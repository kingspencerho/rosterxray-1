#!/usr/bin/env python3
"""Does a defence's BLITZ RATE predict anything that happens to the offence?

Full write-up: ANALYST-REFERENCE.md section 2g.

WHY THIS EXISTS
---------------
Section 2f built a defence-side scheme profile and stated its own caveat: a
sticky tendency is worthless if the thing it acts on is noise.

    "this defence plays man 41% of the time"   r = 0.462  sticky
  x "your receiver gains Y against man"        r = 0.161  COIN FLIP
  = a start/sit recommendation                            NOISE

Blitz rate was flagged as the more promising half (r = 0.622) precisely because
it acts on things that are themselves measurable - sacks, time to throw, how
deep the ball goes. That was an ARGUMENT, and section 2f said so. This measures
it.

THE THREE LINKS, and each one can kill the chain
------------------------------------------------
  LINK 1  does blitz rate repeat?            MEASURED in 2f: r = 0.622. yes.
  LINK 2  does it DO anything within a season?
          r(blitz rate, outcome allowed), same season, n=32 defences.
          If a heavy-blitz defence does not actually take more sacks or force
          faster throws, the chain is dead here and nothing downstream matters.
  LINK 3  does knowing it IN ADVANCE help?
          r(blitz rate in S-1, outcome allowed in S).

⛔⛔ AND LINK 3 HAS A BASELINE IT MUST BEAT, WHICH IS THE WHOLE TEST.
  Compare it against r(outcome in S-1, outcome in S) - the outcome's OWN prior.
  If last year's blitz rate predicts this year's sack rate no better than last
  year's SACK RATE does, blitz rate is a redundant proxy and the scheme profile
  buys nothing you could not get by carrying the outcome forward directly.
  ⭐ A predictor that is merely non-zero is not useful. It has to ADD.

⚠️ THE BAR: n = 32 defences, so an r must reach about 0.355 to be
distinguishable from zero, and a DIFFERENCE between two r values needs more.

⛔ READ THE PER-SEASON ROWS BEFORE THE POOLED ONES. Section 2c was killed by a
verdict that flipped sign between one season and three, and a pooled mean hides
exactly that.

USAGE
  python3 scripts/measure-blitz-consequences.py --selftest
  python3 scripts/measure-blitz-consequences.py
  python3 scripts/measure-blitz-consequences.py --dir PATH

INPUT - both releases are already used elsewhere in this repo:
  play_by_play_<season>.csv.gz        (pbp)
  pbp_participation_<season>.parquet  (parquet only; no csv.gz asset exists)
"""
import collections
import csv
import gzip
import importlib.util
import math
import os
import sys
import tempfile

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ⛔ ONE DEFINITION OF BLITZ AND ONE DEFENCE DERIVATION. Both come from the
# shipped builder rather than being retyped, so this measures the layer the app
# actually carries instead of a second implementation of it.
_spec = importlib.util.spec_from_file_location(
    "bds", os.path.join(REPO, "scripts", "build-defense-scheme.py"))
bds = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bds)

SEASONS = (2023, 2024, 2025)
NOISE_BAR = 0.355
MIN_DROPBACKS = 200

# Outcomes a blitz is supposed to cause, each allowed BY the defence.
OUTCOMES = ("sack_rate", "qb_hit_rate", "adot_allowed", "comp_pct",
            "ypa_allowed", "int_rate", "epa_per_db", "time_to_throw")


def fnum(v):
    try:
        if v in ("", "NA", None):
            return None
        return float(v)
    except (TypeError, ValueError):
        return None


def pbp_for(season, where):
    for n in ("play_by_play_%d.csv.gz" % season, "pbp_%d.csv.gz" % season):
        p = os.path.join(where, n)
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


def outcomes_from_pbp(path):
    """-> {defteam: {outcome: value}} — everything ALLOWED by that defence."""
    a = collections.defaultdict(collections.Counter)
    op = gzip.open if str(path).endswith(".gz") else open
    with op(path, "rt", newline="") as fh:
        for r in csv.DictReader(fh):
            if r.get("season_type") != "REG":
                continue
            d = r.get("defteam")
            if not d:
                continue
            db = fnum(r.get("qb_dropback"))
            if not db:
                continue
            c = a[d]
            c["db"] += 1
            c["sack"] += int(fnum(r.get("sack")) or 0)
            c["hit"] += int(fnum(r.get("qb_hit")) or 0)
            att = fnum(r.get("pass_attempt")) or 0
            if att:
                c["att"] += 1
                c["comp"] += int(fnum(r.get("complete_pass")) or 0)
                c["int"] += int(fnum(r.get("interception")) or 0)
                py = fnum(r.get("passing_yards"))
                if py is not None:
                    c["pyds"] += py
                ay = fnum(r.get("air_yards"))
                if ay is not None:
                    c["ay"] += ay
                    c["ay_n"] += 1
            e = fnum(r.get("epa"))
            if e is not None:
                c["epa"] += e
                c["epa_n"] += 1
    out = {}
    for d, c in a.items():
        if c["db"] < MIN_DROPBACKS or not c["att"]:
            continue
        out[d] = {
            "sack_rate": c["sack"] / c["db"],
            "qb_hit_rate": c["hit"] / c["db"],
            "comp_pct": c["comp"] / c["att"],
            "int_rate": c["int"] / c["att"],
            "ypa_allowed": c["pyds"] / c["att"],
            "adot_allowed": (c["ay"] / c["ay_n"]) if c["ay_n"] else None,
            "epa_per_db": (c["epa"] / c["epa_n"]) if c["epa_n"] else None,
        }
    return out


def blitz_and_ttt(path):
    """-> {defteam: {'blitz_rate':x, 'time_to_throw':y}} from participation."""
    import pyarrow.parquet as pq
    d = pq.read_table(path, columns=["nflverse_game_id", "possession_team",
                                     "number_of_pass_rushers", "time_to_throw"]).to_pydict()
    acc = collections.defaultdict(collections.Counter)
    for i in range(len(d["nflverse_game_id"])):
        dfn = bds.defense_of(d["nflverse_game_id"][i], d["possession_team"][i])
        if not dfn:
            continue
        c = acc[dfn]
        pr = d["number_of_pass_rushers"][i]
        if pr is not None:
            c["rush"] += 1
            if pr >= bds.BLITZ_RUSHERS:
                c["blitz"] += 1
        tt = d["time_to_throw"][i]
        if tt is not None:
            c["tt"] += float(tt)
            c["tt_n"] += 1
    out = {}
    for t, c in acc.items():
        if c["rush"] < bds.MIN_PLAYS:
            continue
        out[t] = {"blitz_rate": c["blitz"] / c["rush"],
                  "time_to_throw": (c["tt"] / c["tt_n"]) if c["tt_n"] else None}
    return out


def load(season, where):
    p = pbp_for(season, where)
    q = bds and os.path.join(where, "pbp_participation_%d.parquet" % season)
    if not os.path.exists(q):
        q = os.path.join(where, "part_%d.parquet" % season)
    if not p or not os.path.exists(q):
        return None
    o = outcomes_from_pbp(p)
    b = blitz_and_ttt(q)
    merged = {}
    for t in set(o) & set(b):
        row = dict(o[t])
        row.update(b[t])
        merged[t] = row
    return merged


def col(data, teams, key):
    return [data[t][key] for t in teams]


def selftest(where):
    print("SELFTEST - blitz consequences harness\n")
    ok = True

    def t(label, cond, detail=""):
        nonlocal ok
        print("  %s   %s%s" % ("ok  " if cond else "FAIL", label,
                               ("  — %s" % detail) if detail and not cond else ""))
        if not cond:
            ok = False

    t("the blitz definition comes from the shipped builder",
      bds.BLITZ_RUSHERS == 5)
    t("the defence derivation is the builder's", bds.defense_of("2025_01_DAL_NYG", "DAL") == "NYG")
    d = load(2025, where)
    if d is None:
        print("\nSKIPPED: 2025 pbp or participation parquet missing. See USAGE.")
        return 0
    t("all 32 defences resolve on both sources", len(d) == 32, "%d" % len(d))
    miss = [k for k in OUTCOMES if any(d[t_].get(k) is None for t_ in d)]
    t("every outcome computes for every defence", not miss, ",".join(miss))
    sr = [d[t_]["sack_rate"] for t_ in d]
    t("sack rate allowed is in a plausible band",
      0.02 < min(sr) and max(sr) < 0.15, "%.3f-%.3f" % (min(sr), max(sr)))
    ad = [d[t_]["adot_allowed"] for t_ in d]
    t("aDOT allowed is in a plausible band",
      4.0 < min(ad) and max(ad) < 12.0, "%.2f-%.2f" % (min(ad), max(ad)))
    print("\n%s" % ("all passed" if ok else "FAILURES"))
    return 0 if ok else 1


def main():
    args = sys.argv[1:]
    where = tempfile.gettempdir()
    if "--dir" in args:
        where = args[args.index("--dir") + 1]
    if "--selftest" in args:
        sys.exit(selftest(where))

    data = {}
    for s in SEASONS:
        sys.stderr.write("  reading %d...\n" % s)
        d = load(s, where)
        if d:
            data[s] = d
    if not data:
        print("Nothing to measure in %s. See USAGE." % where)
        return

    print("BLITZ RATE — does it cause anything, and does knowing it in advance help?")
    print("n = 32 defences, bar ~%.3f. Every outcome is ALLOWED BY that defence.\n" % NOISE_BAR)

    # ---- LINK 2 -----------------------------------------------------------
    print("=== LINK 2 · WITHIN SEASON: does a blitz-heavy defence differ at all? ===")
    print("%-14s %s %8s" % ("outcome", " ".join("%8d" % s for s in sorted(data)), "mean"))
    link2 = {}
    for o in OUTCOMES:
        if o == "time_to_throw":
            pass
        rs = []
        for s in sorted(data):
            d = data[s]
            ts = [t for t in sorted(d) if d[t].get(o) is not None
                  and d[t].get("blitz_rate") is not None]
            rs.append(pearson(col(d, ts, "blitz_rate"), col(d, ts, o)) if len(ts) > 10 else None)
        got = [x for x in rs if x is not None]
        if not got:
            continue
        m = sum(got) / len(got)
        link2[o] = m
        print("%-14s %s %8.3f %s" % (o, " ".join("%8s" % ("%.3f" % x if x is not None else "-")
                                                 for x in rs), m,
                                     "CAUSES" if abs(m) >= NOISE_BAR else "noise"))

    # ---- LINK 3 -----------------------------------------------------------
    pairs = [(a, b) for a, b in zip(sorted(data), sorted(data)[1:])]
    if not pairs:
        return
    print("\n=== LINK 3 · ACROSS SEASONS: blitz(S-1) -> outcome(S), against the")
    print("    outcome's OWN prior. THE BASELINE IS WHAT IT MUST BEAT. ===")
    print("%-14s %s %9s %9s %9s   %s"
          % ("outcome", " ".join("%9s" % ("%d>%d" % pr) for pr in pairs),
             "blitz->now", "own prior", "delta", "verdict"))
    for o in OUTCOMES:
        rb, ro = [], []
        for a, b in pairs:
            da, db_ = data.get(a), data.get(b)
            if not da or not db_:
                continue
            ts = [t for t in sorted(set(da) & set(db_))
                  if da[t].get(o) is not None and db_[t].get(o) is not None
                  and da[t].get("blitz_rate") is not None]
            if len(ts) < 12:
                continue
            rb.append(pearson(col(da, ts, "blitz_rate"), col(db_, ts, o)))
            ro.append(pearson(col(da, ts, o), col(db_, ts, o)))
        rb = [x for x in rb if x is not None]
        ro = [x for x in ro if x is not None]
        if not rb or not ro:
            continue
        mb, mo = sum(rb) / len(rb), sum(ro) / len(ro)
        # Compare on STRENGTH, not signed value - blitz raises some outcomes and
        # lowers others, and the question is which carries more information.
        delta = abs(mb) - abs(mo)
        # ⛔ A PREDICTOR THAT DOES NOT CLEAR THE BAR CANNOT "ADD". Without this
        # gate the table announces a winner between two noise values - int_rate
        # read "blitz ADDS" at r=-0.088 against a baseline of 0.008, which is
        # two numbers that both mean nothing.
        if abs(mb) < NOISE_BAR:
            verdict = "blitz is noise"
        elif delta > 0.05:
            verdict = "blitz ADDS"
        elif delta < -0.05:
            verdict = "own prior wins"
        else:
            verdict = "no difference"
        # ⛔ PER-TRANSITION, NOT JUST THE MEAN. Sections 2c and 2e both died on a
        # verdict that flipped sign between transitions, which a pooled mean hides.
        print("%-14s %s %9.3f %9.3f %9s   %s"
              % (o, " ".join("%9.3f" % x for x in rb), mb, mo, "%+.3f" % delta, verdict))

    print("\n⛔ A predictor that is merely non-zero is not useful. If blitz rate does")
    print("   not beat carrying the outcome itself forward, the scheme profile adds")
    print("   nothing a simpler number does not already give you.")


if __name__ == "__main__":
    main()
