#!/usr/bin/env python3
"""build-gameenv.py -> grading/data/gameenv_<season>.json

THIS WEEK'S GAME ENVIRONMENT AND A REFERENCE PROJECTION. CONTEXT ONLY.
NEVER SCORED, NEVER IN THE AI PROMPT.

WHAT GAP THIS CLOSES
--------------------
Five rules in CLAUDE.md Section 4 are written down and have never had data
behind them for weeks 1-14, because PLAYOFF_GAME_TOTALS carries W15-17 rows
only and is hand-typed:

    Blowout Risk Check          needs spread AND total
    Competitive Balance         needs spread AND total
    Venue / dome modifier       needs indoor
    Defensive Funnel Filter     needs a run/pass split   (NOT built here)
    Macro Volume Multipliers    needs PROE and pace      (NOT built here)

The first three become computable from one free endpoint. The last two need the
play-by-play release, a large weekly download, and are deliberately out of scope
for this file.

WHY A BETTING LINE IS NOT THE SAME CLASS OF DATA AS FPA
-------------------------------------------------------
The Source Hierarchy puts matchup data at rank 5 and the Aug 25 stability run
measured WR FPA as NEGATIVE year over year. That is correct and it does not
transfer to this file.

    FPA is a MEMORY.  What a defense allowed last season. r = 0.05 to 0.25.
    A line is a FORECAST. A live market price for THIS game, with this week's
                          injuries, weather and starter already inside it.

A line is not trying to be stable across seasons, so the year-over-year
correlation that condemns FPA says nothing about it. Verified Sep 12 2026: the
implied team totals derived here reproduce the ones published in a paid
newsletter to the cent on 9 of 13 games, and the other 4 had MOVED overnight,
which is the point of pulling rather than typing.

WHY SLEEPER/ROTOWIRE AND NOT PLAYER PROPS
-----------------------------------------
Both were probed Sep 12 2026 (R19 - a data-availability claim ages like a
verdict):

    ESPN public API        game lines only. No player props. The receivingYards
                           field in the summary endpoint is a SEASON LEADERBOARD
                           label, not a market.
    The Odds API           has props, US/AU books, free tier is 500 requests a
                           MONTH and props bill PER GAME PER MARKET.
    Sleeper /projections   HTTP 200, no auth, whole league in one call, already
                           in half-PPR, and Sleeper is a host this repo already
                           calls in refresh-inseason.sh step 5.

A prop carries money and a projection carries an opinion, which matters for
betting and barely matters for "is 12 points a reasonable expectation".

*** THE PROJECTION IS A BLACK BOX AND MUST RENDER AS A REFERENCE LINE. ***
It hands over a number and never shows its work, which is the opposite of
everything else in this app. The moment the UI says "start him, he is projected
12.4" it has become a worse version of every other site. The product is the
DISAGREEMENT: the projection beside the measured role change, with the gap named.

THRESHOLDS LIVE IN _meta AND THE APP READS THEM
-----------------------------------------------
blowout and shootout are CLAUDE.md Section 4 numbers. Typing them again in
App.jsx would be the duplicate-definition class this repo has now hit nine
times, so they ship in _meta.flags and the app reads them from there.

DEFENSIVE INJURIES ONLY, ON PURPOSE
-----------------------------------
status_2026.json already covers your own players. The thing nothing else in
this app can see is the defence you are FACING, so only defensive positions are
kept. It keeps the file small and the purpose unambiguous.

Usage
    python3 scripts/build-gameenv.py --season 2026 --week 3 \
        --out grading/data/gameenv_2026.json
    python3 scripts/build-gameenv.py --empty --out grading/data/gameenv_2026.json
"""
import argparse, io, json, os, re, sys
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# THE SHELL FETCHES, THIS PARSES. That is build-status.py's pattern and it is
# deliberate rather than stylistic:
#
#   - one HTTP client (curl) for the whole refresh pipeline, so proxy, CA and
#     redirect behaviour is configured in exactly one place
#   - this file becomes a PURE PARSE, which means a guard can run it offline
#     against recorded fixtures with no network at all
#   - measured Sep 12 2026: in the cloud sandbox curl returns 200 for the ESPN
#     scoreboard on every URL form tried while python urllib returns 403 through
#     the egress proxy, regardless of User-Agent. Sleeper works from both. A
#     builder that fetches would be green on one machine and red on another for
#     reasons that have nothing to do with the data.
#
# URLs the shell step uses (kept here so they live beside the parser that
# expects their shape):
#   scoreboard   https://site.api.espn.com/apis/site/v2/sports/football/nfl/
#                scoreboard?seasontype=2&week=<w>&dates=<season>
#   summary      .../summary?event=<id>            (one per game, injuries)
#   projections  https://api.sleeper.app/projections/nfl/<season>/<week>
#                ?season_type=regular&position[]=QB&...&order_by=ppr
# ---------------------------------------------------------------------------


def read_json(path, label):
    """Returns (doc, note). A missing or unreadable input is NOT fatal: the
    section is emitted empty with a note, exactly as refresh-inseason.sh treats
    an nflverse release that has not published yet."""
    if not path:
        return None, f"{label}: not supplied"
    try:
        with io.open(path, encoding="utf-8") as f:
            return json.load(f), None
    except Exception as e:
        return None, f"{label}: unreadable ({e})"


# CLAUDE.md Section 4. Read by App.jsx from _meta.flags - do not retype there.
FLAGS = {
    "blowout":  {"min_abs_spread": 7.0, "max_total": 44.0},
    "shootout": {"max_abs_spread": 3.0, "min_total": 46.0},
}

DEF_POS = {"CB", "S", "DB", "FS", "SS", "LB", "OLB", "ILB", "MLB",
           "DE", "DT", "NT", "EDGE"}
HARD = {"Out", "Injured Reserve", "Doubtful", "Suspension",
        "Physically Unable to Perform", "Non-Football Injury"}


def normalize(name):
    """Character-for-character mirror of App.jsx normalize(). Do not "improve" it.

    Any divergence is a SILENT DROP: the player resolves to nothing and no error
    is raised. Note what it does NOT do - it never strips accents.
    """
    n = (name or "").lower().strip()
    n = re.sub(r"[.,'’]", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)


def implied(total, fav, abs_spread, away, home):
    """total/2 +/- spread/2. Returns None when the line is incomplete.

    A pick'em ("EVEN") has no favourite and splits the total evenly.
    """
    if total is None or abs_spread is None:
        return None
    hi = total / 2.0 + abs_spread / 2.0
    lo = total / 2.0 - abs_spread / 2.0
    if fav == home:
        return {away: round(lo, 2), home: round(hi, 2)}
    if fav == away:
        return {away: round(hi, 2), home: round(lo, 2)}
    return {away: round(total / 2.0, 2), home: round(total / 2.0, 2)}


def parse_line(details):
    """'CIN -3.5' -> ('CIN', 3.5).  'EVEN' -> (None, 0.0)."""
    if not details:
        return None, None
    d = details.strip()
    if d.upper() == "EVEN":
        return None, 0.0
    m = re.match(r"^([A-Z]{2,4})\s+([+-]?\d+(?:\.\d+)?)$", d)
    if not m:
        return None, None
    return m.group(1), abs(float(m.group(2)))


def build_games(sb):
    out = []
    for ev in sb.get("events", []):
        comp = (ev.get("competitions") or [{}])[0]
        teams = {t.get("homeAway"): (t.get("team") or {}).get("abbreviation")
                 for t in comp.get("competitors", [])}
        away, home = teams.get("away"), teams.get("home")
        if not away or not home:
            continue
        odds = (comp.get("odds") or [{}])[0]
        total = odds.get("overUnder")
        fav, sp = parse_line(odds.get("details"))
        g = {
            "id": ev.get("id"), "away": away, "home": home,
            "total": total, "favorite": fav, "spread": sp,
            "implied": implied(total, fav, sp, away, home),
            "indoor": bool((comp.get("venue") or {}).get("indoor")),
            "kick": ev.get("date"),
            "blowout": bool(total is not None and sp is not None
                            and sp >= FLAGS["blowout"]["min_abs_spread"]
                            and total < FLAGS["blowout"]["max_total"]),
            "shootout": bool(total is not None and sp is not None
                             and sp <= FLAGS["shootout"]["max_abs_spread"]
                             and total >= FLAGS["shootout"]["min_total"]),
            "def_out": {away: [], home: []},
        }
        out.append(g)
    return out


def add_injuries(games, summary_dir):
    """Defensive positions only; see the header. summary_dir holds <event>.json,
    one per game, written by the shell step."""
    if not summary_dir:
        return games
    for g in games:
        if not g.get("id"):
            continue
        doc, _ = read_json(os.path.join(summary_dir, f"{g['id']}.json"), "summary")
        if not doc:
            continue
        for blk in doc.get("injuries") or []:
            ab = (blk.get("team") or {}).get("abbreviation")
            if ab not in g["def_out"]:
                continue
            for it in blk.get("injuries") or []:
                a = it.get("athlete") or {}
                pos = (a.get("position") or {}).get("abbreviation")
                st = it.get("status")
                if pos not in DEF_POS or st not in HARD:
                    continue
                g["def_out"][ab].append({
                    "name": a.get("displayName"), "pos": pos, "status": st,
                    "part": (it.get("details") or {}).get("type"),
                })
    return games


def build_projections(rows):
    out = {}
    for r in rows:
        st = r.get("stats") or {}
        pts = st.get("pts_half_ppr")
        if pts is None:
            continue
        p = r.get("player") or {}
        nm = (p.get("full_name")
              or " ".join(x for x in [p.get("first_name"), p.get("last_name")] if x))
        if not nm:
            continue
        rec = {"pts": round(float(pts), 2), "team": r.get("team"),
               "opp": r.get("opponent"), "pos": p.get("position")}
        for src, dst in (("rec", "rec"), ("rec_yd", "rec_yd"), ("rec_tgt", "tgt"),
                         ("rush_yd", "rush_yd"), ("rush_att", "rush_att"),
                         ("pass_yd", "pass_yd")):
            if st.get(src) is not None:
                rec[dst] = round(float(st[src]), 1)
        out[normalize(nm)] = rec
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=2026)
    ap.add_argument("--week", type=int, default=0)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scoreboard", help="ESPN scoreboard json")
    ap.add_argument("--summaries", help="dir of <eventid>.json ESPN summaries")
    ap.add_argument("--projections", help="Sleeper projections json")
    ap.add_argument("--empty", action="store_true",
                    help="emit a zero-row file with the real _meta shape")
    a = ap.parse_args()

    games, projections, notes = [], {}, []
    if not a.empty:
        sb, n = read_json(a.scoreboard, "lines")
        if n:
            notes.append(n)
        elif sb:
            games = add_injuries(build_games(sb), a.summaries)
        pr, n = read_json(a.projections, "projections")
        if n:
            notes.append(n)
        elif pr:
            projections = build_projections(pr)

    priced = sum(1 for g in games if g.get("total") is not None)
    doc = {
        "_meta": {
            "season": a.season,
            "week": a.week if not a.empty else 0,
            "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "scoring": "half_ppr",
            "games_covered": len(games),
            "games_priced": priced,
            "players_projected": len(projections),
            "flags": FLAGS,
            "sources": {
                "lines": "ESPN site.api scoreboard (book line as ESPN publishes it)",
                "injuries": "ESPN site.api summary, defensive positions only",
                "projections": "Sleeper /projections (Rotowire), half-PPR",
            },
            "scored": False,
            "reaches_ai_prompt": False,
            "caveats": [
                "A projection is a model opinion, not a market price. Render it "
                "as a reference line, never as a recommendation.",
                "Lines move. fetched_at is the vintage and a Tuesday pull is "
                "stale by Sunday.",
                "Defensive injuries only. Your own players are in status_<season>.json.",
            ],
            "notes": notes,
        },
        "games": games,
        "projections": projections,
    }
    with open(a.out, "w", encoding="utf-8", newline="") as f:
        json.dump(doc, f, indent=1, sort_keys=False)
        f.write("\n")
    print(f"build-gameenv: {len(games)} games ({priced} priced), "
          f"{len(projections)} projections -> {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
