#!/usr/bin/env python3
"""build-ngs-receiving.py -> grading/data/ngs_receiving_2025.json

Next Gen Stats receiving tracking for WR/TE. Two metrics survive the stability
screen and both are ROLE/SKILL properties rather than outcomes, which is why:

    avg_intended_air_yards  r = 0.826   <- the stickiest PLAYER input measured
                                           anywhere in this project, ahead of
                                           QB rush attempts per game (0.815)
    avg_separation          r = 0.663   <- reliable tier, comparable to dud rate
                                           and well above spike rate (0.475)

Measured here the same way the Aug 25 calibration did: same player, both
seasons, 40+ targets in each, across the 23>24 and 24>25 transitions.

DELIBERATELY NOT EMITTED, because they measure outcomes and do not carry:
    avg_cushion               0.415   (a coverage CHOICE by the defence)
    avg_yac_above_expectation 0.358
    catch_percentage          0.492
    avg_yac                   0.458

WHY SEPARATION MATTERS TO THIS APP SPECIFICALLY: it is the only rank-3
TALENT-IN-ISOLATION input available. Everything else in the app is rank-2
opportunity (target share, snaps) or rank-4 outcome (spike, dud). Separation
answers "does he deserve the targets" independently of whether he got them.

Regenerate:
  curl -sSL -o ngs.csv.gz \\
    https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats/ngs_receiving.csv.gz
  python3 scripts/build-ngs-receiving.py ngs.csv.gz grading/data/ngs_receiving_2025.json
"""
import csv, gzip, json, sys, statistics as st

SRC = sys.argv[1] if len(sys.argv) > 1 else "ngs.csv.gz"
OUT = sys.argv[2] if len(sys.argv) > 2 else "grading/data/ngs_receiving_2025.json"
SEASON = int(sys.argv[3]) if len(sys.argv) > 3 else 2025
MIN_TGT = 40

def num(x):
    try: return float(x)
    except: return None

def norm(n):
    n = n.lower().strip()
    for ch in ".,'’": n = n.replace(ch, "")
    return " ".join(n.replace("-", " ").split())

op = gzip.open if SRC.endswith(".gz") else open
rows = list(csv.DictReader(op(SRC, "rt")))
# week == 0 is nflverse's season-aggregate row
season_rows = [r for r in rows if r["week"] == "0" and r["season_type"] == "REG"]

players, pcts = {}, {"WR": [], "TE": []}
for r in season_rows:
    if int(r["season"]) != SEASON: continue
    tgt = num(r["targets"])
    sep = num(r["avg_separation"])
    iay = num(r["avg_intended_air_yards"])
    pos = r["player_position"]
    if tgt is None or tgt < MIN_TGT or sep is None: continue
    if pos not in ("WR", "TE"): continue
    players[norm(r["player_display_name"])] = {
        "pos": pos, "team": r["team_abbr"], "tgt": int(tgt),
        "sep": round(sep, 2),
        "iay": round(iay, 2) if iay is not None else None,
    }
    pcts[pos].append(sep)

meta = {
    "season": SEASON,
    "source": "nflverse nextgen_stats/ngs_receiving (season-aggregate rows)",
    "min_targets": MIN_TGT,
    "stability": {
        "avg_separation": {"r": 0.663, "tier": "reliable",
            "note": "measured 23>24 0.595, 24>25 0.732, n=85/89 at 40+ targets"},
        "avg_intended_air_yards": {"r": 0.826, "tier": "anchor",
            "note": "measured 23>24 0.832, 24>25 0.820 — the stickiest player input in this project"},
    },
    "hierarchy_rank": {
        "sep": "3 — talent in isolation. The only rank-3 input the app carries.",
        "iay": "2 — opportunity/deployment. aDOT is WHERE he is used, not how well.",
    },
    "not_emitted": {
        "avg_cushion": 0.415, "avg_yac_above_expectation": 0.358,
        "catch_percentage": 0.492, "avg_yac": 0.458,
    },
    "medians": {p: round(st.median(v), 2) for p, v in pcts.items() if v},
    "counts": {p: len(v) for p, v in pcts.items()},
}
json.dump({"_meta": meta, "players": players}, open(OUT, "w"), indent=1, sort_keys=True)
print(f"wrote {OUT}: {len(players)} receivers  medians={meta['medians']}  counts={meta['counts']}")
