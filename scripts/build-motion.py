#!/usr/bin/env python3
"""
build-motion.py — receiver production split by whether the offense used
pre-snap motion, plus a team-level motion-rate table.

⚠️ READ THIS BEFORE TRUSTING THE OUTPUT ⚠️
FTN's `is_motion` is a PLAY-LEVEL flag. It records that the offense put
SOMEBODY in motion on that snap. It does NOT record which player moved.

So the metric this script produces is:
    "this receiver's production on snaps where his offense used motion"
It is NOT:
    "this receiver's production when HE is the one in motion"

Those are different questions. The published player-level motion splits
(PFF, Fantasy Points Data) answer the second one and are paywalled — route
and player-motion charting is not in any free feed. Effect sizes here will
be smaller and noisier than published numbers, because every non-moving
receiver on a motion play is counted too. Do not present a number from this
file as if it were a player-level motion split, and do not expect it to
reproduce a PFF figure.

What it IS good for: a cheap first pass on whether a receiver's offense
leans on motion, and whether he produces more when it does. Pair it with
PLAYCALLER_PROFILES, which already carries the team-level scheme notes
qualitatively (LAC "league-high at-snap motion", TB "2nd-highest", DET
"historically low"). This puts numbers under those notes.

Denominator is TARGETS, not routes. Routes are unavailable — same reason
as the YPRR note in build-player-metrics.py.

Usage:
  py -3.11 scripts/build-motion.py
  py -3.11 scripts/build-motion.py --season 2025 --out grading/data/motion_2025.json
"""

import argparse, json, re, sys
from pathlib import Path

try:
    import nflreadpy as nfl
    import polars as pl
except ImportError:
    sys.exit("pip install nflreadpy")

MIN_TOTAL_TGT = 30   # season targets before a split is worth reporting
MIN_SPLIT_TGT = 10   # targets required in EACH bucket, or the lift is noise
TEAM_ALIAS = {"LA": "LAR"}   # see build-sos.py — nflverse ships the Rams as LA


def normalize(name):
    """Mirror of App.jsx normalize(). See build-player-metrics.py."""
    n = name.lower().strip()
    n = re.sub(r"[.,']", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)


def joined(season):
    """pbp pass attempts with a named receiver, joined to FTN charting."""
    pbp = (
        nfl.load_pbp(seasons=[season])
        .filter(
            (pl.col("season_type") == "REG")
            & (pl.col("pass_attempt") == 1)
            & pl.col("receiver_player_id").is_not_null()
        )
        .select("game_id", "play_id", "posteam", "receiver_player_id",
                "receiver_player_name", "yards_gained", "epa", "complete_pass")
    )
    ftn = nfl.load_ftn_charting(seasons=[season]).select(
        pl.col("nflverse_game_id").alias("game_id"),
        pl.col("nflverse_play_id").alias("play_id"),
        "is_motion",
    )
    # play_id dtypes differ across the two feeds; align before joining.
    pbp = pbp.with_columns(pl.col("play_id").cast(pl.Int64))
    ftn = ftn.with_columns(pl.col("play_id").cast(pl.Int64))
    return pbp.join(ftn, on=["game_id", "play_id"], how="inner").filter(
        pl.col("is_motion").is_not_null()
    )


def full_names():
    """gsis_id -> display_name.

    pbp ships `receiver_player_name` ABBREVIATED ("A.Brown"). Normalizing that
    yields "abrown", which is both unjoinable against PLAYER_METRICS and
    ambiguous (A.Brown = AJ Brown or Anthony Brown). Resolve through the id.
    """
    p = nfl.load_players().select("gsis_id", "display_name")
    return {r["gsis_id"]: r["display_name"] for r in p.iter_rows(named=True)
            if r["gsis_id"] and r["display_name"]}


def build(season, out_path):
    df = joined(season)
    names = full_names()

    team_rate = {}
    for r in df.group_by("posteam").agg(
        pl.col("is_motion").mean().alias("rate"), pl.len().alias("n")
    ).iter_rows(named=True):
        if r["posteam"]:
            team_rate[TEAM_ALIAS.get(r["posteam"], r["posteam"])] = {
                "motion_tgt_rate": round(r["rate"], 3),
                "pass_plays": r["n"],
            }

    agg = df.group_by(["receiver_player_id", "receiver_player_name", "is_motion"]).agg(
        pl.len().alias("tgt"),
        pl.col("yards_gained").sum().alias("yds"),
        pl.col("epa").mean().alias("epa_tgt"),
        pl.col("complete_pass").mean().alias("catch_rate"),
    )

    by_player = {}
    for r in agg.iter_rows(named=True):
        b = by_player.setdefault(r["receiver_player_id"], {"name": r["receiver_player_name"]})
        b["motion" if r["is_motion"] else "static"] = r

    players, unresolved = {}, 0
    for pid, b in by_player.items():
        m, s = b.get("motion"), b.get("static")
        if not m or not s:
            continue
        total = m["tgt"] + s["tgt"]
        if total < MIN_TOTAL_TGT or m["tgt"] < MIN_SPLIT_TGT or s["tgt"] < MIN_SPLIT_TGT:
            continue
        full = names.get(pid)
        if not full:
            unresolved += 1
            continue
        ypt_m, ypt_s = m["yds"] / m["tgt"], s["yds"] / s["tgt"]
        players[normalize(full)] = {
            "tgt_motion": m["tgt"],
            "tgt_static": s["tgt"],
            "motion_tgt_share": round(m["tgt"] / total, 3),
            "ypt_motion": round(ypt_m, 2),
            "ypt_static": round(ypt_s, 2),
            "ypt_lift_pct": round((ypt_m - ypt_s) / ypt_s * 100, 1) if ypt_s > 0 else None,
            "epa_motion": round(m["epa_tgt"], 3),
            "epa_static": round(s["epa_tgt"], 3),
            "epa_lift": round(m["epa_tgt"] - s["epa_tgt"], 3),
        }

    out = {
        "_meta": {
            "season": season,
            "source": "nflverse via nflreadpy (load_pbp + load_ftn_charting), FTN Data charting",
            "credit": "Charting data (2022+) courtesy of FTN Data via nflverse, CC-BY-SA 4.0",
            "WARNING": (
                "is_motion is PLAY-level: the offense used motion, not that THIS "
                "player was in motion. This is a team-scheme split measured on a "
                "player's targets, NOT a player-level motion split. Player-level "
                "motion and routes-run are paywalled (PFF / Fantasy Points Data)."
            ),
            "denominator": "targets, not routes — route participation is unavailable publicly",
            "min_volume": {"total_targets": MIN_TOTAL_TGT, "per_bucket": MIN_SPLIT_TGT},
            "league_motion_rate": round(df["is_motion"].mean(), 3),
            "unresolved_ids": unresolved,
        },
        "teams": dict(sorted(team_rate.items())),
        "players": dict(sorted(players.items())),
    }
    Path(out_path).write_text(json.dumps(out, indent=1), encoding="utf-8")
    return out


def check(out):
    """The join is the failure mode. If FTN and pbp keys drift, the inner join
    silently returns few rows and every split looks clean but means nothing."""
    assert len(out["teams"]) == 32, f"{len(out['teams'])} teams, expected 32"
    thin = [t for t, v in out["teams"].items() if v["pass_plays"] < 300]
    assert not thin, f"suspiciously few joined pass plays for: {thin}"
    rate = out["_meta"]["league_motion_rate"]
    assert 0.2 < rate < 0.7, f"league motion rate {rate} is implausible — check the join"
    # canary for the abbreviated-name bug (pbp "A.Brown" -> "abrown"): every
    # key must be a resolved full name, or nothing joins to PLAYER_METRICS.
    bad = [k for k in out["players"] if " " not in k]
    assert not bad, f"unresolved abbreviated keys: {bad[:5]}"
    return len(out["players"])


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=2025)
    ap.add_argument("--out", default="grading/data/motion_2025.json")
    a = ap.parse_args()
    out = build(a.season, a.out)
    n = check(out)
    tr = sorted(out["teams"].items(), key=lambda kv: -kv[1]["motion_tgt_rate"])
    print(f"league motion rate: {out['_meta']['league_motion_rate']}")
    print("most motion: " + ", ".join(f"{t} {v['motion_tgt_rate']:.0%}" for t, v in tr[:5]))
    print("least motion: " + ", ".join(f"{t} {v['motion_tgt_rate']:.0%}" for t, v in tr[-5:]))
    print(f"players with a usable split: {n}")
    print(f"wrote {a.out}")
