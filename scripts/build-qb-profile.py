#!/usr/bin/env python3
"""
build-qb-profile.py — the three stickiest QB inputs, from nflverse weekly stats.

WHY THIS EXISTS
---------------
The Aug 25 2026 stability calibration measured every input the app reads against
how well it survives to the next season. The QB result was lopsided:

    qb_rush_att_pg    r = 0.815   <- the stickiest input measured ANYWHERE
    pass_att_pg       r = 0.605
    pass_adot         r = 0.486
    ...
    points_pg         r = 0.383   <- barely sticky

A quarterback's rushing volume is the single most repeatable thing in football.
His fantasy points are not. So a QB is projected from volume and deployment,
never from last year's scoring — and **none of those three volume numbers were
in the prompt.** The QB metrics line carried spike rate and dud rate only, which
are 0.308 and (QB) the least useful pair available.

PLAYER_METRICS cannot supply them: build-player-metrics.py tracks carries
internally but does not emit a count, and it has no passing-attempt fields at
all. Regenerating that file to add them would mean re-deriving hvt_pg,
usable_rate and spike_rate — three inputs that DO score — over a pbp release
that may have been revised since. A separate additive file cannot move a grade.

INPUT (download from nflverse-data releases, not committed):
  stats_player_week_2025.csv   (release: player_stats)

  curl -sSL -o qb.csv \\
    https://github.com/nflverse/nflverse-data/releases/download/player_stats/stats_player_week_2025.csv

USAGE
  python3 scripts/build-qb-profile.py <stats_player_week_2025.csv> grading/data/qb_profile_2025.json

FIELDS
  gp            games with at least one pass attempt
  rush_att_pg   designed runs + scrambles per game. Kneels are included by the
                source and are not separable here; they are a rounding error
                against the spread this metric is used to read (a konami-code
                QB runs 7-9 times a game, a pocket QB 2-3).
  pass_att_pg   team pass volume with him on the field
  pass_adot     passing air yards / attempts. Checkdown artist or gunslinger.
                A style property, which is why it outlives yards per attempt,
                completion percentage AND fantasy points in stability.

GATE: 6+ games and 100+ attempts, matching the stability run's own qualifying
rule. A backup's 40-attempt sample describes nothing, and a flattering number on
a tiny sample is worse than no number.

SCOPE: CONTEXT ONLY. Feeds the AI prompt, never the numeric score.
"""

import csv, json, re, sys
from collections import defaultdict
from datetime import date

MIN_GP, MIN_ATT = 6, 100


def normalize(name):
    # EXACT mirror of App.jsx normalize().
    n = (name or "").lower().strip()
    n = re.sub(r"[.,']", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)


def main(stats_path, out_path):
    agg = defaultdict(lambda: defaultdict(float))
    games = defaultdict(set)
    teams = defaultdict(lambda: defaultdict(int))

    with open(stats_path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("season_type") != "REG" or r.get("position") != "QB":
                continue
            att = float(r.get("attempts") or 0)
            if att <= 0:
                continue
            k = normalize(r.get("player_display_name") or r.get("player_name"))
            a = agg[k]
            a["attempts"] += att
            a["carries"] += float(r.get("carries") or 0)
            a["passing_air_yards"] += float(r.get("passing_air_yards") or 0)
            games[k].add(r["week"])
            teams[k][r.get("team") or ""] += 1

    players = {}
    for k, a in agg.items():
        gp = len(games[k])
        if gp < MIN_GP or a["attempts"] < MIN_ATT:
            continue
        players[k] = {
            "team": max(teams[k].items(), key=lambda x: x[1])[0],
            "gp": gp,
            "rush_att_pg": round(a["carries"] / gp, 2),
            "pass_att_pg": round(a["attempts"] / gp, 1),
            "pass_adot": round(a["passing_air_yards"] / a["attempts"], 2),
        }

    rush = sorted(p["rush_att_pg"] for p in players.values())
    meta = {
        "season": 2025,
        "source": "nflverse-data player_stats weekly release (REG only)",
        "generated": date.today().isoformat(),
        "min_gp": MIN_GP,
        "min_attempts": MIN_ATT,
        "qualified": len(players),
        "rush_att_pg_median": rush[len(rush) // 2] if rush else None,
        "stability": {"rush_att_pg": 0.815, "pass_att_pg": 0.605, "pass_adot": 0.486, "points_pg": 0.383},
        "note": "CONTEXT ONLY — feeds the AI prompt, never the numeric score. "
                "Project a QB from rushing volume and pass attempts; his prior-season "
                "fantasy points are barely sticky (r=0.383). 2025 team, not 2026 — "
                "check against the ADP table for anyone who moved.",
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"_meta": meta, "players": players}, f, separators=(",", ":"), sort_keys=True)

    print(f"{len(players)} quarterbacks written to {out_path}")
    print(f"  rush_att_pg median {meta['rush_att_pg_median']}, range {rush[0]} to {rush[-1]}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:3])
