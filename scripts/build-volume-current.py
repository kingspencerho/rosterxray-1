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
    for r in rows:
        key = (TEAM_ALIAS.get(r["team"], r["team"]), r["week"])
        team_tgt[key] += num(r.get("targets"))
        team_ay[key] += num(r.get("receiving_air_yards"))

    agg = defaultdict(lambda: {"gp": 0, "tgt": 0.0, "ay": 0.0, "rec": 0.0,
                               "car": 0.0, "dt": 0.0, "day": 0.0,
                               "weeks": set(), "team": None, "pos": None})
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
        "pairs_with": {
            "file": "player_metrics_2025.json",
            "rule": "BOTH vintages render, always. The prior season is never "
                    "overwritten and the current one never silently replaces it.",
        },
        "counts": {p: sum(1 for v in players.values() if v["pos"] == p) for p in POSITIONS},
    }
    json.dump({"_meta": meta, "players": players}, open(OUT, "w"), indent=1, sort_keys=True)
    print(f"wrote {OUT}: {len(players)} players through W{weeks_covered}  counts={meta['counts']}")


if __name__ == "__main__":
    main()
