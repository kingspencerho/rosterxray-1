#!/usr/bin/env python3
"""build-first-read.py - FIRST-READ TARGETS, the design signal.

WHAT IT ANSWERS, and no other layer here answers it. Target share says he got
the ball. It cannot say whether the play was DESIGNED for him or whether he was
the checkdown after the first option was covered. FTN charts which read in the
progression the quarterback threw to, so joining that to play-by-play gives the
receiver on every first-read throw.

⭐ WHY IT MATTERS FOR A START/SIT: intent precedes outcome. A receiver with a
high first-read share and low production is a different bet from one with the
same production and no design behind it - the first is a role the offence keeps
coming back to, the second is leftovers.

⛔ WHAT THIS IS NOT, AND THE NAME MATTERS. Outside analysts publish first-read
targets PER ROUTE. That denominator needs pbp_participation, which is 404 for
2026, so it is not computable here. This emits two things that need no routes:

    fr_share  his share of his TEAM'S first-read throws   <- the design signal
    fr_rate   first-read targets / his own targets        <- is HE the design
              when the ball comes to him, or the outlet

⛔ NEITHER IS "first read targets per route" and neither may be labelled as it.

⚠️ AND IT SHIPS DESCRIPTIVE UNTIL scripts/measure-first-read.py PUTS AN r ON IT.
Every input in this app carries a stability number; a percentile with no r is
the exact thing §11g criticised in somebody else's tables, and importing the
metric without importing the discipline would be the worst of both.

⭐⭐ IT KEYS ON THE GSIS ID, NOT THE NAME, AND THAT IS THE WHOLE POINT. The
first cut normalised play-by-play's receiver_player_name, which is stored
abbreviated - "M.Evans" - so stripping the period produced "mevans" and the
layer could not join to any other file in the app. Every player asked for came
back ABSENT. play_by_play carries receiver_player_id, a stable GSIS id, and the
nflverse players release maps it to a display name. The id is the join; the
name is a label derived from it.

    python scripts/build-first-read.py <ftn.csv> <pbp.csv.gz> <players.csv.gz> <out.json> <season>
"""
import csv
import gzip
import json
import re
import sys

csv.field_size_limit(10 ** 7)
SUFFIX = re.compile(r"\s+(jr|sr|ii|iii|iv|v)$")
FIRST_READ = "1"


def nm(n):
    n = (n or "").lower().replace(".", "").replace("'", "").replace("-", " ")
    return re.sub(r"\s+", " ", SUFFIX.sub("", n)).strip()


def main():
    if len(sys.argv) < 6:
        sys.exit("usage: build-first-read.py <ftn.csv> <pbp.csv.gz> <players.csv.gz> "
                 "<out.json> <season>")
    ftn_p, pbp_p, ply_p, out_p, season = (sys.argv[1], sys.argv[2], sys.argv[3],
                                          sys.argv[4], int(sys.argv[5]))

    # gsis id -> display name. Absent ids keep their abbreviation and are
    # COUNTED, so a broken mapping is visible instead of quietly thinning the
    # population.
    op2 = gzip.open if ply_p.endswith(".gz") else open
    id2name = {}
    with op2(ply_p, "rt", encoding="utf-8", errors="replace") as fh:
        for r in csv.DictReader(fh):
            gid, disp = r.get("gsis_id"), r.get("display_name")
            if gid and disp:
                id2name[gid] = disp

    reads = {}
    with open(ftn_p, encoding="utf-8", errors="replace") as fh:
        for r in csv.DictReader(fh):
            reads[(r["nflverse_game_id"], r["nflverse_play_id"])] = r["read_thrown"]

    op = gzip.open if pbp_p.endswith(".gz") else open
    with op(pbp_p, "rt", encoding="utf-8", errors="replace") as fh:
        pbp = list(csv.DictReader(fh))

    players, team_fr, matched, unmatched = {}, {}, 0, 0
    unresolved = set()
    games = {}
    for p in pbp:
        if (p.get("pass_attempt") or "0") != "1":
            continue
        key = (p.get("game_id"), p.get("play_id"))
        read = reads.get(key)
        if read is None:
            unmatched += 1
            continue
        matched += 1
        rid = p.get("receiver_player_id") or ""
        disp = id2name.get(rid)
        if disp is None and rid:
            unresolved.add(rid)
        who = nm(disp) if disp else ""
        team = p.get("posteam")
        if read == FIRST_READ and team:
            team_fr[team] = team_fr.get(team, 0) + 1
        if not who:
            continue
        rec = players.setdefault(who, {"tgt": 0, "fr_tgt": 0, "team": team,
                                       "games": set(), "id": rid})
        rec["team"] = team or rec["team"]
        rec["tgt"] += 1
        rec["games"].add(p.get("game_id"))
        if read == FIRST_READ:
            rec["fr_tgt"] += 1
        games.setdefault(team, set()).add(p.get("game_id"))

    # ⛔ A JOIN THAT SILENTLY DROPS PLAYS IS A SILENTLY WRONG SHARE. The rate is
    # published so a bad week's feed is visible rather than inferred.
    total = matched + unmatched
    join_rate = round(matched / total, 4) if total else 0.0

    out = {}
    for k, v in players.items():
        tf = team_fr.get(v["team"], 0)
        out[k] = {
            "id": v.get("id"),
            "team": v["team"],
            "gp": len(v["games"]),
            "tgt": v["tgt"],
            "fr_tgt": v["fr_tgt"],
            # his share of the team's first-read throws - the design signal
            "fr_share": round(v["fr_tgt"] / tf, 4) if tf else None,
            # of his own targets, how many were the design rather than the outlet
            "fr_rate": round(v["fr_tgt"] / v["tgt"], 4) if v["tgt"] else None,
        }

    doc = {
        "_meta": {
            "season": season,
            "source": "nflverse ftn_charting read_thrown x play_by_play receiver",
            "first_read_value": FIRST_READ,
            "pass_plays_matched": matched,
            "pass_plays_unmatched": unmatched,
            "join_rate": join_rate,
            "players": len(out),
            "unresolved_ids": len(unresolved),
            "hierarchy_rank": "2 - opportunity, and specifically the DESIGN half of it",
            "is_not": "NOT first-read targets per route. That denominator needs "
                      "pbp_participation, which is 404 for 2026. fr_share is share of "
                      "the TEAM'S first-read throws; fr_rate is share of HIS OWN targets.",
            "scored": False,
            "reaches_ai_prompt": False,
            "stability": {
                "measured_by": "scripts/measure-first-read.py, 2022-2025, 30+ targets "
                               "in both seasons",
                "fr_rate_pooled": 0.908,
                "fr_rate_WITHIN_position": {"WR": 0.567, "TE": 0.400, "RB": 0.244},
                "fr_share_pooled": 0.802,
                "overlap_with_target_share": {"fr_rate": 0.38, "fr_share": 0.89},
                "ruling": "USE fr_rate FOR WR (0.567, reliable) AND CAUTIOUSLY AT TE "
                          "(0.400, soft). DO NOT USE IT FOR RB (0.244, weak). NEVER "
                          "quote the pooled 0.908 - backs check down at a 0.19 median "
                          "and receivers are the design at 0.73, so pooling measures "
                          "POSITION, not player. fr_share overlaps target share at "
                          "0.89 and is a restatement, the same ruling route share got "
                          "against snap share.",
            },
            "caveats": [
                "A checkdown is charted CHK and a scramble drill SD; neither counts as "
                "a first read, which is the point.",
                "fr_share is diluted on a team that throws more, so compare within a "
                "team or use the percentile, never the raw number across offences.",
            ],
        },
        "players": out,
    }
    with open(out_p, "w", encoding="utf-8", newline="") as fh:
        json.dump(doc, fh, indent=0, sort_keys=True)
    print("wrote %s - %d players, %d first-read throws, join %.1f%% (%d unmatched), "
          "%d unresolved id(s)"
          % (out_p, len(out), sum(team_fr.values()), join_rate * 100, unmatched,
             len(unresolved)))


if __name__ == "__main__":
    main()
