#!/usr/bin/env python3
"""build-routes.py -> grading/data/routes_2025.json

TARGETS PER ROUTE RUN, and the route participation it is computed over.

    tprr       r = 0.674   measured 23>24 0.621, 24>25 0.728, n=219/217
    route_sh   r = 0.756   measured 23>24 0.715, 24>25 0.797

⚠️ THIS LAYER SPENT WEEKS IN TIER C ON A FALSE PREMISE. Both CLAUDE.md and
ANALYST-REFERENCE.md said the NFL participation feed died after 2023 and that no
free routes source existed. Neither is true: `load_participation(2025)` returns
45,184 rows and its `offense_players` column is populated on 100% of them. The
claim was written once, was plausible, and was then cited rather than re-tested.
Re-check a feed before repeating that it is dead — it costs one command.

WHY TPRR IS WORTH A LAYER. Every receiving input the app carries measures what a
coach GAVE a player: target share, WOPR, targets per game, snap share. TPRR
measures what he EARNS per opportunity, which is why it separates a player fed
by volume from one the offence actually looks for. Volume ceiling = routes x
TPRR, so a low route share caps everything else regardless of rate.

IT IS NOT A RESTATEMENT OF TARGETS PER GAME. Measured 2025: r = 0.871 overall,
0.875 among WRs. Correlated, as it must be, but a quarter of the variance is
independent and the divergences are the informative cases — a high-TPRR,
low-volume player is earning looks in limited snaps (the contingency profile),
while the reverse is a coach-fed volume role that a role change can take away.

`route_sh` IS NOT AN INDEPENDENT INPUT AND MUST NOT BE PRESENTED AS ONE.
Measured against `snap_sh` in `player_metrics_2025.json`: r = 0.957 overall and
0.966 among WRs. It is emitted because it is TPRR's DENOMINATOR and a rate
without its sample is unreadable, not because it says anything `snap_sh` does
not. Where the two do diverge they diverge honestly — Derrick Henry 0.388 route
share against 0.545 snap share, because he leaves the field on passing downs.

⚠️ THE DENOMINATOR IS PASS-SNAP PARTICIPATION, NOT CHARTED ROUTES. Participation
records who was ON THE FIELD, never who released into a pattern. For a WR the
two are nearly the same. For a BLOCKING TE OR A PROTECTING BACK they are not:
protection snaps inflate the denominator and deflate the rate. Read RB and TE
TPRR as a floor on the true figure, and note the measured stability is weaker
there too (RB 0.515 against WR/TE 0.687).

⚠️ TEAM DROPBACKS ARE COUNTED PER (PLAYER, GAME), NOT FROM A PRIMARY TEAM. A
first pass assigned each player one team for the season and produced route
shares above 1.0 for every mid-season mover — Rashid Shaheed came out at 1.368.
Any denominator built from a season-level team assignment is wrong for exactly
the players whose role changed, which is the population that matters most.

Regenerate (nflreadpy, because participation ships parquet-only — there is no
csv.gz asset on that release):
  pip install nflreadpy
  python3 scripts/build-routes.py --season 2025 --out grading/data/routes_2025.json
"""
import argparse, json, re, sys

try:
    import nflreadpy as nfl
    import polars as pl
except ImportError:
    sys.exit("pip install nflreadpy")

MIN_ROUTES = 100          # below this the rate is noise; the count is still emitted
POSITIONS = ("WR", "TE", "RB")
TEAM_ALIAS = {"LA": "LAR"}   # see build-sos.py — nflverse ships the Rams as LA


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
            "offense_players",
        )
    )
    pbp = (
        nfl.load_pbp([season])
        .filter((pl.col("season_type") == "REG") & (pl.col("qb_dropback") == 1))
        .select(
            "game_id",
            pl.col("play_id").cast(pl.Int64),
            "posteam",
            "receiver_player_id",
        )
    )
    j = pbp.join(part, on=["game_id", "play_id"], how="inner")
    if j.height == 0:
        return j, 0, 0

    onfield = (
        j.with_columns(pl.col("offense_players").str.split(";").alias("pid"))
        .explode("pid")
        .filter(pl.col("pid").is_not_null() & (pl.col("pid") != ""))
    )
    routes = onfield.group_by("pid").agg(
        pl.len().alias("routes"), pl.col("game_id").n_unique().alias("gp")
    )
    # ⚠ per (player, game). A season-level primary team breaks every mover.
    played = onfield.select("pid", "game_id", "posteam").unique()
    team_db = j.group_by(["posteam", "game_id"]).agg(pl.len().alias("db"))
    denom = (
        played.join(team_db, on=["posteam", "game_id"], how="left")
        .group_by("pid")
        .agg(pl.col("db").sum().alias("team_db"))
    )
    targets = (
        j.filter(pl.col("receiver_player_id").is_not_null())
        .group_by("receiver_player_id")
        .agg(pl.len().alias("tgt"))
        .rename({"receiver_player_id": "pid"})
    )
    # the team he finished on, for display only — never for the denominator
    last_team = (
        onfield.sort("game_id")
        .group_by("pid")
        .agg(pl.col("posteam").last().alias("team"))
    )
    out = (
        routes.join(targets, on="pid", how="left")
        .join(denom, on="pid", how="left")
        .join(last_team, on="pid", how="left")
        .with_columns(pl.col("tgt").fill_null(0))
        .with_columns(
            (pl.col("tgt") / pl.col("routes")).alias("tprr"),
            (pl.col("routes") / pl.col("team_db")).alias("route_sh"),
        )
    )
    players = nfl.load_players().select(
        pl.col("gsis_id").alias("pid"), "display_name", "position"
    )
    return out.join(players, on="pid", how="left"), pbp.height, j.height


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=2025)
    ap.add_argument("--out", default="grading/data/routes_2025.json")
    a = ap.parse_args()

    tbl, dropbacks, joined = build(a.season)
    players, pcts = {}, {p: [] for p in POSITIONS}
    weeks = 0
    if tbl.height:
        weeks = int(tbl["gp"].max() or 0)
        for r in tbl.iter_rows(named=True):
            pos = r["position"]
            name = r["display_name"]
            if pos not in POSITIONS or not name:
                continue
            if (r["routes"] or 0) < MIN_ROUTES or not r["team_db"]:
                continue
            players[normalize(name)] = {
                "pos": pos,
                "team": TEAM_ALIAS.get(r["team"], r["team"]),
                "gp": int(r["gp"]),
                "routes": int(r["routes"]),
                "tgt": int(r["tgt"]),
                "tprr": round(r["tprr"], 3),
                "route_sh": round(r["route_sh"], 3),
            }
            pcts[pos].append(r["tprr"])

    meta = {
        "season": a.season,
        "source": "nflverse pbp_participation x pbp (qb_dropback == 1, REG only)",
        "denominator": "pass-snap participation — ON THE FIELD, not charted routes",
        "min_routes": MIN_ROUTES,
        "weeks_covered": weeks,
        "season_complete": weeks >= 17,
        "dropbacks": dropbacks,
        "joined": joined,
        "stability": {
            "tprr": {
                "r": 0.674,
                "tier": "reliable",
                "note": "23>24 0.621, 24>25 0.728, n=219/217 at 100+ routes. "
                        "WR/TE 0.687, RB 0.515 — the blocking denominator costs backs.",
            },
            "route_sh": {
                "r": 0.756,
                "tier": "denominator, NOT an independent input",
                "note": "23>24 0.715, 24>25 0.797. r=0.957 against snap_sh "
                        "(WR 0.966) — it restates snap share and must never be "
                        "presented as a separate signal.",
            },
        },
        "hierarchy_rank": {
            "tprr": "2 — opportunity, per-route rather than per-game.",
            "route_sh": "2 — same rank and very nearly the same number as snap_sh.",
        },
        "overlap": {
            "tprr_vs_targets_per_game": 0.871,
            "tprr_vs_target_share": 0.817,
            "tprr_vs_wopr": 0.767,
            "route_sh_vs_snap_share": 0.957,
            "note": "measured on 2025. tprr is correlated with volume and not a "
                    "restatement of it; route_sh IS a restatement of snap_sh.",
        },
        "medians": {p: round(sorted(v)[len(v) // 2], 3) for p, v in pcts.items() if v},
        "counts": {p: len(v) for p, v in pcts.items()},
    }
    json.dump({"_meta": meta, "players": players}, open(a.out, "w"),
              indent=1, sort_keys=True)
    print(f"wrote {a.out}: {len(players)} players  "
          f"medians={meta['medians']}  counts={meta['counts']}")


if __name__ == "__main__":
    main()
