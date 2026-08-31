#!/usr/bin/env python3
"""build-availability.py -> grading/data/availability_2026.json

ON-FIELD RATE — the share of his team's games a player was actually on the field
for, across the seasons he was under contract.

⚠ IT IS NAMED FOR WHAT IT MEASURES. The gameday inactive list is what would
separate "hurt" from "healthy and not playing", and nflverse does not ship it in
a usable form. So this counts games with OFFENSIVE SNAPS, which blends
availability with role: a backup quarterback who dresses every week and never
plays scores low here, and that is correct for fantasy — he contributes zero
either way — but it is not a medical finding about him. Read it beside snap
share, which separates the two.

THE GAP THIS FILLS. Every other metric in this app is a PER-GAME RATE, on
purpose: a rate is comparable across players who played different amounts. The
cost is that nothing anywhere expresses whether a player plays. A 17-game season
of a good player beats 11 games of a slightly better one, and best ball feels it
hardest — an empty week is a zero that cannot be substituted out of.

⚠ THE MEASUREMENT THAT MAKES THIS HONEST IS THE DENOMINATOR, and it is why this
script reads ROSTERS and not just game logs. Counting games played against games
played is circular. Counting them against 17 misses a fully lost season
entirely — an Achilles tear in August produces zero rows in the stats file, and
naive availability would simply skip that year and report the player as durable.
So a season counts toward the denominator whenever he appears on that season's
ROSTER, whether or not he ever took a snap.

TWO NUMBERS, BOTH REPORTED, NEVER AVERAGED INTO ONE:
    career   every rostered season. The durability profile.
    recent   the last three rostered seasons. The current one.
A 33-year-old with a clean decade and two broken years running is a different
bet from a 24-year-old with the same career figure, and one number cannot say
both.

⚠ WHAT THIS DOES NOT MEASURE. Availability and ROLE are different things. A
healthy backup appears in 17 games and is 100% available while being nobody's
starter, so this must always be read beside snap share. It also cannot separate
injury from a coach's decision, from suspension, from a holdout — the game was
missed and the reason is not in this data. Say that rather than implying a
medical finding.

CONTEXT ONLY — never feeds the numeric scoring engine.

Regenerate:
  for y in 2019 2020 2021 2022 2023 2024 2025; do
    curl -sSL -o roster_$y.csv  .../releases/download/rosters/roster_$y.csv
    curl -sSL -o week_$y.csv.gz .../releases/download/stats_player/stats_player_week_$y.csv.gz
  done
  python3 scripts/build-availability.py /path/to/dir grading/data/availability_2026.json
"""
import csv, glob, gzip, json, os, sys
from collections import defaultdict

SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/nfl"
OUT = sys.argv[2] if len(sys.argv) > 2 else "grading/data/availability_2026.json"

# Regular-season length. 2020 ran 16 games; everything from 2021 runs 17.
def season_games(year):
    return 16 if year <= 2020 else 17

RECENT_N = 3           # seasons in the "recent" window
MIN_SEASONS = 2        # below this, a career rate is one season wearing a label
FANTASY_POS = {"QB", "RB", "WR", "TE", "FB"}

# ⚠ THE ROSTER FILE IS NOT A LIST OF NFL PLAYERS. It carries ~3,100 rows a
# season including the practice squad and everyone cut in camp, and counting
# those seasons produced a league-wide median availability of 25% — a number
# that describes roster churn, not durability.
#
#   ACT  active roster          counts
#   RES  reserve / IR / PUP     counts — this is precisely the lost season
#   INA  inactive               counts
#   DEV  practice squad         EXCLUDED — not an NFL contributor
#   CUT  released               EXCLUDED — a roster decision, not availability
#   RET / TRD / TRC             EXCLUDED
COUNTED_STATUS = {"ACT", "RES", "INA"}

# Status alone is not enough. A fringe player signed in December appears as ACT
# with three games, and that is a fact about his ROLE rather than his health.
# So the population is limited to players who have held a real role at some
# point in the window — and for those players a zero-game rostered season is
# genuinely a season lost.
ESTABLISHED_GAMES = 8

SUFFIX = {"jr", "sr", "ii", "iii", "iv", "v"}

def norm(n):
    n = (n or "").lower().strip()
    for ch in ".,'’":
        n = n.replace(ch, "")
    parts = n.replace("-", " ").split()
    while len(parts) > 1 and parts[-1] in SUFFIX:
        parts.pop()
    return " ".join(parts)


def main():
    rosters = sorted(glob.glob(os.path.join(SRC, "roster_*.csv")))
    if not rosters:
        sys.exit(f"no roster_*.csv in {SRC}")

    # season -> {normalised name: (display name, position)}
    rostered = {}
    for path in rosters:
        year = int(os.path.basename(path).split("_")[1].split(".")[0])
        rostered[year] = {}
        with open(path, newline="") as f:
            for row in csv.DictReader(f):
                pos = (row.get("position") or "").upper()
                if pos not in FANTASY_POS:
                    continue
                if (row.get("status") or "").upper() not in COUNTED_STATUS:
                    continue
                nm = row.get("full_name") or row.get("player_name") or ""
                if nm:
                    rostered[year][norm(nm)] = (nm, pos)

    # season -> {normalised name: distinct weeks with offensive snaps}
    #
    # ⚠ THE NUMERATOR IS SNAPS, NOT STAT LINES. The weekly stats file only
    # carries a row when a stat actually occurred, so a blocking tight end, a
    # receiver who ran routes and drew no targets, and a quarterback who handed
    # off twice all read as absent. The first build of this file used stat lines
    # and put the league-wide median at 63%, which is a fact about who accrues
    # box-score events rather than about who plays.
    #
    # snap_counts has no gsis id, so it is keyed by normalised name — the same
    # join build-snap-trajectory.py already uses against this release.
    played = defaultdict(lambda: defaultdict(set))
    for year in sorted(rostered):
        path = os.path.join(SRC, f"snaps_{year}.csv.gz")
        if not os.path.exists(path):
            continue
        with gzip.open(path, "rt", newline="") as f:
            for row in csv.DictReader(f):
                if (row.get("game_type") or "REG") != "REG":
                    continue
                try:
                    snaps = float(row.get("offense_snaps") or 0)
                except ValueError:
                    snaps = 0
                wk = row.get("week") or ""
                nm = norm(row.get("player") or "")
                if nm and wk and snaps > 0:
                    played[year][nm].add(wk)

    seasons = sorted(rostered)
    recent_years = set(seasons[-RECENT_N:])

    # Established = held a real role in at least one covered season. Applied
    # BEFORE aggregation so a camp body never reaches the medians and skews the
    # population every percentile is read against.
    established = {key for year in seasons for key, wks in played[year].items()
                   if len(wks) >= ESTABLISHED_GAMES}

    agg = defaultdict(lambda: {"gp": 0, "poss": 0, "rgp": 0, "rposs": 0,
                               "seasons": [], "name": "", "pos": ""})
    for year in seasons:
        cap = season_games(year)
        for key, (nm, pos) in rostered[year].items():
            if key not in established:
                continue
            # A rostered season with zero snaps is a season MISSED, not a season
            # absent. That is the whole reason rosters are read here.
            gp = min(len(played[year].get(key, ())), cap)
            a = agg[key]
            a["name"] = nm; a["pos"] = pos
            a["gp"] += gp; a["poss"] += cap
            if year in recent_years:
                a["rgp"] += gp; a["rposs"] += cap
            a["seasons"].append({"y": year, "gp": gp, "of": cap})

    players = {}
    for key, a in agg.items():
        n_seasons = len(a["seasons"])
        if n_seasons < MIN_SEASONS or not a["poss"]:
            continue
        row = {
            "pos": a["pos"],
            "seasons": n_seasons,
            "gp": a["gp"],
            "possible": a["poss"],
            "career": round(a["gp"] / a["poss"], 3),
            "by_season": a["seasons"][-5:],
        }
        # The recent window is emitted only when it covers more than one season,
        # for the same reason the career figure gates at two: a single season is
        # a fact about one year and calling it a rate implies a trend.
        rseasons = [s for s in a["seasons"] if s["y"] in recent_years]
        if a["rposs"] and len(rseasons) >= 2:
            row["recent"] = round(a["rgp"] / a["rposs"], 3)
            row["recent_seasons"] = len(rseasons)
        # A missed season is the single most useful line in the record and is
        # invisible in either rate, so it is named explicitly.
        row["missed_full_seasons"] = sum(1 for s in a["seasons"] if s["gp"] == 0)
        players[key] = row

    vals = sorted(p["career"] for p in players.values())
    by_pos = defaultdict(list)
    for p in players.values():
        by_pos[p["pos"]].append(p["career"])
    out = {
        "_meta": {
            "as_of": 2026,
            "seasons_covered": [seasons[0], seasons[-1]],
            "source": "nflverse rosters (the denominator) x snap_counts, offensive snaps > 0 (the numerator)",
            "denominator": "team games in every season the player appeared on a ROSTER, so a fully missed season counts against him. Counting only seasons with a stat line would skip a lost year entirely and report the player as durable.",
            "recent_window": RECENT_N,
            "gates": {"min_seasons": MIN_SEASONS,
                      "counted_status": sorted(COUNTED_STATUS),
                      "established_games": ESTABLISHED_GAMES,
                      "note": "a one-season sample is a fact about one year; calling it a rate implies a trend. Practice-squad and cut seasons are excluded, and the population is limited to players who held a real role at some point — without that gate the league-wide median came out at 25%, which measures roster churn rather than durability"},
            "numerator_is_snaps": "Games with offensive snaps, NOT games with a stat line. A blocking TE, a receiver who ran routes and drew no targets, and a QB who handed off twice all record zero stats while playing, and counting stat lines put the median at 63%.",
            "not_role": "This blends availability with ROLE, because the gameday inactive list is unavailable. A backup who dresses every week and never plays scores low, which is correct for fantasy and is not a statement about his health. Read it beside snap share.",
            "not_medical": "This cannot separate injury from a coaching decision, a suspension or a holdout. The player was off the field; the reason is not in this data.",
            "hierarchy_rank": "2 — opportunity. It is the volume multiplier every per-game rate in this app silently assumes.",
            "medians": {"all": round(vals[len(vals) // 2], 3),
                        **{k: round(sorted(v)[len(v) // 2], 3) for k, v in by_pos.items() if len(v) >= 12}},
            "counts": {"players": len(players),
                       **{k: len(v) for k, v in sorted(by_pos.items())}},
        },
        "players": players,
    }
    with open(OUT, "w") as f:
        json.dump(out, f, indent=1, sort_keys=True)
    print(f"wrote {OUT}: {len(players)} players, {seasons[0]}-{seasons[-1]}")
    print("  medians:", out["_meta"]["medians"])
    worst = sorted((kv for kv in players.items() if kv[1]["seasons"] >= 4),
                   key=lambda kv: kv[1]["career"])[:6]
    for n, p in worst:
        print(f"  {n:24s} {p['pos']:3s} {p['career']*100:5.1f}% career  "
              f"{p['gp']}/{p['possible']}  {p['missed_full_seasons']} lost season(s)")

if __name__ == "__main__":
    main()
