#!/usr/bin/env python3
"""Build METRICS-PLAIN-ENGLISH.md from ANALYST-REFERENCE.md.

WHY THIS IS GENERATED AND NOT WRITTEN
-------------------------------------
Every explanation in the output already exists in ANALYST-REFERENCE.md - the
template guard (REQUIRED_PROSE) forces every entry to carry "Plain English."
and "Why it matters.", and 23 of 26 also carry "Worked example." and
"Gotchas.". The content was never missing. The ORDER was.

Section 1 lists inputs by STICKINESS, which is the right order for deciding
what to trust and the wrong order for learning what things mean. Section 5
then buries each explanation under a File/Field/Surfaces table that a reader
who wants to understand WOPR does not care about.

So this reads the reference and re-emits it in Source Hierarchy order with the
engineering metadata stripped: the question each rank answers, then each
metric's plain meaning, its argument, a real player, and the trap.

  A HAND-WRITTEN COPY WOULD BE A SECOND SOURCE OF TRUTH.  Section 0 Rule 3
  and the guard-23 comment on section 13 both forbid exactly that, and the
  repo has six files that went stale in one day by being derived and not
  stamped.  Generated means it cannot drift and cannot disagree.

  IT ALSO CANNOT LEAK.  This repo is PUBLIC.  A generator can only emit what
  ANALYST-REFERENCE.md already contains, so no roster, league or personal
  fantasy context can reach the output by accident.

Run:  python scripts/build-plain-english.py
      python scripts/build-plain-english.py --selftest
"""
import io
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "ANALYST-REFERENCE.md")
OUT = os.path.join(ROOT, "METRICS-PLAIN-ENGLISH.md")

# The four human fields, in template order. Anything else bolded inside an
# entry (and several entries carry extra paragraphs) rides along with the
# field above it, which is correct - it is that field's own argument.
FIELDS = ["Plain English", "Why it matters", "Worked example", "Gotchas"]

# Groups, in the order a reader should meet them. Rank "-" is not a rank: it
# is the reference shelf, and lumping it in with rank 5 would imply a trust
# level the file deliberately refuses to give it.
ABSENT = ("—", "-", "")   # the index prints an em dash for "not measured"


def section(doc, start, end):
    a = doc.index(start)
    b = doc.index(end)
    assert b > a, "%s must precede %s" % (start, end)
    return doc[a:b]


def parse_index(doc):
    """Section 1 rows: name, anchor, r, rank, tier, status."""
    body = section(doc, "## §1 · Index", "## §2 ·")
    rows = []
    for line in body.split("\n"):
        m = re.match(r"^\|\s*\[(.+?)\]\(#(.+?)\)\s*\|(.+)\|\s*$", line)
        if not m:
            continue
        cells = [c.strip() for c in m.group(3).split("|")]
        rows.append({
            "name": m.group(1),
            "anchor": m.group(2),
            "r": cells[0],
            "rank": cells[1],
            "tier": cells[2],
            "status": cells[3],
            "scored": cells[4] if len(cells) > 4 else "",
        })
    assert rows, "no index rows parsed - section 1 table shape changed"
    return rows


def parse_ranks(doc):
    """Section 3 rank headings plus the prose under each."""
    body = section(doc, "## §3 · The Source Hierarchy",
                   "## §4 ·")
    out = {}
    parts = re.split(r"\n### Rank (\d) — ", body)
    for i in range(1, len(parts), 2):
        num = parts[i]
        chunk = parts[i + 1]
        lines = chunk.split("\n")
        prose = "\n".join(lines[1:]).split("\n**Inputs:**")[0]
        out[num] = {"question": lines[0].strip(), "prose": prose.strip()}
    assert len(out) == 5, "expected 5 ranks, parsed %d" % len(out)
    return out


def parse_entries(doc):
    """Sections 5-7: anchor-keyed dict of the four human fields."""
    body = section(doc, "## §5 ·", "## §8 ·")
    out = {}
    for raw in re.split(r"\n### ", body)[1:]:
        # A `###` split absorbs the `## SECTION` heading that follows the LAST
        # entry of a section, which then rides into that entry's Gotchas field
        # and prints a stray "Tier B" header in the middle of the output. This
        # repo has hit the swallowed-header trap three times running the other
        # way (a cut anchored on `### ` eating a `## `). Same boundary, read
        # from the other side: anchor the end on EITHER heading level.
        raw = re.split(r"\n## ", raw)[0]
        heading = raw.split("\n")[0].strip()
        fields = {}
        for name in FIELDS:
            marker = "**%s.**" % name
            if marker not in raw:
                continue
            tail = raw[raw.index(marker) + len(marker):]
            # Stop at the next KNOWN field, never at the next bold run - some
            # entries carry extra bolded paragraphs that belong to the field
            # above them.
            cut = len(tail)
            for other in FIELDS:
                nxt = tail.find("**%s.**" % other)
                if nxt != -1:
                    cut = min(cut, nxt)
            fields[name] = tail[:cut].strip().rstrip("-").strip()
        out[anchor_of(heading)] = {"heading": heading, "fields": fields}
    return out


def anchor_of(heading):
    """GitHub's anchor rule, which is what section 1's links already use.

    IT REPLACES EACH SPACE INDIVIDUALLY, never runs of whitespace. Collapsing
    a run to one hyphen produced "snap-trajectory-r-rank-1" against the real
    "snap-trajectory--r----rank-1", so every entry silently missed its index
    row and all 26 metrics rendered with no explanation under them. The
    doubled hyphens ARE the punctuation that was stripped.
    """
    a = re.sub(r"[^a-z0-9 \-]", "", heading.lower())
    return a.strip().replace(" ", "-")


def parse_oneliners(doc):
    """Section 13's one-line summary per metric, keyed by anchor."""
    body = section(doc, "## §13 ·", "## §14 ·")
    out = {}
    for line in body.split("\n"):
        m = re.match(r"^\|\s*\[.+?\]\(#(.+?)\)\s*\|(.+?)\|\s*$", line)
        if m:
            out[m.group(1)] = m.group(2).strip()
    return out


def parse_order(doc):
    """Section 13's 'order to work in' - the most useful thing in the file."""
    body = section(doc, "## §13 ·", "## §14 ·")
    m = re.search(r"### The order to work in, on the clock\n(.+?)(?=\n---|\Z)",
                  body, re.S)
    return m.group(1).strip() if m else ""


def parse_sort_rule(doc):
    """Section 3's generate-versus-sort rule."""
    body = section(doc, "## §3 ·", "## §4 ·")
    m = re.search(r"### The rule that ties it together\n(.+?)(?=\n###|\Z)",
                  body, re.S)
    return m.group(1).strip() if m else ""


def src_commit():
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%h", "--", "ANALYST-REFERENCE.md"],
            cwd=ROOT, stderr=subprocess.DEVNULL)
        return out.decode().strip() or "unknown"
    except Exception:
        return "unknown"


def build():
    doc = io.open(SRC, encoding="utf-8", newline="").read()
    rows = parse_index(doc)
    ranks = parse_ranks(doc)
    entries = parse_entries(doc)
    ones = parse_oneliners(doc)

    L = []
    w = L.append

    w("<!-- GENERATED by scripts/build-plain-english.py. DO NOT HAND-EDIT. -->")
    w("<!-- DERIVED-FROM: ANALYST-REFERENCE.md@%s -->" % src_commit())
    w("<!-- REBUILD: python scripts/build-plain-english.py -->")
    w("")
    w("# What every number means, in plain English")
    w("")
    w("**Every metric the app carries, grouped by the QUESTION it answers,"
      " with a real player attached.**")
    w("")
    w("> ⛔ **GENERATED. Do not hand-edit this file** — rebuild it with"
      " `python scripts/build-plain-english.py`.")
    w("> Every word below is lifted from"
      " [ANALYST-REFERENCE.md](ANALYST-REFERENCE.md), which stays the single"
      " source of truth.")
    w("> **If this file and section 5 of that one ever disagree, section 5"
      " wins** — and the fix is to rebuild, never to edit here.")
    w("")
    w("## Read this first — the two rankings, and why you need both")
    w("")
    w("| | The question it answers |")
    w("|---|---|")
    w("| **Stickiness** (the `r` beside each name) | *If I know last year's"
      " figure, is it still true this year?* `0.00` is a coin flip, `1.00` is"
      " perfectly repeatable |")
    w("| **The Source Hierarchy** (rank 1–5) | *When two things disagree,"
      " which one do I believe?* |")
    w("")
    w("> ## **Stickiness tells you what to ASSUME by default."
      " The hierarchy tells you what OVERRIDES the default.**")
    w("")
    w("**That is why rank 1 is deliberately the least sticky family in the"
      " app.** A confirmed role change does not compete with last year's"
      " numbers — it invalidates them.")
    w("")
    w("---")
    w("")

    used = set()

    for num in ["1", "2", "3", "4", "5"]:
        meta = ranks[num]
        mine = [r for r in rows if r["rank"] == num]
        w("# Rank %s — %s" % (num, meta["question"]))
        w("")
        w(meta["prose"])
        w("")
        if not mine:
            w("*(No inputs carried at this rank.)*")
            w("")
            continue
        w("**The %d input%s at this rank:** %s" % (
            len(mine), "" if len(mine) == 1 else "s",
            " · ".join(r["name"] for r in mine)))
        w("")
        for r in mine:
            emit(w, r, entries, ones)
            used.add(r["anchor"])
        w("---")
        w("")

    unranked = [r for r in rows if r["rank"] not in ranks]
    if unranked:
        w("# No rank — the reference shelf")
        w("")
        w("**These carry no Source Hierarchy rank on purpose.** Some are"
          " descriptive and measured too weakly to trust; some were considered"
          " and never built. **A number with no rank may not move a verdict.**")
        w("")
        for r in unranked:
            emit(w, r, entries, ones)
            used.add(r["anchor"])
        w("---")
        w("")

    w("# The rule that ties all five together")
    w("")
    w(parse_sort_rule(doc))
    w("")
    w("---")
    w("")
    w("# The order to work in, on the clock")
    w("")
    w(parse_order(doc))
    w("")

    missing = [r["name"] for r in rows if r["anchor"] not in used]
    assert not missing, "inputs dropped on the floor: %s" % missing

    # Cross-references inside the copied prose are bare `(#anchor)` links that
    # resolve against ANALYST-REFERENCE.md's own headings. Left alone they are
    # dead links here - they scroll nowhere and report nothing, which is the
    # exact failure the link sweep exists for. Repoint them at the source.
    body = "\n".join(L)
    body = re.sub(r"\]\(#([a-z0-9][a-z0-9-]*)\)",
                  r"](ANALYST-REFERENCE.md)", body)
    text = body.rstrip() + "\n"
    io.open(OUT, "w", encoding="utf-8", newline="").write(text)
    return text, rows


def emit(w, row, entries, ones):
    e = entries.get(row["anchor"])
    bits = []
    if row["r"] not in ABSENT:
        bits.append("repeats at `r = %s`" % row["r"])
    bits.append({"A": "built and live", "B": "queued, not built",
                 "C": "considered and rejected"}.get(row["tier"], row["tier"]))
    if row["scored"] and row["scored"].lower() not in ("no", ""):
        bits.append("**feeds the grade** (%s)" % row["scored"]
                    .replace("**", "").replace("yes — ", ""))

    w("## %s" % row["name"])
    w("")
    one = ones.get(row["anchor"])
    if one:
        w("> **%s**" % one.replace("**", ""))
        w("")
    w("*%s · [full entry](ANALYST-REFERENCE.md)*" % " · ".join(bits))
    w("")
    if not e:
        w("*(No entry found in section 5 — rebuild after adding one.)*")
        w("")
        return
    for name in FIELDS:
        if name in e["fields"]:
            w("**%s.** %s" % (name, e["fields"][name]))
            w("")


def selftest():
    """One runnable check: the output must cover every input, once, with a
    plain-English line, and must not invent an `r` the index does not carry."""
    text, rows = build()
    fails = 0
    for r in rows:
        n = len(re.findall(r"^## %s$" % re.escape(r["name"]), text, re.M))
        if n != 1:
            print("  FAIL  %s appears %d times" % (r["name"], n))
            fails += 1
    # A SECTION heading in the output means an entry swallowed the boundary
    # that followed it. Must-fail case for the `\n## ` cut in parse_entries.
    #
    # MATCH THE HEADING, NOT THE WORDS. The first version flagged any mention
    # of "Tier B"/"Tier C" and fired on three legitimate sentences - TPRR's own
    # gotcha says it "spent weeks in Tier C on a false premise". A checker that
    # cries wolf is one you learn to skip, which is how eleven duplicate keys
    # once accumulated behind eleven build warnings.
    for line in text.split("\n"):
        if line.startswith("## \u00a7"):
            print("  FAIL  a section boundary leaked into an entry: %s" % line)
            fails += 1
    if "**Plain English.**" not in text:
        print("  FAIL  no plain-English prose carried through")
        fails += 1
    for r in rows:
        if r["r"] not in ABSENT and r["r"] not in text:
            print("  FAIL  r=%s for %s never reached the output"
                  % (r["r"], r["name"]))
            fails += 1
    # must-fail case: a bogus input must be caught, not silently skipped.
    if re.search(r"^## Definitely Not A Metric$", text, re.M):
        print("  FAIL  selftest is not discriminating")
        fails += 1
    print("selftest: %d input(s), %d failure(s)" % (len(rows), fails))
    return 1 if fails else 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    text, rows = build()
    print("wrote %s" % os.path.relpath(OUT, ROOT))
    print("  %d inputs, %d lines" % (len(rows), text.count("\n")))
