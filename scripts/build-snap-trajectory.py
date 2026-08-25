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
  python3 scripts/build-snap-trajectory.py <snaps.csv.gz> grading/data/snap_trajectory_2025.json

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
TREND_THRESHOLD = 0.15 # ~1 stdev of the 2025 delta distribution
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


def main(snap_path, out_path):
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

    players, deltas = {}, []
    for (name, pos), rows in games.items():
        rows.sort()
        if len(rows) < 4:
            continue  # nothing to describe a trajectory with
        early = [p for w, p, _ in rows if w <= EARLY_MAX]
        late = [p for w, p, _ in rows if w >= LATE_MIN]
        teams = {t for _, _, t in rows if t}

        qualified = len(early) >= MIN_WINDOW_GP and len(late) >= MIN_WINDOW_GP
        delta = round(mean(late) - mean(early), 3) if qualified else None
        if delta is not None:
            deltas.append(delta)
            trend = "rising" if delta >= TREND_THRESHOLD else "falling" if delta <= -TREND_THRESHOLD else "stable"
        else:
            trend = None

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
            "trend": trend,
            "changed_team": len(teams) > 1,
        }

    deltas.sort()
    n = len(deltas)
    meta = {
        "season": 2025,
        "source": "nflverse-data snap_counts release (offense_pct, REG only)",
        "generated": date.today().isoformat(),
        "early_weeks": f"1-{EARLY_MAX}",
        "late_weeks": f"{LATE_MIN}-18",
        "min_window_gp": MIN_WINDOW_GP,
        "trend_threshold": TREND_THRESHOLD,
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
    print(f"  qualified for a delta: {n}  (rising {meta['rising']}, falling {meta['falling']})")
    print(f"  delta p10 {meta['delta_p10']:+.3f}  median {meta['delta_median']:+.3f}  p90 {meta['delta_p90']:+.3f}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:3])
