#!/usr/bin/env python3
"""
refresh-adp.py — measure (and optionally apply) ADP drift in App.jsx.

WHY THIS EXISTS
    ADP_DATA is a dated snapshot. Drafts happen later and ADP moves. A stale
    table produces false REACH/VALUE flags, which is a reported bug class in
    this repo (see CLAUDE.md, "ADP Source of Truth"). An Aug 15 2026 audit
    found median drift 9.2 picks, mean 14.5, max 81.1 against a live market
    — roughly triple the 5.1 mean recorded in July.

    Refreshing by hand is how the tables drifted apart in the first place, and
    how five duplicate keys got into ADP_DATA. This does the measuring.

THE ONE RULE: REPORT BY DEFAULT, NEVER AUTO-APPLY.
    ADP is a data decision with a source behind it. This script writes a diff
    you read. It only edits App.jsx when you pass --apply, and even then it
    refuses moves it cannot justify (see --max-move and --min-drafts).

FORMAT MISMATCH — READ THIS BEFORE TRUSTING A NUMBER
    The source (Fantasy Football Calculator) is REDRAFT. ADP_DATA is UNDERDOG
    BEST BALL. They are different markets, and some of the gap this reports is
    format, not staleness:

      - Best ball drafts QUARTERBACKS EARLIER (2-3 per roster, no streaming).
        A QB showing "+40" here is usually correct behavior, not decay.
      - Best ball drafts UPSIDE earlier and floor later, so rookies and
        contingent profiles run ahead of their redraft price.
      - Redraft drafts early-down volume backs earlier and pass-catching
        specialists later.

    MEASURED OFFSET (Aug 15 2026). Five held players were checked against a
    live Underdog board rather than guessed at. For ESTABLISHED VETERANS the
    redraft source ran ~20-29 picks EARLIER than real best-ball ADP, and FOUR
    OF THE FIVE turned out to be pure format offset with the table already
    correct to within 7 picks:

        player     ADP_DATA   real UD   err    redraft   reported "drift"
        Stafford     104.0     108.3   +4.3      75.2       -28.8
        Aaron Jones  120.0     126.9   +6.9      98.2       -21.8
        Shakir       127.0     131.0   +4.0     104.0       -23.0
        Kyle Pitts   108.0     103.2   -4.8      82.4       -25.6
        Kamara       181.2     162.1  -19.1     147.3       -33.9   <- real

    So a 20-30 pick negative delta on a veteran RB/WR/TE is the EXPECTED
    reading here and means nothing on its own. Do not treat direction alone
    as evidence of staleness: it takes a NEWS DRIVER, or a real best-ball
    quote, to justify writing a number into ADP_DATA.

    So: --table yahoo is a LIKE-FOR-LIKE comparison (redraft vs redraft) and
    can be applied with confidence. --table data is CROSS-FORMAT and should be
    treated as a directional signal — apply news-driven moves, not QB noise.

USAGE
    python3 scripts/refresh-adp.py                        # report, ADP_DATA
    python3 scripts/refresh-adp.py --table yahoo          # report, redraft table
    python3 scripts/refresh-adp.py --format ppr           # different source format
    python3 scripts/refresh-adp.py --table yahoo --apply  # write it
    python3 scripts/refresh-adp.py --out drift.md         # save the report

    After --apply you MUST mirror and test:
        cp App.jsx App.jsx.jsx && npm test

SOURCE
    https://fantasyfootballcalculator.com/api/v1/adp/<format>?teams=12&year=<year>
    Free, no auth. Returns a meta block with the exact draft-date window, so
    the vintage is always knowable rather than assumed.
"""

import argparse
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
APP = REPO / "App.jsx"

TABLES = {
    "data": ("ADP_DATA", "Underdog best ball", "CROSS-FORMAT vs a redraft source"),
    "yahoo": ("ADP_YAHOO", "redraft", "like-for-like vs a redraft source"),
    "superflex": ("ADP_SUPERFLEX", "superflex", "CROSS-FORMAT; superflex reprices QBs hardest"),
}

SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


def normalize(name: str) -> str:
    """Mirror App.jsx normalize() + suffix stripping used by buildLastNameIndex.

    Hyphens and apostrophes become spaces, punctuation is dropped, and name
    suffixes are removed. Suffixes poisoning the index was a real bug here
    (CLAUDE.md, "Name Resolution Across ADP Tables") — keep this in sync.
    """
    s = name.lower().replace("-", " ").replace("'", "").replace("’", "")
    s = re.sub(r"[^a-z ]", "", s)
    parts = [p for p in s.split() if p and p not in SUFFIXES]
    return " ".join(parts)


def fetch(fmt: str, year: int, teams: int) -> dict:
    url = (
        f"https://fantasyfootballcalculator.com/api/v1/adp/{fmt}"
        f"?teams={teams}&year={year}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "rosterxray-adp-refresh"})
    with urllib.request.urlopen(req, timeout=45) as r:
        payload = json.loads(r.read().decode("utf8"))
    if payload.get("status") != "Success":
        sys.exit(f"source returned status={payload.get('status')!r}")
    return payload


ENTRY = re.compile(
    r'^(?P<indent>\s*)"(?P<key>[^"]+)":\s*\{\s*adp:\s*(?P<adp>[\d.]+)\s*,'
    r'\s*pos:\s*"(?P<pos>[^"]+)"\s*,\s*team:\s*"(?P<team>[^"]+)"\s*\}\s*,'
    r'(?P<trail>.*)$'
)


def read_table(text: str, const_name: str):
    """Return (entries, start_line, end_line). entries: list of dicts w/ line no."""
    lines = text.split("\n")
    start = None
    for i, ln in enumerate(lines):
        if ln.startswith(f"const {const_name} = {{"):
            start = i
            break
    if start is None:
        sys.exit(f"could not find `const {const_name} = {{` in App.jsx")
    end = None
    for i in range(start + 1, len(lines)):
        if lines[i].startswith("};"):
            end = i
            break
    if end is None:
        sys.exit(f"could not find the closing brace for {const_name}")

    entries = []
    for i in range(start + 1, end):
        m = ENTRY.match(lines[i])
        if m:
            entries.append({
                "line": i,
                "key": m.group("key"),
                "adp": float(m.group("adp")),
                "pos": m.group("pos"),
                "team": m.group("team"),
                "trail": m.group("trail"),
                "indent": m.group("indent"),
            })
    return entries, start, end


def main() -> int:
    ap = argparse.ArgumentParser(description="Measure ADP drift in App.jsx against a live market.")
    ap.add_argument("--table", choices=sorted(TABLES), default="data")
    ap.add_argument("--format", default="half-ppr",
                    help="source format: half-ppr, ppr, standard, 2qb, dynasty")
    ap.add_argument("--year", type=int, default=date.today().year)
    ap.add_argument("--teams", type=int, default=12)
    ap.add_argument("--threshold", type=float, default=15.0,
                    help="report moves of at least this many picks (default 15)")
    ap.add_argument("--min-drafts", type=int, default=20,
                    help="ignore source rows drafted fewer than N times (default 20). "
                         "A 12-draft sample is noise, not a market.")
    ap.add_argument("--max-move", type=float, default=60.0,
                    help="with --apply, refuse moves larger than this without review "
                         "(default 60). A 60+ pick move is a story, not a drift.")
    ap.add_argument("--apply", action="store_true",
                    help="actually rewrite App.jsx. Off by default, on purpose.")
    ap.add_argument("--out", help="write the markdown report to this path")
    args = ap.parse_args()

    const_name, table_desc, comparability = TABLES[args.table]

    payload = fetch(args.format, args.year, args.teams)
    meta = payload["meta"]
    src_rows = payload["players"]
    vintage = f"{meta['start_date']} to {meta['end_date']}"

    text = APP.read_text(encoding="utf8")
    entries, _, _ = read_table(text, const_name)

    src = {}
    thin = {}
    for p in src_rows:
        k = normalize(p["name"])
        if not k:
            continue
        (thin if p.get("times_drafted", 0) < args.min_drafts else src)[k] = p

    moves, unmatched, thin_hits = [], [], []
    for e in entries:
        k = normalize(e["key"])
        hit = src.get(k)
        if hit is None:
            if k in thin:
                thin_hits.append((e, thin[k]))
            else:
                unmatched.append(e)
            continue
        delta = hit["adp"] - e["adp"]
        if abs(delta) >= args.threshold:
            moves.append({
                "entry": e, "src": hit, "delta": delta,
                "pos_mismatch": hit["position"] != e["pos"],
                "team_mismatch": hit["team"] != e["team"],
            })

    moves.sort(key=lambda m: -abs(m["delta"]))
    matched = len(entries) - len(unmatched) - len(thin_hits)
    all_deltas = sorted(
        abs(src[normalize(e["key"])]["adp"] - e["adp"])
        for e in entries if normalize(e["key"]) in src
    )

    L = []
    w = L.append
    w(f"# ADP drift report — {const_name}")
    w("")
    w(f"- **Table:** `{const_name}` ({table_desc})")
    w(f"- **Source:** Fantasy Football Calculator `{meta['type']}`, {args.teams}-team, "
      f"**{meta['total_drafts']:,} drafts**, {vintage}")
    w(f"- **Comparability:** {comparability}")
    w(f"- **Matched:** {matched} of {len(entries)} table entries "
      f"({len(unmatched)} not in source, {len(thin_hits)} below the {args.min_drafts}-draft floor)")
    if all_deltas:
        mid = all_deltas[len(all_deltas) // 2]
        w(f"- **Drift:** median {mid:.1f} · mean {sum(all_deltas)/len(all_deltas):.1f} "
          f"· max {all_deltas[-1]:.1f}")
    w("")
    if args.table != "yahoo":
        w("> **Cross-format warning.** The source is redraft; this table is not. "
          "Quarterback moves are the usual false positive — best ball drafts QBs "
          "earlier by design. Apply news-driven moves, not format artifacts.")
        w("")

    w(f"## Moves of {args.threshold:.0f}+ picks ({len(moves)})")
    w("")
    w("Negative delta = the live market drafts him EARLIER than the table says.")
    w("")
    w("| Player | Pos | App | Live | Delta | Drafts | Flags |")
    w("|---|---|---:|---:|---:|---:|---|")
    for m in moves:
        e, s, d = m["entry"], m["src"], m["delta"]
        flags = []
        if abs(d) > args.max_move:
            flags.append("**REVIEW: >max-move**")
        if m["pos_mismatch"]:
            flags.append(f"pos {e['pos']}->{s['position']}")
        if m["team_mismatch"]:
            flags.append(f"team {e['team']}->{s['team']}")
        if e["pos"] == "QB" and args.table != "yahoo":
            flags.append("QB: likely format, not drift")
        if e["trail"].strip():
            flags.append("has comment")
        w(f"| {e['key']} | {e['pos']} | {e['adp']:.1f} | {s['adp']:.1f} | "
          f"{d:+.1f} | {s.get('times_drafted', 0)} | {' · '.join(flags)} |")
    w("")

    if thin_hits:
        w(f"## Below the {args.min_drafts}-draft floor ({len(thin_hits)}) — not applied")
        w("")
        w("Present in the source but on too small a sample to trust. "
          "These are often exactly the players whose price is moving, so read them, "
          "then set the number by hand with a source.")
        w("")
        w("| Player | App | Live | Delta | Drafts |")
        w("|---|---:|---:|---:|---:|")
        for e, s in sorted(thin_hits, key=lambda t: -abs(t[1]["adp"] - t[0]["adp"]))[:25]:
            w(f"| {e['key']} | {e['adp']:.1f} | {s['adp']:.1f} | {s['adp']-e['adp']:+.1f} | "
              f"{s.get('times_drafted', 0)} |")
        w("")

    if unmatched:
        w(f"## In the table, absent from the source ({len(unmatched)})")
        w("")
        w("Deep-bench names the source does not carry. No action — but if one of "
          "these is a player you actually draft, his ADP has no live check at all.")
        w("")
        w("`" + "`, `".join(e["key"] for e in unmatched[:60]) + "`")
        w("")

    missing = [p for k, p in src.items()
               if k not in {normalize(e["key"]) for e in entries}]
    missing.sort(key=lambda p: p["adp"])
    if missing:
        w(f"## In the source, absent from `{const_name}` ({len(missing)})")
        w("")
        w("**These resolve to nothing and silently drop out of a graded roster.** "
          "Adding a player to one table and not the others is the usual cause of an "
          "\"app doesn't recognize X\" report.")
        w("")
        w("| Player | Pos | Team | Live ADP | Drafts |")
        w("|---|---|---|---:|---:|")
        for p in missing[:40]:
            w(f"| {p['name']} | {p['position']} | {p['team']} | {p['adp']:.1f} | "
              f"{p.get('times_drafted', 0)} |")
        w("")

    report = "\n".join(L)
    print(report)
    if args.out:
        Path(args.out).write_text(report + "\n", encoding="utf8")
        print(f"\n[report written to {args.out}]", file=sys.stderr)

    if not args.apply:
        print(f"\n[report only — {len(moves)} move(s) identified, nothing written. "
              f"Re-run with --apply to write them.]", file=sys.stderr)
        return 0

    applied, skipped = [], []
    lines = text.split("\n")
    for m in moves:
        e, s, d = m["entry"], m["src"], m["delta"]
        if abs(d) > args.max_move:
            skipped.append((e, s, d, f"exceeds --max-move {args.max_move:.0f}"))
            continue
        if m["pos_mismatch"] or m["team_mismatch"]:
            skipped.append((e, s, d, "pos/team disagree — resolve by hand"))
            continue
        old = lines[e["line"]]
        stamp = f"  // ADP refresh {date.today().isoformat()}: {e['adp']:.1f} -> {s['adp']:.1f} " \
                f"({meta['type']}, {meta['total_drafts']:,} drafts, {vintage})"
        base = re.sub(r"//.*$", "", old).rstrip()
        new = re.sub(r"(adp:\s*)[\d.]+", lambda mo: mo.group(1) + f"{s['adp']:g}", base, count=1)
        lines[e["line"]] = new + stamp
        applied.append((e, s, d))

    APP.write_text("\n".join(lines), encoding="utf8")
    print(f"\n[applied {len(applied)}, skipped {len(skipped)}]", file=sys.stderr)
    for e, s, d, why in skipped:
        print(f"  SKIPPED {e['key']}: {d:+.1f} — {why}", file=sys.stderr)
    print("\nNOW DO THIS:", file=sys.stderr)
    print("  1. Bump the vintage for this table in App.jsx ADP_VINTAGE", file=sys.stderr)
    print("  2. cp App.jsx App.jsx.jsx", file=sys.stderr)
    print("  3. npm test", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
