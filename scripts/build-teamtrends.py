#!/usr/bin/env python3
"""
build-teamtrends.py — the three Section 4 team-level inputs that have never
had data behind them: OFFENSIVE PROE, NEUTRAL-SCRIPT PACE, and the
DEFENSIVE FUNNEL split.

CONTEXT ONLY. Nothing here reaches analyzeRoster, analyzeRedraft or the AI
prompt, and _meta records both facts so a guard can assert them.

WHY A SIXTH IN-SEASON LAYER
  CLAUDE.md Section 4 has specified all three since July and none of them
  was computable: Macro Volume Multipliers wants neutral-script pace and
  offensive PROE, and the Defensive Funnel Filter wants the pass/rush EPA
  split. PLAYOFF_GAME_TOTALS is hand-typed and holds W15-17 only, so there
  was no W1-14 source for any of it.

⚠️  TWO CENTRING TRAPS, BOTH MEASURED ON 2025 AND BOTH LOAD-BEARING
  1. THE FUNNEL GAP IS NOT CENTRED ON ZERO. Passing is more efficient than
     running league-wide, so every defence allows more EPA per pass than
     per rush. Raw mean gap +0.025 with sd 0.102 — a bare sign test would
     call most of the league a "pass funnel" and mean nothing. The label is
     computed against the LEAGUE MEAN of that season, never against zero.
  2. PROE IS NOT CENTRED ON ZERO EITHER. nflfastR's xpass model is fit on
     history and a given season drifts off it: 2025's league mean pass_oe
     is -1.74, not 0.00. Labelling off the raw number would call two thirds
     of the league run-heavy.
  Both raw and league-relative values are stored. RAW matches the published
  convention so a reader can check it against a public table; RELATIVE is
  what the label is computed from.

⚠️  THE OFFENCE AND DEFENCE HALVES ARE NESTED, NOT FLAT, ON PURPOSE
  A team's funnel describes ITS DEFENCE, which is a fact about the players
  it FACES. Flat keys (proe / pace / funnel all on "KC") is precisely the
  shape that produces the FPA Direction error CLAUDE.md forbids. `off` and
  `def` make the direction structural instead of a naming convention.

⚠️  ALL THREE STABILISE SLOWLY. THE GATES ARE DERIVED, NOT CHOSEN.
  Measured by resampling each team's own 2025 plays, the rule applied is
  "mean absolute sampling error <= half the league spread":

      metric   league sd   gate        error at the gate
      PROE      3.33 pp    300 plays   1.67 pp
      pace      1.08 s     200 plays   0.47 s
      funnel    0.102      350/side    0.047

  In games that is roughly week 5 for PROE and pace and week 10 for the
  funnel. A current-season team below its gate emits the count and NO
  value, so the absence says "not readable yet" rather than reading as a
  flat league-average team.

⚠️  PACE IS SNAP-TO-SNAP AND IS NOT COMPARABLE TO A PUBLISHED PACE TABLE.
  It measures elapsed game clock between consecutive snaps on the same
  drive, which includes the previous play's own duration — so the absolute
  numbers run ~5s higher than tables that measure from the end of a play.
  The RANKING is the product; the number is not a citable figure.

Usage:
  python3 scripts/build-teamtrends.py --pbp pbp_2025.csv.gz \
      --season 2025 --out grading/data/teamtrends_2025.json
  python3 scripts/build-teamtrends.py --season 2026 --empty \
      --out grading/data/teamtrends_2026.json

There is deliberately NO HTTP client here: the shell fetches, this parses.
Same split as build-status.py and build-gameenv.py, and it keeps the
builder runnable offline against a fixture.
"""

import argparse, csv, gzip, json, statistics as st, sys
from datetime import datetime, timezone

# Neutral script, per CLAUDE.md Section 4: within 7 points, Q1-Q3.
NEUTRAL_MARGIN = 7
NEUTRAL_MAX_QTR = 3
# Two-minute drills are not a tendency, they are a clock state.
NEUTRAL_MIN_HALF_SECONDS = 120
# A snap-to-snap delta outside this band spans a possession change or a
# stoppage the clock did not run through; it is not pace.
PACE_MIN_DELTA, PACE_MAX_DELTA = 0, 45

# Derived: see the docstring. mean abs sampling error <= half the league sd.
GATES = {"proe_plays": 300, "pace_plays": 200, "funnel_plays_per_side": 350}

# Minimum sample before a team is counted toward the league distribution the
# thresholds are derived from. Keeps a 1-game team from widening the sd.
LEAGUE_MIN = {"proe": 200, "pace": 120, "funnel": 200}


def fnum(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def read_pbp(path):
    op = gzip.open if str(path).endswith(".gz") else open
    with op(path, "rt", newline="") as f:
        for row in csv.DictReader(f):
            if row.get("season_type") != "REG":
                continue
            yield row


def collect(rows):
    """One pass over the season; three accumulators."""
    oe = {}          # posteam -> [pass_oe]
    pace = {}        # posteam -> [seconds between snaps, neutral only]
    dpass = {}       # defteam -> [epa allowed on a pass]
    drush = {}       # defteam -> [epa allowed on a rush]
    weeks = set()
    games = {}       # team -> set(game_id)

    prev = None
    for r in rows:
        wk = fnum(r.get("week"))
        if wk:
            weeks.add(int(wk))
        pt = r.get("play_type")
        off, dfn = r.get("posteam"), r.get("defteam")
        gid = r.get("game_id")

        if off and gid:
            games.setdefault(off, set()).add(gid)
        if dfn and gid:
            games.setdefault(dfn, set()).add(gid)

        # --- PROE. nflfastR computes pass_oe only where xpass is defined,
        #     which is already the pass/run universe we want.
        v = fnum(r.get("pass_oe"))
        if v is not None and off:
            oe.setdefault(off, []).append(v)

        # --- Defensive EPA split.
        e = fnum(r.get("epa"))
        if e is not None and dfn:
            if pt == "pass":
                dpass.setdefault(dfn, []).append(e)
            elif pt == "run":
                drush.setdefault(dfn, []).append(e)

        # --- Pace. Consecutive snaps, same game, same offence, same drive.
        if pt in ("pass", "run"):
            if (prev is not None
                    and prev.get("game_id") == gid
                    and prev.get("posteam") == off
                    and prev.get("drive") == r.get("drive")):
                a = fnum(prev.get("game_seconds_remaining"))
                b = fnum(r.get("game_seconds_remaining"))
                sd = fnum(r.get("score_differential"))
                q = fnum(r.get("qtr"))
                hsr = fnum(r.get("half_seconds_remaining"))
                if a is not None and b is not None:
                    d = a - b
                    neutral = (sd is not None and abs(sd) <= NEUTRAL_MARGIN
                               and q is not None and q <= NEUTRAL_MAX_QTR
                               and (hsr is None or hsr > NEUTRAL_MIN_HALF_SECONDS))
                    if PACE_MIN_DELTA < d <= PACE_MAX_DELTA and neutral and off:
                        pace.setdefault(off, []).append(d)
            prev = r

    return oe, pace, dpass, drush, weeks, games


def mean(xs):
    return sum(xs) / len(xs) if xs else None


def label(rel, sd, hi, lo):
    """One SD either side of the league mean, or neither."""
    if rel is None or not sd:
        return None
    if rel >= sd:
        return hi
    if rel <= -sd:
        return lo
    return "average"


def build(oe, pace, dpass, drush, weeks, games):
    # League distributions, computed only over teams with a real sample so a
    # one-game team cannot widen the spread the thresholds come from.
    proe_raw = {t: mean(v) for t, v in oe.items() if len(v) >= LEAGUE_MIN["proe"]}
    pace_raw = {t: mean(v) for t, v in pace.items() if len(v) >= LEAGUE_MIN["pace"]}
    gap_raw = {}
    for t in dpass:
        if len(dpass.get(t, [])) >= LEAGUE_MIN["funnel"] and len(drush.get(t, [])) >= LEAGUE_MIN["funnel"]:
            gap_raw[t] = mean(dpass[t]) - mean(drush[t])

    def dist(d):
        vals = list(d.values())
        if len(vals) < 8:
            return None, None
        return st.mean(vals), st.pstdev(vals)

    proe_mu, proe_sd = dist(proe_raw)
    pace_mu, pace_sd = dist(pace_raw)
    gap_mu, gap_sd = dist(gap_raw)

    teams = {}
    for t in sorted(set(list(oe) + list(pace) + list(dpass) + list(drush))):
        off, dfn = {}, {}

        n = len(oe.get(t, []))
        off["proe_plays"] = n
        if n >= GATES["proe_plays"] and proe_mu is not None:
            raw = mean(oe[t])
            rel = raw - proe_mu
            off["proe"] = round(raw, 2)
            off["proe_rel"] = round(rel, 2)
            off["proe_label"] = label(rel, proe_sd, "pass-heavy", "run-heavy")

        n = len(pace.get(t, []))
        off["pace_plays"] = n
        if n >= GATES["pace_plays"] and pace_mu is not None:
            raw = mean(pace[t])
            rel = raw - pace_mu
            off["pace"] = round(raw, 2)
            off["pace_rel"] = round(rel, 2)
            # Fewer seconds between snaps is FASTER, so the sign flips.
            off["pace_label"] = label(-rel, pace_sd, "fast", "slow")

        np_, nr = len(dpass.get(t, [])), len(drush.get(t, []))
        dfn["pass_plays"], dfn["rush_plays"] = np_, nr
        if np_ >= GATES["funnel_plays_per_side"] and nr >= GATES["funnel_plays_per_side"] and gap_mu is not None:
            pe, re_ = mean(dpass[t]), mean(drush[t])
            raw = pe - re_
            rel = raw - gap_mu
            dfn["pass_epa"] = round(pe, 4)
            dfn["rush_epa"] = round(re_, 4)
            dfn["funnel"] = round(raw, 4)
            dfn["funnel_rel"] = round(rel, 4)
            dfn["funnel_label"] = label(rel, gap_sd, "pass funnel", "run funnel")

        teams[t] = {"games": len(games.get(t, set())), "off": off, "def": dfn}

    max_week = max(weeks) if weeks else 0
    league = {}
    if proe_mu is not None:
        league["proe_mean"], league["proe_sd"] = round(proe_mu, 3), round(proe_sd, 3)
    if pace_mu is not None:
        league["pace_mean"], league["pace_sd"] = round(pace_mu, 3), round(pace_sd, 3)
    if gap_mu is not None:
        league["funnel_mean"], league["funnel_sd"] = round(gap_mu, 4), round(gap_sd, 4)

    return teams, max_week, league


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pbp")
    ap.add_argument("--season", type=int, required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--empty", action="store_true",
                    help="emit a zero-row placeholder through the real code path")
    a = ap.parse_args()

    if a.empty:
        rows = []
    else:
        if not a.pbp:
            sys.exit("build-teamtrends: --pbp is required unless --empty")
        rows = read_pbp(a.pbp)

    oe, pace, dpass, drush, weeks, games = collect(rows)
    teams, max_week, league = build(oe, pace, dpass, drush, weeks, games)

    out = {
        "_meta": {
            "season": a.season,
            "weeks_covered": max_week,
            "season_complete": max_week >= 18,
            "teams_covered": len(teams),
            "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "source": "nflverse play_by_play (nflfastR); pass_oe/xpass and epa as published",
            "scored": False,
            "reaches_ai_prompt": False,
            "gates": GATES,
            "gate_rule": "mean absolute sampling error <= half the league spread, "
                         "measured by resampling each team's own 2025 plays",
            "neutral": {"margin": NEUTRAL_MARGIN, "max_qtr": NEUTRAL_MAX_QTR,
                        "min_half_seconds": NEUTRAL_MIN_HALF_SECONDS},
            "league": league,
            "threshold_source": "1 SD of this build's own league distribution",
            "caveats": [
                "PROE and the funnel gap are labelled against the LEAGUE MEAN of this "
                "season, never against zero: 2025 league mean pass_oe is -1.74 and the "
                "league mean funnel gap is positive because passing is more efficient "
                "than running everywhere.",
                "off describes the team's OWN offence. def describes the defence it "
                "fields, which is a fact about the players who FACE it — never about "
                "its own skill players.",
                "Pace is snap-to-snap elapsed clock and includes the previous play's "
                "duration, so it runs ~5s higher than published pace tables. Use the "
                "ranking, not the number.",
                "A partial season's own SD is inflated by sampling noise, so a partial "
                "build flags FEWER teams than a complete one. That is the conservative "
                "direction and is intended.",
            ],
        },
        "teams": teams,
    }

    with open(a.out, "w", newline="", encoding="utf-8") as f:
        json.dump(out, f, indent=1, sort_keys=True)
        f.write("\n")

    print("teamtrends: season %d, weeks %d, %d teams -> %s"
          % (a.season, max_week, len(teams), a.out))
    if league:
        print("  league  PROE %+.2f sd %.2f   pace %.2f sd %.2f   funnel %+.3f sd %.3f"
              % (league.get("proe_mean", 0), league.get("proe_sd", 0),
                 league.get("pace_mean", 0), league.get("pace_sd", 0),
                 league.get("funnel_mean", 0), league.get("funnel_sd", 0)))


if __name__ == "__main__":
    main()
