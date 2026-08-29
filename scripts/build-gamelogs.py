#!/usr/bin/env python3
"""
build-gamelogs.py — per-week fantasy game logs, from nflverse weekly stats.

WHY THIS EXISTS
---------------
The player card ASSERTS things a game log SHOWS. It says RJ Harvey's role grew
from 29% to 56%, that Tucker Kraft's 86% snap share is a W1-9 read, that Justin
Jefferson posted zero spike weeks at a top-10 ADP. Each of those is a sentence
the reader has to take on trust, and each is a picture the underlying data can
draw in sixty pixels.

    RJ Harvey          ▃▁▁▆▁▁▃█▆▁▃·██▆█▆▁     the back-half surge, visible
    Tucker Kraft       ▃█▁▃·▆▆█▁·········     the ACL tear, visible
    Justin Jefferson   ▆▃▆▆▆·▆▆▆▃▃▃▁▁▁▆▃▆     never bad, never great

THE BANDS ARE NOT NEW. 18+ / 10+ / <5 are exactly the spike, usable and dud
thresholds the card's WEEK OUTCOMES section already prints as rates. This file
draws the distribution those three percentages summarise, so it introduces no
new vocabulary and no fifth colour scale — it is a picture of a section the card
already has.

CONTEXT ONLY. Nothing here reaches analyzeRoster or analyzeRedraft; guard 15
holds the line and guard 19 asserts the containment directly.

INPUT (download from nflverse-data releases, not committed):
  stats_player_week_<season>.csv   (release tag: stats_player, NOT player_stats —
  the obvious guess 404s)

  curl -sSL -o wk.csv \\
    https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2025.csv

  refresh-inseason.sh ALREADY DOWNLOADS THIS FILE for build-qb-profile.py, so
  during the season this layer costs one extra parse and no extra network.

USAGE
  python3 scripts/build-gamelogs.py <stats_player_week.csv> <out.json> [season]

SHAPE — arrays, not objects, and that is the whole size story.
  Named keys on ~3,000 game rows triple the file for no added meaning. Each game
  is a fixed-width row whose column meanings live once in _meta.cols:

    QB     [week, oppIdx, pts, tds, att, pass_yds, pass_td, carries, rush_yds]
    RB     [week, oppIdx, pts, tds, carries, rush_yds, tgt, rec, rec_yds]
    WR/TE  [week, oppIdx, pts, tds, tgt, rec, rec_yds, air_yds]

  oppIdx indexes _meta.teams. Measured at 76 KB raw / 28 KB gzipped for 212
  draftable players across 2,961 games.

SCORING is this app's format: half-PPR, 4pt passing TD, -1 INT, -2 fumble lost.
Kickers and defenses are not carried; the app filters them everywhere else.

GATE: none. A one-game log is still true, and unlike a RATE it cannot mislead by
being computed over a tiny sample — the reader sees exactly how many bars exist.
That is the opposite of the rule for player_metrics, and deliberately so.
"""
import csv, json, sys, re, collections

SCORE = dict(py=0.04, ptd=4.0, ints=-1.0, ry=0.1, rtd=6.0, recy=0.1, rectd=6.0, rec=0.5, fum=-2.0)


def num(v):
    try:
        return float(v) if v not in ("", "NA", None) else 0.0
    except (TypeError, ValueError):
        return 0.0


def points(r):
    return (num(r["passing_yards"]) * SCORE["py"] + num(r["passing_tds"]) * SCORE["ptd"]
            + num(r["passing_interceptions"]) * SCORE["ints"]
            + num(r["rushing_yards"]) * SCORE["ry"] + num(r["rushing_tds"]) * SCORE["rtd"]
            + num(r["receiving_yards"]) * SCORE["recy"] + num(r["receiving_tds"]) * SCORE["rectd"]
            + num(r["receptions"]) * SCORE["rec"]
            + (num(r["sack_fumbles_lost"]) + num(r["rushing_fumbles_lost"])
               + num(r["receiving_fumbles_lost"])) * SCORE["fum"])


def normalize(s):
    s = s.lower().replace(".", " ").replace("-", " ").replace("'", "")
    s = re.sub(r"[^a-z ]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def draftable_names(app_path):
    """Only players the app can actually draft. Keeps the file to the population
    the card renders, and matches how CARD_PERCENTILES picks its own gate."""
    src = open(app_path, encoding="utf-8").read()
    i = src.index("const ADP_DATA")
    depth, j = 0, src.index("{", i)
    for x in range(j, len(src)):
        if src[x] == "{":
            depth += 1
        elif src[x] == "}":
            depth -= 1
            if depth == 0:
                block = src[j:x + 1]
                break
    return {normalize(m.group(1)) for m in re.finditer(r'"([^"]+)":\s*\{\s*adp:', block)}


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    src_csv, out_path = sys.argv[1], sys.argv[2]
    season = int(sys.argv[3]) if len(sys.argv) > 3 else 2025

    rows = [r for r in csv.DictReader(open(src_csv, encoding="utf-8"))
            if r.get("season_type") == "REG" and r.get("position") in ("QB", "RB", "WR", "TE")]
    draft = draftable_names("App.jsx")

    teams = sorted({r["opponent_team"] for r in rows if r.get("opponent_team")})
    tidx = {t: i for i, t in enumerate(teams)}

    def row_for(r):
        pos, wk = r["position"], int(r["week"])
        opp = tidx.get(r["opponent_team"], -1)
        pts = round(points(r), 1)
        tds = int(num(r["passing_tds"]) + num(r["rushing_tds"]) + num(r["receiving_tds"]))
        if pos == "QB":
            tail = [int(num(r["attempts"])), int(num(r["passing_yards"])), int(num(r["passing_tds"])),
                    int(num(r["carries"])), int(num(r["rushing_yards"]))]
        elif pos == "RB":
            tail = [int(num(r["carries"])), int(num(r["rushing_yards"])),
                    int(num(r["targets"])), int(num(r["receptions"])), int(num(r["receiving_yards"]))]
        else:
            tail = [int(num(r["targets"])), int(num(r["receptions"])),
                    int(num(r["receiving_yards"])), int(num(r["receiving_air_yards"]))]
        return [wk, opp, pts, tds] + tail

    by = collections.defaultdict(list)
    pos_of = {}
    for r in rows:
        n = normalize(r["player_display_name"])
        if n not in draft:
            continue
        by[n].append(row_for(r))
        pos_of[n] = r["position"]

    # AN EMPTY BUILD MUST REPORT ZERO WEEKS. `or [0]` gave weeks_covered = 1 on a
    # header-only input, which would make the 2026 placeholder read as LIVE and
    # let an empty file outrank the real 2025 season on every card.
    weeks = sorted({int(r["week"]) for r in rows})
    out = {
        "_meta": {
            "season": season,
            "weeks_covered": len(weeks),
            "max_week": max(weeks) if weeks else 0,
            # vintageLabel() prints "through W18" unless a season declares itself
            # finished. An 18-week regular season is complete, and labelling a
            # closed book as in-progress is the vintage trap in miniature.
            "season_complete": bool(weeks) and max(weeks) >= 18,
            "teams": teams,
            "scoring": "half-PPR, 4pt passing TD",
            "bands": {"spike": 18, "usable": 10, "dud": 5},
            "cols": {
                "QB": ["week", "opp", "pts", "tds", "att", "pass_yds", "pass_td", "car", "rush_yds"],
                "RB": ["week", "opp", "pts", "tds", "car", "rush_yds", "tgt", "rec", "rec_yds"],
                "WR": ["week", "opp", "pts", "tds", "tgt", "rec", "rec_yds", "air_yds"],
                "TE": ["week", "opp", "pts", "tds", "tgt", "rec", "rec_yds", "air_yds"],
            },
        }
    }
    for n, games in by.items():
        out[n] = {"pos": pos_of[n], "g": sorted(games)}

    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, separators=(",", ":"))
    total = sum(len(g) for g in by.values())
    import os
    print(f"{out_path}: {len(by)} players, {total} games, weeks 1-{max(weeks) if weeks else 0}, "
          f"{os.path.getsize(out_path)/1024:.0f} KB")


if __name__ == "__main__":
    main()
