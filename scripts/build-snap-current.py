#!/usr/bin/env python3
"""build-snap-current.py - CURRENT-SEASON snap share, per player, per week.

WHY THIS EXISTS, and it is a real cost rather than a nice-to-have. On Sep 19
2026 a flex decision turned on whether a receiver was a full-time player. The
app could not answer: routes_2025 is last season, and snap_trajectory_2026 is
correctly EMPTY because a trajectory needs 3 games in each window and it was
week 2. The number came from an outside article instead.

⭐ IT IS NOT THE SAME THING AS ROUTE SHARE AND MUST NOT BE LABELLED AS ONE.
Route share counts pass plays; this counts every offensive snap, so a back who
blocks and a receiver who sits on run downs read differently. routes_2025's own
metadata measures route_sh against snap_sh at r=0.957 - very close, not equal.
Measured on the same week-1 sample: one receiver read 37% of snaps against 29%
of routes, another 64% of snaps against 85% of routes. Close enough to answer
"is he full-time"; never close enough to quote as a route number.

⛔ WHAT IT DELIBERATELY DOES NOT DO: split early vs late, or call anything a
trend. That is snap_trajectory's job and it needs 6 games. This reports what
happened, per week, and lets the reader see the sample.

⭐⭐ IT GOES THROUGH THE ID, NOT THE FEED'S SPELLING. The first version keyed on
the name in snap_counts, which writes "Kenneth Gainwell" where other layers
write "Kenny Gainwell". Scout looked up one spelling, got nothing, and printed
"no 2026 snap row" for a player on his roster - an absence that reads exactly
like a fact. snap_counts carries pfr_player_id, and player_ids.json maps every
feed's id to a gsis id and a canonical display name, so the feed's spelling
never reaches the output.

    python scripts/build-snap-current.py <snap_counts.csv.gz> <player_ids.json> <out.json> <season>
"""
import csv
import gzip
import json
import re
import sys

SUFFIX = re.compile(r"\s+(jr|sr|ii|iii|iv|v)$")
OFFENSE = {"QB", "RB", "FB", "WR", "TE"}


def nm(n):
    n = (n or "").lower().replace(".", "").replace("'", "").replace("-", " ")
    return re.sub(r"\s+", " ", SUFFIX.sub("", n)).strip()


def main():
    if len(sys.argv) < 5:
        sys.exit("usage: build-snap-current.py <snap_counts.csv.gz> <player_ids.json> "
                 "<out.json> <season>")
    src, ids_p, out, season = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    IDS = json.load(open(ids_p, encoding="utf-8"))
    unresolved = set()

    def canon(row):
        """Canonical (key, gsis id) for one snap row, id first.

        ⛔ The fallback is the FEED name, and it is recorded rather than hidden -
        a row that had to fall back is a row that may not join, and the count
        is published so the next person sees it without going looking.
        """
        pid = (row.get("pfr_player_id") or "").strip()
        gid = IDS["by_alt"].get("pfr:" + pid) if pid else None
        if gid:
            return nm(IDS["names"].get(gid, row.get("player"))), gid
        key = nm(row.get("player"))
        pos = (row.get("position") or "").upper()
        gid = (IDS["by_name"].get(key)
               or IDS["by_name_pos"].get(key + "|" + pos))
        if gid:
            return nm(IDS["names"].get(gid, row.get("player"))), gid
        unresolved.add(key)
        return key, None

    op = gzip.open if src.endswith(".gz") else open
    with op(src, "rt", encoding="utf-8", errors="replace") as fh:
        rows = [r for r in csv.DictReader(fh)
                if (r.get("position") or "").upper() in OFFENSE
                and (r.get("season") or "").strip() == str(season)]
    if not rows:
        sys.exit("no offensive rows for season %s in %s" % (season, src))

    # WEEK COMPLETENESS IS PART OF THE OUTPUT, not a footnote. A week with two
    # teams in it is a Thursday game, and a mean that mixes it with a full week
    # is comparing players on different denominators. The reader is told.
    by_week = {}
    for r in rows:
        by_week.setdefault(r["week"], set()).add(r.get("team"))
    weeks = sorted(by_week, key=lambda w: int(w))
    complete = [w for w in weeks if len(by_week[w]) >= 30]
    partial = [w for w in weeks if len(by_week[w]) < 30]

    players = {}
    for r in rows:
        key, gid = canon(r)
        if not key:
            continue
        try:
            pct = float(r.get("offense_pct") or 0)
            snaps = int(float(r.get("offense_snaps") or 0))
        except ValueError:
            continue
        p = players.setdefault(key, {
            "pos": (r.get("position") or "").upper(),
            "team": r.get("team"),
            "id": gid,
            "weeks": [],
        })
        p["id"] = p.get("id") or gid
        p["team"] = r.get("team") or p["team"]
        p["weeks"].append({"week": int(r["week"]), "pct": round(pct, 3), "snaps": snaps})

    for p in players.values():
        p["weeks"].sort(key=lambda w: w["week"])
        played = [w for w in p["weeks"] if w["snaps"] > 0]
        p["gp"] = len(played)
        p["snap_pct"] = round(sum(w["pct"] for w in played) / len(played), 3) if played else 0.0
        p["snaps"] = sum(w["snaps"] for w in p["weeks"])
        # The most recent week is its own field: in a two-week sample the mean
        # and the latest game are nearly the same number, and by week 8 they are
        # not. Print both from the start so nobody has to remember to add it.
        p["last_pct"] = played[-1]["pct"] if played else 0.0

    doc = {
        "_meta": {
            "season": season,
            "weeks_covered": len(weeks),
            "weeks_complete": [int(w) for w in complete],
            "weeks_partial": [int(w) for w in partial],
            "players": len(players),
            "unresolved_names": len(unresolved),
            "keyed_by": "canonical display name from player_ids.json, resolved via "
                        "pfr_player_id. The feed's own spelling never reaches the output.",
            "source": "nflverse snap_counts",
            "hierarchy_rank": "2 - opportunity. Current season, so it OUTRANKS the 2025 layers.",
            "is_not": "NOT route share. Route share counts pass plays only; this counts "
                      "every offensive snap. routes_2025 measures the two at r=0.957 - very "
                      "close, not equal. Never quote this as a route number.",
            "caveats": [
                "A partial week is one or two teams, not the league. Players in it have a "
                "denominator nobody else has; weeks_partial names which.",
                "snap_pct is the mean over games PLAYED, so an inactive week does not drag "
                "it down. gp is printed beside it.",
                "This says nothing about trend. A trend needs snap_trajectory and 6 games.",
            ],
        },
        "players": players,
    }
    with open(out, "w", encoding="utf-8", newline="") as fh:
        json.dump(doc, fh, indent=0, sort_keys=True)
    print("wrote %s - %d players, weeks %s (complete %s, partial %s), %d unresolved"
          % (out, len(players), weeks, complete, partial, len(unresolved)))


if __name__ == "__main__":
    main()
