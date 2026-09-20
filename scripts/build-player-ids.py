#!/usr/bin/env python3
"""build-player-ids.py - ONE crosswalk, so a name never silently finds nobody.

THE BUG THIS EXISTS FOR, and it is worth stating plainly because the fix looks
like bookkeeping. A back on his roster is "kenny gainwell" in two layers and
"kenneth gainwell" in two others, because some builders take a feed's spelling
and some resolve through a player id. A single-spelling lookup returned null,
and null renders exactly like "this player has no data". His 84th-percentile
2025 season printed as "no 2025 row" for a week.

⭐ WHY THIS IS NOT A MIGRATION. Re-keying every layer to an id is the textbook
answer and it is blocked here: player_metrics_2025 is FROZEN mid-season by
guard so grades cannot move, App.jsx is name-keyed throughout, and two builders
cannot run on this machine at all. This gives the same join without touching
any of that, and new layers are built id-first anyway.

⛔⛔ AMBIGUOUS NAMES ARE NEVER GUESSED. Two players can normalise to one string.
Mapping the name to whichever row came first would hand a caller the WRONG
PLAYER - worse than the bug being fixed, because nothing about a wrong number
looks wrong.

⭐⭐ BUT REFUSING IS NOT USEFUL EITHER, and the first cut proved it: "antonio
williams" collides, and he is on his roster. So the crosswalk publishes THREE
keys of increasing specificity - name, name+position, name+position+team - and
a caller falls down the ladder until one is unambiguous. Position alone settles
almost all of them, because the collisions are usually a receiver and a back.

    python scripts/build-player-ids.py <players.csv.gz> <out.json> [min_last_season]
"""
import csv
import gzip
import json
import re
import sys

csv.field_size_limit(10 ** 7)
SUFFIX = re.compile(r"\s+(jr|sr|ii|iii|iv|v)$")
ALT_ID_COLS = ("pfr_id", "pff_id", "espn_id", "esb_id", "nfl_id", "otc_id", "smart_id")


def variants(r):
    """Every spelling of one player, taken from the feed rather than invented.

    ⭐⭐ THE NICKNAME PROBLEM SOLVES ITSELF HERE. The players release carries
    first_name "Kenneth", common_first_name "Kenny" and display_name "Kenny
    Gainwell" on one row, so both spellings fall out of the data. A hand-written
    alias list fixed the three cases somebody noticed and could never fix the
    fourth; this covers every nickname in the league without anyone typing one.
    """
    last = (r.get("last_name") or "").strip()
    out = {r.get("display_name") or ""}
    for c in ("football_name", "common_first_name", "first_name"):
        first = (r.get(c) or "").strip()
        if first and last:
            out.add(first + " " + last)
    return {nm(x) for x in out if nm(x)}


def nm(n):
    n = (n or "").lower().replace(".", "").replace("'", "").replace("-", " ")
    return re.sub(r"\s+", " ", SUFFIX.sub("", n)).strip()


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: build-player-ids.py <players.csv.gz> <out.json> [min_last_season]")
    src, out = sys.argv[1], sys.argv[2]
    floor = int(sys.argv[3]) if len(sys.argv) > 3 else 2018

    op = gzip.open if src.endswith(".gz") else open
    with op(src, "rt", encoding="utf-8", errors="replace") as fh:
        rows = [r for r in csv.DictReader(fh)]

    def last(r):
        try:
            return int(r.get("last_season") or 0)
        except ValueError:
            return 0

    # SCOPE IS A SAFETY FEATURE, not an optimisation. Every retired player kept
    # in the pool is another chance to collide with an active one, and a
    # collision either excludes a real player or resolves to a wrong one.
    sel = [r for r in rows if r.get("gsis_id") and r.get("display_name") and last(r) >= floor]

    seen = {}
    for r in sel:
        for v in variants(r):
            seen.setdefault(v, []).append(r["gsis_id"])
    ambiguous = sorted(k for k, v in seen.items() if len(set(v)) > 1)
    amb = set(ambiguous)

    by_name, names, by_alt, alt_collisions = {}, {}, {}, 0
    by_pos, by_pos_team, pos_seen, pos_team_seen = {}, {}, {}, {}
    for r in sel:
        gid = r["gsis_id"]
        names[gid] = r["display_name"]
        for key in variants(r):
            if key not in amb:
                by_name[key] = gid
        # THE LADDER. Each rung is only published when IT is unambiguous, so a
        # caller that gets an answer can trust it without checking anything.
        p = (r.get("position") or "").upper()
        t = (r.get("latest_team") or r.get("team") or "").upper()
        for key in variants(r):
            if p:
                pos_seen.setdefault(key + "|" + p, set()).add(gid)
            if p and t:
                pos_team_seen.setdefault(key + "|" + p + "|" + t, set()).add(gid)
        # A feed keyed on its own id is the cleanest join there is, and this is
        # what lets a future builder go id-first without a name anywhere.
        for c in ALT_ID_COLS:
            v = (r.get(c) or "").strip()
            if not v:
                continue
            k2 = "%s:%s" % (c.replace("_id", ""), v)
            if k2 in by_alt and by_alt[k2] != gid:
                alt_collisions += 1
                continue
            by_alt[k2] = gid

    by_pos = {k: list(v)[0] for k, v in pos_seen.items() if len(v) == 1}
    by_pos_team = {k: list(v)[0] for k, v in pos_team_seen.items() if len(v) == 1}
    # What the ladder actually buys, measured rather than asserted.
    rescued = sorted(n for n in amb if any(
        k.startswith(n + "|") for k in by_pos))
    # Variants buy coverage and cost ambiguity. Both are published so the trade
    # is visible rather than assumed.
    variant_names = len({v for r in sel for v in variants(r)})

    doc = {
        "_meta": {
            "source": "nflverse players release",
            "min_last_season": floor,
            "players": len(sel),
            "names_mapped": len(by_name),
            "name_variants_seen": variant_names,
            "ambiguous_count": len(ambiguous),
            "ambiguous_rescued_by_position": len(rescued),
            "names_pos_mapped": len(by_pos),
            "names_pos_team_mapped": len(by_pos_team),
            "alt_ids_mapped": len(by_alt),
            "alt_id_collisions_dropped": alt_collisions,
            "alt_id_systems": list(ALT_ID_COLS),
            "rules": {
                "ambiguous": "A normalised name shared by two players maps to NOTHING. "
                             "A wrong player is worse than a missing one, because nothing "
                             "about a wrong number looks wrong.",
                "scope": "last_season >= min_last_season. Retired players are excluded "
                         "because each one is another chance to collide with an active one.",
                "not_a_migration": "Layers keep their own keys. This is the join, not a "
                                   "re-key - player_metrics_2025 is frozen and App.jsx is "
                                   "name-keyed, and neither is touched.",
            },
        },
        "by_name": by_name,
        "by_name_pos": by_pos,
        "by_name_pos_team": by_pos_team,
        "by_alt": by_alt,
        "names": names,
        "ambiguous": ambiguous,
    }
    with open(out, "w", encoding="utf-8", newline="") as fh:
        json.dump(doc, fh, indent=0, sort_keys=True)
    print("wrote %s - %d players, %d names, %d +pos, %d +pos+team, "
          "%d ambiguous (%d rescued by position), %d alt ids"
          % (out, len(sel), len(by_name), len(by_pos), len(by_pos_team),
             len(ambiguous), len(rescued), len(by_alt)))


if __name__ == "__main__":
    main()
