#!/usr/bin/env python3
"""build-yahoo-ids.py - name -> Yahoo player id, so the card can link to the same
player's page on Yahoo (his ask, Oct 10 2026: "optimize my app to function
seamlessly with the yahoo fantasy app").

SOURCE: DynastyProcess db_playerids.csv, a free public crosswalk (yahoo_id beside
gsis_id, sleeper_id and the rest). NOTHING here comes from the Yahoo API; it is a
public id table, and the link it enables opens Yahoo's own public player page.

    python scripts/build-yahoo-ids.py <db_playerids.csv> grading/data/yahoo_ids_2026.json

RULES
  * Skill positions only (QB/RB/WR/TE) on a current NFL team; a row needs a yahoo_id.
  * Keyed by the app's own normalize() (mirror of App.jsx), suffixes kept, so
    lookupPlayer's alias and suffix handling works on it unchanged.
  * A name shared by two skill players at the SAME position maps to NOTHING. A
    link to the wrong player is worse than no link. Same rule as player_ids.json.
    Two players sharing a name at DIFFERENT positions are kept per position.
  * Rookies appear as the source adds them (it lags the draft by weeks); until
    then the card simply shows no link.
Stdlib only, like every in-season builder.
"""
import csv, json, re, sys
from datetime import datetime, timezone

SKILL = {"QB", "RB", "WR", "TE"}


def normalize(name):
    """Character-for-character mirror of App.jsx normalize(). Do not "improve" it."""
    n = (name or "").lower().strip()
    n = re.sub(r"[.,'’]", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: build-yahoo-ids.py <db_playerids.csv> <out.json>")
    src, out = sys.argv[1], sys.argv[2]
    rows = list(csv.DictReader(open(src, encoding="utf-8")))
    by = {}
    for r in rows:
        yid, pos = (r.get("yahoo_id") or "").strip(), (r.get("position") or "").strip()
        if pos not in SKILL or not yid or yid == "NA" or not yid.isdigit():
            continue
        # CURRENT players only: a row with no NFL team is retired or long gone,
        # and every data file here must key the population the app grades
        # (guard: test-player-ids.mjs, 80% resolve floor).
        if (r.get("team") or "").strip() in ("", "NA", "FA"):
            continue
        by.setdefault(normalize(r.get("name")), []).append(
            {"id": int(yid), "pos": pos, "team": (r.get("team") or "").strip() or None})
    players, dropped = {}, 0
    for k, lst in by.items():
        seen = {}
        for e in lst:
            seen.setdefault(e["pos"], []).append(e)
        keep = [v[0] for v in seen.values() if len({x["id"] for x in v}) == 1]
        dropped += len(seen) - len(keep)
        if keep:
            players[k] = keep
    meta = {
        "source": "DynastyProcess db_playerids.csv (public crosswalk)",
        "built": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "players": len(players),
        "ambiguous_dropped": dropped,
        "url": "https://sports.yahoo.com/nfl/players/{id}/",
        "rules": "skill positions only; a name shared by two players at one position maps to nothing",
        "scored": False,
        "reaches_ai_prompt": False,
    }
    with open(out, "w", encoding="utf-8", newline="") as f:
        json.dump({"_meta": meta, "players": players}, f, separators=(",", ":"), ensure_ascii=False)
    print(f"wrote {out}: {len(players)} names, {dropped} ambiguous dropped")


if __name__ == "__main__":
    main()
