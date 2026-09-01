#!/usr/bin/env python3
"""build-coverage.py -> grading/data/coverage_2025.json

Receiving production split by MAN versus ZONE coverage, from the NFL
participation feed's `defense_man_zone_type`. 2025: 7,035 man snaps and 15,020
zone snaps, and 16,687 of 16,699 targets carry a label.

⚠️⚠️ READ THE STABILITY BEFORE READING ANYTHING ELSE ⚠️⚠️

    ypt_man - ypt_zone (the "edge")   r = 0.161   23>24 0.199, 24>25 0.122
    ypt_man                           r = 0.235
    ypt_zone                           r = 0.294
    man_rate (share of targets vs man) r = 0.335

**THE MAN/ZONE EDGE DOES NOT CARRY YEAR TO YEAR.** At 0.161 it sits beside RB
yards per carry (0.022) and per-target efficiency (0.31) in the coin-flip band,
far below every input the app projects from. It is emitted as a DESCRIPTION OF
2025 and nothing else — the same treatment `player_efficiency_2025.json` gets,
for the same measured reason.

Three consequences, all deliberate:
  1. It renders in the player card's REFERENCE group, dimmed, beside efficiency.
  2. **It is NOT in the AI prompt.** Efficiency is, with warnings, because its
     weakest field still beats this one. A model quoting a 0.16 figure as a
     talent claim is precisely the failure the prompt warnings exist to prevent,
     and the cheapest defence is not handing it the number.
  3. Nothing scores off it. See the scoring wall.

WHY BUILD IT AT ALL. It answers a question the app previously could not touch
and that separation actively invites: `avg_separation` averages across every
coverage a receiver faced, so a contested-catch profile who wins by
out-positioning rather than by getting open scores low with no way to say so.
This is the qualifier. It just turns out the qualifier is descriptive.

⚠️⚠️ THE EDGE IS NOT CENTRED ON ZERO. READ THE PERCENTILE, NEVER THE SIGN.
Man coverage suppresses yards per target league-wide, so almost everybody posts
a negative edge: the 2025 WR median is **-1.48** and the TE median **-1.10**. A
receiver at -1.2 is ABOVE his position median. Anyone reading the raw minus sign
as "bad against man" will mis-read most of the league, which is why this file
ships a per-position percentile population and the card refuses to print an edge
without it.

⚠️ IT ALSO IS NOT A ROUTE-WINNING METRIC. It inherits the aDOT confound raw
separation has — a deep target is worth more yards whoever is covering — and man
coverage puts a linebacker on a running back, which is a personnel mismatch
rather than a skill. Backs do skew positive here: 5 of the 7 who clear the gate
are above zero against a WR median of -1.48. **An earlier ungated pass produced
a far louder version of that claim (a leaderboard topped by backs at +6 to +11)
and it did not survive the 15-target gate — those were single-digit samples.**
The direction is real; the magnitude was noise. Gate first, then look.

WORKED EXAMPLE, and the reason this got built. Tee Higgins' reputation is as a
man beater. Measured: 7.79 y/t against man on 43 targets, 9.57 against zone on
56 — an edge of -1.78, which is the **44th percentile of qualified WRs**. So the
honest read is ORDINARY, not poor, and an earlier reading of the bare -1.78 as
"reputation not supported" overstated it by ignoring the population. At r=0.161
the metric is not entitled to any stronger claim than "2025 did not show it".

Regenerate (nflreadpy — participation ships parquet-only):
  pip install nflreadpy
  python3 scripts/build-coverage.py --season 2025 --out grading/data/coverage_2025.json
"""
import argparse, json, re, sys

try:
    import nflreadpy as nfl
    import polars as pl
except ImportError:
    sys.exit("pip install nflreadpy")

MIN_SPLIT_TGT = 15        # targets required in EACH bucket, or the split is noise
POSITIONS = ("WR", "TE", "RB")
TEAM_ALIAS = {"LA": "LAR"}


def normalize(name):
    """Mirror of App.jsx normalize(). See build-player-metrics.py."""
    n = name.lower().strip()
    n = re.sub(r"[.,']", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)


def build(season):
    part = (
        nfl.load_participation([season])
        .select(
            pl.col("nflverse_game_id").alias("game_id"),
            pl.col("play_id").cast(pl.Int64),
            "defense_man_zone_type",
        )
    )
    pbp = (
        nfl.load_pbp([season])
        .filter(
            (pl.col("season_type") == "REG")
            & (pl.col("pass_attempt") == 1)
            & pl.col("receiver_player_id").is_not_null()
        )
        .select(
            "game_id",
            pl.col("play_id").cast(pl.Int64),
            "posteam",
            "receiver_player_id",
            "yards_gained",
            "air_yards",
        )
    )
    j = pbp.join(part, on=["game_id", "play_id"], how="inner")
    labelled = j.filter(
        pl.col("defense_man_zone_type").is_in(["MAN_COVERAGE", "ZONE_COVERAGE"])
    ).with_columns((pl.col("defense_man_zone_type") == "MAN_COVERAGE").alias("man"))

    if labelled.height == 0:
        return labelled, j.height, 0

    g = labelled.group_by(["receiver_player_id", "man"]).agg(
        pl.len().alias("t"),
        pl.col("yards_gained").sum().alias("y"),
        pl.col("air_yards").mean().alias("a"),
    )
    man = g.filter(pl.col("man")).select(
        pl.col("receiver_player_id").alias("pid"),
        pl.col("t").alias("tgt_man"),
        (pl.col("y") / pl.col("t")).alias("ypt_man"),
        pl.col("a").alias("adot_man"),
    )
    zone = g.filter(~pl.col("man")).select(
        pl.col("receiver_player_id").alias("pid"),
        pl.col("t").alias("tgt_zone"),
        (pl.col("y") / pl.col("t")).alias("ypt_zone"),
        pl.col("a").alias("adot_zone"),
    )
    team = (
        labelled.sort("game_id")
        .group_by("receiver_player_id")
        .agg(pl.col("posteam").last().alias("team"))
        .rename({"receiver_player_id": "pid"})
    )
    players = nfl.load_players().select(
        pl.col("gsis_id").alias("pid"), "display_name", "position"
    )
    out = (
        man.join(zone, on="pid", how="inner")
        .join(team, on="pid", how="left")
        .join(players, on="pid", how="left")
        .with_columns(
            (pl.col("ypt_man") - pl.col("ypt_zone")).alias("edge"),
            (pl.col("tgt_man") / (pl.col("tgt_man") + pl.col("tgt_zone"))).alias("man_rate"),
        )
    )
    return out, j.height, labelled.height


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=2025)
    ap.add_argument("--out", default="grading/data/coverage_2025.json")
    a = ap.parse_args()

    tbl, targets, labelled = build(a.season)
    players, edges = {}, []
    for r in (tbl.iter_rows(named=True) if tbl.height else []):
        pos, name = r["position"], r["display_name"]
        if pos not in POSITIONS or not name:
            continue
        if r["tgt_man"] < MIN_SPLIT_TGT or r["tgt_zone"] < MIN_SPLIT_TGT:
            continue
        players[normalize(name)] = {
            "pos": pos,
            "team": TEAM_ALIAS.get(r["team"], r["team"]),
            "tgt_man": int(r["tgt_man"]),
            "ypt_man": round(r["ypt_man"], 2),
            "tgt_zone": int(r["tgt_zone"]),
            "ypt_zone": round(r["ypt_zone"], 2),
            "edge": round(r["edge"], 2),
            "man_rate": round(r["man_rate"], 3),
        }
        edges.append(r["edge"])

    meta = {
        "season": a.season,
        "source": "nflverse pbp_participation defense_man_zone_type x pbp targets",
        "min_split_targets": MIN_SPLIT_TGT,
        "targets_seen": targets,
        "targets_labelled": labelled,
        "descriptive_only": True,
        "in_ai_prompt": False,
        "stability": {
            "edge": {"r": 0.161, "tier": "coin flip",
                     "note": "23>24 0.199, 24>25 0.122, n=115/99. DOES NOT CARRY. "
                             "Describes 2025 and must never be used to project."},
            "ypt_man": {"r": 0.235, "tier": "coin flip"},
            "ypt_zone": {"r": 0.294, "tier": "coin flip"},
            "man_rate": {"r": 0.335, "tier": "weak",
                         "note": "how often he FACED man — a defensive choice about "
                                 "his offence at least as much as about him."},
        },
        "not_emitted": {
            "adot_man": 0.807,
            "note": "sticky, but it is aDOT again — already carried as "
                    "avg_intended_air_yards (r=0.826) in ngs_receiving. Two entries "
                    "for one idea is how a reference doubles without gaining anything.",
        },
        "hierarchy_rank": {
            "edge": "no rank. Descriptive of 2025, like per-touch efficiency.",
        },
        "median_edge": round(sorted(edges)[len(edges) // 2], 2) if edges else None,
        # ⚠ per position, because the pooled median hides that the edge is not
        # centred on zero. A reader comparing a WR against -1.19 rather than
        # -1.48 misplaces him by a quarter of a yard per target.
        "medians": {
            pos: round(sorted(e)[len(e) // 2], 2)
            for pos in POSITIONS
            for e in [[v["edge"] for v in players.values() if v["pos"] == pos]]
            if e
        },
        "counts": {
            pos: sum(1 for v in players.values() if v["pos"] == pos)
            for pos in POSITIONS
        },
        "count": len(players),
    }
    json.dump({"_meta": meta, "players": players}, open(a.out, "w"),
              indent=1, sort_keys=True)
    print(f"wrote {a.out}: {len(players)} receivers  "
          f"median edge={meta['median_edge']}  labelled={labelled}/{targets}")


if __name__ == "__main__":
    main()
