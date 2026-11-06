#!/usr/bin/env bash
# build.sh — assemble the hand-written sections into one HTML file and render a PDF.
#
# The sections in sections/ are hand-written prose. This script only assembles
# and renders them; it does not generate content. See README.md for the split.
#
#   ./draft-report/build.sh                 -> draft-report/out/report.{html,pdf}
#   ./draft-report/build.sh /custom/out     -> writes there instead
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$HERE/out}"
mkdir -p "$OUT"

ORDER=$(awk '{print $1}' "$HERE/SECTION-ORDER.txt")

python3 - "$HERE" "$OUT" <<'PY'
import sys, os
here, out = sys.argv[1], sys.argv[2]
order = [l.split()[0] for l in open(f'{here}/SECTION-ORDER.txt') if l.strip()]
fonts = open(f'{here}/fonts-inline.css', encoding='utf-8').read()
head  = open(f'{here}/head.html', encoding='utf-8').read().replace('FONTS_PLACEHOLDER', fonts)
body  = ''.join(open(f'{here}/sections/{n}.html', encoding='utf-8').read() for n in order)
open(f'{out}/report.html', 'w', encoding='utf-8').write(
    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + head + '</head><body>' + body + '</body></html>')
# artifact variant: no doctype/head/body wrapper, for publishing as a web page
open(f'{out}/artifact.html', 'w', encoding='utf-8').write(head + body)
print(f'assembled {len(order)} sections -> {out}/report.html', file=sys.stderr)
PY

# Chromium: prefer a Playwright install, fall back to whatever is on PATH.
CHROME="$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)"
[ -z "$CHROME" ] && CHROME="$(command -v chromium || command -v chromium-browser || command -v google-chrome || true)"
if [ -z "$CHROME" ]; then
  echo "no chromium found; HTML written but PDF skipped" >&2; exit 0
fi

"$CHROME" --headless --no-sandbox --disable-gpu \
  --run-all-compositor-stages-before-draw --virtual-time-budget=10000 \
  --no-pdf-header-footer \
  --print-to-pdf="$OUT/16-Team-Full-PPR-Draft-Board.pdf" \
  "file://$OUT/report.html" 2>&1 | grep -vi "dbus\|ERROR:" || true

if command -v pdfinfo >/dev/null 2>&1; then
  pdfinfo "$OUT/16-Team-Full-PPR-Draft-Board.pdf" | grep -E '^(Pages|Page size)' >&2
fi
echo "PDF: $OUT/16-Team-Full-PPR-Draft-Board.pdf" >&2
