#!/usr/bin/env python3
"""coaching-adj-impact.py — what does each COACHING_ADJ delta actually DO?

WHY THIS EXISTS. COACHING_ADJ is the only SCORED input in this app with no
measured basis: nine hand-set magnitudes on reasoned claims about coaching
churn. Every other scored layer was derived and negative-tested. So the one
question a reader cannot answer by looking at the table is the one that
matters: does this number change anything?

It usually does not, and that is not obvious. The matchup score is strictly
tier-banded (rank <=8 Smash 5, <=14 Good 4, <=20 Even 3, <=26 Hard 2, else
Avoid 1 — see getMatchupTier). So a delta that moves no position across a rank
BOUNDARY cannot change any grade, for any roster, ever. Two of the nine are
inert by that test and look exactly as authoritative as the seven that are not.

MEASURED Sep 13 2026 against the five committed fixtures, 90 grades each:
  BAL -2.0   75 grades move, 11 letters     GB  -1.5   75 move, 15 letters
  CLE -0.5   75 move,  0 letters            PIT -1.5   60 move,  1 letter
  CHI +1.5   45 move,  0 letters            DAL +1.0   41 move,  0 letters
  TEN +0.5   30 move,  0 letters
  WAS +0.75   0 move                        NYJ +0.25   0 move
The fixture run and this tier test agree, and this one generalises: it needs no
roster, because it asks whether a rank band moved at all.

  python scripts/coaching-adj-impact.py          # every entry
  python scripts/coaching-adj-impact.py --inert   # only the ones doing nothing

It READS App.jsx and changes nothing. Run it before and after touching any
delta — a change that moves no boundary is a comment, not a grade change.
"""
import io, re, sys

APP = "App.jsx"
# Mirrors getMatchupTier's rank bands. ⛔ If those move, move these.
BANDS = ((8, "Smash"), (14, "Good"), (20, "Even"), (26, "Hard"))


def tier(pts, pool):
    """Rank a points-allowed value against the position pool, softest first."""
    idx = next((i for i, v in enumerate(pool) if v <= pts), -1)
    rank = len(pool) + 1 if idx == -1 else idx + 1
    for cap, name in BANDS:
        if rank <= cap:
            return name
    return "Avoid"


def load():
    s = io.open(APP, encoding="utf-8", newline="").read()
    blk = s[s.index("const FPA = {"):s.index("// 2026 Bye Weeks")]
    fpa = {}
    for pos in ("QB", "RB", "WR", "TE"):
        m = re.search(rf"{pos}: \{{(.*?)\}},", blk, re.S)
        fpa[pos] = {k: float(v) for k, v in re.findall(r"(\w+): ([\d.]+)", m.group(1))}
    ci = s.index("const COACHING_ADJ = {")
    coach = [(t, float(d)) for t, d in re.findall(
        r"^\s{2}([A-Z]{2,3}): \{ all: ([+-]?[\d.]+),", s[ci:s.index("\n};", ci)], re.M)]
    return fpa, coach


def main():
    inert_only = "--inert" in sys.argv
    fpa, coach = load()
    pools = {p: sorted(v.values(), reverse=True) for p, v in fpa.items()}
    inert = []
    print(f"{'team':<5}{'delta':>7}   tier WITHOUT -> WITH, per position")
    print("-" * 74)
    for t, d in sorted(coach, key=lambda x: -abs(x[1])):
        cells, moved = [], 0
        for pos in ("QB", "RB", "WR", "TE"):
            raw = fpa[pos].get(t)
            if raw is None:
                cells.append(f"{pos} ?")
                continue
            a, b = tier(raw, pools[pos]), tier(raw + d, pools[pos])
            if a != b:
                moved += 1
                cells.append(f"{pos} {a}->{b}")
            else:
                cells.append(f"{pos} {a}=")
        if moved == 0:
            inert.append(t)
        if inert_only and moved:
            continue
        tag = "INERT" if moved == 0 else f"{moved}/4"
        print(f"{t:<5}{d:>+7.2f}   {tag:<6} " + "  ".join(cells))
    print()
    if inert:
        print(f"⚠ INERT ({len(inert)}): {', '.join(inert)} — crosses no rank boundary at any "
              f"position, so it cannot move a grade for any roster.")
    else:
        print("No inert entries: every delta crosses at least one rank boundary.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
