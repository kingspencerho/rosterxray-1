#!/usr/bin/env python3
"""build-vacated.py -> grading/data/vacated_2026.json

Per-team share of 2025 targets and carries now VACATED — held last season by a
player who is no longer on that roster. This is RANK-1 evidence in the Source
Hierarchy (role/opportunity CHANGE) and the single best breakout predictor the
app has access to. It was prototyped once as a throwaway and never became a
file; this is that file.

⚠ THE BUG THIS SCRIPT EXISTS TO AVOID. The first pass inflated WAS to 82.4%
because it differenced RAW NAMES: "brian robinson jr" in the 2025 metrics did
not match "brian robinson" on the 2026 roster, so a player still on the team
read as a departure. NORMALISE (lowercase, strip punctuation AND suffixes)
BEFORE DIFFERENCING — every name on both sides goes through the same norm().

⚠ THE TEAM FIELDS MEAN DIFFERENT THINGS, which is the whole mechanism:
    player_metrics_2025.team  = the team he PLAYED for in 2025
    roster_2026.team          = the team he is on NOW
A player whose two teams differ has vacated his 2025 share. So has one who
appears in the metrics and not on any 2026 roster (retired, unsigned, out).

WHAT THIS IS NOT: it says targets are AVAILABLE, never who inherits them. That
is a judgement about role, and per Lens 1 you still have to project who absorbs
the share before ADP reflects it.

Regenerate:
  python3 scripts/build-vacated.py roster.csv grading/data/player_metrics_2025.json \\
      grading/data/vacated_2026.json
"""
import csv, json, sys

ROSTER = sys.argv[1] if len(sys.argv) > 1 else "roster.csv"
METRICS = sys.argv[2] if len(sys.argv) > 2 else "grading/data/player_metrics_2025.json"
OUT = sys.argv[3] if len(sys.argv) > 3 else "grading/data/vacated_2026.json"

SUFFIX = {"jr", "sr", "ii", "iii", "iv", "v"}
def norm(n):
    n = (n or "").lower().strip()
    for ch in ".,'’": n = n.replace(ch, "")
    parts = n.replace("-", " ").split()
    while parts and parts[-1] in SUFFIX: parts.pop()   # <- the WAS bug
    return " ".join(parts)

# who is on a 2026 roster, and where
now = {}
for r in csv.DictReader(open(ROSTER)):
    if r.get("position") not in ("QB", "RB", "WR", "TE"): continue
    k = norm(r.get("full_name", ""))
    if k: now.setdefault(k, r.get("team"))

pm = json.load(open(METRICS))
rows = {k: v for k, v in pm.items() if not k.startswith("_") and isinstance(v, dict)}

teams = {}
for name, m in rows.items():
    t = m.get("team")
    if not t or m.get("pos") not in ("WR", "TE", "RB", "QB"): continue
    d = teams.setdefault(t, {"tgt_sh_total": 0.0, "vacated_tgt_sh": 0.0,
                             "gone": [], "returning_tgt_sh": 0.0})
    sh = m.get("tgt_sh") or 0.0
    d["tgt_sh_total"] += sh
    k = norm(name)
    where = now.get(k)
    if where is None:
        status = "not on a 2026 roster"
    elif where != t:
        status = f"now {where}"
    else:
        d["returning_tgt_sh"] += sh
        continue
    d["vacated_tgt_sh"] += sh
    if sh >= 0.03:
        d["gone"].append({"name": name, "pos": m.get("pos"),
                          "tgt_sh": round(sh, 3), "status": status})

out = {}
for t, d in teams.items():
    tot = d["tgt_sh_total"]
    if tot <= 0: continue
    d["gone"].sort(key=lambda x: -x["tgt_sh"])
    out[t] = {
        # share of the team's OWN measured target share that walked out
        "vacated_pct": round(d["vacated_tgt_sh"] / tot * 100, 1),
        "vacated_tgt_sh": round(d["vacated_tgt_sh"], 3),
        "measured_tgt_sh": round(tot, 3),
        "gone": d["gone"][:6],
    }

meta = {
    "season_from": 2025, "season_to": 2026,
    "source": "player_metrics_2025 (2025 team) differenced against nflverse roster_2026 (current team)",
    "normalisation": "lowercase, punctuation stripped, SUFFIXES STRIPPED before differencing — "
                     "the known bug that read 'brian robinson jr' as a departure and inflated WAS to 82.4%",
    "denominator": "team's own measured 2025 target share, not 1.00 — the metrics cover drafted "
                   "players only, so a team's shares do not sum to 100% and the percentage is "
                   "'share of the measured pool that left', which is the comparable figure",
    "listed_cutoff": "individual departures listed at 3%+ target share",
    "hierarchy_rank": "1 — role/opportunity CHANGE, the most causal input in the framework",
    "not_a_projection": "This says targets are AVAILABLE. It does NOT say who inherits them; "
                        "per Lens 1 you must still project who absorbs the share before ADP does.",
}
json.dump({"_meta": meta, "teams": out}, open(OUT, "w"), indent=1, sort_keys=True)
top = sorted(out.items(), key=lambda x: -x[1]["vacated_pct"])[:6]
print(f"wrote {OUT}: {len(out)} teams")
print("most vacated:", ", ".join(f"{t} {v['vacated_pct']}%" for t, v in top))
