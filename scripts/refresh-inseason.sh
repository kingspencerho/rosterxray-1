#!/usr/bin/env bash
# refresh-inseason.sh — the weekly in-season data refresh.
#
# THE SPLIT REFRESH CADENCE
# -------------------------
# Anything that SCORES is frozen. Anything that is CONTEXT may refresh.
#
#   FROZEN   grading/data/player_metrics_2025.json
#            Feeds four scored inputs: hvt_pg (Naked RB gate), usable_rate
#            (Advance Rate Layer), spike_rate + nuclear_rate (Ceiling Shape
#            Layer). Refreshing it weekly would move every grade for reasons
#            unrelated to the roster, make the grade-history panel and share
#            links incomparable, and invalidate every calibration on file.
#            It stays at 2025-final for the whole season. Guard 15 enforces this.
#
#   WEEKLY   grading/data/snap_trajectory_2026.json   <- role CHANGE, rank 1
#            grading/data/qb_profile_2026.json        <- QB volume, r=0.815
#            grading/data/gamelogs_2026.json          <- per-week output, card only
#            Both are context-only: they reach the AI prompt and the player
#            card, never analyzeRoster or analyzeRedraft.
#
#   LIVE     grading/data/status_2026.json            <- availability + depth chart
#            The only step here that works BEFORE Week 1, because its source is
#            not an nflverse season release. It is context-only AND does not
#            render or reach the prompt yet (approved Sep 1 2026: watch the feed
#            for a week first). Guard 26 holds both promises.
#
#   ANNUAL   efficiency, motion, airyards, sos. Efficiency is the least
#            predictive layer in the app (RB yds/carry r=0.02), motion's FTN
#            source lags by more than a week, and sos is schedule-static. None
#            of them earn a weekly download.
#
# The prior season is never overwritten. The card and the prompt show BOTH —
# "38% in 2025, 61% through W7" says more than either number alone, and a layer
# that silently swaps vintage underneath the reader is the stale-data trap in a
# new costume.
#
# TWO CADENCES, BECAUSE ONLY HALF OF THIS EXPIRES
# ------------------------------------------------
# Steps 1-4 read nflverse SEASON RELEASES, which publish after games are played
# and do not change again until the next Monday night. Re-fetching them on a
# Saturday is pure waste.
#
# Steps 5-6 are LIVE third-party snapshots and both move all week:
#   status      Friday practice designations, IR moves, depth-chart changes
#   gameenv     betting lines move continuously; projections follow the news
#
# So --live-only runs 5 and 6 alone. That is the late-week pass.
#
# ⛔ NO SCHEDULED JOB CAN CAPTURE FINAL INACTIVES. Those land 90 minutes before
# kickoff, and a run that opens a pull request cannot be merged into a live page
# in that window. The late-week pass exists to catch FRIDAY'S OFFICIAL PRACTICE
# REPORT — the single largest information event of the week — not the last word.
#
# USAGE
#   bash scripts/refresh-inseason.sh [season]                # all six steps
#   bash scripts/refresh-inseason.sh [season] --live-only    # steps 5-6 only
#
# Then re-run the guards and commit:
#   npm test && git add grading/data && git commit
#
# Until Week 1 the releases 404 and the committed placeholders stay in place,
# which is correct rather than a failure — every consumer degrades to
# 2025-only behaviour while `players` is empty.

set -uo pipefail
SEASON="2026"
LIVE_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --live-only) LIVE_ONLY=1 ;;
    -*) echo "refresh-inseason: unknown flag $arg" >&2; exit 2 ;;
    *)  SEASON="$arg" ;;
  esac
done
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

BASE="https://github.com/nflverse/nflverse-data/releases/download"
fetch() { # url dest — returns non-zero on a 404 rather than writing a stub
  local code
  code=$(curl -sSL --max-time 180 -w "%{http_code}" -o "$2" "$1") || return 1
  [ "$code" = "200" ] || { echo "  HTTP $code — not published yet"; return 1; }
}

echo "In-season refresh · season $SEASON"
echo

fail=0
got_any=0

if [ "$LIVE_ONLY" = "1" ]; then
  echo "Live-only pass: steps 1-4 skipped (nflverse season releases do not"
  echo "change between Monday night and the weekend). Refreshing 5-6 only."
  echo
else
  echo "1/6  snap trajectory (role change)"
  # NOTE the release tags: snap_counts, but stats_player (NOT player_stats).
  if fetch "$BASE/snap_counts/snap_counts_$SEASON.csv.gz" "$TMP/snaps.csv.gz"; then
    got_any=1
    python3 "$ROOT/scripts/build-snap-trajectory.py" "$TMP/snaps.csv.gz" \
      "$ROOT/grading/data/snap_trajectory_$SEASON.json" "$SEASON" || fail=1
  else
    echo "  skipped — placeholder left untouched"; fail=1
  fi
  echo

  # ONE DOWNLOAD, THREE BUILDERS. The QB profile, the game logs and the volume
  # twin all read the same weekly stats file, so the second and third layers cost
  # a parse each and no extra network.
  echo "2/6  QB volume profile"
  if fetch "$BASE/stats_player/stats_player_week_$SEASON.csv" "$TMP/week.csv"; then
    got_any=1
    python3 "$ROOT/scripts/build-qb-profile.py" "$TMP/week.csv" \
      "$ROOT/grading/data/qb_profile_$SEASON.json" "$SEASON" || fail=1
    echo
    echo "3/6  game logs (reusing the same download)"
    python3 "$ROOT/scripts/build-gamelogs.py" "$TMP/week.csv" \
      "$ROOT/grading/data/gamelogs_$SEASON.json" "$SEASON" || fail=1
    echo
    # THE CONTEXT TWIN OF THE FROZEN SCORED FILE. player_metrics_2025.json feeds
    # four scored inputs and stays frozen all season, which means the anchors it
    # carries (targets/gm 0.77, air yards share 0.78, target share 0.73) describe
    # LAST season for the whole of this one. This is the same measurements on the
    # current season, context only. Both vintages render; neither replaces the
    # other.
    echo "4/6  current-season volume (reusing the same download)"
    python3 "$ROOT/scripts/build-volume-current.py" "$TMP/week.csv" \
      "$ROOT/grading/data/volume_$SEASON.json" "$SEASON" || fail=1
  else
    echo "  skipped — placeholder left untouched"; fail=1
    echo
    echo "3/6  game logs (reusing the same download)"
    echo "  skipped — the weekly stats file is unavailable"
    echo
    echo "4/6  current-season volume (reusing the same download)"
    echo "  skipped — the weekly stats file is unavailable"
  fi
  echo
fi

# STEP 5 IS THE ODD ONE OUT AND THE COMMENT IS THE POINT.
# It cannot reuse a download above: those are nflverse SEASON RELEASES and this
# is a third-party live snapshot on a different host. It is also the only step
# that returns data before Week 1, which is exactly why it exists - the
# hand-written notes are at their most wrong in the weeks the nflverse releases
# do not publish.
#
# The 14.6MB raw payload is written to $TMP and dies with the trap. Only the
# ~200KB extract reaches grading/data/. NEVER commit the raw dump.
echo "5/6  availability + depth chart (Sleeper, live - works pre-season)"
if fetch "https://api.sleeper.app/v1/players/nfl" "$TMP/sleeper.json"; then
  python3 "$ROOT/scripts/build-status.py" "$TMP/sleeper.json" \
    "$ROOT/grading/data/status_$SEASON.json" "$SEASON" && got_any=1 || fail=1
else
  echo "  skipped - Sleeper unreachable; placeholder left untouched"
  echo "  (third-party and unversioned by design - see build-status.py)"
  fail=1
fi
echo

# STEP 6 IS THE SECOND ODD ONE OUT, FOR THE SAME REASON AS STEP 5: a live
# third-party snapshot rather than an nflverse season release. It is also the
# only step whose data EXPIRES. Lines move all week, so fetched_at is the
# vintage and a Tuesday pull is stale by Sunday. That is recorded in the file's
# own _meta.caveats and printed on the page.
#
# THE WEEK COMES FROM ESPN, NOT FROM DATE MATH. A bare scoreboard call reports
# week.number for the current week, so there is no season-start constant to
# drift and no off-by-one after a bye or a flexed game.
#
# curl does every fetch here on purpose. Measured Sep 12 2026: in the cloud
# sandbox curl returns 200 for this endpoint on every URL form while python
# urllib returns 403 through the egress proxy. build-gameenv.py is a PURE PARSE
# for that reason - see its header.
echo "6/6  game environment + weekly projections (live - expires, see _meta)"
ESPN="https://site.api.espn.com/apis/site/v2/sports/football/nfl"
if fetch "$ESPN/scoreboard" "$TMP/cur.json"; then
  WEEK=$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print((d.get('week') or {}).get('number') or 0)" "$TMP/cur.json" 2>/dev/null || echo 0)
else
  WEEK=0
fi
if [ "${WEEK:-0}" -ge 1 ] && [ "${WEEK:-0}" -le 18 ]; then
  echo "  current week: $WEEK"
  mkdir -p "$TMP/sum"
  fetch "$ESPN/scoreboard?seasontype=2&week=$WEEK&dates=$SEASON" "$TMP/sb.json" || true
  fetch "https://api.sleeper.app/projections/nfl/$SEASON/$WEEK?season_type=regular&position[]=QB&position[]=RB&position[]=WR&position[]=TE&order_by=ppr"     "$TMP/proj.json" || true
  if [ -s "$TMP/sb.json" ]; then
    for id in $(python3 -c "import json;print(' '.join(str(e.get('id')) for e in json.load(open('$TMP/sb.json')).get('events',[]) if e.get('id')))" 2>/dev/null); do
      fetch "$ESPN/summary?event=$id" "$TMP/sum/$id.json" >/dev/null 2>&1 || true
    done
  fi
  python3 "$ROOT/scripts/build-gameenv.py" --season "$SEASON" --week "$WEEK" \
    --scoreboard "$TMP/sb.json" --summaries "$TMP/sum" --projections "$TMP/proj.json" \
    --out "$ROOT/grading/data/gameenv_$SEASON.json" && got_any=1 || fail=1
else
  echo "  skipped - no current NFL week (out of season, or ESPN unreachable)"
  echo "  placeholder left untouched; the app renders no game block"
fi
echo

if [ "$fail" = "0" ]; then
  echo "Done. Run: npm test   then commit grading/data/"
elif [ "$got_any" = "1" ]; then
  # Partial is the NORMAL pre-season outcome now that step 5 exists: Sleeper
  # returns, the season releases 404. Reporting that as "nothing refreshed"
  # would be a false negative, and a script that lies about its own result is
  # how a stale layer survives a refresh nobody doubted.
  echo "Partly refreshed. Some layers updated; others are not published yet."
  echo "Run: npm test   then commit grading/data/"
else
  echo "Nothing refreshed (season not started, or a release is unavailable)."
  echo "The committed placeholders are unchanged and the app behaves as 2025-only."
fi
exit 0
