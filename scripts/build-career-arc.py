#!/usr/bin/env python3
"""build-career-arc.py -> grading/data/career_arc_2026.json

Age, experience and DRAFT CAPITAL for skill players. Three facts the app has
never carried, and the reason each matters:

  age           Career arc is one of the most reliable patterns in fantasy and
                the app had ZERO representation of it. A 24-year-old and a
                30-year-old with identical 2025 lines are not the same bet.
  draft_number  Lens 2 (Draft Capital as Opportunity Signal) leans on this
                constantly and it existed only inside prose, so nothing could
                compute with it. Now structured. 0 = undrafted.
  years_exp     Separates a second-year breakout candidate from a nine-year
                veteran holding the same role.

⚠ THE AGE BANDS BELOW ARE PRIORS, NOT MEASUREMENTS MADE HERE. This app has one
season of player data; a real aging curve needs many, and a cross-sectional
age-vs-production read on a single year is confounded by survivorship (the
30-year-olds still playing are the ones who stayed good). They are emitted as
LABELLED CONTEXT so a reader can weigh them, never as a computed finding, and
nothing scores off them.

Regenerate:
  curl -sSL -o roster.csv \\
    https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_2026.csv
  python3 scripts/build-career-arc.py roster.csv grading/data/career_arc_2026.json
"""
import csv, json, sys
from datetime import date

SRC = sys.argv[1] if len(sys.argv) > 1 else "roster.csv"
OUT = sys.argv[2] if len(sys.argv) > 2 else "grading/data/career_arc_2026.json"
SEASON = int(sys.argv[3]) if len(sys.argv) > 3 else 2026
AS_OF = date(SEASON, 9, 1)          # ages quoted as of kickoff, not today

# Published priors from the wider literature, NOT measured in this repo.
BANDS = {
    "RB": {"rising": 23, "peak": 26, "decline": 27,
           "note": "the sharpest curve in fantasy — production falls off from about 27, and workload history compounds it"},
    "WR": {"rising": 24, "peak": 28, "decline": 30,
           "note": "breakout age matters early; the plateau is long and the fall is later and gentler than at RB"},
    "TE": {"rising": 25, "peak": 29, "decline": 31,
           "note": "the latest-developing position — a 25-year-old TE is often still pre-breakout"},
    "QB": {"rising": 25, "peak": 32, "decline": 35,
           "note": "the longest runway; rushing production ages faster than passing"},
}

def norm(n):
    n = n.lower().strip()
    for ch in ".,'’": n = n.replace(ch, "")
    return " ".join(n.replace("-", " ").split())

def age_on(b):
    try: y, m, d = (int(x) for x in b.split("-")[:3])
    except Exception: return None
    a = AS_OF.year - y - ((AS_OF.month, AS_OF.day) < (m, d))
    return a if 18 <= a <= 50 else None

rows = list(csv.DictReader(open(SRC)))
players, seen = {}, set()
for r in rows:
    pos = r.get("position")
    if pos not in BANDS: continue
    key = norm(r.get("full_name", ""))
    if not key or key in seen: continue
    a = age_on(r.get("birth_date", ""))
    if a is None: continue
    seen.add(key)
    try: dn = int(r.get("draft_number") or 0)
    except ValueError: dn = 0
    try: yx = int(r.get("years_exp") or 0)
    except ValueError: yx = 0
    b = BANDS[pos]
    players[key] = {
        "pos": pos, "team": r.get("team"), "age": a, "exp": yx,
        "draft": dn,                       # 0 = undrafted
        "phase": "rising" if a <= b["rising"] else "decline" if a >= b["decline"] else "peak",
    }

meta = {
    "season": SEASON, "as_of": AS_OF.isoformat(),
    "source": "nflverse rosters (birth_date, years_exp, draft_number)",
    "bands": BANDS,
    "bands_are_priors": ("Published career-arc priors, NOT measured in this repo. One season of "
                         "player data cannot produce an aging curve, and a cross-sectional read is "
                         "confounded by survivorship. Weigh them; never quote them as a finding."),
    "draft": "0 = undrafted. Lens 2 treats a high pick plus an early role as a strong signal.",
    "counts": {},
}
for p in BANDS:
    meta["counts"][p] = sum(1 for v in players.values() if v["pos"] == p)
json.dump({"_meta": meta, "players": players}, open(OUT, "w"), indent=1, sort_keys=True)
print(f"wrote {OUT}: {len(players)} players  {meta['counts']}")
