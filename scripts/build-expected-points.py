#!/usr/bin/env python3
"""Expected fantasy points per player per game -> expected_<season>.json.

WHAT IT ANSWERS, and nothing else in this app answers it
--------------------------------------------------------
Given the chances a player actually got - the targets, where they were thrown,
the carries, where they started - how many points SHOULD that have been worth?
Then set it beside what he really scored.

Every other opportunity layer here reports a SHARE (target share, snap share,
carry share). A share tells you how much of a pie he owns and says nothing
about how big the pie is or where on the field it sits. This converts the
whole opportunity set into one number on the SAME SCALE AS THE OUTPUT, which
is what lets a receiving role and a goal-line role be compared without
hand-waving.

  Worked case, Week 1 2026: James Cook scored 8.4 half-PPR points on 11.4
  expected. A respectable box score that was actually a below-par week. No
  share in this repo can tell you that.

SOURCE, AND THE CORRECTION IT CARRIES
-------------------------------------
`ffverse/ffopportunity`, release tag `latest-data`, asset `ep_weekly_<season>.csv`.

⭐ CLAUDE.md has recorded since Aug that this layer "needs nflreadpy + polars,
   dependencies every in-season builder deliberately avoids". THAT IS WRONG,
   and checking rather than repeating it is what made this cheap: the release
   publishes plain CSV alongside the parquet, so this builder is stdlib only,
   exactly like every other one here.
⭐ It also records the data as living in nflverse. It does not - there is no
   `ff_opportunity` tag in nflverse-data. It is a ffverse release.
✅ 2026 IS PUBLISHED. `ep_weekly_2026.csv` exists and carries Week 1.

⛔⛔ THE FILE IS FULL PPR. THIS BUILDER DOES NOT USE ITS TOTALS.
`total_fantasy_points_exp` was verified against a reconstruction from the
component columns across four players and matches full PPR to 0.02. This app
is HALF-PPR with 4-point passing TDs. Copying their total would print a PPR
number on a half-PPR card - the same class of error as reading a share whose
denominator you did not check. Everything below is recomputed from components
using this repo's own SCORE dict.

⚠️ AND IT IS NOT HAYDEN WINKS' MODEL. His charts say "Data: nflfastR" and his
published Gibbs figure (28.4) does not reproduce from this file in half-PPR
(30.56) or any other single scoring. Expected points is a MODEL, not a
measurement, and two models disagree. Never present this as reproducing his.

Regenerate:
  curl -sSL -o ep.csv https://github.com/ffverse/ffopportunity/releases/download/latest-data/ep_weekly_2026.csv
  python3 scripts/build-expected-points.py ep.csv grading/data/expected_2026.json 2026
"""
import csv
import io
import json
import re
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "ep.csv"
OUT = sys.argv[2] if len(sys.argv) > 2 else "grading/data/expected_2026.json"
SEASON = int(sys.argv[3]) if len(sys.argv) > 3 else 2026

POSITIONS = ("QB", "RB", "WR", "TE")
TEAM_ALIAS = {"LA": "LAR"}
# One game is not a rate. Context layer, so the gate is low and the game count
# travels with every number - same contract as build-volume-current.py.
MIN_GP = 1

# ⛔ THIS REPO'S SCORING, NOT THE SOURCE FILE'S. Mirrors SCORE in
# build-gamelogs.py; a second hand-typed copy is the duplicate-definition class
# this repo has paid for twelve times, so the guard asserts the two agree.
SCORE = dict(py=0.04, ptd=4.0, ints=-1.0, ry=0.1, rtd=6.0,
             recy=0.1, rectd=6.0, rec=0.5)


def normalize(name):
    """Mirror of App.jsx normalize(). See build-player-metrics.py."""
    n = (name or "").lower().strip()
    n = re.sub(r"[.,']", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)


def num(v):
    try:
        return float(v) if v not in ("", "NA", None) else 0.0
    except (TypeError, ValueError):
        return 0.0


def score(r, suffix):
    """Half-PPR points from the component columns.

    `suffix` is "_exp" for the expected set and "" for the realised set, so
    BOTH SIDES GO THROUGH THE SAME ARITHMETIC. Scoring one side from the file's
    own total and the other from components would put the difference between
    two scoring systems into a column labelled 'luck'.
    """
    g = lambda k: num(r.get(k + suffix))
    return (g("pass_yards_gained") * SCORE["py"]
            + g("pass_touchdown") * SCORE["ptd"]
            + g("pass_interception") * SCORE["ints"]
            + g("rush_yards_gained") * SCORE["ry"]
            + g("rush_touchdown") * SCORE["rtd"]
            + g("rec_yards_gained") * SCORE["recy"]
            + g("rec_touchdown") * SCORE["rectd"]
            + g("receptions") * SCORE["rec"])


def main():
    try:
        rows = list(csv.DictReader(io.open(SRC, encoding="utf-8",
                                           errors="replace", newline="")))
    except FileNotFoundError:
        sys.exit("missing %s" % SRC)
    rows = [r for r in rows if int(num(r.get("season"))) == SEASON]

    agg = {}
    weeks = set()
    for r in rows:
        pos = r.get("position")
        name = r.get("full_name")
        if pos not in POSITIONS or not name:
            continue
        w = int(num(r.get("week")))
        if w:
            weeks.add(w)
        k = normalize(name)
        a = agg.setdefault(k, {"pos": pos, "team": None, "gp": 0,
                               "exp": 0.0, "act": 0.0})
        a["pos"] = pos
        a["team"] = TEAM_ALIAS.get(r.get("posteam"), r.get("posteam")) or a["team"]
        a["gp"] += 1
        a["exp"] += score(r, "_exp")
        a["act"] += score(r, "")

    players = {}
    for k, a in agg.items():
        if a["gp"] < MIN_GP:
            continue
        exp_pg = a["exp"] / a["gp"]
        act_pg = a["act"] / a["gp"]
        players[k] = {
            "pos": a["pos"], "team": a["team"], "gp": a["gp"],
            "exp_pg": round(exp_pg, 2),
            "act_pg": round(act_pg, 2),
            # ⚠️ POSITIVE MEANS HE OUT-SCORED HIS OPPORTUNITY. It is NOT a
            # skill rating and it is NOT a forecast - the repo's own table puts
            # every efficiency input between r=0.02 and r=0.31. Read it as the
            # part of his week that his usage does NOT explain.
            "diff_pg": round(act_pg - exp_pg, 2),
            "exp": round(a["exp"], 1), "act": round(a["act"], 1),
        }

    # Rank within position on EXPECTED, never on actual. The whole point is to
    # rank the opportunity rather than the outcome.
    for pos in POSITIONS:
        grp = sorted([k for k, v in players.items() if v["pos"] == pos],
                     key=lambda k: -players[k]["exp_pg"])
        for i, k in enumerate(grp, 1):
            players[k]["exp_rank"] = i
        grp2 = sorted(grp, key=lambda k: -players[k]["act_pg"])
        for i, k in enumerate(grp2, 1):
            players[k]["act_rank"] = i

    weeks_covered = max(weeks) if weeks else 0
    meta = {
        "season": SEASON,
        "weeks_covered": weeks_covered,
        "season_complete": weeks_covered >= 18,
        "source": "ffverse/ffopportunity latest-data (ep_weekly)",
        "context_only": True,
        "scored": False,
        "reaches_ai_prompt": False,
        "min_gp": MIN_GP,
        "scoring": dict(SCORE),
        "hierarchy_rank": {"all": "2 — opportunity volume, expressed in points"},
        "rules": {
            "recomputed": "HALF-PPR, from the source's COMPONENT columns using "
                          "this repo's own SCORE dict. The source file is FULL "
                          "PPR and its totals are deliberately unused - copying "
                          "them would print a PPR number on a half-PPR card.",
            "both_sides": "expected and actual go through the same arithmetic, "
                          "so the difference is not two scoring systems.",
            "diff": "positive means he out-scored his opportunity. NOT a skill "
                    "rating and NOT a forecast - every efficiency input in §2 "
                    "sits between r=0.02 and r=0.31.",
            "not_winks": "this is a MODEL, and not the one Hayden Winks "
                         "publishes. His Gibbs figure does not reproduce here "
                         "under any single scoring. Never present it as his.",
            "rank": "ranks are within position, on EXPECTED. The point is to "
                    "rank the opportunity, not the outcome.",
        },
        "counts": {p: sum(1 for v in players.values() if v["pos"] == p)
                   for p in POSITIONS},
    }
    json.dump({"_meta": meta, "players": players},
              io.open(OUT, "w", encoding="utf-8", newline=""),
              indent=1, sort_keys=True)
    print("wrote %s: %d players through W%d  counts=%s"
          % (OUT, len(players), weeks_covered, meta["counts"]))
    if players:
        top = sorted(players.items(), key=lambda kv: -kv[1]["exp_pg"])[:5]
        for k, v in top:
            print("   %-22s %-3s exp %5.1f  act %5.1f  diff %+5.1f"
                  % (k, v["pos"], v["exp_pg"], v["act_pg"], v["diff_pg"]))


if __name__ == "__main__":
    main()
