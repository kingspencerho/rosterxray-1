#!/usr/bin/env python3
"""
build-fpa-current.py — fantasy points allowed by position, from the season being
played. The live twin of the hand-typed 2025 FPA table in App.jsx.

WHY THIS EXISTS
---------------
`FPA` in App.jsx is Rotowire's 2025 season, typed in by hand. Every green-to-red
matchup pill in the app is computed from it, all season, every season.

Measured Sep 13 2026 (ANALYST-REFERENCE.md §2b): FPA through week N predicts the
REST of that same season far better than the prior season predicts anything.

    pos   last year    W1-3     the crossover
    QB       0.049     0.369    immediate
    WR      -0.073     0.531    immediate, and it INVERTS — WR is the worst
                                cross-season input in the app and one of the
                                best within a season
    TE       0.192     0.281    better at 3, clearly better by 6
    RB       0.245    -0.123    NEITHER predicts; see below

⛔ STATE THE BAR: with n=31 defences an r must reach ~0.355 to be distinguishable
from noise, so both RB figures are inside the noise. RB is carried anyway, and
the reason is his and it is correct: THE PILL DESCRIBES, IT DOES NOT FORECAST.
A correlation asks whether the RANKING PERSISTS; it never asks whether a number
describes the team that exists NOW. A defence that lost three starters in August
is a different defence, and last season's number describes a team that is gone.

GATES (read from _meta.gates by App.jsx — never retype them there)
  QB · WR · TE   3 weeks
  RB             4 weeks   SAMPLE PARITY, not predictiveness. A defence's RB
                           figure rests on ~1.79 draftable backs per game against
                           a receiver's 2.29, so RB needs ~4 to hold the same
                           number of observations WR holds at 3.

⚠️ THE GATE IS PER POSITION AND THE SWITCH IS LEAGUE-WIDE. A position goes live
when weeks_covered clears its gate, and then EVERY defence uses live data for it.
Mixing live and estimated defences inside one position would rank them against
two different distributions — the same population error the card's five separate
percentile tables exist to avoid.

⛔ WHEN LIVE DATA IS IN USE, NO ADJUSTMENT APPLIES ON TOP. COACHING_ADJ and
OFFSEASON_ADJ_2026 are hand-written guesses at what a defence would BECOME. Real
results already contain whatever it became. Adding them would double-count.

⚠️ POPULATION: ALL players, not the draftable subset. §2b was derived on
draftable players only (that is what gamelogs covers), so the real sample here is
LARGER than the one the gates were measured on — which makes the gates
conservative rather than optimistic.

SCORING mirrors build-gamelogs.py exactly: half-PPR, 4pt passing TD, -1 INT,
-2 fumble lost. A second scoring function would drift; if that one changes,
change this one in the same edit.

INPUT (release tag: stats_player, NOT player_stats — the obvious guess 404s)
  refresh-inseason.sh ALREADY downloads this file, so this layer costs one extra
  parse and no extra network.

USAGE
  python3 scripts/build-fpa-current.py <stats_player_week.csv> <out.json> [season]
"""
import csv, json, sys, re, collections

SCORE = dict(py=0.04, ptd=4.0, ints=-1.0, ry=0.1, rtd=6.0,
             recy=0.1, rectd=6.0, rec=0.5, fum=-2.0)

GATES = {"QB": 3, "WR": 3, "TE": 3, "RB": 4}
POSITIONS = ("QB", "RB", "WR", "TE")
SUFFIX = {"jr", "sr", "ii", "iii", "iv", "v"}

# ⛔ nflverse SAYS "LA", THE FPA TABLE THIS FILE REPLACES SAYS "LAR". Normalised
# HERE, at the source, so the JSON matches the table it stands in for and no
# consumer has to remember. Sep 11 2026 lost every Rams card to exactly this
# split in vacated_2026.json, and the first fix normalised the wrong direction —
# the file is keyed the way the app keys it, which is the ADP table's spelling.
TEAM_FIX = {"LA": "LAR"}


def num(v):
    try:
        return float(v) if v not in ("", "NA", None) else 0.0
    except (TypeError, ValueError):
        return 0.0


def points(r):
    """⚠️ Mirrors build-gamelogs.py:points(). Change both or neither."""
    return (num(r["passing_yards"]) * SCORE["py"] + num(r["passing_tds"]) * SCORE["ptd"]
            + num(r["passing_interceptions"]) * SCORE["ints"]
            + num(r["rushing_yards"]) * SCORE["ry"] + num(r["rushing_tds"]) * SCORE["rtd"]
            + num(r["receiving_yards"]) * SCORE["recy"] + num(r["receiving_tds"]) * SCORE["rectd"]
            + num(r["receptions"]) * SCORE["rec"]
            + (num(r["sack_fumbles_lost"]) + num(r["rushing_fumbles_lost"])
               + num(r["receiving_fumbles_lost"])) * SCORE["fum"])


def normalize(s):
    """Mirror of App.jsx normalize(), plus suffix stripping. ⚠️ The period is
    DELETED, not replaced with a space — "A.J. Brown" is "aj brown"."""
    s = s.lower().strip()
    s = re.sub(r"[.,'’]", "", s)
    s = s.replace("-", " ")
    s = re.sub(r"[^a-z ]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    parts = s.split()
    while len(parts) > 1 and parts[-1] in SUFFIX:
        parts.pop()
    return " ".join(parts)


def adp_positions(app_path):
    """⚠️ POSITION COMES FROM THE ADP TABLE WHERE THE APP HAS AN OPINION.
    Travis Hunter plays both ways and nflverse files him as CB; his receiving
    points belong under WR. Players the table does not carry fall back to the
    release's own position, because this file covers everyone."""
    src = open(app_path, encoding="utf-8").read()
    i = src.index("const ADP_DATA")
    depth, j = 0, src.index("{", i)
    block = ""
    for x in range(j, len(src)):
        if src[x] == "{":
            depth += 1
        elif src[x] == "}":
            depth -= 1
            if depth == 0:
                block = src[j:x + 1]
                break
    return {normalize(m.group(1)): m.group(2)
            for m in re.finditer(r'"([^"]+)":\s*\{\s*adp:[^}]*?pos:\s*"(\w+)"', block)}


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    src_csv, out_path = sys.argv[1], sys.argv[2]
    season = int(sys.argv[3]) if len(sys.argv) > 3 else 2026

    try:
        rows = [r for r in csv.DictReader(open(src_csv, encoding="utf-8"))
                if r.get("season_type") == "REG"]
    except OSError:
        rows = []

    adp = adp_positions("App.jsx") if rows else {}

    # (defence, pos) -> week -> points allowed that week
    box = collections.defaultdict(lambda: collections.defaultdict(float))
    weeks = set()
    for r in rows:
        opp = r.get("opponent_team")
        if not opp:
            continue
        opp = TEAM_FIX.get(opp, opp)
        pos = adp.get(normalize(r.get("player_display_name", ""))) or r.get("position")
        if pos not in POSITIONS:
            continue
        wk = int(num(r.get("week")))
        if wk <= 0:
            continue
        weeks.add(wk)
        box[(opp, pos)][wk] += points(r)

    covered = len(weeks)
    defences = collections.defaultdict(dict)
    for (opp, pos), wk in box.items():
        gs = len(wk)
        if gs:
            # ⚠️ PER GAME, never per WEEK — a defence on bye played fewer.
            defences[opp][pos] = {"pts": round(sum(wk.values()) / gs, 2), "g": gs}

    # A position is live only when the season itself has enough weeks. The
    # switch is league-wide so every defence is ranked against one distribution.
    live = {p: covered >= GATES[p] for p in POSITIONS}

    out = {
        "_meta": {
            "season": season,
            "weeks_covered": covered,
            "max_week": max(weeks) if weeks else 0,
            "defences": len(defences),
            "gates": GATES,
            "live": live,
            "scoring": "half-PPR, 4pt passing TD",
            "population": "all players, not the draftable subset",
            "source": "nflverse-data stats_player weekly release",
            "scored": True,
            "reaches_ai_prompt": False,
            "derivation": "ANALYST-REFERENCE.md section 2b",
            "caveats": [
                "Raw points allowed, NOT schedule-adjusted. A defence that drew "
                "Kelce, Bowers and LaPorta looks soft at TE for reasons that are "
                "not the defence.",
                "A position goes live league-wide or not at all; mixing live and "
                "estimated defences would rank them against two distributions.",
                "When live, no COACHING_ADJ or OFFSEASON_ADJ_2026 applies — real "
                "results already contain whatever the defence became.",
            ],
        },
        "defences": dict(sorted(defences.items())),
    }
    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(out, fh, indent=1, sort_keys=False)
        fh.write("\n")

    print(f"{out_path}: {len(defences)} defences, {covered} weeks covered")
    for p in POSITIONS:
        n = sum(1 for d in defences.values() if p in d)
        print(f"   {p}: {n} defences  gate {GATES[p]}w  "
              f"{'LIVE' if live[p] else 'not yet — falls back to the estimate'}")


if __name__ == "__main__":
    main()
