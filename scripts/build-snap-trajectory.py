#!/usr/bin/env python3
"""
build-snap-trajectory.py — RosterXRay in-season snap TRAJECTORY from nflverse.

WHY THIS EXISTS
---------------
`player_metrics_2025.json` stores `snap_sh` as a SEASON AVERAGE. A season
average is the wrong number whenever a role changed mid-year, and it fails in
the single direction that matters most for 2026 projection: a player who was
buried in September and starting in December averages out to "committee," which
is exactly what he is not any more.

This is not hypothetical. Two players were mis-graded off the season average
before this file existed:

  RJ Harvey   season snap 0.421 -> read as a timeshare and graded fade/falling.
              Weeks 10+ he was at 0.567. The role had already changed.
  Chris Rodriguez  season row understates a back who took 112 carries at 4.5 YPC.

Season averages bury role CHANGE, and role change is rank 1 in the Source
Hierarchy while the season average is a rank-2 volume summary. The most
recent role is closer to next season's role than the mean of the whole year.

INPUT (download from nflverse-data releases, not committed):
  snap_counts_2025.csv.gz   (release: snap_counts)

  curl -sSL -o snaps.csv.gz \\
    https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2025.csv.gz

USAGE
  python3 scripts/build-snap-trajectory.py <snaps.csv.gz> <out.json> [season]

  Season defaults to 2025. During the 2026 season this runs weekly against the
  live release; see scripts/refresh-inseason.sh.

PARTIAL SEASONS SPLIT DIFFERENTLY, ON PURPOSE
---------------------------------------------
A W1-9 / W10-18 split is meaningless in Week 8 — nobody has a late window, so
every player would report "partial season" and the layer would say nothing all
autumn, which is exactly the half of the year when role change is most worth
catching. So the split mode follows the data:

  complete season (18+ weeks)  ->  W1-9 vs W10-18          split_mode "calendar"
  partial season               ->  first half vs second half of weeks covered
                                                            split_mode "halves"

A 4-vs-4 split is noisier than a 9-vs-9 one, so the threshold is DERIVED from
that run's own delta distribution rather than inheriting the full-season 0.15.
`_meta.threshold_source` records which was used. Never compare a partial-season
delta against a full-season one; they are different measurements.

FIELDS (per player, offensive skill positions only)
  season      mean offense_pct across games played  (== player_metrics snap_sh)
  early/late  mean offense_pct over W1-9 / W10-18
  early_gp    games played in each window. Both must clear MIN_WINDOW_GP or
  late_gp       delta/trend are null — a 1-game window is not a trajectory.
  last4       mean over the last four games PLAYED (not the last four weeks,
              so an injured player's exit role is still measured on real snaps)
  delta       late - early. Positive = role grew.
  trend       rising / stable / falling at |delta| >= TREND_THRESHOLD
  changed_team  true if the player appears under 2+ teams. His trajectory then
              conflates two different roles — read the split, not the delta.

THRESHOLD IS DERIVED, NOT PICKED
--------------------------------
Across the 367 qualified players in 2025 the delta distribution is centered at
zero (mean +0.010, median -0.005 — so there is no systematic league-wide drift
to correct for) with stdev 0.157. TREND_THRESHOLD = 0.15 is therefore ~1 SD and
flags the tails: p10 sits at -0.150 and p90 at +0.193. Re-derive it if the
season changes; do not nudge it to make a player grade better.

SCOPE: CONTEXT ONLY
-------------------
Like the efficiency, SOS, motion and air-yards layers, this feeds the AI prompt
and nothing else. It does NOT touch the numeric scoring engine, so grades stay
comparable to those issued before it landed. Snap share is a PROXY for route
participation (the NFL participation feed died after 2023) — the same caveat
`snap_sh` already carries.
"""

import csv, gzip, json, re, sys
from collections import defaultdict
from datetime import date

EARLY_MAX = 9          # W1-9
LATE_MIN = 10          # W10-18
MIN_WINDOW_GP = 3      # games needed in BOTH windows before a delta is reported
TREND_THRESHOLD = 0.15 # ~1 stdev of the 2025 full-season delta distribution
COMPLETE_SEASON_WEEKS = 18
SKILL = ("QB", "RB", "WR", "TE")


def normalize(name):
    # EXACT mirror of App.jsx normalize(): lowercase, strip [.,'],
    # hyphen -> space, collapse whitespace. Suffixes are KEPT.
    n = name.lower().strip()
    n = re.sub(r"[.,']", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)


def mean(v):
    return sum(v) / len(v)


def stdev(v):
    if len(v) < 2:
        return 0.0
    m = sum(v) / len(v)
    return (sum((x - m) ** 2 for x in v) / (len(v) - 1)) ** 0.5


def main(snap_path, out_path, season="2025"):
    season = int(season)
    # (normalized name, position) -> [(week, offense_pct, team), ...]
    games = defaultdict(list)
    with gzip.open(snap_path, "rt", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("game_type") != "REG":
                continue
            if r.get("position") not in SKILL:
                continue
            snaps = r.get("offense_snaps")
            if not snaps or int(float(snaps)) <= 0:
                continue
            key = (normalize(r["player"]), r["position"])
            games[key].append((int(r["week"]), float(r.get("offense_pct") or 0), r.get("team") or ""))

    weeks_covered = max((w for rows in games.values() for w, _, _ in rows), default=0)
    complete = weeks_covered >= COMPLETE_SEASON_WEEKS
    # Mid-season the calendar split has no late window at all, so fall back to
    # halves of what has actually been played.
    if complete:
        split_mode, cut = "calendar", EARLY_MAX
    else:
        split_mode, cut = "halves", max(weeks_covered // 2, 1)

    players, deltas = {}, []
    for (name, pos), rows in games.items():
        rows.sort()
        if len(rows) < 4:
            continue  # nothing to describe a trajectory with
        early = [p for w, p, _ in rows if w <= cut]
        late = [p for w, p, _ in rows if w > cut]
        teams = {t for _, _, t in rows if t}

        qualified = len(early) >= MIN_WINDOW_GP and len(late) >= MIN_WINDOW_GP
        delta = round(mean(late) - mean(early), 3) if qualified else None
        if delta is not None:
            deltas.append(delta)

        players[name] = {
            "pos": pos,
            "team": rows[-1][2],
            "gp": len(rows),
            "season": round(mean([p for _, p, _ in rows]), 3),
            "early": round(mean(early), 3) if early else None,
            "late": round(mean(late), 3) if late else None,
            "early_gp": len(early),
            "late_gp": len(late),
            "last4": round(mean([p for _, p, _ in rows[-4:]]), 3),
            "delta": delta,
            "trend": None,  # assigned below, once the threshold is known
            "changed_team": len(teams) > 1,
        }

    # A complete season reuses the documented 0.15 (~1 SD of the 2025 full-season
    # distribution). A partial season derives its own, because a 4-vs-4 split is
    # noisier and inheriting 0.15 would flag ordinary variance as role change.
    if complete:
        threshold, threshold_source = TREND_THRESHOLD, "fixed (~1 SD of the 2025 full season)"
    else:
        threshold = round(stdev(deltas), 2) if len(deltas) >= 30 else None
        threshold_source = f"derived from this run ({len(deltas)} qualified deltas)"

    for p in players.values():
        if p["delta"] is None or threshold is None:
            p["trend"] = None
        else:
            p["trend"] = "rising" if p["delta"] >= threshold else "falling" if p["delta"] <= -threshold else "stable"

    deltas.sort()
    n = len(deltas)
    meta = {
        "season": season,
        "source": "nflverse-data snap_counts release (offense_pct, REG only)",
        "generated": date.today().isoformat(),
        "weeks_covered": weeks_covered,
        "season_complete": complete,
        "split_mode": split_mode,
        "early_weeks": f"1-{cut}",
        "late_weeks": f"{cut + 1}-{weeks_covered}" if weeks_covered else "",
        "min_window_gp": MIN_WINDOW_GP,
        "trend_threshold": threshold,
        "threshold_source": threshold_source,
        "qualified": n,
        "delta_median": deltas[n // 2] if n else None,
        "delta_p10": deltas[int(n * 0.10)] if n else None,
        "delta_p90": deltas[int(n * 0.90)] if n else None,
        "rising": sum(1 for p in players.values() if p["trend"] == "rising"),
        "falling": sum(1 for p in players.values() if p["trend"] == "falling"),
        "note": "CONTEXT ONLY — feeds the AI prompt, never the numeric score. "
                "snap share is a route-participation PROXY. A changed_team player's "
                "delta spans two roles and must be read as such.",
    }

    with open(out_path, "w", encoding="utf-8") as f:
        # Minified — imported into the client bundle.
        json.dump({"_meta": meta, "players": players}, f, separators=(",", ":"), sort_keys=True)

    print(f"{len(players)} players written to {out_path}")
    print(f"  season {season} · weeks 1-{weeks_covered} · {'COMPLETE' if complete else 'PARTIAL'} · split {split_mode} at W{cut}")
    print(f"  threshold {threshold} ({threshold_source})")
    print(f"  qualified for a delta: {n}  (rising {meta['rising']}, falling {meta['falling']})")
    if n:
        print(f"  delta p10 {meta['delta_p10']:+.3f}  median {meta['delta_median']:+.3f}  p90 {meta['delta_p90']:+.3f}")


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    main(*sys.argv[1:4])
