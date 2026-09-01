#!/usr/bin/env python3
"""build-status.py -> grading/data/status_<season>.json

CURRENT AVAILABILITY AND DEPTH-CHART SLOT. CONTEXT ONLY. FLAGS, NEVER OVERRULES.

WHAT PROBLEM THIS SOLVES, AND WHICH HALF IT DELIBERATELY DOES NOT
----------------------------------------------------------------
RECENT_NEWS (140 entries) and SITUATIONS (461) are hand-written and aged against
a 30-45 day rule. Thirty days is a fair shelf life for an August camp report. In
October a depth chart can invert inside a week, and this season already produced
two entries that inverted inside 48 hours (Alec Pierce activated off PUP; Josh
Jacobs to the Commissioner's Exempt List the day after an entry described an
open review).

THE LAYER IS NOT A REPLACEMENT FOR THE PROSE, AND THE SPLIT WAS MEASURED RATHER
THAN ASSUMED. Fifteen RECENT_NEWS entries were sampled at random on Sep 1 2026
and classified:

    0 of 15   could be supplied by a feed on its own
    7 of 15   are pure analytical judgement with no feed component at all
    8 of 15   carry a feed-supplyable FACT wrapped in a judgement

So a feed can CONFIRM or CONTRADICT a fact inside an entry. It can never write
one. Tyler Allgeier's note opens "Listed RB1 on ARI's first depth chart", which
is depth_chart_order. It then says "2yr/$12.25M; 19 GZ carries in 2025", which no
feed produces. George Kittle's PUP tag is injury_status; "Achilles at his age is
the real risk, not the PUP tag itself" is the reason the entry exists at all.

WHY SLEEPER AND NOT THE NFLVERSE INJURY REPORT
----------------------------------------------
Both were re-probed Sep 1 2026 (R19 - a data-availability claim ages like a
verdict).

  nflverse injuries_2026.csv.gz   HTTP 404. The newest file in the release is
                                  2025, last updated 2026-03-18. It publishes
                                  once games are played.
  nflverse injuries_2025.csv.gz   HTTP 200, 6,068 rows, weeks 1-22, shape
                                  unchanged from what 14a records. report_status
                                  is BLANK on 3,285 of them (54%) - over half the
                                  file is practice-report-only.
  Sleeper /v1/players/nfl         HTTP 200, 14.6MB, 12,225 players, ~1s.
                                  812 skill-position players with a team.

The deciding fact is COVERAGE, not stability. nflverse is the safer dependency
and carries only the official injury report - no trades, no suspensions, no
depth-chart moves. Of the eight mixed entries above, the feed-supplyable fact was
a DEPTH-CHART SLOT more often than an injury status, and nflverse cannot see that
field at all. Role change is rank 1 in the hierarchy; the app infers it today
from snap trajectory, which lags a week. A depth-chart slot is same-day.

THE COST, STATED PLAINLY: Sleeper is third-party, unversioned, and can change
shape without notice, unlike a pinned nflverse release. Treat availability as a
runtime risk. _meta.source_probed records when it was last known good.

THE JOIN IS THE RISKIEST PART OF THIS LAYER
-------------------------------------------
14a records that the injury feed "joins on gsis_id, the same key every other
layer uses". BOTH HALVES ARE WRONG FOR THIS SOURCE:

  1. Sleeper carries gsis_id on 147 of 812 skill players - 18%.
  2. No layer in grading/data/ keys on gsis_id. Every one of them keys on a
     LOWERCASED FULL NAME. Checked across all 19 files.

So this is a name-resolution problem, which is the class this repo has been
burned by before - findPlayer, the alias table, and three guards exist because of
it. normalize() below is a character-for-character mirror of App.jsx line 2469
and MUST stay one. Suffixes (SUFFIX_RE) and METRIC_NAME_ALIASES are handled by
the app's own resolver at READ time, exactly as every other layer relies on, and
are deliberately not reimplemented here - a second resolver is a second thing to
drift.

Regenerate (or run scripts/refresh-inseason.sh, which calls this):
  curl -sSL -o sleeper.json https://api.sleeper.app/v1/players/nfl
  python3 scripts/build-status.py sleeper.json grading/data/status_2026.json 2026

NEVER commit sleeper.json. It is 14.6MB of raw dump; this writes the small
extract, the way every other layer does.
"""
import json
import re
import sys
from datetime import datetime, timezone

SRC = sys.argv[1] if len(sys.argv) > 1 else "sleeper.json"
OUT = sys.argv[2] if len(sys.argv) > 2 else "grading/data/status_2026.json"
SEASON = int(sys.argv[3]) if len(sys.argv) > 3 else 2026

POSITIONS = ("WR", "TE", "RB", "QB")

# A status meaning "he is not playing", as opposed to a weekly maybe. Only these
# raise a contradiction flag in report-stale-news.mjs. A Questionable tag every
# Friday would flag half the league and train the reader to ignore the report,
# which is worse than not reporting at all.
HARD_STATUS = ("IR", "PUP", "Out", "Sus", "NFI", "DNR")

# The exact field set every player row carries. The guard asserts this, so a
# Sleeper shape change adds or drops a key loudly instead of silently.
ROW_FIELDS = ("pos", "team", "status", "injury_status", "injury_body_part",
              "depth_chart_order", "depth_chart_position", "news_updated")


def normalize(name):
    """Character-for-character mirror of App.jsx:2469. Do not "improve" it.

    Note what it does NOT do: it never strips accents. A name carrying an acute
    accent stays accented, and the metrics file carries it the same way.
    Stripping here would silently unjoin every accented name.
    """
    n = (name or "").lower().strip()
    n = re.sub(r"[.,'’]", "", n)
    n = n.replace("-", " ")
    return re.sub(r"\s+", " ", n)


def iso(ms):
    if not ms:
        return None
    try:
        return datetime.fromtimestamp(ms / 1000, timezone.utc).strftime("%Y-%m-%d")
    except (TypeError, ValueError, OSError, OverflowError):
        return None


def main():
    try:
        with open(SRC, encoding="utf-8") as fh:
            raw = json.load(fh)
    except FileNotFoundError:
        sys.exit("missing " + SRC)
    if not isinstance(raw, dict):
        sys.exit("unexpected payload: expected an object keyed by sleeper player id")

    built_at = datetime.now(timezone.utc)
    players = {}
    dropped_no_name = 0

    for p in raw.values():
        if not isinstance(p, dict):
            continue
        if p.get("position") not in POSITIONS or not p.get("team"):
            continue
        key = normalize(p.get("full_name"))
        if not key:
            # R11 - a filtered name must never be silent. Counted into _meta.
            dropped_no_name += 1
            continue
        players[key] = {
            "pos": p.get("position"),
            "team": p.get("team"),
            "status": p.get("status") or None,
            "injury_status": p.get("injury_status") or None,
            "injury_body_part": p.get("injury_body_part") or None,
            "depth_chart_order": p.get("depth_chart_order"),
            "depth_chart_position": p.get("depth_chart_position") or None,
            "news_updated": iso(p.get("news_updated")),
        }

    hard = [k for k, v in players.items() if v["injury_status"] in HARD_STATUS]
    with_depth = sum(1 for v in players.values() if v["depth_chart_order"] is not None)

    meta = {
        "season": SEASON,
        "source": "Sleeper /v1/players/nfl (public, no auth, unversioned)",
        "source_probed": built_at.strftime("%Y-%m-%d"),
        "built_at": built_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "context_only": True,
        # This layer is a point-in-time snapshot, not a season metric, so it has
        # no prior vintage to be swapped with. The dual-vintage rule still binds
        # in the form that matters here, which is the approved conflict rule:
        "conflict_rule": (
            "The feed NEVER overwrites, outranks or out-dates a hand-written note. "
            "It raises a flag a human clears. A hand-written note keeps its own date "
            "until it is edited by hand. Both render; neither replaces the other."
        ),
        "why_not_freshest_wins": (
            "A same-day feed would out-date all 140 RECENT_NEWS entries permanently. "
            "7 of 15 sampled entries are pure judgement the feed has no opinion about, "
            "so freshest-wins would demote the analysis to decoration on day one."
        ),
        "reaches_ai_prompt": False,
        "renders": False,
        "renders_reason": (
            "Approved Sep 1 2026: build it, ship it reading, do not render until the "
            "feed has been watched for a week. The committed file stays at zero rows "
            "until that watch is done, so there is nothing to render by construction."
        ),
        "join_key": (
            "normalize(full_name), a mirror of App.jsx:2469. NOT gsis_id, which Sleeper "
            "carries on only 18% of skill players and which no layer in grading/data/ uses."
        ),
        "row_fields": list(ROW_FIELDS),
        "hard_status": list(HARD_STATUS),
        "hierarchy_rank": {"all": "1 - role and availability CHANGE"},
        # A snapshot has no year-over-year r. Never invent one. R4: a borrowed
        # prior is not a finding, and an absent one is not a zero.
        "stability": None,
        "counts": {p: sum(1 for v in players.values() if v["pos"] == p) for p in POSITIONS},
        "with_depth_chart": with_depth,
        "hard_status_count": len(hard),
        "dropped_no_name": dropped_no_name,
    }

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"_meta": meta, "players": players}, fh, indent=1, sort_keys=True)
        fh.write("\n")
    print("wrote {}: {} players  counts={}  depth_chart={}  hard_status={}".format(
        OUT, len(players), meta["counts"], with_depth, len(hard)))


if __name__ == "__main__":
    main()
