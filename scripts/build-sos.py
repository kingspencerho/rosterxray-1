#!/usr/bin/env python3
"""
build-sos.py — season-long strength of schedule per team per position,
plus the year-over-year DELTA versus the prior season's slate.

Why this exists (Jul 26 2026): the app tiers matchups ONE WEEK AT A TIME
(getMatchupTier). It has never had a season-aggregate number, and it has
never had a way to see that the SCHEDULE ITSELF changed year over year.
Per the Source Hierarchy in CLAUDE.md, "the situation changed" outranks
"last year's raw production" — a slate that moved 20+ spots is exactly
that kind of change, and the engine was blind to it.

METHOD
  FPA (fantasy points allowed per game, by position) is computed from
  nflverse player stats for ONE base season, then applied to BOTH
  schedules. Holding defensive quality constant is deliberate: it
  isolates the schedule change from the defense-quality change. The
  delta answers "if every defense were exactly as good as it was in
  <base>, did your slate get easier or harder?" — nothing more.

  Scoring is HALF-PPR to match the app's existing FPA table (verified
  Jul 26 2026: computed TE-vs-CIN 17.45 against the app's hardcoded
  17.45, WR-vs-MIN 19.34 against 19.22 — the RotoWire table the app
  ships is half-PPR).

RANK CONVENTION (matches the public tables this was cross-checked against)
  rank 1  = EASIEST slate (opponents allowed the most points)
  rank 32 = HARDEST slate
  delta   = prior_rank - target_rank. POSITIVE = schedule got EASIER.

  Note the inversion versus getMatchupTier's internal rank, where rank 1
  is the softest single opponent. Same direction, different scale — do
  not mix the two numbers in one comparison.

FPA SELF-TEAM RULE (CLAUDE.md: "never violate")
  A team's SOS averages its OPPONENTS' FPA. A team's own defense never
  enters its own SOS. Asserted in check() below.

Usage:
  py -3.11 scripts/build-sos.py                       # 2026 vs 2025, base 2025
  py -3.11 scripts/build-sos.py --target 2026 --prior 2025 --base 2025
  py -3.11 scripts/build-sos.py --out grading/data/sos_2026.json
"""

import argparse, json, sys
from pathlib import Path

try:
    import nflreadpy as nfl
    import polars as pl
except ImportError:
    sys.exit("pip install nflreadpy  (nfl_data_py is deprecated — nflverse moved to nflreadpy)")

POSITIONS = ["QB", "RB", "WR", "TE"]

# nflverse ships the Rams as "LA"; every table in App.jsx uses "LAR".
# Normalize on the way out so the JSON keys join cleanly against FPA/BYES/
# TEAM_ENV/FULL_SCHEDULE. Verified Jul 26 2026: this is the ONLY code that
# differs across all 32 teams.
TEAM_ALIAS = {"LA": "LAR"}


def tm(code):
    return TEAM_ALIAS.get(code, code)


def half_ppr_fpa(season):
    """Fantasy points allowed per game, by defense and position. Half-PPR.

    half-PPR == the midpoint of nflverse's standard and PPR columns, since
    receptions are the only term that differs (1.0 vs 0.0 per catch).
    """
    ps = nfl.load_player_stats(seasons=[season]).filter(pl.col("season_type") == "REG")
    sched = nfl.load_schedules(seasons=[season]).filter(pl.col("game_type") == "REG")

    games = {}
    for row in sched.iter_rows(named=True):
        for side in ("home_team", "away_team"):
            games[tm(row[side])] = games.get(tm(row[side]), 0) + 1

    agg = (
        ps.filter(pl.col("position").is_in(POSITIONS))
        .group_by(["opponent_team", "position"])
        .agg(
            ((pl.col("fantasy_points") + pl.col("fantasy_points_ppr")) / 2)
            .sum()
            .alias("pts")
        )
    )

    fpa = {p: {} for p in POSITIONS}
    for row in agg.iter_rows(named=True):
        team, pos = tm(row["opponent_team"]), row["position"]
        if team in games:
            fpa[pos][team] = round(row["pts"] / games[team], 2)
    return fpa


def opponents(season):
    """{team: [opponent, ...]} for the regular season."""
    sched = nfl.load_schedules(seasons=[season]).filter(pl.col("game_type") == "REG")
    opp = {}
    for row in sched.iter_rows(named=True):
        h, a = tm(row["home_team"]), tm(row["away_team"])
        opp.setdefault(h, []).append(a)
        opp.setdefault(a, []).append(h)
    return opp


def season_sos(opp_map, fpa, pos):
    """{team: mean opponent FPA}. Higher = easier slate."""
    out = {}
    for team, opps in opp_map.items():
        vals = [fpa[pos][o] for o in opps if o in fpa[pos]]
        if vals:
            out[team] = sum(vals) / len(vals)
    return out


def rank_easiest_first(raw):
    """rank 1 = easiest (highest opponent FPA). Ties share the better rank."""
    ordered = sorted(raw.items(), key=lambda kv: -kv[1])
    ranks, prev_val, prev_rank = {}, None, 0
    for i, (team, val) in enumerate(ordered, start=1):
        if prev_val is not None and abs(val - prev_val) < 1e-9:
            ranks[team] = prev_rank
        else:
            ranks[team] = i
            prev_rank, prev_val = i, val
    return ranks


def check(target_opps, fpa):
    """Guard the CLAUDE.md self-team FPA rule and basic shape."""
    for team, opps in target_opps.items():
        assert team not in opps, f"{team} appears in its own opponent list"
    for pos in POSITIONS:
        assert len(fpa[pos]) == 32, f"{pos} FPA covers {len(fpa[pos])} teams, expected 32"
    assert len(target_opps) == 32, f"{len(target_opps)} teams in schedule, expected 32"
    # canary: if nflverse changes a code, this fails loudly instead of writing
    # a JSON whose keys silently miss every join in App.jsx.
    unaliased = {t for t in target_opps if t in TEAM_ALIAS}
    assert not unaliased, f"un-normalized nflverse codes leaked through: {unaliased}"


def build(target, prior, base, out_path):
    fpa = half_ppr_fpa(base)
    t_opps, p_opps = opponents(target), opponents(prior)
    check(t_opps, fpa)

    data = {
        "_meta": {
            "target_season": target,
            "prior_season": prior,
            "fpa_base_season": base,
            "scoring": "half-PPR",
            "rank_convention": "1 = easiest slate, 32 = hardest",
            "delta": "prior_rank - target_rank; positive = schedule got easier",
            "source": "nflverse via nflreadpy (load_player_stats, load_schedules)",
            "caveat": (
                "Defensive quality is held at the base season. High-churn "
                "defenses (see COACHING_ADJ) are low-confidence here for the "
                "same reason they are low-confidence in getMatchupTier."
            ),
        }
    }

    for pos in POSITIONS:
        t_raw, p_raw = season_sos(t_opps, fpa, pos), season_sos(p_opps, fpa, pos)
        t_rank, p_rank = rank_easiest_first(t_raw), rank_easiest_first(p_raw)
        data[pos] = {
            team: {
                "rank": t_rank[team],
                "prior_rank": p_rank.get(team),
                "delta": (p_rank[team] - t_rank[team]) if team in p_rank else None,
                "opp_fpa": round(t_raw[team], 2),
            }
            for team in sorted(t_raw)
        }

    data["_fpa_computed"] = fpa
    Path(out_path).write_text(json.dumps(data, indent=1), encoding="utf-8")
    return data


def report(data):
    for pos in POSITIONS:
        rows = sorted(data[pos].items(), key=lambda kv: -(kv[1]["delta"] or 0))
        easier = [f"{t} +{v['delta']}" for t, v in rows[:5]]
        harder = [f"{t} {v['delta']}" for t, v in rows[-5:]]
        print(f"{pos}  easier: {', '.join(easier)}")
        print(f"{pos}  harder: {', '.join(harder)}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=int, default=2026)
    ap.add_argument("--prior", type=int, default=2025)
    ap.add_argument("--base", type=int, default=2025, help="season used for defensive quality")
    ap.add_argument("--out", default="grading/data/sos_2026.json")
    a = ap.parse_args()
    report(build(a.target, a.prior, a.base, a.out))
    print(f"\nwrote {a.out}")
