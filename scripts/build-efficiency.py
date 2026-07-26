#!/usr/bin/env python3
"""
build-efficiency.py — per-touch EFFICIENCY, split into a rushing axis and a
receiving axis, ranked within position.

Why this exists (Jul 26 2026): every one of the 18 fields in
player_metrics_2025.json measures OPPORTUNITY (tgt_sh, snap_sh, wopr,
hvt_pg, gz_car) or OUTCOME FREQUENCY (spike_rate, dud_rate). None of them
measures what a player did per touch. The engine could not tell a back who
gets 20 carries and produces from one who gets 20 carries and does not.

Concretely: McCaffrey 2025 grades elite on every existing field (hvt_pg
3.65, 102 rec, 23.3% target share, 70.6% spike rate) while being one of
the least efficient rushers in the league. Jaylen Warren is the mirror
image — efficient on both axes at a 50.8% snap share, which the engine
reads as "backup." Volume-without-efficiency scored too well and
efficiency-without-volume was invisible.

TWO AXES, DELIBERATELY SEPARATE
  Rushing and receiving efficiency do not correlate. A back can be a
  bottom-5 runner and the best receiving back alive. Collapsing them into
  one "efficiency" number destroys exactly the signal that makes this
  worth adding, so they stay separate all the way to the output.

SOURCES (both free, both nflverse)
  PRIMARY   ffopportunity expected fantasy points. rush/rec fantasy points
            OVER EXPECTED, per opportunity. Model-adjusted, covers every
            skill player with volume. This is the axis pair.
  SECONDARY NFL Next Gen Stats player tracking. rush_yards_over_expected_
            per_att, avg_yac_above_expectation, avg_separation. Narrower
            coverage (qualified players only) but it is tracking data, not
            box score, so it is the better tiebreaker where present.

  Both are stored. Neither is YPRR. Public data still has no per-route
  participation, so a true yards-per-route-run remains impossible — see
  the same note in build-player-metrics.py.

MIN VOLUME
  Ranks are computed only over players clearing the volume gate, so a
  back with 6 efficient carries does not outrank a workhorse. Players
  below the gate get the raw value and a null rank.

Usage:
  py -3.11 scripts/build-efficiency.py
  py -3.11 scripts/build-efficiency.py --season 2025 --out grading/data/player_efficiency_2025.json
"""

import argparse, json, re, sys
from pathlib import Path

try:
    import nflreadpy as nfl
    import polars as pl
except ImportError:
    sys.exit("pip install nflreadpy")

MIN_CARRIES = 40      # ~2.5/game over a season; below this YPC noise dominates
MIN_TARGETS = 25      # matches the volume floor where target-based rates stabilize
POSITIONS = ["QB", "RB", "WR", "TE"]


def normalize(name):
    """EXACT mirror of App.jsx normalize() and build-player-metrics.py.
    lowercase, strip [.,'], hyphen -> space, collapse whitespace.
    Suffixes (Jr/III) are KEPT — App.jsx getMetrics() handles them."""
    n = name.lower().strip()
    n = re.sub(r"[.,']", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)


def rank_desc(pairs):
    """rank 1 = most efficient. pairs = [(key, value)]. Ties share a rank."""
    ordered = sorted(pairs, key=lambda kv: -kv[1])
    ranks, prev_val, prev_rank = {}, None, 0
    for i, (key, val) in enumerate(ordered, start=1):
        if prev_val is not None and abs(val - prev_val) < 1e-12:
            ranks[key] = prev_rank
        else:
            ranks[key] = i
            prev_rank, prev_val = i, val
    return ranks


def load_opportunity(season):
    """Season totals of expected vs actual fantasy points, per player."""
    o = nfl.load_ff_opportunity(seasons=[season], stat_type="weekly")
    agg = o.group_by(["player_id", "full_name", "position"]).agg(
        pl.col("rush_fantasy_points_diff").sum().alias("rush_diff"),
        pl.col("rec_fantasy_points_diff").sum().alias("rec_diff"),
        pl.col("rush_fantasy_points_exp").sum().alias("rush_exp"),
        pl.col("rec_fantasy_points_exp").sum().alias("rec_exp"),
        pl.col("rush_attempt").sum().alias("carries_opp"),
    )
    return {r["player_id"]: r for r in agg.iter_rows(named=True)}


def load_volume(season):
    """Regular-season carries and targets, per player."""
    ps = nfl.load_player_stats(seasons=[season]).filter(pl.col("season_type") == "REG")
    agg = ps.group_by(["player_id", "player_display_name", "position"]).agg(
        pl.col("carries").sum().alias("carries"),
        pl.col("targets").sum().alias("targets"),
    )
    return {r["player_id"]: r for r in agg.iter_rows(named=True)}


def load_ngs(season):
    """Next Gen Stats season rows (week 0 is the season aggregate)."""
    out = {}
    rush = nfl.load_nextgen_stats(seasons=[season], stat_type="rushing").filter(
        (pl.col("week") == 0) & (pl.col("season_type") == "REG")
    )
    for r in rush.iter_rows(named=True):
        out.setdefault(r["player_gsis_id"], {}).update(
            ngs_ryoe_att=r["rush_yards_over_expected_per_att"],
            ngs_rush_pct_oe=r["rush_pct_over_expected"],
        )
    rec = nfl.load_nextgen_stats(seasons=[season], stat_type="receiving").filter(
        (pl.col("week") == 0) & (pl.col("season_type") == "REG")
    )
    for r in rec.iter_rows(named=True):
        out.setdefault(r["player_gsis_id"], {}).update(
            ngs_yac_oe=r["avg_yac_above_expectation"],
            ngs_separation=r["avg_separation"],
        )
    return out


def build(season, out_path):
    opp, vol, ngs = load_opportunity(season), load_volume(season), load_ngs(season)

    rows = {}
    for pid, o in opp.items():
        v = vol.get(pid, {})
        pos = o["position"] or v.get("position")
        if pos not in POSITIONS:
            continue
        carries = v.get("carries") or o["carries_opp"] or 0
        targets = v.get("targets") or 0
        rec = {
            "pos": pos,
            "carries": int(carries),
            "targets": int(targets),
            # points over expected PER OPPORTUNITY — the two axes
            "rush_poe_att": round(o["rush_diff"] / carries, 4) if carries >= MIN_CARRIES else None,
            "rec_poe_tgt": round(o["rec_diff"] / targets, 4) if targets >= MIN_TARGETS else None,
            # season totals, for context when a rank looks surprising
            "rush_poe_total": round(o["rush_diff"], 1),
            "rec_poe_total": round(o["rec_diff"], 1),
        }
        rec.update(ngs.get(pid, {}))
        rows[normalize(o["full_name"] or v.get("player_display_name", ""))] = rec

    # Rank within position, only over players clearing the volume gate.
    qualified = {}
    for pos in POSITIONS:
        for field, rank_name in (("rush_poe_att", "rush_eff_rank"),
                                 ("rec_poe_tgt", "rec_eff_rank"),
                                 ("ngs_ryoe_att", "ngs_rush_rank")):
            pairs = [(k, r[field]) for k, r in rows.items()
                     if r["pos"] == pos and r.get(field) is not None]
            for k, rk in rank_desc(pairs).items():
                rows[k][rank_name] = rk
            for k, r in rows.items():
                if r["pos"] == pos:
                    r.setdefault(rank_name, None)
            if pairs:
                qualified[f"{pos}_{rank_name}"] = len(pairs)

    out = {
        "_meta": {
            "season": season,
            "source": "nflverse via nflreadpy (load_ff_opportunity, load_player_stats, load_nextgen_stats)",
            "axes": "rush_poe_att and rec_poe_tgt are fantasy points OVER EXPECTED per carry / per target",
            "rank_convention": "1 = most efficient within position; null = below the volume gate",
            "min_volume": {"carries": MIN_CARRIES, "targets": MIN_TARGETS},
            "qualified_counts": qualified,
            "not_yprr": (
                "This is NOT yards per route run. Public data has no per-route "
                "participation, so YPRR cannot be computed. These are per-carry "
                "and per-target rates."
            ),
        },
        "players": rows,
    }
    Path(out_path).write_text(json.dumps(out, indent=1), encoding="utf-8")
    return out


def check(out):
    """One runnable assertion set: the axes must actually disagree.

    If rushing and receiving efficiency ranks were near-duplicates, the whole
    two-axis premise would be wrong and one column would do. Correlation is
    computed over backs qualifying on BOTH gates.
    """
    p = out["players"]
    both = [(r["rush_eff_rank"], r["rec_eff_rank"]) for r in p.values()
            if r["pos"] == "RB" and r.get("rush_eff_rank") and r.get("rec_eff_rank")]
    assert len(both) >= 20, f"only {len(both)} RBs qualified on both axes"
    n = len(both)
    mx = sum(a for a, _ in both) / n
    my = sum(b for _, b in both) / n
    cov = sum((a - mx) * (b - my) for a, b in both)
    vx = sum((a - mx) ** 2 for a, _ in both) ** 0.5
    vy = sum((b - my) ** 2 for _, b in both) ** 0.5
    r = cov / (vx * vy)
    assert abs(r) < 0.6, f"axes are near-duplicates (r={r:.2f}); one column would do"
    return n, r


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=2025)
    ap.add_argument("--out", default="grading/data/player_efficiency_2025.json")
    a = ap.parse_args()
    out = build(a.season, a.out)
    n, r = check(out)
    print(f"players: {len(out['players'])}")
    print(f"qualified: {out['_meta']['qualified_counts']}")
    print(f"RB axis independence: n={n}, r={r:+.2f} (near 0 = the two axes carry different information)")
    print(f"wrote {a.out}")
