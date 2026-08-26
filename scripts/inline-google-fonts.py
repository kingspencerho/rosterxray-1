#!/usr/bin/env python3
"""
inline-google-fonts.py — bake Google Fonts into a self-contained CSS file.

WHY
  The draft report renders to PDF through headless Chromium. A <link> to
  fonts.googleapis.com works only if the render machine has network access to
  it, and silently falls back to a system font if it does not — producing a PDF
  that looks wrong with no error. Inlining the woff2 files as data URIs makes
  the render deterministic and the PDF self-contained.

  It also filters to the LATIN subset. The default css2 response carries
  Cyrillic, Greek and Vietnamese ranges, which is ~19 files instead of 6 and
  triples the size for glyphs this document never uses.

USAGE
  python3 scripts/inline-google-fonts.py > draft-report/fonts-inline.css

  Change FAMILIES below to change the typefaces. Requires network access.
"""
import re, base64, urllib.request, sys

FAMILIES = 'family=Oswald:wght@500;600&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400'
CSS_URL = f'https://fonts.googleapis.com/css2?{FAMILIES}&display=swap'
# a modern UA gets woff2 back; the default UA gets much larger ttf
UA = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120 Safari/537.36')


def fetch(url, ua=UA):
    return urllib.request.urlopen(
        urllib.request.Request(url, headers={'User-Agent': ua}), timeout=30).read()


def main():
    css = fetch(CSS_URL).decode('utf-8')
    blocks = re.findall(r'/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{.*?\})', css, re.S)
    out, total = [], 0
    for subset, blk in blocks:
        if subset != 'latin':
            continue
        url = re.search(r'url\((https://[^)]+)\)', blk).group(1)
        fam = re.search(r"font-family: '([^']+)'", blk).group(1)
        weight = re.search(r'font-weight: (\d+)', blk).group(1)
        style = re.search(r'font-style: (\w+)', blk).group(1)
        data = fetch(url)
        total += len(data)
        b64 = base64.b64encode(data).decode()
        out.append(f"@font-face{{font-family:'{fam}';font-style:{style};"
                   f"font-weight:{weight};font-display:swap;"
                   f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}")
        print(f'  {fam:<16} {style:<7} {weight}  {len(data):>7,} bytes', file=sys.stderr)
    print(f'  {len(out)} faces, {total:,} bytes of font data', file=sys.stderr)
    sys.stdout.write('\n'.join(out))


if __name__ == '__main__':
    main()
