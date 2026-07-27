#!/usr/bin/env python3
"""
build-airyards.py — RB air yards / aDOT, team RB air yards, and QB dropback
conversion. Three layers, one pass over play-by-play.

Source: Ben Gretch (Stealing Signals) on the BDGE podcast, Jul 27 2026,
"why you should care more about RB air yards". Numbers below were reproduced
from nflverse before anything was built: his Stevenson 155 air yards / 9+
yards per target came out 159 / 9.32, Woody Marks 5th on 36 targets matched
exactly, as did Kyren Williams 3rd and Michael Carter 7th.

WHY THESE THREE

1. RB aDOT AND RAW AIR YARDS
   player_metrics already stores ay_sh (air yards SHARE), which is near-zero
   for every RB and therefore tells you nothing. What separates them is the
   back's OWN aDOT. Most RBs catch the ball BEHIND the line of scrimmage, so
   they start in a receiving-yards hole and need YAC just to reach zero.
   2025: Stevenson turned 37 targets into 345 yards at a +4.30 aDOT; Jeanty
   turned 73 targets into 346 at -1.42. Twice the volume, same output.

2. TEAM RB AIR YARDS
   This is a PLAY-CALLER fingerprint, not a player trait. David Johnson posted
   the all-time RB air yards season under Bruce Arians in 2016; Arians left,
   Mike McCoy arrived, and the usage never came back. So when a play-caller
   moves, the RB's aDOT should be re-projected from the COACH. Pairs directly
   with PLAYCALLER_PROFILES in App.jsx.

3. QB DROPBACK CONVERSION
   Gretch's chain: called passes -> dropbacks -> actual pass attempts. Sacks
   and scrambles consume dropbacks before a target ever exists, and QBs who
   hold the ball also reach the checkdown less, which suppresses RB targets
   specifically. A team-level multiplier on every pass-catcher projection,
   not just RBs.

NOT BUILDABLE HERE: targets per route run ("intent"), the sharpest idea in the
source. Needs routes run, which is paywalled (PFF / Fantasy Points). Same wall
as YPRR in build-player-metrics.py. snap_sh remains the weak free proxy.

Usage:
  py -3.11 scripts/build-airyards.py
  py -3.11 scripts/build-airyards.py --season 2025 --out grading/data/airyards_2025.json
"""

import argparse, json, re, sys
from pathlib import Path

try:
    import nflreadpy as nfl
    import polars as pl
except ImportError:
    sys.exit("pip install -r scripts/requirements.txt")

MIN_TGT = 20          # below this a season aDOT is one wheel route from meaningless
TEAM_ALIAS = {"LA": "LAR"}   # nflverse ships the Rams as LA; App.jsx uses LAR


def normalize(name):
    """Mirror of App.jsx normalize(). See build-player-metrics.py."""
    n = name.lower().strip()
    n = re.sub(r"[.,']", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)


def tm(code):
    return TEAM_ALIAS.get(code, code)


def build(season, out_path):
    pbp = nfl.load_pbp(seasons=[season]).filter(pl.col("season_type") == "REG")
    players = nfl.load_players().select("gsis_id", "display_name", "position")

    # ---- targets with a charted air yards value ----
    tgts = (
        pbp.filter(
            (pl.col("pass_attempt") == 1)
            & pl.col("receiver_player_id").is_not_null()
            & pl.col("air_yards").is_not_null()
        )
        .join(players, left_on="receiver_player_id", right_on="gsis_id", how="left")
    )

    # ---- 1. per-RB aDOT and air yards ----
    rb = tgts.filter(pl.col("position") == "RB")
    agg = (
        rb.group_by("display_name").agg(
            pl.len().alias("tgt"),
            pl.col("air_yards").sum().alias("air_yards"),
            pl.col("air_yards").mean().alias("adot"),
            pl.col("yards_gained").sum().alias("rec_yds"),
            pl.col("complete_pass").mean().alias("catch_rate"),
            # a single deep shot is the whole point of the metric — keep the max
            pl.col("air_yards").max().alias("deepest"),
        ).filter(pl.col("tgt") >= MIN_TGT)
    )
    rows = {}
    for r in agg.iter_rows(named=True):
        if not r["display_name"]:
            continue
        rows[normalize(r["display_name"])] = {
            "tgt": int(r["tgt"]),
            "air_yards": round(r["air_yards"], 1),
            "adot": round(r["adot"], 2),
            "rec_yds": int(r["rec_yds"]),
            "ypt": round(r["rec_yds"] / r["tgt"], 2),
            "catch_rate": round(r["catch_rate"], 3),
            "deepest_target": round(r["deepest"], 1),
        }
    # rank on raw air yards — the volume-adjusted version is ypt, kept separately
    for i, k in enumerate(sorted(rows, key=lambda k: -rows[k]["air_yards"]), start=1):
        rows[k]["air_yards_rank"] = i
    qualified = len(rows)

    # ---- 2. team RB air yards (the play-caller fingerprint) ----
    teams = {}
    for r in rb.group_by("posteam").agg(
        pl.col("air_yards").sum().alias("rb_air_yards"),
        pl.col("air_yards").mean().alias("rb_adot"),
        pl.len().alias("rb_tgt"),
    ).iter_rows(named=True):
        if r["posteam"]:
            teams[tm(r["posteam"])] = {
                "rb_air_yards": round(r["rb_air_yards"], 1),
                "rb_adot": round(r["rb_adot"], 2),
                "rb_tgt": int(r["rb_tgt"]),
            }
    for i, t in enumerate(sorted(teams, key=lambda t: -teams[t]["rb_air_yards"]), start=1):
        teams[t]["rb_air_rank"] = i

    # ---- 3. QB dropback conversion ----
    # Of the dropbacks a team calls, how many survive into an actual target?
    # Sacks and scrambles consume the play before any receiver is thrown to.
    db = pbp.filter(pl.col("qb_dropback") == 1)
    conv = db.group_by("posteam").agg(
        pl.len().alias("dropbacks"),
        pl.col("sack").sum().alias("sacks"),
        pl.col("qb_scramble").sum().alias("scrambles"),
        pl.col("pass_attempt").sum().alias("attempts"),
    )
    rb_tgt_by_team = {
        tm(r["posteam"]): r["n"]
        for r in rb.group_by("posteam").agg(pl.len().alias("n")).iter_rows(named=True)
        if r["posteam"]
    }
    all_tgt_by_team = {
        tm(r["posteam"]): r["n"]
        for r in tgts.group_by("posteam").agg(pl.len().alias("n")).iter_rows(named=True)
        if r["posteam"]
    }
    for r in conv.iter_rows(named=True):
        if not r["posteam"]:
            continue
        t = tm(r["posteam"])
        d = r["dropbacks"] or 1
        drain = (r["sacks"] + r["scrambles"]) / d
        entry = teams.setdefault(t, {})
        entry.update({
            "dropbacks": int(d),
            "sack_rate": round(r["sacks"] / d, 3),
            "scramble_rate": round(r["scrambles"] / d, 3),
            # the headline: share of dropbacks that never become a target
            "dropback_drain": round(drain, 3),
            "att_per_dropback": round(r["attempts"] / d, 3),
            # does this offence actually feed the backs once it does throw?
            "rb_target_rate": round(rb_tgt_by_team.get(t, 0) / max(1, all_tgt_by_team.get(t, 1)), 3),
        })
    for i, t in enumerate(sorted(teams, key=lambda t: teams[t].get("dropback_drain", 0)), start=1):
        teams[t]["drain_rank"] = i   # 1 = least drain, best conversion

    out = {
        "_meta": {
            "season": season,
            "source": "nflverse via nflreadpy (load_pbp, load_players)",
            "framework": "Ben Gretch / Stealing Signals, RB air yards (BDGE podcast Jul 27 2026)",
            "min_targets": MIN_TGT,
            "qualified_rbs": qualified,
            "adot": "average depth of target relative to the line of scrimmage. NEGATIVE means the back catches it behind the line and must earn yards back before gaining any.",
            "dropback_drain": "share of dropbacks lost to sacks and scrambles, so never becoming a target. Higher = fewer targets exist for everyone in the offence.",
            "rb_target_rate": "share of the team's charted targets that went to a running back",
            "ranks": "air_yards_rank and rb_air_rank: 1 = most. drain_rank: 1 = LEAST drain (best conversion).",
            "ceiling_not_opportunity": (
                "This layer identifies ACCESS to explosive plays, not expected volume. "
                "Per the source's own 60/40 framing it lives in the unexplained variance, "
                "so it belongs beside spike/nuclear rates in ceiling shape - never above "
                "role and volume in the Source Hierarchy."
            ),
            "not_tprr": (
                "Targets per route run (the source's 'intent' metric) is NOT here. It needs "
                "routes run, which is paywalled. Do not substitute target share for it."
            ),
        },
        "backs": dict(sorted(rows.items())),
        "teams": dict(sorted(teams.items())),
    }
    Path(out_path).write_text(json.dumps(out, indent=1), encoding="utf-8")
    return out


def check(out):
    """The join is the failure mode: if receiver ids stop matching the player
    table, every aDOT silently becomes null and the file looks merely sparse."""
    b, t = out["backs"], out["teams"]
    assert len(b) >= 30, f"only {len(b)} qualified RBs - check the players join"
    assert len(t) == 32, f"{len(t)} teams, expected 32"
    assert all("dropback_drain" in v for v in t.values()), "a team is missing dropback data"
    # aDOT must actually span zero, or air_yards was not read correctly
    adots = [v["adot"] for v in b.values()]
    assert min(adots) < 0 < max(adots), f"aDOT range {min(adots):.2f}..{max(adots):.2f} does not straddle zero"
    drains = [v["dropback_drain"] for v in t.values()]
    assert 0.02 < min(drains) and max(drains) < 0.40, f"implausible drain range {min(drains)}..{max(drains)}"
    return len(b)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=2025)
    ap.add_argument("--out", default="grading/data/airyards_2025.json")
    a = ap.parse_args()
    out = build(a.season, a.out)
    n = check(out)
    b, t = out["backs"], out["teams"]
    top = sorted(b, key=lambda k: -b[k]["air_yards"])[:5]
    bot = sorted(b, key=lambda k: b[k]["air_yards"])[:4]
    print(f"qualified RBs: {n}")
    print("most air yards : " + ", ".join(f"{k.title()} {b[k]['air_yards']:.0f} (aDOT {b[k]['adot']:+.2f})" for k in top))
    print("deepest holes  : " + ", ".join(f"{k.title()} {b[k]['air_yards']:.0f} (aDOT {b[k]['adot']:+.2f})" for k in bot))
    tt = sorted(t, key=lambda k: -t[k]["rb_air_yards"])
    print("team RB air    : top " + ", ".join(f"{k} {t[k]['rb_air_yards']:.0f}" for k in tt[:5]))
    print("               : bot " + ", ".join(f"{k} {t[k]['rb_air_yards']:.0f}" for k in tt[-4:]))
    dd = sorted(t, key=lambda k: t[k]["dropback_drain"])
    print("dropback drain : best " + ", ".join(f"{k} {t[k]['dropback_drain']:.1%}" for k in dd[:4]))
    print("               : worst " + ", ".join(f"{k} {t[k]['dropback_drain']:.1%}" for k in dd[-4:]))
    print(f"wrote {a.out}")
