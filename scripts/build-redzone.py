#!/usr/bin/env python3
"""build-redzone.py -> grading/data/redzone_2025.json

RED-ZONE OPPORTUNITY SHARE, per player.

Lens 1 of the framework says red zone and goal line touches are STANDALONE
SCORING EQUITY and must be tracked separately from overall snap share. The app
could not see them. `hvt_pg` is the closest thing it carried and it is a per-game
COUNT, not a SHARE — a back with 3.0 HVT/gm on a team that never reaches the red
zone and one on a team that lives there look identical, and they are not the same
asset.

The share is the number Lens 1 actually asks for: how much of his offense's
scoring opportunity belongs to him.

THREE ZONES, because they answer different questions:
    inside 20  the red zone. Scoring opportunity in the broad sense.
    inside 10  where touchdowns are actually decided. A tighter, noisier signal.
    inside 5   goal line. Almost entirely a coaching decision about personnel.

WHY THE DENOMINATOR IS THE TEAM'S OWN PLAYS. A raw red-zone target count is
mostly a fact about the offense. The share isolates the player's claim on it,
which is the part that survives a change in team scoring rate.

⚠ SMALL SAMPLES. Red-zone volume is a fraction of total volume, so this file
carries per-player counts alongside every share and gates on a minimum. A 100%
red-zone target share on 2 targets is noise wearing a percentage sign. Consumers
must print the count beside the share, and the card must not rank a player whose
population is too thin to rank honestly.

CONTEXT ONLY — never feeds the numeric scoring engine.

Regenerate:
  curl -sSL -o pbp.csv.gz  .../releases/download/pbp/play_by_play_2025.csv.gz
  curl -sSL -o week.csv.gz .../releases/download/stats_player/stats_player_week_2025.csv.gz
  python3 scripts/build-redzone.py pbp.csv.gz week.csv.gz grading/data/redzone_2025.json
"""
import csv, gzip, json, sys
from collections import defaultdict

PBP = sys.argv[1] if len(sys.argv) > 1 else "pbp.csv.gz"
WEEK = sys.argv[2] if len(sys.argv) > 2 else "week.csv.gz"
OUT = sys.argv[3] if len(sys.argv) > 3 else "grading/data/redzone_2025.json"
SEASON = int(sys.argv[4]) if len(sys.argv) > 4 else 2025

# Gates. A share below these is a ratio of two small numbers, and printing it at
# full confidence is the same error as ranking a three-game backup in the 90th
# percentile of something.
MIN_RZ_OPP = 5     # to emit a red-zone share at all
MIN_I10_OPP = 3    # to emit an inside-10 share
MIN_TEAM_OPP = 20  # a team below this had no meaningful red-zone sample

SUFFIX = {"jr", "sr", "ii", "iii", "iv", "v"}

def norm(n):
    n = (n or "").lower().strip()
    for ch in ".,'’":
        n = n.replace(ch, "")
    parts = n.replace("-", " ").split()
    while len(parts) > 1 and parts[-1] in SUFFIX:
        parts.pop()
    return " ".join(parts)

def load_names(path):
    """id -> (display name, position).

    ⚠ pbp NEVER carries a usable name. It prints "A.St. Brown" and "H.Henry",
    which normalise to "ast brown" and "hhenry" and match nothing in any ADP
    table. The id is the only real join key, so the display name is taken from
    the weekly stats release and a player absent from it is DROPPED rather than
    published under an abbreviation nobody can look up.
    """
    out = {}
    opener = gzip.open if path.endswith(".gz") else open
    with opener(path, "rt", newline="") as f:
        for row in csv.DictReader(f):
            pid = row.get("player_id") or ""
            nm = row.get("player_display_name") or ""
            if pid and nm:
                out[pid] = (nm, row.get("position") or "")
    return out


def main():
    id_names = load_names(WEEK)
    tgt = defaultdict(int); i10_tgt = defaultdict(int); i5_tgt = defaultdict(int)
    car = defaultdict(int); i10_car = defaultdict(int); i5_car = defaultdict(int)
    team_tgt = defaultdict(int); team_i10_tgt = defaultdict(int)
    team_car = defaultdict(int); team_i10_car = defaultdict(int)
    teams = {}; dropped = 0

    opener = gzip.open if PBP.endswith(".gz") else open
    with opener(PBP, "rt", newline="") as f:
        for row in csv.DictReader(f):
            if row.get("season_type") != "REG":
                continue
            try:
                yl = float(row.get("yardline_100") or "")
            except ValueError:
                continue
            if yl > 20:
                continue
            # Two-point plays are a separate game state with its own play-calling
            # and would inflate a goal-line share with plays that are not downs.
            if (row.get("two_point_attempt") or "0") == "1":
                continue
            pos = row.get("posteam") or ""
            if not pos:
                continue

            if (row.get("pass_attempt") or "0") == "1" and (row.get("sack") or "0") != "1":
                rid = row.get("receiver_player_id") or ""
                # A pass with no receiver is a throwaway. It is a team dropback
                # and nobody's target, so it counts for neither.
                if not rid:
                    continue
                teams[rid] = pos
                tgt[rid] += 1; team_tgt[pos] += 1
                if yl <= 10: i10_tgt[rid] += 1; team_i10_tgt[pos] += 1
                if yl <= 5:  i5_tgt[rid] += 1
            elif (row.get("rush_attempt") or "0") == "1":
                rid = row.get("rusher_player_id") or ""
                if not rid:
                    continue
                teams[rid] = pos
                car[rid] += 1; team_car[pos] += 1
                if yl <= 10: i10_car[rid] += 1; team_i10_car[pos] += 1
                if yl <= 5:  i5_car[rid] += 1

    def share(n, d):
        return round(n / d, 4) if d and d >= MIN_TEAM_OPP else None

    players = {}
    for pid in set(list(tgt) + list(car)):
        hit = id_names.get(pid)
        if not hit:
            dropped += 1
            continue
        disp, pos_lbl = hit
        t = teams.get(pid, "")
        rz_opp = tgt[pid] + car[pid]
        row = {
            "id": pid,
            "pos": pos_lbl,
            "team": t,
            "rz_tgt": tgt[pid], "rz_car": car[pid],
            "i10_tgt": i10_tgt[pid], "i10_car": i10_car[pid],
            "i5_tgt": i5_tgt[pid], "i5_car": i5_car[pid],
        }
        # A share is emitted only when BOTH the player and his team clear their
        # gate. Absence of a share with a count present is meaningful: it says
        # the sample is too thin to express as a rate.
        if tgt[pid] >= MIN_RZ_OPP:
            row["rz_tgt_sh"] = share(tgt[pid], team_tgt[t])
        if i10_tgt[pid] >= MIN_I10_OPP:
            row["i10_tgt_sh"] = share(i10_tgt[pid], team_i10_tgt[t])
        if car[pid] >= MIN_RZ_OPP:
            row["rz_car_sh"] = share(car[pid], team_car[t])
        if i10_car[pid] >= MIN_I10_OPP:
            row["i10_car_sh"] = share(i10_car[pid], team_i10_car[t])
        # Everything below the smallest gate is dropped rather than published
        # with an unrankable share, per the small-sample note above.
        if rz_opp >= MIN_RZ_OPP:
            players[norm(disp)] = row

    out = {
        "_meta": {
            "season": SEASON,
            "source": "nflverse pbp, REG only, two-point plays excluded",
            "zones": {"rz": "inside the 20", "i10": "inside the 10", "i5": "inside the 5 (goal line)"},
            "denominator": "the player's own team's red-zone plays of that type, so the share isolates his claim on the offense's scoring opportunity rather than describing how often the offense got there",
            "gates": {
                "min_player_rz_opp": MIN_RZ_OPP,
                "min_player_i10_opp": MIN_I10_OPP,
                "min_team_opp": MIN_TEAM_OPP,
                "note": "a share is emitted only when the player AND his team clear the gate. A count with no share means the sample is too thin to express as a rate — that absence is information, not a gap",
            },
            "hierarchy_rank": "1 — opportunity, and specifically the scoring-equity half of it that Lens 1 requires be tracked separately from snap share",
            "not_a_projection": "Red-zone usage is among the most coaching-dependent things in football. A new OC can reassign a goal-line role in one week, so this describes 2025 deployment and is superseded by any dated role note.",
            "counts": {},
        },
        "teams": {},
        "players": players,
    }
    for t in sorted(team_tgt):
        out["teams"][t] = {
            "rz_tgt": team_tgt[t], "rz_car": team_car[t],
            "i10_tgt": team_i10_tgt[t], "i10_car": team_i10_car[t],
        }
    out["_meta"]["counts"] = {
        "players": len(players),
        "dropped_no_display_name": dropped,
        "teams": len(out["teams"]),
        "with_rz_tgt_sh": sum(1 for p in players.values() if p.get("rz_tgt_sh") is not None),
        "with_rz_car_sh": sum(1 for p in players.values() if p.get("rz_car_sh") is not None),
    }
    with open(OUT, "w") as f:
        json.dump(out, f, indent=1, sort_keys=True)
    print(f"wrote {OUT}: {len(players)} players, {len(out['teams'])} teams, {dropped} dropped without a resolvable name")
    top = sorted((p for p in players.items() if p[1].get("rz_tgt_sh")), key=lambda kv: -kv[1]["rz_tgt_sh"])[:8]
    for n, p in top:
        print(f"  {n:24s} {p['team']:3s} {p['rz_tgt']:3d} rz tgt  {p['rz_tgt_sh']*100:5.1f}% share")

if __name__ == "__main__":
    main()
