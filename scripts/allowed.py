#!/usr/bin/env python3
"""
allowed.py - what each defense has ALLOWED to each position this season, from public data.

The question it answers: "if I start a running back against DAL, what do backs do against
DAL?" Points allowed per game (half PPR, full PPR or standard) with its league rank, plus the
raw counting stats behind it: targets, receptions, yards, touchdowns, carries, and the last
three games on their own.

WHY PUBLIC DATA AND NOT THE YAHOO "POINTS AGAINST" PAGE (Oct 25, 2026, his question)
  Yahoo's page is built from his league's scoring, and the developer agreement bars storing
  or caching Yahoo data (cl. 2.c.vii), which rules out tracking it week over week. Driving
  his logged-in browser to read it breaks Yahoo's Terms (section 2.4(i)). The nflverse weekly
  player file carries every line Yahoo's page is built from, so this rebuilds the same table
  in any scoring, with the counting stats Yahoo's page does not show.

USAGE
  python scripts/allowed.py DAL RB              one defense, one position
  python scripts/allowed.py DAL                 one defense, all four positions
  python scripts/allowed.py --rank RB           all 32 defenses for one position
  add --scoring full | half | std   (default half)   and --csv <file> to use a local copy
  python scripts/allowed.py --selftest

  Data: stats_player_week_<season>.csv from nflverse (downloaded to the temp folder, re-fetched
  after 12 hours). Position comes from the file. Each defense's games count once per week played.
  ponytail: fumbles lost and 2-pt conversions are left out of scoring; add if a league needs them.
"""
import csv, io, os, sys, tempfile, time, urllib.request
from collections import defaultdict

SEASON = 2026
URL = f"https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{SEASON}.csv"
POS = ("QB", "RB", "WR", "TE")
REC_PTS = {"half": 0.5, "full": 1.0, "std": 0.0}


def num(r, k):
    try:
        return float(r.get(k) or 0)
    except ValueError:
        return 0.0


def points(r, scoring):
    return (num(r, "passing_yards") * 0.04 + num(r, "passing_tds") * 4 - num(r, "passing_interceptions") * 2
            + num(r, "rushing_yards") * 0.1 + num(r, "rushing_tds") * 6
            + num(r, "receiving_yards") * 0.1 + num(r, "receiving_tds") * 6
            + num(r, "receptions") * REC_PTS[scoring])


def load(path=None):
    if not path:
        path = os.path.join(tempfile.gettempdir(), f"stats_player_week_{SEASON}.csv")
        if not os.path.exists(path) or time.time() - os.path.getmtime(path) > 12 * 3600:
            urllib.request.urlretrieve(URL, path)
    with open(path, encoding="utf-8") as fh:
        return [r for r in csv.DictReader(fh) if r.get("season_type", "REG") == "REG" and r.get("position") in POS]


STATS = ["pts", "targets", "receptions", "receiving_yards", "receiving_tds", "carries", "rushing_yards",
         "rushing_tds", "attempts", "completions", "passing_yards", "passing_tds", "passing_interceptions"]


def table(rows, scoring):
    """{(defense, pos): {"weeks": {week: {stat: total}}}}"""
    t = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    games = defaultdict(set)
    for r in rows:
        d, w = r["opponent_team"], int(r["week"])
        games[d].add(w)
        cell = t[(d, r["position"])][w]
        cell["pts"] += points(r, scoring)
        for k in STATS[1:]:
            cell[k] += num(r, k)
    return t, games


def per_game(t, games, d, pos, weeks=None):
    ws = sorted(games[d])
    if weeks:
        ws = ws[-weeks:]
    out = {k: sum(t[(d, pos)][w][k] for w in ws) / max(len(ws), 1) for k in STATS}
    out["g"] = len(ws)
    return out


def rank(t, games, pos, d):
    order = sorted(games, key=lambda x: -per_game(t, games, x, pos)["pts"])
    return order.index(d) + 1


def show(t, games, d, pos, scoring):
    s, l3 = per_game(t, games, d, pos), per_game(t, games, d, pos, 3)
    lg = sum(per_game(t, games, x, pos)["pts"] for x in games) / len(games)
    print(f"\n{pos}s vs {d}  ({s['g']} games, {scoring} PPR)   {s['pts']:.1f} pts/g   rank {rank(t, games, pos, d)}/32 "
          f"(1 = most allowed)   league avg {lg:.1f}   last 3: {l3['pts']:.1f}")
    if pos == "QB":
        print(f"   per game: {s['completions']:.1f}/{s['attempts']:.1f}, {s['passing_yards']:.0f} pass yds, "
              f"{s['passing_tds']:.1f} pass TD, {s['passing_interceptions']:.1f} INT, {s['carries']:.1f} carries for {s['rushing_yards']:.0f}")
    else:
        print(f"   per game: {s['targets']:.1f} targets, {s['receptions']:.1f} rec, {s['receiving_yards']:.0f} rec yds, "
              f"{s['receiving_tds']:.2f} rec TD | {s['carries']:.1f} carries, {s['rushing_yards']:.0f} rush yds, {s['rushing_tds']:.2f} rush TD")
    by = "  ".join(f"W{w} {t[(d, pos)][w]['pts']:.1f}" for w in sorted(games[d]))
    print(f"   by week: {by}")


def selftest():
    rows = [
        {"opponent_team": "AAA", "week": "1", "position": "RB", "receptions": "4", "receiving_yards": "30", "rushing_yards": "70", "rushing_tds": "1"},
        {"opponent_team": "AAA", "week": "2", "position": "RB", "receptions": "2", "receiving_yards": "10", "rushing_yards": "40"},
        {"opponent_team": "BBB", "week": "1", "position": "RB", "receptions": "1", "receiving_yards": "5", "rushing_yards": "20"},
    ]
    t, g = table(rows, "half")
    a = per_game(t, g, "AAA", "RB")
    assert abs(a["pts"] - ((0.5*4 + 3 + 7 + 6) + (0.5*2 + 1 + 4)) / 2) < 1e-9, a["pts"]
    assert a["receptions"] == 3 and rank(t, g, "RB", "AAA") == 1
    assert abs(points(rows[0], "full") - points(rows[0], "std") - 4) < 1e-9
    print("selftest ok")


def main(argv):
    if "--selftest" in argv:
        return selftest()
    scoring = argv[argv.index("--scoring") + 1] if "--scoring" in argv else "half"
    path = argv[argv.index("--csv") + 1] if "--csv" in argv else None
    args = [a for i, a in enumerate(argv) if not a.startswith("--") and (i == 0 or argv[i - 1] not in ("--scoring", "--csv"))]
    t, games = table(load(path), scoring)
    if "--rank" in argv:
        pos = args[0].upper()
        for i, d in enumerate(sorted(games, key=lambda x: -per_game(t, games, x, pos)["pts"]), 1):
            s = per_game(t, games, d, pos)
            print(f"{i:2d}. {d:4s} {s['pts']:5.1f} pts/g   {s['receptions']:4.1f} rec  {s['receiving_yards']:5.0f} rec yds  "
                  f"{s['carries']:4.1f} car  {s['rushing_yards']:5.0f} rush yds   ({s['g']} g)")
        return
    d = args[0].upper()
    if d not in games:
        sys.exit(f"unknown team {d}; teams: {' '.join(sorted(games))}")
    for pos in ([args[1].upper()] if len(args) > 1 else POS):
        show(t, games, d, pos, scoring)


if __name__ == "__main__":
    main(sys.argv[1:])
