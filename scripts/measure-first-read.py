#!/usr/bin/env python3
"""measure-first-read.py - does the first-read signal REPEAT, and is it NEW?

THREE questions, and the third one broke the headline finding on its first run.

1. DOES IT REPEAT? Same player, consecutive seasons. Every input in this app
   carries an r; a percentile with no r is the exact thing 11g criticised in an
   outside analyst's tables, and importing his metric without importing the
   discipline would be the worst of both.

2. ⭐⭐ IS IT A RESTATEMENT? routes_2025 measures route share against snap share
   at r=0.957 and concludes it "must never be presented as a separate signal."
   If first-read share just restates target share it adds a column and no
   information. This measures the overlap before anything is allowed to ship.

3. IS IT JUST POSITION? The pooled numbers said fr_rate repeats at 0.908,
   which would have made it the stickiest input measured anywhere in this app.
   It is not. Backs check down (median fr_rate 0.19), receivers are the design
   (0.73), tight ends sit between - so pooling builds three clusters and the
   correlation measures "positions stay positions". WITHIN POSITION it falls to
   0.567 at WR, 0.400 at TE and 0.244 at RB.

   This is the repo rule working: name the search that would falsify the
   conclusion and run that one too. One run, and a headline number about to be
   quoted as a finding turned out to be a confound.

    python scripts/measure-first-read.py [--selftest] [--dir <f>] [--players <f>]
"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
SCRATCH = sys.argv[sys.argv.index("--dir") + 1] if "--dir" in sys.argv else os.environ.get(
    "FR_DIR", os.path.join(os.path.dirname(HERE), "grading", "data"))
MIN_TGT = 30          # a share built on five targets is noise wearing a percentage
SEASONS = (2022, 2023, 2024, 2025)


def pearson(xs, ys):
    n = len(xs)
    if n < 8:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    num = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
    dx = sum((a - mx) ** 2 for a in xs) ** 0.5
    dy = sum((b - my) ** 2 for b in ys) ** 0.5
    return round(num / (dx * dy), 3) if dx and dy else None


def _positions():
    """gsis id -> position, from the nflverse players release if it is to hand."""
    import csv
    import gzip
    p = None
    if "--players" in sys.argv:
        p = sys.argv[sys.argv.index("--players") + 1]
    else:
        for cand in (os.path.join(SCRATCH, "players.csv.gz"),
                     os.path.join(os.path.dirname(HERE), "grading", "data", "players.csv.gz")):
            if os.path.exists(cand):
                p = cand
                break
    if not p or not os.path.exists(p):
        return {}
    csv.field_size_limit(10 ** 7)
    op = gzip.open if p.endswith(".gz") else open
    out = {}
    with op(p, "rt", encoding="utf-8", errors="replace") as fh:
        for r in csv.DictReader(fh):
            if r.get("gsis_id"):
                out[r["gsis_id"]] = r.get("position")
    return out


def load(season):
    p = os.path.join(SCRATCH, "first_read_%d.json" % season)
    if not os.path.exists(p):
        return None
    return json.load(open(p, encoding="utf-8"))["players"]


def selftest():
    ok = True

    def check(label, cond, why=""):
        nonlocal ok
        print("  %s  %s%s" % ("ok  " if cond else "FAIL", label,
                              "" if cond or not why else "   <- " + why))
        ok = ok and bool(cond)

    check("a perfect line correlates at 1.0", pearson(list(range(20)), list(range(20))) == 1.0)
    check("a reversed line correlates at -1.0", pearson(list(range(20)), list(range(19, -1, -1))) == -1.0)
    # ⛔ MUST-FAIL CASE. A correlation routine that returns something for noise
    # would manufacture a finding out of nothing.
    import random
    random.seed(7)
    a = [random.random() for _ in range(200)]
    b = [random.random() for _ in range(200)]
    r = pearson(a, b)
    check("pure noise stays near zero", abs(r) < 0.2, "got %s" % r)
    check("too few pairs returns None, never a number", pearson([1, 2, 3], [1, 2, 3]) is None)
    print("\n%s  measure-first-read" % ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


def main():
    if "--selftest" in sys.argv:
        sys.exit(selftest())

    data = {s: load(s) for s in SEASONS}
    missing = [s for s, d in data.items() if not d]
    if missing:
        sys.exit("missing built seasons: %s (build them first, or pass --dir)" % missing)

    print("DOES FIRST-READ SHARE REPEAT?   min %d targets in BOTH seasons\n" % MIN_TGT)
    print("  %-12s %5s %8s %8s" % ("transition", "n", "fr_share", "fr_rate"))
    shares, rates = [], []
    for a, b in zip(SEASONS, SEASONS[1:]):
        pa, pb = data[a], data[b]
        keys = [k for k in pa if k in pb
                and (pa[k]["tgt"] or 0) >= MIN_TGT and (pb[k]["tgt"] or 0) >= MIN_TGT
                and pa[k]["fr_share"] is not None and pb[k]["fr_share"] is not None]
        rs = pearson([pa[k]["fr_share"] for k in keys], [pb[k]["fr_share"] for k in keys])
        rr = pearson([pa[k]["fr_rate"] for k in keys], [pb[k]["fr_rate"] for k in keys])
        shares.append(rs); rates.append(rr)
        print("  %d>%-7d %5d %8s %8s" % (a, b, len(keys), rs, rr))
    ms = round(sum(x for x in shares if x is not None) / len([x for x in shares if x is not None]), 3)
    mr = round(sum(x for x in rates if x is not None) / len([x for x in rates if x is not None]), 3)
    print("  %-12s %5s %8s %8s" % ("MEAN", "", ms, mr))

    print("\n⭐ IS IT NEW, OR A RESTATEMENT? (same season, against target share)\n")
    print("  %-8s %5s %14s" % ("season", "n", "fr_share vs tgt_sh"))
    for s in SEASONS:
        p = data[s]
        keys = [k for k in p if (p[k]["tgt"] or 0) >= MIN_TGT and p[k]["fr_share"] is not None]
        # target share is not in this file, so the comparable is his share of
        # his team's TARGETS, rebuilt here from the same rows.
        team_tgt = {}
        for k in p:
            team_tgt[p[k]["team"]] = team_tgt.get(p[k]["team"], 0) + (p[k]["tgt"] or 0)
        xs = [p[k]["fr_share"] for k in keys]
        ys = [(p[k]["tgt"] or 0) / team_tgt[p[k]["team"]] for k in keys]
        print("  %-8d %5d %14s" % (s, len(keys), pearson(xs, ys)))

    # ---- 3. THE FALSIFYING CHECK ----------------------------------------
    # Nothing above separates a player signal from a position one, and the
    # pooled figure is the one that looks impressive.
    print(chr(10) + "IS IT JUST POSITION? (same transitions, WITHIN each position)" + chr(10))
    pos = _positions()
    if not pos:
        print("  players file not found - pass --players <players.csv.gz> to run this.")
    else:
        print("  %-8s %5s %10s" % ("within", "n", "fr_rate r"))
        for P in ("WR", "TE", "RB"):
            xs, ys = [], []
            for a, b in zip(SEASONS, SEASONS[1:]):
                pa, pb = data[a], data[b]
                for k in pa:
                    if k in pb and (pa[k]["tgt"] or 0) >= MIN_TGT and (pb[k]["tgt"] or 0) >= MIN_TGT:
                        if pos.get(pa[k].get("id")) == P:
                            xs.append(pa[k]["fr_rate"])
                            ys.append(pb[k]["fr_rate"])
            print("  %-8s %5d %10s" % (P, len(xs), pearson(xs, ys)))
        print(chr(10) + "  IF THESE SIT FAR BELOW THE POOLED NUMBER, THE POOLED NUMBER IS")
        print("  MEASURING POSITION AND MUST NEVER BE QUOTED AS A PLAYER SIGNAL.")

    print("\nREAD IT AGAINST THE BAR. Player-level comparisons in this app clear")
    print("noise at roughly r=0.10-0.14 at these sample sizes. And an overlap")
    print("above ~0.95 against target share would make it a RESTATEMENT, which")
    print("is what route share turned out to be against snap share.")


if __name__ == "__main__":
    main()
