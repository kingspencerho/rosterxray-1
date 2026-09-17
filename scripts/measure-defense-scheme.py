#!/usr/bin/env python3
"""DEFENCE-SIDE scheme rates, and whether they repeat year to year.

Full write-up: ANALYST-REFERENCE.md section 2f.

THE GAP THIS ANSWERS
--------------------
scripts/matchup-brief.py prints two gaps as gaps, and CLAUDE.md calls the first
"the highest-value data addition for P3":

  * there is NO defence-side scheme profile. `coverage_2025.json` is man rate
    FACED BY A RECEIVER - an offence-side measurement wearing a defensive name.
  * nothing splits a defence by route DEPTH.

This closes the first. The same participation release already in use carries
`defense_man_zone_type`, `defense_coverage_type`, `number_of_pass_rushers`,
`defenders_in_box` and `was_pressure` - all attributes of the DEFENCE, none of
them previously read from that side.

⛔ THE 2026 TWIN IS BLOCKED AND THE BLOCK IS REAL. Probed Sep 17 2026 with
2023-25 as a control: pbp_participation_2023/24/25.parquet all return 200 and
2026 returns 404. So a current-season version cannot exist yet, and this is a
PRIOR-SEASON layer by necessity rather than by choice.
⚠️ Probe the PARQUET. The release ships parquet only - there is no csv.gz asset -
so a 404 on .csv.gz proves nothing and would produce a false "still blocked".

⛔ NO nflreadpy AND NO polars. The two shipped participation builders
(build-routes.py, build-coverage.py) import both, and neither is installed on
this machine - which is why they cannot be re-run here. pyarrow reads the
parquet directly, which is closer to the stdlib convention every other builder
in this repo follows.

THE DEFENCE IS DERIVED, NOT JOINED. participation carries `possession_team` and
no defensive team, but `nflverse_game_id` encodes both (2025_01_DAL_NYG), so the
defence is whichever side is not in possession. Verified: 0 of 45,184 rows
unresolvable, all 32 defences present.

WHAT IT MEASURES
----------------
Year-over-year correlation of each rate, same defence, across 2023>2024 and
2024>2025. n = 32, so an r must reach about 0.355 to be distinguishable from
noise - state that bar before quoting any number below.

⚠️ A SCHEME RATE IS DESCRIPTIVE. Even a sticky one says what a defence DID, not
what it will do to your receiver. Read ANALYST-REFERENCE section 2 first: the
man/zone EDGE a receiver posts is r=0.161, a coin flip, and is deliberately
withheld from the AI prompt. A defence's own tendency is a different quantity
and is measured here on its own terms.

USAGE
  python3 scripts/measure-defense-scheme.py --selftest
  python3 scripts/measure-defense-scheme.py
  python3 scripts/measure-defense-scheme.py --dir PATH

INPUT
  curl -sSL -o part_2025.parquet \
    https://github.com/nflverse/nflverse-data/releases/download/pbp_participation/pbp_participation_2025.parquet
"""
import collections
import math
import os
import sys
import tempfile

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

SEASONS = (2023, 2024, 2025)
NOISE_BAR = 0.355
BLITZ_RUSHERS = 5          # 5+ pass rushers is the conventional blitz line
MIN_PLAYS = 150            # per defence, per metric, before a rate is emitted

COLS = ["nflverse_game_id", "possession_team", "defense_man_zone_type",
        "defense_coverage_type", "number_of_pass_rushers", "was_pressure",
        "defenders_in_box"]


def parquet_for(season, where):
    for name in ("pbp_participation_%d.parquet" % season, "part_%d.parquet" % season):
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


def defense_of(game_id, possession):
    """participation has no defteam column; nflverse_game_id encodes both."""
    if not game_id or not possession:
        return None
    parts = game_id.split("_")
    if len(parts) < 4:
        return None
    away, home = parts[2], parts[3]
    if possession == away:
        return home
    if possession == home:
        return away
    return None


def load(path):
    import pyarrow.parquet as pq
    d = pq.read_table(path, columns=COLS).to_pydict()
    acc = collections.defaultdict(lambda: collections.Counter())
    unresolved = 0
    for i in range(len(d["nflverse_game_id"])):
        dfn = defense_of(d["nflverse_game_id"][i], d["possession_team"][i])
        if not dfn:
            unresolved += 1
            continue
        a = acc[dfn]
        mz = d["defense_man_zone_type"][i]
        if mz in ("MAN_COVERAGE", "ZONE_COVERAGE"):
            a["mz"] += 1
            if mz == "MAN_COVERAGE":
                a["man"] += 1
        cov = d["defense_coverage_type"][i]
        if cov:
            a["cov"] += 1
            a["cov_" + str(cov)] += 1
        pr = d["number_of_pass_rushers"][i]
        if pr is not None:
            a["rush"] += 1
            if pr >= BLITZ_RUSHERS:
                a["blitz"] += 1
        wp = d["was_pressure"][i]
        if wp is not None:
            a["prs_n"] += 1
            if wp in (True, 1, "1", "TRUE", "True"):
                a["prs"] += 1
        box = d["defenders_in_box"][i]
        if box is not None:
            a["box_n"] += 1
            a["box_sum"] += float(box)
    return acc, unresolved


def rates(acc):
    """-> {metric: {team: rate}} for metrics with a real sample."""
    out = collections.defaultdict(dict)
    for team, a in acc.items():
        if a["mz"] >= MIN_PLAYS:
            out["man_rate"][team] = a["man"] / a["mz"]
        if a["rush"] >= MIN_PLAYS:
            out["blitz_rate"][team] = a["blitz"] / a["rush"]
        if a["prs_n"] >= MIN_PLAYS:
            out["pressure_rate"][team] = a["prs"] / a["prs_n"]
        if a["box_n"] >= MIN_PLAYS:
            out["box_mean"][team] = a["box_sum"] / a["box_n"]
        if a["cov"] >= MIN_PLAYS:
            for key in list(a):
                if key.startswith("cov_"):
                    out[key.lower()][team] = a[key] / a["cov"]
    return out


def selftest(where):
    print("SELFTEST - defence derivation and classification coverage\n")
    p = parquet_for(2025, where)
    if not p:
        print("SKIPPED: no 2025 participation parquet on disk. See USAGE.")
        return 0
    acc, unresolved = load(p)
    fail = 0
    print("  unresolvable defence rows     %d" % unresolved)
    if unresolved:
        print("    FAIL - the game-id derivation is not total")
        fail += 1
    print("  distinct defences             %d" % len(acc))
    if len(acc) != 32:
        print("    FAIL - expected 32")
        fail += 1
    mz = sum(a["mz"] for a in acc.values())
    # ANALYST-REFERENCE and CLAUDE.md both record 22,055 classified 2025 pass
    # plays, measured by a different session through nflreadpy. Reproducing it
    # through pyarrow is what says this read matches the one already banked.
    print("  man/zone classified plays     %d  (banked figure: 22055)" % mz)
    if mz != 22055:
        print("    FAIL - does not reproduce the banked count")
        fail += 1
    r = rates(acc)
    print("  metrics with a usable sample  %d" % len(r))
    print("\n%s" % ("derivation reproduces the banked read" if not fail
                    else "%d PROBLEM(S) - fix before trusting any verdict" % fail))
    return 1 if fail else 0


def main():
    args = sys.argv[1:]
    where = tempfile.gettempdir()
    if "--dir" in args:
        where = args[args.index("--dir") + 1]
    if "--selftest" in args:
        sys.exit(selftest(where))

    seasons = {}
    for s in SEASONS:
        p = parquet_for(s, where)
        if not p:
            continue
        sys.stderr.write("  reading %d...\n" % s)
        acc, _ = load(p)
        seasons[s] = rates(acc)
    if len(seasons) < 2:
        print("Need at least two seasons of participation parquet in %s." % where)
        return

    print("DEFENCE SCHEME RATES - does a defence's own tendency repeat?")
    print("n = 32 defences, so an r must reach ~%.3f to clear noise\n" % NOISE_BAR)

    metrics = sorted({m for v in seasons.values() for m in v},
                     key=lambda m: (m.startswith("cov_"), m))
    pairs = [(a, b) for a, b in zip(sorted(seasons), sorted(seasons)[1:])]

    print("%-16s %s %8s   %s" % ("metric",
                                 " ".join("%9s" % ("%d>%d" % p) for p in pairs),
                                 "mean r", "reads as"))
    print("-" * 62)
    rows = []
    for m in metrics:
        rs = []
        for a, b in pairs:
            da, db = seasons[a].get(m, {}), seasons[b].get(m, {})
            ts = sorted(set(da) & set(db))
            if len(ts) < 12:
                rs.append(None)
                continue
            rs.append(pearson([da[t] for t in ts], [db[t] for t in ts]))
        ok = [x for x in rs if x is not None]
        if not ok:
            continue
        mean = sum(ok) / len(ok)
        verdict = "REPEATS" if mean >= NOISE_BAR else "noise"
        rows.append((mean, m))
        print("%-16s %s %8.3f   %s"
              % (m, " ".join("%9s" % ("%.3f" % x if x is not None else "-") for x in rs),
                 mean, verdict))

    rows.sort(reverse=True)
    keep = [m for v, m in rows if v >= NOISE_BAR]
    print("\n%d of %d metrics clear the bar: %s"
          % (len(keep), len(rows), ", ".join(keep) if keep else "none"))
    print("\n⚠️ A SCHEME RATE IS DESCRIPTIVE EVEN WHEN IT REPEATS. It says what a")
    print("   defence DID, not what it will do to your receiver - the man/zone EDGE")
    print("   a receiver posts is r=0.161 and is withheld from the AI prompt on")
    print("   purpose. These are a different quantity, measured on their own terms.")


if __name__ == "__main__":
    main()
