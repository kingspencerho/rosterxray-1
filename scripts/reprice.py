#!/usr/bin/env python3
"""Score a real 2026 stat line under a LEAGUE's actual scoring, not half-PPR.

Full write-up: ANALYST-REFERENCE.md section 11q.

WHY THIS EXISTS
---------------
The app's expected/actual model is HALF-PPR and says so nowhere in its output.
Two of his leagues pay for things the model cannot even see - completions,
sacks taken, and passing/rushing/receiving first downs are absent from
`gamelogs_*` entirely. Section 11p records a start/sit call that REVERSED once
the real scoring was applied, so this is not a rounding concern.

It reads play-by-play directly, so completions, sacks and first downs are
counted rather than guessed. Everything it prints is MEASURED.

⛔ IT KEYS ON GSIS ID, NEVER ON THE PBP NAME FIELD. Those are abbreviated
("T.Shough"), and section 11h records a whole measurement that came back empty
because it joined on them.

⚠️ THE YARDAGE-BONUS AMBIGUITY IS REAL AND IS NOT RESOLVED HERE. Yahoo prints
"2 points at 300 yards; 3 points at 400 yards" and applies milestone bonuses
CUMULATIVELY. --bonus-top shows the other reading. Where they differ the
output says so, because a silent choice between two readings is the failure
this file exists to stop.

USAGE
  python3 scripts/reprice.py --selftest
  python3 scripts/reprice.py --league jfl3 "Tyler Shough" "Carson Wentz"
  python3 scripts/reprice.py --league battleroyale --week 1 "Malik Willis"
"""
import argparse
import json
import os
import sys

# ---------------------------------------------------------------- leagues ---
# Transcribed from the settings pages he sent. A value absent here is zero.
LEAGUES = {
    # league 967682. Passing TDs 5, INT -2, and SACKS -1.5, which no other
    # league of his charges for at all.
    "jfl3": {
        "label": "JFL #3 (967682)",
        "completion": 0.1, "pass_yd": 1 / 25, "pass_td": 5, "int": -2,
        "sack": -1.5,
        "pass_yd_bonus": [(300, 2), (400, 3)],
        "rush_yd": 1 / 10, "rush_td": 6,
        "rush_yd_bonus": [(100, 1), (150, 1.5), (200, 2.5)],
        "rec": 1, "rec_yd": 1 / 10, "rec_td": 6,
        "rec_yd_bonus": [(100, 1), (150, 1.5), (200, 2.5)],
        "fumble": -1, "fumble_lost": -2, "pick6": -3,
        "comp_40": 1.5, "pass_td_40": 2, "run_40": 1, "rush_td_40": 1,
        "rec_40": 1.5, "rec_td_40": 1,
        "pass_1d": 0.1, "rec_1d": 0.1, "rush_1d": 0.1,
    },
    # league 468496. HALF PPR - the only one of his that is - plus a small
    # bonus on 40+ yard TDs only. Otherwise Yahoo standard.
    "footballbaybee": {
        "label": "Football Baybee (468496)",
        "completion": 0, "pass_yd": 1 / 25, "pass_td": 4, "int": -1,
        "sack": 0, "pass_yd_bonus": [],
        "rush_yd": 1 / 10, "rush_td": 6, "rush_yd_bonus": [],
        "rec": 0.5, "rec_yd": 1 / 10, "rec_td": 6, "rec_yd_bonus": [],
        "fumble": 0, "fumble_lost": -2, "pick6": 0,
        "comp_40": 0, "pass_td_40": 1, "run_40": 0, "rush_td_40": 1,
        "rec_40": 0, "rec_td_40": 1,
        "pass_1d": 0, "rec_1d": 0, "rush_1d": 0,
    },
    # league 972885. Full PPR, SIX-point passing TDs, and a soft fumble rule.
    # No completions, no first downs, no yardage or 40+ yard-play bonuses.
    "jfl2": {
        "label": "JFL #2 (972885)",
        "completion": 0, "pass_yd": 1 / 25, "pass_td": 6, "int": -1,
        "sack": 0, "pass_yd_bonus": [],
        "rush_yd": 1 / 10, "rush_td": 6, "rush_yd_bonus": [],
        "rec": 1, "rec_yd": 1 / 10, "rec_td": 6, "rec_yd_bonus": [],
        "fumble": 0, "fumble_lost": -1, "pick6": 0,
        "comp_40": 0, "pass_td_40": 0, "run_40": 0, "rush_td_40": 0,
        "rec_40": 0, "rec_td_40": 0,
        "pass_1d": 0, "rec_1d": 0, "rush_1d": 0,
    },
    # league 15263. First downs pay FIVE TIMES what they do above, and there
    # is no sack penalty at all - which is why the same two players rank
    # differently in the two leagues.
    "battleroyale": {
        "label": "2QB Battle Royale (15263)",
        "completion": 0.1, "pass_yd": 1 / 25, "pass_td": 4, "int": -1,
        "sack": 0, "pass_yd_bonus": [],
        "rush_yd": 1 / 10, "rush_td": 6, "rush_yd_bonus": [],
        "rec": 1, "rec_yd": 1 / 10, "rec_td": 6, "rec_yd_bonus": [],
        "fumble": 0, "fumble_lost": -2, "pick6": -2,
        "comp_40": 1, "pass_td_40": 2, "run_40": 1, "rush_td_40": 2,
        "rec_40": 1, "rec_td_40": 2,
        "pass_1d": 0, "rec_1d": 0.5, "rush_1d": 0.5,
    },
}


def bonus(total, tiers, top_only=False):
    """Milestone bonuses. Yahoo stacks them; --bonus-top takes the best only."""
    hit = [pts for thresh, pts in tiers if total >= thresh]
    if not hit:
        return 0.0
    return max(hit) if top_only else sum(hit)


def score(s, cfg, top_only=False):
    """A stat dict -> (points, itemised lines). Every term is explicit."""
    L = []

    def add(label, n, per):
        v = n * per
        if n or v:
            L.append((label, n, per, v))
        return v

    t = 0.0
    t += add("completions", s["comp"], cfg["completion"])
    t += add("passing yards", s["pass_yd"], cfg["pass_yd"])
    b = bonus(s["pass_yd"], cfg.get("pass_yd_bonus", []), top_only)
    if b:
        L.append(("  passing-yard bonus", s["pass_yd"], None, b))
        t += b
    t += add("passing TDs", s["pass_td"], cfg["pass_td"])
    t += add("interceptions", s["int"], cfg["int"])
    t += add("sacks taken", s["sack"], cfg["sack"])
    t += add("passing 1st downs", s["pass_1d"], cfg["pass_1d"])
    t += add("40+ yd completions", s["comp_40"], cfg["comp_40"])
    t += add("40+ yd passing TDs", s["pass_td_40"], cfg["pass_td_40"])
    t += add("rushing yards", s["rush_yd"], cfg["rush_yd"])
    b = bonus(s["rush_yd"], cfg.get("rush_yd_bonus", []), top_only)
    if b:
        L.append(("  rushing-yard bonus", s["rush_yd"], None, b))
        t += b
    t += add("rushing TDs", s["rush_td"], cfg["rush_td"])
    t += add("rushing 1st downs", s["rush_1d"], cfg["rush_1d"])
    t += add("40+ yd runs", s["run_40"], cfg["run_40"])
    t += add("40+ yd rushing TDs", s["rush_td_40"], cfg["rush_td_40"])
    t += add("receptions", s["rec"], cfg["rec"])
    t += add("receiving yards", s["rec_yd"], cfg["rec_yd"])
    b = bonus(s["rec_yd"], cfg.get("rec_yd_bonus", []), top_only)
    if b:
        L.append(("  receiving-yard bonus", s["rec_yd"], None, b))
        t += b
    t += add("receiving TDs", s["rec_td"], cfg["rec_td"])
    t += add("receiving 1st downs", s["rec_1d"], cfg["rec_1d"])
    t += add("40+ yd receptions", s["rec_40"], cfg["rec_40"])
    t += add("40+ yd receiving TDs", s["rec_td_40"], cfg["rec_td_40"])
    t += add("fumbles", s["fum"], cfg["fumble"])
    t += add("fumbles lost", s["fum_lost"], cfg["fumble_lost"])
    t += add("pick sixes thrown", s["pick6"], cfg["pick6"])
    return round(t, 2), L


EMPTY = dict(comp=0, pass_yd=0, pass_td=0, int=0, sack=0, pass_1d=0, comp_40=0,
             pass_td_40=0, rush_yd=0, rush_td=0, rush_1d=0, run_40=0,
             rush_td_40=0, rec=0, rec_yd=0, rec_td=0, rec_1d=0, rec_40=0,
             rec_td_40=0, fum=0, fum_lost=0, pick6=0)


def selftest():
    fails = 0

    def chk(label, cond, got=""):
        nonlocal fails
        print("  %s   %s%s" % ("ok  " if cond else "FAIL", label,
                               "" if cond else "  -> %s" % got))
        if not cond:
            fails += 1

    cfg = LEAGUES["jfl3"]

    # Hand-computed: 30 comp, 410 yd, 3 TD, 1 INT, 2 sacks, 18 pass 1st downs.
    #   comp    30 * 0.1  =  3.0
    #   yards  410 / 25   = 16.4   + bonus 2 (300) + 3 (400) = 5.0
    #   TDs      3 * 5    = 15.0
    #   INT      1 * -2   = -2.0
    #   sacks    2 * -1.5 = -3.0
    #   1st dn  18 * 0.1  =  1.8
    #                     = 36.2
    s = dict(EMPTY, comp=30, pass_yd=410, pass_td=3, int=1, sack=2, pass_1d=18)
    pts, _ = score(s, cfg)
    chk("a hand-computed QB line scores exactly 36.2", abs(pts - 36.2) < 0.01, pts)

    # the SAME line in the other league, which has no sack penalty and pays
    # 4 per TD - it must come out DIFFERENT, or the configs are not wired.
    p2, _ = score(s, LEAGUES["battleroyale"])
    chk("the same line scores differently in the other league", abs(p2 - pts) > 1, p2)
    # ⭐ AND THE DIRECTION IS NOT THE OBVIOUS ONE. The first version of this
    # assertion guessed that the league WITHOUT a sack penalty must score
    # higher. It does not: JFL3 pays 5 per passing TD against 4, stacks +5 of
    # yardage bonuses, and pays for passing first downs, which together dwarf
    # its -3 of sacks. The guess was wrong and the arithmetic was right.
    # So the real property to pin is that the gap SURVIVES removing sacks -
    # i.e. these configs differ structurally, not by one rule.
    nosack = dict(s, sack=0)
    j_ns, _ = score(nosack, cfg)
    b_ns, _ = score(nosack, LEAGUES["battleroyale"])
    chk("the leagues still disagree with sacks removed, so it is not one rule",
        abs(j_ns - b_ns) > 1, "%s vs %s" % (j_ns, b_ns))

    # ⭐ the bonus reading actually changes the answer, so it cannot be silent
    top, _ = score(s, cfg, top_only=True)
    chk("cumulative vs top-only bonuses differ by exactly 2.0",
        abs((pts - top) - 2.0) < 0.01, "%s vs %s" % (pts, top))

    # a sack must COST points, not be ignored
    a, _ = score(dict(EMPTY, comp=10, pass_yd=100), cfg)
    b, _ = score(dict(EMPTY, comp=10, pass_yd=100, sack=4), cfg)
    chk("four sacks cost exactly 6.0", abs((a - b) - 6.0) < 0.01, a - b)

    # MUST-FAIL: an empty line must be zero, not a silent nonzero from a
    # default creeping into the config.
    z, _ = score(dict(EMPTY), cfg)
    chk("an empty stat line scores exactly 0", z == 0, z)

    print("\n" + ("all passed" if not fails else "%d FAILURE(S)" % fails))
    return 1 if fails else 0


def pull(names, week, season=2026):
    """Real stats from play-by-play, joined on GSIS id."""
    import nflreadpy as nfl
    import polars as pl

    xw = json.load(open(os.path.join("grading", "data", "player_ids.json")))

    def norm(n):
        n = n.lower().strip()
        for c in ".,'":
            n = n.replace(c, "")
        return " ".join(n.replace("-", " ").split())

    ids = {}
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
        ids[n] = i

    p = nfl.load_pbp([season])
    if week:
        p = p.filter(pl.col("week") == week)
    rows = p.to_dicts()

    out = {}
    for n, pid in ids.items():
        s = dict(EMPTY)
        for r in rows:
            if r.get("passer_player_id") == pid:
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
                ry = r.get("rushing_yards") or 0
                s["rush_yd"] += ry
                s["rush_td"] += int(r.get("rush_touchdown") or 0)
                s["rush_1d"] += int(r.get("first_down_rush") or 0)
                if ry >= 40:
                    s["run_40"] += 1
                    if r.get("rush_touchdown"):
                        s["rush_td_40"] += 1
            if r.get("receiver_player_id") == pid:
                gy = r.get("receiving_yards")
                if gy is None:
                    gy = r.get("yards_gained") or 0
                if r.get("complete_pass"):
                    s["rec"] += 1
                    s["rec_yd"] += gy
                    s["rec_td"] += int(r.get("pass_touchdown") or 0)
                    if r.get("first_down_pass"):
                        s["rec_1d"] += 1
                    if gy >= 40:
                        s["rec_40"] += 1
                        if r.get("pass_touchdown"):
                            s["rec_td_40"] += 1
            if r.get("fumbled_1_player_id") == pid:
                s["fum"] += 1
                s["fum_lost"] += int(r.get("fumble_lost") or 0)
        out[n] = s
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--league", default="jfl3", choices=sorted(LEAGUES))
    ap.add_argument("--week", type=int, default=None)
    ap.add_argument("--bonus-top", action="store_true",
                    help="best milestone only, instead of Yahoo's cumulative")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        sys.exit(selftest())
    if not a.names:
        sys.exit("name at least one player.")

    cfg = LEAGUES[a.league]
    print("scoring: %s   week %s\n" % (cfg["label"], a.week or "1+2"))
    stats = pull(a.names, a.week)
    totals = {}
    for n in a.names:
        s = stats[n]
        pts, lines = score(s, cfg, a.bonus_top)
        alt, _ = score(s, cfg, not a.bonus_top)
        totals[n] = pts
        print("=" * 62)
        print("%s   %s PTS" % (n.upper(), pts))
        print("=" * 62)
        for label, cnt, per, val in lines:
            print("  %-24s %8s %10s %9.2f"
                  % (label, round(cnt, 1),
                     "" if per is None else round(per, 3), val))
        if abs(alt - pts) > 0.001:
            print("  %-24s %29.2f" % ("[other bonus reading]", alt))
    if len(totals) > 1:
        o = sorted(totals.items(), key=lambda x: -x[1])
        print("\n  %s by %.2f" % (o[0][0], o[0][1] - o[1][1]))
    print("\n  MEASURED from play-by-play. Counts, not estimates.")
    print("  A past line is not a forecast - it prices what already happened.")


if __name__ == "__main__":
    main()
