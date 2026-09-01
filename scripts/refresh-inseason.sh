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
# USAGE
#   bash scripts/refresh-inseason.sh [season]     # season defaults to 2026
#
# Then re-run the guards and commit:
#   npm test && git add grading/data && git commit
#
# Until Week 1 the releases 404 and the committed placeholders stay in place,
# which is correct rather than a failure — every consumer degrades to
# 2025-only behaviour while `players` is empty.

set -uo pipefail
SEASON="${1:-2026}"
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

echo "1/3  snap trajectory (role change)"
# NOTE the release tags: snap_counts, but stats_player (NOT player_stats).
if fetch "$BASE/snap_counts/snap_counts_$SEASON.csv.gz" "$TMP/snaps.csv.gz"; then
  python3 "$ROOT/scripts/build-snap-trajectory.py" "$TMP/snaps.csv.gz" \
    "$ROOT/grading/data/snap_trajectory_$SEASON.json" "$SEASON" || fail=1
else
  echo "  skipped — placeholder left untouched"; fail=1
fi
echo

# ONE DOWNLOAD, THREE BUILDERS. The QB profile, the game logs and the volume
# twin all read the same weekly stats file, so the second and third layers cost
# a parse each and no extra network.
echo "2/4  QB volume profile"
if fetch "$BASE/stats_player/stats_player_week_$SEASON.csv" "$TMP/week.csv"; then
  python3 "$ROOT/scripts/build-qb-profile.py" "$TMP/week.csv" \
    "$ROOT/grading/data/qb_profile_$SEASON.json" "$SEASON" || fail=1
  echo
  echo "3/4  game logs (reusing the same download)"
  python3 "$ROOT/scripts/build-gamelogs.py" "$TMP/week.csv" \
    "$ROOT/grading/data/gamelogs_$SEASON.json" "$SEASON" || fail=1
  echo
  # THE CONTEXT TWIN OF THE FROZEN SCORED FILE. player_metrics_2025.json feeds
  # four scored inputs and stays frozen all season, which means the anchors it
  # carries (targets/gm 0.77, air yards share 0.78, target share 0.73) describe
  # LAST season for the whole of this one. This is the same measurements on the
  # current season, context only. Both vintages render; neither replaces the
  # other.
  echo "4/4  current-season volume (reusing the same download)"
  python3 "$ROOT/scripts/build-volume-current.py" "$TMP/week.csv" \
    "$ROOT/grading/data/volume_$SEASON.json" "$SEASON" || fail=1
else
  echo "  skipped — placeholder left untouched"; fail=1
  echo
  echo "3/4  game logs (reusing the same download)"
  echo "  skipped — the weekly stats file is unavailable"
  echo
  echo "4/4  current-season volume (reusing the same download)"
  echo "  skipped — the weekly stats file is unavailable"
fi
echo

if [ "$fail" = "0" ]; then
  echo "Done. Run: npm test   then commit grading/data/"
else
  echo "Nothing refreshed (season not started, or a release is unavailable)."
  echo "The committed placeholders are unchanged and the app behaves as 2025-only."
fi
exit 0
