#!/usr/bin/env python3
"""
build-player-metrics.py — RosterXRay per-player metrics from nflverse 2025 data.

Computes the player-quality metrics the grading engine currently lacks
(see audit Jul 15 2026: SITUATIONS covers ~104 players; everyone else is
invisible to quality checks). Output is a JSON block keyed by normalized
player name, ready to be embedded as PLAYER_METRICS in App.jsx/App.jsx.jsx
or served as a data file.

Inputs (download from nflverse-data releases, not committed):
  play_by_play_2025.csv.gz  (release: pbp)
  roster_2025.csv.gz        (release: rosters)

Usage:
  py -3.11 scripts/build-player-metrics.py <pbp.csv.gz> <roster.csv.gz> <out.json>

Metrics per player:
  gp             games with at least one target or carry
  tgt, tgt_sh    total targets, share of team targets
  ay_sh          share of team air yards
  wopr           1.5*tgt_sh + 0.7*ay_sh  (weighted opportunity)
  rz_tgt, ez_tgt red-zone (<=20 yl) and end-zone targets
  gz_car         green-zone carries (<=10 yl)
  hvt_pg         (rz_tgt + gz_car) / gp  — high-value touches per game
                 (feeds the Naked RB insulation Gate 1: HVT 4.5+)
  expl_pct       % of carries gaining 10+ yards (min 20 carries, else null)
  spike/usable/dud/nuclear rates — % of games at half-PPR (Underdog) points:
                 nuclear >= 28, spike >= 18, usable >= 10, dud < 5
                 (Legendary Upside-style week-outcome taxonomy)

Honest limitation: public nflverse data has no per-route participation, so
YPRR/TPRR cannot be computed. tgt_sh + wopr are the substitutes.

Scoring approximation: half-PPR from pbp events (rec 0.5, yds 0.1/0.1,
TD 6, fumble lost -2, pass yds 0.04, pass TD 4, INT -1). Return/2pt not
counted — immaterial for spike-rate classification.
"""

import csv, gzip, json, sys, re
from collections import defaultdict

NUCLEAR, SPIKE, USABLE, DUD = 28.0, 18.0, 10.0, 5.0

def normalize(name):
    # EXACT mirror of App.jsx normalize() (App.jsx.jsx:1519):
    # lowercase, strip [.,'], hyphen -> space, collapse whitespace.
    # Suffixes (Jr/III) are KEPT — the app's fuzzy matcher handles them.
    n = name.lower().strip()
    n = re.sub(r"[.,']", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)

def main(pbp_path, roster_path, out_path):
    # gsis id -> (full name, position)
    id_name, id_pos = {}, {}
    with gzip.open(roster_path, "rt", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            gid = r.get("gsis_id") or ""
            if gid:
                id_name[gid] = r.get("full_name") or ""
                id_pos[gid] = r.get("position") or ""

    tgt = defaultdict(int); rec = defaultdict(int); rz_tgt = defaultdict(int); ez_tgt = defaultdict(int)
    airy = defaultdict(float)
    car = defaultdict(int); car10 = defaultdict(int); gz_car = defaultdict(int)
    team_tgt = defaultdict(int); team_airy = defaultdict(float)
    pts = defaultdict(float)              # (player, game) -> half-PPR points
    games = defaultdict(set)              # player -> game ids
    team_of = {}

    with gzip.open(pbp_path, "rt", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("season_type") != "REG":
                continue
            gid = r["game_id"]

            def touch(pid, team):
                if pid:
                    games[pid].add(gid)
                    if team: team_of[pid] = team

            # --- passing / receiving ---
            if r.get("pass_attempt") == "1" and r.get("sack") != "1":
                rec_id = r.get("receiver_player_id") or ""
                psr_id = r.get("passer_player_id") or ""
                posteam = r.get("posteam") or ""
                ay = float(r.get("air_yards") or 0)
                ydl = r.get("yardline_100")
                ydl = float(ydl) if ydl not in ("", "NA", None) else 100.0
                if rec_id:
                    tgt[rec_id] += 1; team_tgt[posteam] += 1
                    airy[rec_id] += ay; team_airy[posteam] += max(ay, 0)
                    touch(rec_id, posteam)
                    if ydl <= 20: rz_tgt[rec_id] += 1
                    if ay >= ydl: ez_tgt[rec_id] += 1
                    if r.get("complete_pass") == "1":
                        rec[rec_id] += 1
                        yds = float(r.get("receiving_yards") or 0)
                        pts[(rec_id, gid)] += 0.5 + 0.1 * yds
                        if r.get("pass_touchdown") == "1":
                            pts[(rec_id, gid)] += 6
                if psr_id:
                    touch(psr_id, posteam)
                    if r.get("complete_pass") == "1":
                        pts[(psr_id, gid)] += 0.04 * float(r.get("passing_yards") or 0)
                        if r.get("pass_touchdown") == "1":
                            pts[(psr_id, gid)] += 4
                    if r.get("interception") == "1":
                        pts[(psr_id, gid)] -= 1

            # --- rushing ---
            if r.get("rush_attempt") == "1":
                rid = r.get("rusher_player_id") or ""
                if rid:
                    posteam = r.get("posteam") or ""
                    yds = float(r.get("rushing_yards") or 0)
                    ydl = r.get("yardline_100")
                    ydl = float(ydl) if ydl not in ("", "NA", None) else 100.0
                    car[rid] += 1
                    if yds >= 10: car10[rid] += 1
                    if ydl <= 10: gz_car[rid] += 1
                    touch(rid, posteam)
                    pts[(rid, gid)] += 0.1 * yds
                    if r.get("rush_touchdown") == "1":
                        pts[(rid, gid)] += 6

            # --- fumbles lost ---
            if r.get("fumble_lost") == "1":
                fid = r.get("fumbled_1_player_id") or ""
                if fid and fid in games:
                    pts[(fid, gid)] -= 2

    out = {}
    for pid, gset in games.items():
        name = id_name.get(pid)
        if not name:
            continue
        gp = len(gset)
        if gp < 3 or (tgt[pid] + car[pid]) < 10:
            continue  # ponytail: skip sub-3-game / sub-10-touch noise rows
        team = team_of.get(pid, "")
        t_tgt = team_tgt.get(team, 0) or 1
        t_ay = team_airy.get(team, 0) or 1.0
        weekly = [pts.get((pid, g), 0.0) for g in gset]
        tgt_sh = tgt[pid] / t_tgt
        ay_sh = max(airy[pid], 0) / t_ay
        out[normalize(name)] = {
            "pos": id_pos.get(pid, ""), "team": team, "gp": gp,
            "tgt": tgt[pid],
            "rec": rec[pid],
            "tgt_sh": round(tgt_sh, 3),
            "ay_sh": round(ay_sh, 3),
            "wopr": round(1.5 * tgt_sh + 0.7 * ay_sh, 3),
            "rz_tgt": rz_tgt[pid], "ez_tgt": ez_tgt[pid],
            "gz_car": gz_car[pid],
            "hvt_pg": round((rz_tgt[pid] + gz_car[pid]) / gp, 2),
            "expl_pct": round(car10[pid] / car[pid], 3) if car[pid] >= 20 else None,
            "nuclear_rate": round(sum(1 for p in weekly if p >= NUCLEAR) / gp, 3),
            "spike_rate": round(sum(1 for p in weekly if p >= SPIKE) / gp, 3),
            "usable_rate": round(sum(1 for p in weekly if p >= USABLE) / gp, 3),
            "dud_rate": round(sum(1 for p in weekly if p < DUD) / gp, 3),
        }

    with open(out_path, "w", encoding="utf-8") as f:
        # Minified — this file is imported into the client bundle (App.jsx.jsx).
        json.dump(out, f, separators=(",", ":"), sort_keys=True)
    print(f"{len(out)} players written to {out_path}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3])
