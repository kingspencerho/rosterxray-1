#!/usr/bin/env bash
# film-sheets.sh - turn a player film / highlight video into readable contact sheets.
#
# WHY THIS EXISTS. Evaluating a ROOKIE or a waiver add is the one case where tape
# outranks the data, because the rate data does not exist yet. The reading rubric
# is ANALYST-REFERENCE.md section 11t. This script is only the plumbing that gets
# frames in front of a reader; it judges nothing.
#
#   bash scripts/film-sheets.sh <youtube-url|local-path> [outdir]
#
# It writes <outdir>/sheets/sheet_NN.png - tiled 4x4 contact sheets - plus the
# source video and any captions. Read the SHEETS, not the individual frames:
# a 16-up tile costs one image instead of sixteen and gross reads (alignment,
# down and distance off the score bug, where the ball goes) survive the tiling.
# Pull individual full-res frames with -ss only for the two or three plays that
# turn out to matter.
#
# ------------------------------------------------------------------ TRAPS ---
# Four things cost real time on the first run. All four are handled here.
#
# 1. 720p IS 403-BLOCKED. The web / web_safari / tv_embedded clients advertise
#    720p and then return HTTP 403 partway through the download. The `android`
#    client returns format 18 (640x360, combined A/V) and actually completes.
#    So this tries android FIRST and treats 360p as the expected result.
#    ⛔ Do not "fix" this by asking for a higher format - you get a 403, not a
#    better file. Re-probe occasionally; yt-dlp catches up with YouTube.
#
# 2. `-pattern_type glob` IS NOT COMPILED INTO THIS FFMPEG BUILD. It fails with
#    "Function not implemented". Use a zero-padded %02d sequence instead, which
#    is what the tiling step below does.
#
# 3. A 403 MID-DOWNLOAD IS NOT A DEAD ROUTE. The first attempt failing says
#    nothing about the second. This loops over clients before giving up.
#
# 4. THE FRAME INTERVAL MUST SCALE WITH DURATION. A 2-minute debut reel and an
#    11-minute season compilation need very different sampling to land on a
#    readable number of sheets. This targets ~64 frames either way.
#    ⚠️ Use CEILING division, not floor. 121/64 floors to 1, which yields 121
#    frames and 8 sheets instead of the 4 intended - the target is an upper
#    bound on frames, so the interval has to round UP.
#
# 5. ⛔ `metadata=print:file=` SILENTLY WRITES NOTHING IF THE PATH HAS A COLON.
#    Inside an ffmpeg filtergraph `:` separates options, so a Windows absolute
#    path (C:/...) truncates the argument at the drive letter. ffmpeg exits 0
#    and the file never appears. This cd's into the output directory and uses a
#    bare relative filename instead. Same class as every other silent-absence
#    bug in this repo: the command succeeded and produced nothing.
#
# ⚠️ WHAT THE OUTPUT CANNOT SHOW, and it is a property of the SOURCE, not of
# this script: almost all of this footage is the BROADCAST angle, which crops
# the safeties out of frame before the snap. You cannot read coverage shell,
# release technique against press, or hand usage off it. All-22 is not on
# YouTube. Say so rather than inferring.
set -uo pipefail

# ------------------------------------------------------------ --find MODE ---
#   bash scripts/film-sheets.sh --find "Player Name" [n]
#
# LISTS candidate videos, newest first, with upload date, age, length and
# channel. It NEVER picks one and never downloads anything.
#
# WHY IT DOES NOT PICK: on Sep 23 2026 the top results for a Week 2 search on
# Kaleb Johnson included "Preseason Week 2 Highlights vs Jets" - STEELERS
# footage uploaded Aug 22, before his Aug 30 trade to Green Bay. The title
# matched the query perfectly. Only the upload date, read against the date of
# the trade, told it apart. That comparison needs the player's team history,
# which this script does not know, so the choice stays with the reader.
#
# The REEL column is read off the title and is the survivorship check from
# ANALYST-REFERENCE 11t: "every target" / "every snap" reels include the misses,
# "best catches" and "every catch" do not. Prefer an unfiltered reel when both
# exist. Blank means the title does not say.
#
# ~4 seconds per result (each is a real metadata fetch), so n defaults to 8.
if [ "${1:-}" = "--find" ]; then
  Q="${2:-}"; N="${3:-8}"
  [ -z "$Q" ] && { echo "usage: film-sheets.sh --find \"Player Name\" [n]" >&2; exit 2; }
  command -v yt-dlp >/dev/null || { echo "yt-dlp not found" >&2; exit 3; }
  NOW=$(date +%s)
  echo "== YouTube: \"$Q highlights\", $N results, newest first =="
  printf "%-10s %5s %6s  %-10s %-12s %-22s %s\n" UPLOADED AGE LENGTH REEL ID CHANNEL TITLE
  PYTHONIOENCODING=utf-8 yt-dlp --no-warnings --skip-download --ignore-errors \
      --print "%(upload_date)s|%(duration_string)s|%(id)s|%(channel)s|%(title)s" \
      "ytsearch${N}:${Q} highlights" 2>/dev/null \
    | sort -r \
    | while IFS='|' read -r D LEN ID CH T; do
        AGE="?"
        if [[ "$D" =~ ^[0-9]{8}$ ]]; then
          TS=$(date -d "$D" +%s 2>/dev/null) && AGE="$(( (NOW - TS) / 86400 ))d"
          D="${D:0:4}-${D:4:2}-${D:6:2}"
        fi
        LT=$(printf '%s' "$T" | tr '[:upper:]' '[:lower:]')
        REEL=""
        if [[ "$LT" =~ every\ (target|snap|touch|run|carry|play|rep)|all\ (targets|snaps|plays) ]]; then
          REEL="unfiltered"
        elif [[ "$LT" =~ best|top\ [0-9]|every\ catch|mix|hype ]]; then
          REEL="curated"
        fi
        printf "%-10s %5s %6s  %-10s %-12s %-22.22s %s\n" "$D" "$AGE" "$LEN" "$REEL" "$ID" "$CH" "$T"
      done
  echo
  echo "Nothing was picked. Check each upload date against the player's current"
  echo "team before trusting a title, then run:"
  echo "  bash scripts/film-sheets.sh \"https://www.youtube.com/watch?v=<ID>\" <outdir>"
  exit 0
fi

SRC="${1:-}"
OUT="${2:-film-out}"
[ -z "$SRC" ] && { echo "usage: film-sheets.sh <youtube-url|local-path> [outdir]" >&2; exit 2; }
command -v ffmpeg  >/dev/null || { echo "ffmpeg not found"  >&2; exit 3; }
command -v ffprobe >/dev/null || { echo "ffprobe not found" >&2; exit 3; }

mkdir -p "$OUT/sheets"
VID="$OUT/video.mp4"

if [ -f "$SRC" ]; then
  echo "local file: $SRC"
  VID="$SRC"
else
  command -v yt-dlp >/dev/null || { echo "yt-dlp not found" >&2; exit 3; }
  echo "== metadata =="
  yt-dlp --no-warnings --skip-download \
    --print "%(title)s" --print "%(uploader)s" --print "%(duration)s sec" \
    --print "%(upload_date)s" "$SRC" 2>/dev/null

  # TRAP 1 + 3: android first, then the rest. 360p is the expected outcome.
  got=0
  for CLIENT in android ios tv web_safari web; do
    echo "== download attempt: $CLIENT =="
    rm -f "$VID" "$OUT"/video.f*.part
    if yt-dlp --no-warnings --extractor-args "youtube:player_client=$CLIENT" \
        --retries 5 --fragment-retries 5 --retry-sleep 2 \
        -f "best[ext=mp4]/best" --merge-output-format mp4 \
        -o "$VID" --write-auto-subs --sub-langs "en.*" --convert-subs srt \
        "$SRC" >/dev/null 2>&1 && [ -s "$VID" ]; then
      echo "   ok via $CLIENT"; got=1; break
    fi
    echo "   failed on $CLIENT"
  done
  [ "$got" = "1" ] || { echo "could not download after trying every client" >&2; exit 4; }
fi

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VID" | cut -d. -f1)
WH=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$VID")
[ -z "${DUR:-}" ] && { echo "could not read duration" >&2; exit 5; }

# TRAP 4: aim for ~64 frames whatever the runtime, rounding the interval UP so
# 64 is a ceiling on frames rather than a floor. Minimum 1s for a short clip.
IVAL=$(( (DUR + 63) / 64 )); [ "$IVAL" -lt 1 ] && IVAL=1
echo "== ${DUR}s at ${WH}, one frame every ${IVAL}s -> ~$(( DUR / IVAL )) frames =="

ffmpeg -v error -i "$VID" \
  -vf "fps=1/${IVAL},scale=480:270,tile=4x4" "$OUT/sheets/sheet_%02d.png" -y

# Scene cuts are a decent proxy for play boundaries on a cut-up reel. Printed
# so a reader can -ss straight to a play start instead of guessing.
# TRAP 5: run from inside $OUT with a BARE filename - an absolute path with a
# drive-letter colon makes this write nothing and still exit 0.
VID_ABS="$(cd "$(dirname "$VID")" && pwd)/$(basename "$VID")"
( cd "$OUT" && ffmpeg -v info -i "$VID_ABS" \
    -vf "select='gt(scene,0.35)',metadata=print:file=cuts.txt" \
    -an -f null - >/dev/null 2>&1 )
# `grep -c` PRINTS 0 AND EXITS 1 on no match, so `|| echo 0` appends a SECOND
# line and the count prints as two lines. Swallow the exit status instead.
CUTS=$(grep -c "pts_time" "$OUT/cuts.txt" 2>/dev/null) || true
[ -z "${CUTS:-}" ] && CUTS=0

echo
echo "wrote $(ls "$OUT"/sheets/sheet_*.png 2>/dev/null | wc -l) sheet(s) to $OUT/sheets/"
echo "$CUTS scene cut(s) listed in $OUT/cuts.txt - likely play boundaries"
echo
echo "Read the sheets. For a play worth a closer look:"
echo "  ffmpeg -ss <seconds> -i \"$VID\" -frames:v 1 frame.png"
echo "Rubric: ANALYST-REFERENCE.md section 11t"
