#!/usr/bin/env python3
"""Does SCHEDULE-ADJUSTED FPA beat RAW FPA at predicting the rest of the season?

THE ANSWER IS NO, AND THIS SCRIPT IS THE REASON NOTHING SHIPPED.
Full write-up: ANALYST-REFERENCE.md section 2c.

WHY IT EXISTS
-------------
CLAUDE.md and ANALYST-REFERENCE.md have both carried this caveat since Aug 25:

    "These are RAW points allowed, NOT schedule-adjusted. A defence that drew
     Kelce, Bowers and LaPorta looks soft at TE for reasons unrelated to the
     defence."

The caveat is true. It does NOT follow that adjusting helps: the correction is
estimated from the same three-to-eight-game sample it is correcting, so it adds
noise as well as removing a confound. Which effect wins is empirical, and FPA is
a SCORED input - every matchup pill in the app - so it got measured before
anything was built.

THE TEST
--------
For each season, position and cut-week N:

  RAW(D)   mean points allowed per game by defence D over weeks 1..N
  ADJ(D)   the same, minus each opponent offence's own strength at that
           position, LEAVE-ONE-OUT so D's own games never feed the baseline it
           is corrected against
  TARGET   RAW points allowed per game by D over weeks N+1..18, same season

Then correlate each predictor against the target. Higher r wins.

⛔ THE TARGET IS RAW ON PURPOSE. A manager's points are raw. The pill answers
"how many points will my guy score against this defence", not "how good is this
defence in the abstract" - and scoring the target adjusted would be grading the
adjustment against itself.

⛔⛔ WHAT IT FOUND: every position's verdict FLIPS SIGN between one season and
three. TE at cut 3 reads +0.229 on 2025 alone and +0.051 pooled; RB at cut 6
reads -0.180 on 2025 and +0.034 pooled. The per-season swing is 4-8x the effect.
A quantity whose sign depends on which season you measured it in is not an
effect - and 2025 is exactly the season that would have been picked, because it
is the one section 2b used.

⚠️ AND A SECOND FINDING, LARGER THAN THE FIRST: section 2b's headline WR figure
(0.531 through week 3) is ONE SEASON and does not replicate - 2024 is -0.230,
pooled is 0.141, under the 0.355 noise bar. That does NOT pull the live FPA
layer, which stands on his descriptive ruling rather than on the correlation.
See section 2c.

⛔ SCORING IS IMPORTED FROM build-fpa-current.py, NEVER RETYPED. A calibration
that scores differently from the builder it judges is measuring the gap between
two scoring functions - the duplicate-definition class, pointed at a
measurement instead of at code.

USAGE
  python3 scripts/measure-schedule-adjustment.py --draftable        # 3 seasons
  python3 scripts/measure-schedule-adjustment.py 2025 --draftable   # one season
  python3 scripts/measure-schedule-adjustment.py --selftest         # reproduces 2b

  --draftable  restrict to players present in ADP_DATA. This is the population
               section 2b was measured on, and the ONLY mode in which its table
               reproduces. Without it the population is every player in the
               release, which is what build-fpa-current.py actually ships.
  --dir PATH   where the weekly CSVs live (default: system temp)

INPUT - the same release refresh-inseason.sh already downloads:
  curl -sSL -o stats_player_week_2025.csv \
    https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2025.csv
"""
import collections
import csv
import importlib.util
import io
import math
import os
import sys
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_spec = importlib.util.spec_from_file_location(
    "bfc", os.path.join(REPO, "scripts", "build-fpa-current.py"))
bfc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bfc)

POSITIONS = ("QB", "RB", "WR", "TE")
CUTS = (3, 4, 5, 6, 8)
SEASONS = (2023, 2024, 2025)

# ⚠️ n = 31-32 defences, so an r must reach about this to be distinguishable
# from zero at p<0.05. A DIFFERENCE between two r values needs more than this,
# which is why a +0.03 delta below is reported as "no difference".
NOISE_BAR = 0.355

# The published section 2b table, 2025 draftable. --selftest asserts this
# harness still reproduces it; a harness that cannot reproduce the baseline has
# no standing to overturn it.
SEC_2B = {
    ("QB", 3): 0.369, ("QB", 4): 0.332, ("QB", 5): 0.351, ("QB", 6): 0.329, ("QB", 8): 0.266,
    ("RB", 3): -0.123, ("RB", 4): -0.057, ("RB", 5): 0.115, ("RB", 6): 0.148, ("RB", 8): 0.101,
    ("WR", 3): 0.531, ("WR", 4): 0.615, ("WR", 5): 0.569, ("WR", 6): 0.418, ("WR", 8): 0.521,
    ("TE", 3): 0.281, ("TE", 4): 0.314, ("TE", 5): 0.275, ("TE", 6): 0.426, ("TE", 8): 0.322,
}

ADP_POS = bfc.adp_positions(os.path.join(REPO, "App.jsx"))


def csv_for(season, where):
    """The release names it one way and a hand curl often names it another, so
    try the forms that actually turn up rather than failing on spelling."""
    for name in ("stats_player_week_%d.csv" % season,
                 "wk%d.csv" % season,
                 "wk%s.csv" % str(season)[2:]):
        p = os.path.join(where, name)
        if os.path.exists(p):
            return p
    return None


def pearson(xs, ys):
    n = len(xs)
    if n < 3:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sx = sum((x - mx) ** 2 for x in xs)
    sy = sum((y - my) ** 2 for y in ys)
    if sx <= 0 or sy <= 0:
        return None
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / math.sqrt(sx * sy)


def spearman(xs, ys):
    def rank(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        r = [0.0] * len(v)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and v[order[j + 1]] == v[order[i]]:
                j += 1
            avg = (i + j) / 2.0 + 1
            for k in range(i, j + 1):
                r[order[k]] = avg
            i = j + 1
        return r
    return pearson(rank(xs), rank(ys))


def load(path, draftable):
    """-> games[pos][(week, def_team, off_team)] = points that offence's
    players at that position scored in that game."""
    games = {p: collections.defaultdict(float) for p in POSITIONS}
    with io.open(path, encoding="utf-8", newline="") as fh:
        for r in csv.DictReader(fh):
            if r.get("season_type") != "REG":
                continue
            try:
                wk = int(r["week"])
            except (TypeError, ValueError):
                continue
            if wk < 1 or wk > 18:
                continue
            nm = bfc.normalize(r.get("player_display_name") or r.get("player_name") or "")
            # ⚠️ Position from the ADP table where the app has an opinion, same
            # rule build-fpa-current.py uses - Travis Hunter is filed CB by
            # nflverse and his receiving points belong under WR.
            pos = ADP_POS.get(nm) or (r.get("position") or "").upper()
            if pos not in POSITIONS:
                continue
            if draftable and nm not in ADP_POS:
                continue
            off = bfc.TEAM_FIX.get(r.get("team"), r.get("team"))
            dfn = bfc.TEAM_FIX.get(r.get("opponent_team"), r.get("opponent_team"))
            if not off or not dfn:
                continue
            games[pos][(wk, dfn, off)] += bfc.points(r)
    return games


def build(pos, cut, games):
    rows = games[pos]
    early = [(w, d, o, v) for (w, d, o), v in rows.items() if w <= cut]
    late = [(w, d, o, v) for (w, d, o), v in rows.items() if w > cut]
    if not early or not late:
        return {}, {}, {}

    off_games = collections.defaultdict(list)
    for w, d, o, v in early:
        off_games[o].append((d, v))
    league = sum(v for _, _, _, v in early) / len(early)

    def off_strength_excluding(o, skip_def):
        """LEAVE-ONE-OUT. Without it a defence that shut an offence down lowers
        that offence's baseline and is then credited for facing a weak offence -
        it would be corrected against itself."""
        vals = [v for dd, v in off_games.get(o, []) if dd != skip_def]
        return (sum(vals) / len(vals) - league) if vals else None

    raw_acc, adj_acc = collections.defaultdict(list), collections.defaultdict(list)
    for w, d, o, v in early:
        raw_acc[d].append(v)
        s = off_strength_excluding(o, d)
        # ⚠️ No usable baseline -> keep the raw value rather than dropping the
        # game. Dropping shrinks some defences' samples and not others, which is
        # a different bias than the one being removed.
        adj_acc[d].append(v - s if s is not None else v)

    tgt_acc = collections.defaultdict(list)
    for w, d, o, v in late:
        tgt_acc[d].append(v)

    keep = [d for d in raw_acc
            if d in tgt_acc and len(raw_acc[d]) >= 2 and len(tgt_acc[d]) >= 4]
    return ({d: sum(raw_acc[d]) / len(raw_acc[d]) for d in keep},
            {d: sum(adj_acc[d]) / len(adj_acc[d]) for d in keep},
            {d: sum(tgt_acc[d]) / len(tgt_acc[d]) for d in keep})


def run(seasons, draftable, where):
    loaded = {}
    for s in seasons:
        p = csv_for(s, where)
        if not p:
            print("  %d: no weekly CSV found in %s - skipped" % (s, where))
            continue
        loaded[s] = load(p, draftable)
    return loaded


def cells(loaded, seasons):
    out = collections.defaultdict(list)
    for pos in POSITIONS:
        for cut in CUTS:
            for s in seasons:
                if s not in loaded:
                    continue
                raw, adj, tgt = build(pos, cut, loaded[s])
                ds = sorted(raw)
                if len(ds) < 10:
                    continue
                x1 = [raw[d] for d in ds]
                x2 = [adj[d] for d in ds]
                y = [tgt[d] for d in ds]
                r1, r2 = pearson(x1, y), pearson(x2, y)
                if r1 is None or r2 is None:
                    continue
                out[(pos, cut)].append(
                    (s, r1, r2, spearman(x1, y), spearman(x2, y), len(ds)))
    return out


def selftest(where):
    print("SELFTEST - does this harness reproduce ANALYST-REFERENCE section 2b?")
    print("(2025, draftable only - the population that table was measured on)\n")
    loaded = run([2025], True, where)
    if 2025 not in loaded:
        print("SKIPPED: the 2025 weekly CSV is not on disk. See USAGE for the curl.")
        return 0
    got = cells(loaded, [2025])
    fail = 0
    print("%-4s %-4s %9s %9s %8s" % ("pos", "cut", "published", "measured", "diff"))
    for pos in POSITIONS:
        for cut in CUTS:
            want = SEC_2B.get((pos, cut))
            v = got.get((pos, cut))
            if want is None or not v:
                continue
            mine = v[0][1]
            d = mine - want
            ok = abs(d) <= 0.002
            if not ok:
                fail += 1
            print("%-4s %-4s %9.3f %9.3f %+8.3f  %s"
                  % (pos, cut, want, mine, d, "ok" if ok else "MISMATCH"))
    print("\n%s" % ("all 20 cells reproduce" if not fail
                    else "%d CELL(S) DO NOT REPRODUCE - fix this before trusting any "
                         "verdict below" % fail))
    return 1 if fail else 0


def main():
    args = sys.argv[1:]
    draftable = "--draftable" in args
    where = tempfile.gettempdir()
    if "--dir" in args:
        where = args[args.index("--dir") + 1]
    seasons = [int(a) for a in args if a.isdigit()] or list(SEASONS)

    if "--selftest" in args:
        sys.exit(selftest(where))

    print("SCHEDULE-ADJUSTED vs RAW FPA - does adjusting predict better?")
    print("target = RAW points allowed per game, weeks N+1..18, same season")
    print("population = %s" % ("DRAFTABLE (section 2b's)" if draftable
                               else "ALL players (build-fpa-current.py's)"))
    print("bar: an r must reach ~%.3f to clear noise at n=31\n" % NOISE_BAR)

    loaded = run(seasons, draftable, where)
    if not loaded:
        print("Nothing to measure. See USAGE for the curl.")
        return
    got = cells(loaded, seasons)

    hdr = "%-4s %-4s %-6s %7s %7s %8s %8s %8s %5s"
    print(hdr % ("pos", "cut", "season", "rawR", "adjR", "delta", "rawRho", "adjRho", "n"))
    print("-" * 66)
    for pos in POSITIONS:
        for cut in CUTS:
            for s, r1, r2, s1, s2, n in got.get((pos, cut), []):
                print(hdr % (pos, cut, s, "%.3f" % r1, "%.3f" % r2, "%+.3f" % (r2 - r1),
                             "%.3f" % s1, "%.3f" % s2, n))
        print()

    print("\nPOOLED across %d season(s)" % len(loaded))
    print("%-4s %-4s %8s %8s %9s  %s" % ("pos", "cut", "rawR", "adjR", "delta", "verdict"))
    print("-" * 58)
    helps = hurts = 0
    for pos in POSITIONS:
        for cut in CUTS:
            v = got.get((pos, cut))
            if not v:
                continue
            r1 = sum(x[1] for x in v) / len(v)
            r2 = sum(x[2] for x in v) / len(v)
            d = r2 - r1
            if d > 0.02:
                verdict, _ = "adj better", helps
                helps += 1
            elif d < -0.02:
                verdict = "raw better"
                hurts += 1
            else:
                verdict = "no difference"
            print("%-4s %-4s %8.3f %8.3f %+9.3f  %s" % (pos, cut, r1, r2, d, verdict))

    total = sum(1 for k in got if got[k])
    print("\nhelps by >0.02: %d   hurts by >0.02: %d   neither: %d"
          % (helps, hurts, total - helps - hurts))
    if len(loaded) > 1:
        print("\n⛔ Read the PER-SEASON rows before the pooled ones. The finding that "
              "stopped\n   this shipping is that the sign flips by season, which a "
              "pooled mean hides.")


if __name__ == "__main__":
    main()
