#!/usr/bin/env python3
"""build-volume-current.py -> grading/data/volume_<season>.json

THE IN-SEASON ANSWER TO A PROBLEM THE FROZEN FILE CREATES.

`player_metrics_2025.json` feeds four SCORED inputs and is frozen for the whole
season on purpose: refreshing it weekly would move every grade for reasons
unrelated to the roster and silently invalidate every calibration on file.

The consequence is easy to miss and it is the point of this script. **The most
repeatable volume numbers in the app describe LAST season for the whole of
THIS one.** In Week 8 the card and the prompt were still quoting 2025 targets
per game, target share and air yards share, which are r=0.77, 0.73 and 0.78 —
the anchors everything else leans on.

So this is the CONTEXT TWIN. Same measurements, current season, and it never
touches the scoring engine.

  targets/game    r = 0.774   the raw volume nothing survives being low
  air yards share r = 0.780   where on the field that volume is aimed
  target share    r = 0.729   how central he is to the passing game
  WOPR            r = 0.752   the two blended
  carries/game    r = 0.730   the RB counterpart, which the scored file
                              never emitted a count for at all

⚠️ BOTH VINTAGES ARE ALWAYS SHOWN. NEVER SWAPPED. "18% target share in 2025,
27% through W7" says more than either number alone, and a layer that silently
changes which season it describes is the stale-data trap in a new costume. This
is the same rule `snap_trajectory`, `qb_profile` and `gamelogs` already follow.

⚠️ IT COSTS NO EXTRA NETWORK. `refresh-inseason.sh` already downloads
`stats_player_week_<season>.csv.gz` for build-qb-profile and build-gamelogs.
This is a third parse of a file that is already on disk — the same economy the
game-log layer got. Red-zone share and TPRR are NOT built here for the opposite
reason: they need the pbp and participation releases, which are large weekly
downloads. They stay annual until someone decides that trade is worth it.

⚠️ THE SEASON-TO-DATE SHARE HIDES THE TREND, WHICH IS THE WHOLE IN-SEASON
QUESTION. A season aggregate answers "how central is he" and cannot answer
"is he becoming more central", and role CHANGE is rank 1 in the Source
Hierarchy while volume is rank 2. Averaging the year collapses the higher-
ranked signal into the lower-ranked one — the exact failure `snap_trajectory`
exists to fix, left unclosed on the better metric (target share r=0.729 and
targets/gm r=0.774, against snap share's 0.709).

So every player also carries a PER-WEEK target-share series and a derived
trend. Worked example, Colston Loveland 2025: season 5.12 tgt/gm, 15th among
draftable TEs and utterly ordinary — while the weekly share ran 11.1% in W10
to 39.4% in W18. The average describes neither player.

⚠️ "insufficient" IS NOT "stable". A player with too few games gets
trend "insufficient" and a null delta, never a flat reading. Silence that
looks like a measurement is the silent-drop failure in a new costume: the
consumer must be able to say "not enough games yet" in words.

⚠️ DENOMINATORS ARE PER (PLAYER, GAME), NEVER SEASON-LEVEL. Team targets are
summed only over the games the player actually appeared in. A full-season
denominator understates every partial-season player, which is a bug this repo
already shipped once (Jul 16 2026, Garrett Wilson read 12.6% against his real
in-game share). Counting per game also keeps mid-season movers honest: the same
season-level-team shortcut produced route shares above 1.0 in build-routes.py.

Regenerate (or just run scripts/refresh-inseason.sh, which calls this):
  curl -sSL -o stats.csv.gz \\
    https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv.gz
  python3 scripts/build-volume-current.py stats.csv.gz grading/data/volume_2026.json 2026
"""
import csv, gzip, json, re, sys
from collections import defaultdict

SRC = sys.argv[1] if len(sys.argv) > 1 else "stats.csv.gz"
OUT = sys.argv[2] if len(sys.argv) > 2 else "grading/data/volume_2026.json"
SEASON = int(sys.argv[3]) if len(sys.argv) > 3 else 2026

POSITIONS = ("WR", "TE", "RB", "QB")
TEAM_ALIAS = {"LA": "LAR"}   # see build-sos.py — nflverse ships the Rams as LA
# One game is not a rate. The scored file uses 8+ because it feeds a grade;
# this one is context and has to say something useful in October, so the gate
# is lower and the game count travels with every number.
MIN_GP = 2

# --- trajectory ---------------------------------------------------------
# Both windows must hold this many GAMES before a delta is reported. The
# snap-trajectory layer uses 3 because it is a full-season retrospective;
# this one has to be useful in October, so 2 turns the split on at 4 games
# (~W4-5) instead of 6 (~W6-7). The game count travels with every number so
# a thin split is visible rather than implied.
MIN_WINDOW_GP = 2
# Recency window, in GAMES PLAYED — never "the last 3 weeks". An injured
# player's exit role must be measured on games he actually played, the same
# rule build-snap-trajectory.py applies to its last4.
LAST_N = 3


def normalize(name):
    """Mirror of App.jsx normalize(). See build-player-metrics.py."""
    n = name.lower().strip()
    n = re.sub(r"[.,']", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


def split_windows(weeks, season_complete):
    """Return (early, recent, mode).

    A W1-9 / W10-18 calendar split is meaningless in Week 8 — nobody has a
    late window, so the layer would say nothing all autumn, which is exactly
    the half of the year role change matters most. Partial seasons therefore
    split the weeks actually COVERED into halves. `_meta` records which was
    used, and the two are never comparable: a 3-vs-3 halves delta and a
    9-vs-9 calendar delta are different measurements.
    """
    if season_complete:
        return [w for w in weeks if w <= 9], [w for w in weeks if w > 9], "calendar"
    mid = len(weeks) // 2
    return weeks[:mid], weeks[mid:], "halves"


def trajectory(wk_rows, season_complete, ci=1, si=2):
    """Per-week share series plus the early/recent split. Threshold is applied
    later, once the run's own delta distribution is known.

    ⚠️ RUN FOR BOTH THE PASSING AND RUSHING SIDES, and that is not optional.
    RJ Harvey 2025 is the proof: his target share delta is +0.027 (stable)
    while his carries per game went 8.0 -> 16.5 opportunities. A board that
    reported only the passing side would print "stable" for the exact player
    this repo records being graded fade/falling on four separate rosters off
    a season average. `ci`/`si` select the count and share columns.
    """
    rows = sorted(wk_rows)
    weeks = [w for w, *rest in rows if rest[si - 1] is not None]
    by_week = {r[0]: r[si] for r in rows if r[si] is not None}
    early_w, recent_w, mode = split_windows(weeks, season_complete)
    mean = lambda ws: (sum(by_week[w] for w in ws) / len(ws)) if ws else None
    early, recent = mean(early_w), mean(recent_w)
    # ⚠ Both windows must be real. A one-game window is not a trajectory, and
    # reporting one would put a confident label on a single afternoon.
    delta = (recent - early) if (
        early is not None and recent is not None
        and len(early_w) >= MIN_WINDOW_GP and len(recent_w) >= MIN_WINDOW_GP
    ) else None
    last_w = weeks[-LAST_N:]
    return {
        "series": [[r[0], int(r[ci]), round(r[si], 4)]
                   for r in rows if r[si] is not None],
        "early": round(early, 4) if early is not None else None,
        "recent": round(recent, 4) if recent is not None else None,
        "early_gp": len(early_w), "recent_gp": len(recent_w),
        "last3": round(mean(last_w), 4) if last_w else None,
        "last3_gp": len(last_w),
        "delta": round(delta, 4) if delta is not None else None,
        "split_mode": mode,
    }


def main():
    op = gzip.open if SRC.endswith(".gz") else open
    try:
        rows = [r for r in csv.DictReader(op(SRC, "rt"))
                if r.get("season_type") == "REG" and int(r.get("season") or 0) == SEASON]
    except FileNotFoundError:
        sys.exit(f"missing {SRC}")

    # Team totals per (team, week) — the denominator, built at game grain.
    team_tgt = defaultdict(float)
    team_ay = defaultdict(float)
    team_car = defaultdict(float)
    for r in rows:
        key = (TEAM_ALIAS.get(r["team"], r["team"]), r["week"])
        team_tgt[key] += num(r.get("targets"))
        team_ay[key] += num(r.get("receiving_air_yards"))
        team_car[key] += num(r.get("carries"))

    agg = defaultdict(lambda: {"gp": 0, "tgt": 0.0, "ay": 0.0, "rec": 0.0,
                               "car": 0.0, "dt": 0.0, "day": 0.0,
                               "weeks": set(), "team": None, "pos": None,
                               "wk": []})
    for r in rows:
        pos = r.get("position")
        name = r.get("player_display_name")
        if pos not in POSITIONS or not name:
            continue
        team = TEAM_ALIAS.get(r["team"], r["team"])
        a = agg[normalize(name)]
        a["pos"], a["team"] = pos, team          # last team seen = current team
        a["weeks"].add(r["week"])
        a["gp"] += 1
        a["tgt"] += num(r.get("targets"))
        a["ay"] += num(r.get("receiving_air_yards"))
        a["rec"] += num(r.get("receptions"))
        a["car"] += num(r.get("carries"))
        # ⚠ denominator accumulated only for games he appeared in
        a["dt"] += team_tgt[(team, r["week"])]
        a["day"] += team_ay[(team, r["week"])]
        # Per-week grain, kept so a trend can be computed. The denominator is
        # this week's team total for the team he played for THAT week, so a
        # mid-season move never contaminates the share.
        dt_wk = team_tgt[(team, r["week"])]
        dc_wk = team_car[(team, r["week"])]
        a["wk"].append((int(r["week"]),
                        num(r.get("targets")),
                        (num(r.get("targets")) / dt_wk) if dt_wk else None,
                        num(r.get("carries")),
                        (num(r.get("carries")) / dc_wk) if dc_wk else None))

    weeks_covered = max((int(w) for r in rows for w in [r["week"]]), default=0)

    players = {}
    for key, a in agg.items():
        if a["gp"] < MIN_GP:
            continue
        tgt_sh = a["tgt"] / a["dt"] if a["dt"] else None
        ay_sh = a["ay"] / a["day"] if a["day"] else None
        wopr = (1.5 * tgt_sh + 0.7 * ay_sh) if (tgt_sh is not None and ay_sh is not None) else None
        players[key] = {
            "pos": a["pos"], "team": a["team"], "gp": a["gp"],
            "tgt": int(a["tgt"]), "tgt_pg": round(a["tgt"] / a["gp"], 2),
            "rec": int(a["rec"]),
            "car": int(a["car"]), "car_pg": round(a["car"] / a["gp"], 2),
            "tgt_sh": round(tgt_sh, 3) if tgt_sh is not None else None,
            "ay_sh": round(ay_sh, 3) if ay_sh is not None else None,
            "wopr": round(wopr, 3) if wopr is not None else None,
            "trend": trajectory(a["wk"], weeks_covered >= 18, 1, 2),
            # Backs only. A receiver's carry share is noise and printing it
            # would invite reading a trend into three jet sweeps.
            "trend_car": (trajectory(a["wk"], weeks_covered >= 18, 3, 4)
                          if a["pos"] == "RB" else None),
        }

    # THE THRESHOLD IS DERIVED FROM THIS RUN'S OWN DISTRIBUTION, never
    # hand-typed. A fixed number starts measuring league-wide drift as soon as
    # the distribution moves; ~1 SD of the observed deltas always means "this
    # player moved more than most players moved". build-snap-trajectory.py
    # derives its 0.15 the same way and guard 13 pins the centering.
    #
    # EACH SERIES DERIVES ITS OWN. Target share and carry share have different
    # spreads, and applying one threshold to both would flag the wrong tail on
    # one of them — the same class as the position-normalisation bug in the
    # Ceiling Shape Layer, which moved grades for the wrong reason and looked
    # like a working feature while it did.
    def derive(key):
        ds = sorted(v[key]["delta"] for v in players.values()
                    if v.get(key) and v[key]["delta"] is not None)
        n = len(ds)
        if n < 30:
            # Too few splits to derive anything honest — usually the opening
            # weeks of a season. Nothing gets a rising/falling label, rather
            # than every player getting one off a distribution of twelve.
            return None, f"not derived — only {n} deltas, need 30", n, None, None
        mean_d = sum(ds) / n
        sd = (sum((d - mean_d) ** 2 for d in ds) / n) ** 0.5
        return (round(sd, 4), "derived (1 SD of this run's deltas)",
                n, round(ds[n // 2], 4), round(sd, 4))

    def label(key, threshold):
        c = {"rising": 0, "falling": 0, "stable": 0, "insufficient": 0}
        for v in players.values():
            t = v.get(key)
            if not t:
                continue
            d = t["delta"]
            if d is None or threshold is None:
                # NOT "stable". Stable means measured and flat; this means not
                # yet measurable, and a consumer must be able to say which.
                t["trend"] = "insufficient"
            elif d >= threshold:
                t["trend"] = "rising"
            elif d <= -threshold:
                t["trend"] = "falling"
            else:
                t["trend"] = "stable"
            c[t["trend"]] += 1
        return c

    trend_meta = {}
    for key, metric in (("trend", "target share, per week"),
                        ("trend_car", "carry share, per week (RB only)")):
        thr, tsrc, dn, dmed, dsd = derive(key)
        trend_meta[key] = {
            "metric": metric, "threshold": thr, "threshold_source": tsrc,
            "min_window_gp": MIN_WINDOW_GP, "last_n": LAST_N,
            "split_mode": ("calendar" if weeks_covered >= 18 else "halves"),
            "delta_n": dn, "delta_median": dmed, "delta_stdev": dsd,
            "counts": label(key, thr),
        }

    meta = {
        "season": SEASON,
        "source": "nflverse stats_player (weekly, REG only)",
        "weeks_covered": weeks_covered,
        # A finished season must not label itself "in progress". vintageLabel()
        # reads this; a closed book described as live is the vintage trap in
        # miniature (same bug the game-log builder shipped and fixed).
        "season_complete": weeks_covered >= 18,
        "min_gp": MIN_GP,
        "context_only": True,
        "denominator": "team targets/air yards summed over GAMES PLAYED, never the full season",
        "stability": {
            "tgt_pg": 0.774, "ay_sh": 0.780, "tgt_sh": 0.729,
            "wopr": 0.752, "car_pg": 0.730,
        },
        "hierarchy_rank": {"all": "2 — opportunity volume"},
        "trend": trend_meta,
        "trend_rules": {
            "rank": "1 — role/opportunity CHANGE, which outranks the season "
                    "aggregate sitting beside it",
            "insufficient": "means not enough games to split, NOT a flat role. "
                            "Never render it as stable.",
            "both_sides": "`trend` is the PASSING side, `trend_car` the RUSHING "
                          "side. A back can be flat in one and moving in the "
                          "other — RJ Harvey 2025 reads stable on target share "
                          "while his touches doubled. Read both for RBs.",
            "windows": "calendar (W1-9 vs W10-18) only on a complete season, "
                       "otherwise halves of the weeks covered. The two are "
                       "different measurements and never comparable.",
        },
        "pairs_with": {
            "file": "player_metrics_2025.json",
            "rule": "BOTH vintages render, always. The prior season is never "
                    "overwritten and the current one never silently replaces it.",
        },
        "counts": {p: sum(1 for v in players.values() if v["pos"] == p) for p in POSITIONS},
    }
    json.dump({"_meta": meta, "players": players}, open(OUT, "w"), indent=1, sort_keys=True)
    print(f"wrote {OUT}: {len(players)} players through W{weeks_covered}  counts={meta['counts']}")
    for k, m in trend_meta.items():
        print(f"  {k}: threshold={m['threshold']} n={m['delta_n']} "
              f"median={m['delta_median']} {m['counts']}")


if __name__ == "__main__":
    main()
