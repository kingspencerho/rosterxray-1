# Draft report pipeline

**What it is:** the tooling that produced `16-Team-Full-PPR-Draft-Board.pdf`, a 28-page
draft cheat sheet written for someone who does not follow the NFL. Built Aug 26, 2026.

**One command rebuilds the PDF from source:**

```bash
./draft-report/build.sh          # -> draft-report/out/*.pdf and *.html
```

---

## The split that matters: what is computed and what is written

This is the design decision to understand before changing anything.

| Half | Who does it | Where it lives |
|---|---|---|
| **Computed** — join ADP to metrics, round math, full-PPR premium, playoff slates | `scripts/draft-report.py` | produces a markdown worksheet |
| **Written** — the one-sentence reason per player, the strategy, the glossary | a Claude session, by hand | `draft-report/sections/*.html` |
| **Assembled** — sections into one HTML, HTML into a PDF | `draft-report/build.sh` | `draft-report/out/` |

**Why the prose is not generated.** Picking which of six true facts about a player belongs
in his one sentence is a judgement about what the reader needs, not a computation. A
template would produce "78 catches, 0.24 target share, ADP 91" for everyone, which is
exactly the analyst-voice output the report exists to avoid. The worksheet hands over
every input; the writing is a separate pass.

## Rebuilding after the data changes

```bash
# 1. pull the data tables out of App.jsx as JSON
node scripts/extract-app-blocks.mjs > /tmp/blocks.json

# 2. build the worksheet for the target league
python3 scripts/draft-report.py --blocks /tmp/blocks.json \
    --teams 16 --roster 15 --table yahoo --scoring full --out /tmp/worksheet.md

# 3. write or revise the sections in draft-report/sections/ from that worksheet
# 4. reassemble and render
./draft-report/build.sh
```

`draft-report.py` is league-agnostic. `--teams 12 --roster 16 --scoring half` produces a
different worksheet from the same data, and the round math follows.

## The three computed columns, and why each exists

**`+PPR` — the full-PPR premium, in points per game.** `ADP_YAHOO` is sourced from
Fantasy Football Calculator, which prices **half** PPR. A full-PPR league therefore
carries a systematic mispricing: reception-heavy players are cheaper than they should be.
This column is that gap. It is the largest edge available in a full-PPR draft and it is
invisible reading the ADP table straight. Wan'Dale Robinson at +2.88 in round 6 is the
clearest instance.

**`slate` — the W15-17 playoff matchup rating, out of 9.** Each of a team's three playoff
opponents is scored 3 (soft) to 0 (hard) against what that defense allowed to the
position. See the caveat below.

**Round number.** `ceil(adp / teams)`. Obvious, but it is the reason a 16-team board reads
completely differently from the 12-team ADP everyone quotes.

## The playoff-slate caveat, stated plainly

`CLAUDE.md`'s metric hierarchy ranks matchup data **5th of 5, least stable, format
decisions only**, and says redraft ignores W15-17.

**That rule is right for a normal league and wrong for a deep one.** In a 12-team league a
bad December is repairable off waivers. In a 16-team league with a short bench the waiver
pool is empty, so the December slate is much closer to locked at draft time. That is the
only reason the column exists.

**It is a tiebreaker. It never makes a good player bad.** The single actionable result in
the Aug 26 build: George Kittle draws hard matchups in all three playoff weeks, the only
0/9 in the pool. He is still worth his price; the schedule breaks the tie against him when
the alternative is close.

## Reproducibility notes

- **Fonts are inlined**, not linked. A `<link>` to fonts.googleapis.com silently falls back
  to a system font when the render machine cannot reach it, producing a wrong-looking PDF
  with no error. `draft-report/fonts-inline.css` is the pinned copy;
  `scripts/inline-google-fonts.py` regenerates it and needs network.
- **The render is Chromium headless.** `build.sh` prefers a Playwright install at
  `/opt/pw-browsers/`, then falls back to `chromium` / `google-chrome` on PATH.
- **`out/` is generated.** Do not edit anything in it; edit `sections/` and rebuild.

## What the report is NOT

It is a snapshot, not a live tool. The Aug 26 build carries ADP from Aug 15 and roles
verified against live reporting on Aug 26, and it says so on its own masthead and in its
sources section. **Any draft held after the 53-man deadline needs the roles re-verified**,
which is a research pass, not a rebuild — the tooling here cannot detect a trade.
