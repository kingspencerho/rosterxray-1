#!/usr/bin/env python3
"""How often does this QB post a FLOOR game, and how often a disaster?

His question, and it is the right one: a mean is useless for a start/sit call
in a league that charges -1.5 a sack and -2 an interception. What decides it is
the SHAPE of the distribution and how much of the downside is penalty-driven.

WHY A SEPARATE SCRIPT. reprice.py answers "what did this line score". This
answers "what does this player's week-to-week spread look like under these
rules". Same question one level up, and it needs every game rather than one.

⛔ IT IMPORTS reprice.py's SCORING RATHER THAN RESTATING IT. Two copies of a
scoring table drift, and this repo has paid for that class a dozen times. The
league configs and score() come from there; only the aggregation is new.

⚠️ WHAT IT CANNOT DO. A distribution is a description of games already played,
never a forecast. It says what his spread HAS been, and a role change, a new
offensive line or a different opponent can move it. Read it as the base rate
you are betting against, not as a projection.

USAGE
  python3 scripts/qb-floor.py --league jfl3 --season 2025 "Tyler Shough"
  python3 scripts/qb-floor.py --league jfl3 --defense BAL CHI
  python3 scripts/qb-floor.py --selftest
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reprice import LEAGUES, EMPTY, score  # noqa: E402  single scoring definition


def norm(n):
    n = (n or "").lower().strip()
    for c in ".,'":
        n = n.replace(c, "")
    return " ".join(n.replace("-", " ").split())


def resolve(names):
    xw = json.load(open(os.path.join("grading", "data", "player_ids.json")))
    out = {}
    for n in names:
        k = norm(n)
        i = xw["by_name"].get(k)
        if not i:
            for kk, vv in xw["by_name_pos"].items():
                if kk.split("|")[0] == k:
                    i = vv
                    break
        if not i:
            sys.exit("cannot resolve %r through the crosswalk." % n)
        out[n] = i
    return out


def per_game(rows, pid):
    """-> {(season, week): stat dict}. Only games he actually threw in."""
    games = {}
    for r in rows:
        key = (r.get("season"), r.get("week"))
        if r.get("passer_player_id") == pid:
            s = games.setdefault(key, dict(EMPTY))
            py = r.get("passing_yards") or 0
            s["comp"] += int(r.get("complete_pass") or 0)
            s["pass_yd"] += py
            s["pass_td"] += int(r.get("pass_touchdown") or 0)
            s["int"] += int(r.get("interception") or 0)
            s["sack"] += int(r.get("sack") or 0)
            s["pass_1d"] += int(r.get("first_down_pass") or 0)
            if r.get("complete_pass") and py >= 40:
                s["comp_40"] += 1
                if r.get("pass_touchdown"):
                    s["pass_td_40"] += 1
        if r.get("rusher_player_id") == pid:
            s = games.setdefault(key, dict(EMPTY))
            ry = r.get("rushing_yards") or 0
            s["rush_yd"] += ry
            s["rush_td"] += int(r.get("rush_touchdown") or 0)
            s["rush_1d"] += int(r.get("first_down_rush") or 0)
            if ry >= 40:
                s["run_40"] += 1
        if r.get("fumbled_1_player_id") == pid:
            s = games.setdefault(key, dict(EMPTY))
            s["fum"] += 1
            s["fum_lost"] += int(r.get("fumble_lost") or 0)
    # a QB with only a kneel-down is not a game he played
    return {k: v for k, v in games.items() if v["comp"] or v["sack"] or v["pass_yd"]}


def penalty_of(s, cfg):
    """Points given BACK - the half of the line this league punishes."""
    return -(s["sack"] * cfg["sack"] + s["int"] * cfg["int"]
             + s["fum"] * cfg["fumble"] + s["fum_lost"] * cfg["fumble_lost"]
             + s["pick6"] * cfg["pick6"])


def selftest():
    fails = 0

    def chk(label, cond, got=""):
        nonlocal fails
        print("  %s   %s%s" % ("ok  " if cond else "FAIL", label,
                               "" if cond else "  -> %s" % got))
        if not cond:
            fails += 1

    cfg = LEAGUES["jfl3"]
    # 5 sacks, 2 INT, 2 fumbles 1 lost = 7.5 + 4 + 2 + 2 = 15.5 given back
    s = dict(EMPTY, sack=5, int=2, fum=2, fum_lost=1)
    chk("penalty_of sums the four charge types", abs(penalty_of(s, cfg) - 15.5) < 0.01,
        penalty_of(s, cfg))
    # a league that charges nothing gives nothing back
    chk("a league with no sack charge reports less penalty",
        penalty_of(s, LEAGUES["battleroyale"]) < penalty_of(s, cfg))
    chk("...and jfl2 charges nothing for sacks at all",
        abs(penalty_of(dict(EMPTY, sack=5), LEAGUES["jfl2"])) < 0.01)
    # a kneel-down game must be dropped, not scored as a zero
    g = per_game([{"season": 2025, "week": 1, "rusher_player_id": "x",
                   "rushing_yards": -1}], "x")
    chk("a rush-only kneel is not counted as a passing game", not g, g)
    print("\n" + ("all passed" if not fails else "%d FAILURE(S)" % fails))
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--league", default="jfl3", choices=sorted(LEAGUES))
    ap.add_argument("--season", type=int, nargs="+", default=[2025, 2026])
    ap.add_argument("--defense", nargs="+", default=[])
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        sys.exit(selftest())

    import nflreadpy as nfl
    import polars as pl

    cfg = LEAGUES[a.league]
    print("scoring: %s\n" % cfg["label"])
    print("loading play-by-play for %s ..." % ", ".join(map(str, a.season)))
    p = nfl.load_pbp(a.season).filter(pl.col("season_type") == "REG")
    rows = p.to_dicts()

    for n in a.names:
        pid = resolve([n])[n]
        games = per_game(rows, pid)
        if not games:
            print("%s: no games on file for those seasons.\n" % n.upper())
            continue
        scored = []
        for key in sorted(games):
            s = games[key]
            pts, _ = score(s, cfg)
            scored.append((key, pts, penalty_of(s, cfg), s))

        vals = sorted(x[1] for x in scored)
        n_g = len(vals)

        def pct(f):
            return sum(1 for v in vals if f(v)) / n_g * 100

        print("=" * 72)
        print("%s   %d games" % (n.upper(), n_g))
        print("=" * 72)
        print("  week-by-week (season.week  points  penalty given back)")
        for (season, wk), pts, pen, s in scored:
            bar = "#" * max(0, int(round(pts / 2)))
            print("    %d.%-2s %7.1f  (-%4.1f)  %s" % (season, wk, pts, pen, bar))
        print("\n  median %.1f   mean %.1f   low %.1f   high %.1f"
              % (vals[n_g // 2], sum(vals) / n_g, vals[0], vals[-1]))
        print("  %5.0f%% of games at 20+      (a good week)" % pct(lambda v: v >= 20))
        print("  %5.0f%% of games at 15+      (a usable floor)" % pct(lambda v: v >= 15))
        print("  %5.0f%% of games under 12    (a hole to dig out of)" % pct(lambda v: v < 12))
        print("  %5.0f%% of games under 8     (a disaster)" % pct(lambda v: v < 8))
        pens = [x[2] for x in scored]
        print("  penalties given back: median %.1f, worst %.1f, %.0f%% of games over 6"
              % (sorted(pens)[n_g // 2], max(pens),
                 sum(1 for x in pens if x > 6) / n_g * 100))
        print()

    for team in a.defense:
        d = [r for r in rows if r.get("defteam") == team]
        by = {}
        for r in d:
            k = (r.get("season"), r.get("week"))
            g = by.setdefault(k, {"sack": 0, "int": 0, "pass": 0})
            g["sack"] += int(r.get("sack") or 0)
            g["int"] += int(r.get("interception") or 0)
            g["pass"] += int(r.get("pass_attempt") or 0)
        if not by:
            print("%s: no rows.\n" % team)
            continue
        gs = len(by)
        sk = sum(g["sack"] for g in by.values())
        it = sum(g["int"] for g in by.values())
        pa = sum(g["pass"] for g in by.values())
        print("=" * 72)
        print("%s DEFENCE   %d games" % (team, gs))
        print("=" * 72)
        print("  sacks %.2f/gm   interceptions %.2f/gm   sack rate %.1f%% of dropbacks"
              % (sk / gs, it / gs, 100.0 * sk / max(1, pa + sk)))
        print("  cost to a QB in this league: %.1f pts/gm from sacks and picks alone"
              % (sk / gs * -cfg["sack"] + it / gs * -cfg["int"]))
        print()


if __name__ == "__main__":
    main()
