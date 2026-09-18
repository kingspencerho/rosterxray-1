#!/usr/bin/env python3
"""measure-name-joins.py - how often does a cross-file player lookup MISS?

WHY. Every layer in grading/data keys players by NAME, and only redzone_2025
carries a stable id, so a join across files is a string match and nothing
verifies it. On Sep 17 2026 matchup-brief.py printed Kenny Gainwell in its
"NO 2025 DATA - every read above is BLIND to these starters" block while his
2025 row sat one file over under "kenneth gainwell". A 96th-percentile targets
per route run and a 94th-percentile red-zone target share were suppressed from
a live lineup decision, and the disclosure block asserted the opposite.

TWO FAILURE CLASSES AND THEY NEED DIFFERENT FIXES:
  SUFFIX/PUNCTUATION  "chris godwin jr" vs "chris godwin"  -> _nm() already
                      solves this; the brief just was not using it.
  NICKNAME            "kenneth gainwell" vs "kenny gainwell" -> no rule
                      reaches it. Needs an alias, and the alias list must be
                      MEASURED so it stays short and honest.

This prints the residue after normalisation, per file pair, so the alias list
is evidence rather than whoever-someone-noticed.

    python scripts/measure-name-joins.py
"""
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "grading", "data")
SUFFIX = re.compile(r"\s+(jr|sr|ii|iii|iv|v)$")


def nm(n):
    n = n.lower().replace(".", "").replace("'", "").replace("-", " ")
    return re.sub(r"\s+", " ", SUFFIX.sub("", n)).strip()


def load(f):
    d = json.load(open(os.path.join(DATA, f), encoding="utf-8"))
    p = d.get("players", {k: v for k, v in d.items() if not k.startswith("_")})
    return {k: v for k, v in p.items() if isinstance(v, dict)}


def offense(rows):
    return {k: v for k, v in rows.items()
            if v.get("pos") in ("QB", "RB", "WR", "TE")}


def main():
    MET = offense(load("player_metrics_2025.json"))
    layers = {f: offense(load(f)) for f in
              ("routes_2025.json", "redzone_2025.json", "gamelogs_2025.json")}
    ST = offense(load("status_2026.json"))

    print("RAW vs NORMALISED join, player_metrics_2025 -> each layer\n")
    print("  %-26s %6s %8s %10s %9s" % ("layer", "n", "raw hit", "norm hit", "residue"))
    for f, rows in layers.items():
        norm = {}
        for k in rows:
            norm.setdefault(nm(k), k)
        raw = sum(1 for k in MET if k in rows)
        got = sum(1 for k in MET if nm(k) in norm)
        print("  %-26s %6d %8d %10d %9d" % (f, len(MET), raw, got, len(MET) - got))

    # The disclosure block's own question: which 2026 starters look unmeasured?
    print("\nWHO THE BRIEF WOULD CALL UNMEASURED, and whether that is true")
    mnorm = {}
    for k in MET:
        mnorm.setdefault(nm(k), k)
    raw_miss = [k for k in ST if k not in MET]
    norm_miss = [k for k in ST if nm(k) not in mnorm]
    print("  status_2026 offensive players : %d" % len(ST))
    print("  unmeasured by RAW name        : %d" % len(raw_miss))
    print("  unmeasured after _nm()        : %d   <- the honest number" % len(norm_miss))
    print("  FALSE 'no data' claims fixed  : %d" % (len(raw_miss) - len(norm_miss)))

    rescued = sorted(set(raw_miss) - set(norm_miss))
    print("\n  a sample of the rescued (status name -> metrics name):")
    for k in rescued[:12]:
        print("    %-24s -> %s" % (k, mnorm[nm(k)]))

    # NICKNAMES: normalisation cannot reach these. Surface candidates by
    # surname+team so the alias list is derived, not remembered.
    print("\nNICKNAME CANDIDATES - same surname and team, different first name")
    by = {}
    for k, v in MET.items():
        parts = nm(k).split()
        if len(parts) >= 2:
            by.setdefault((parts[-1], v.get("team")), []).append(k)
    hits = 0
    for k, v in ST.items():
        parts = nm(k).split()
        if len(parts) < 2 or nm(k) in mnorm:
            continue
        for cand in by.get((parts[-1], v.get("team")), []):
            print("    %-24s ~ %-24s (%s %s)" % (k, cand, v.get("team"), v.get("pos")))
            hits += 1
    print("    %d candidate(s). Each needs a HUMAN to confirm - a surname" % hits)
    print("    collision is not proof two rows are the same person.")


if __name__ == "__main__":
    main()
