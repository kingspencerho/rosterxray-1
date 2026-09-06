# Runbooks — the procedures you run by hand, and their logs

> **What this file is:** the step-by-step for anything in this repo that a human runs on a
> schedule, written so you can follow it months later without remembering anything. Commands
> are given for **PowerShell**, which is the shell actually in use here.
>
> **What this file is NOT:** a context handoff. `CLAUDE.md` is that, and its rule 5 says there
> should not be a second one. This holds PROCEDURE and its readings, never project state — if
> a runbook ends up explaining what the app is, it has drifted and belongs in `CLAUDE.md`.

---

## 📑 INDEX — every runbook, one line each

**This index is the entry point. It stays short by contract (see the rules at the bottom), so
a new runbook never buries an old one.**

| # | Runbook | When you run it | Status |
|---|---|---|---|
| **1** | [The Sleeper feed watch](#runbook-1--the-sleeper-feed-watch) | once a day for 7 days, then it ends | 🟡 **RUNNING** — started Sep 1 2026 |
| — | *Pre-draft data check* | before any draft | ▶ not here — it is the `/predraft` skill, `.claude/skills/predraft/` |
| — | *Note verification* | before committing any player note | ▶ not here — it is the `/notecheck` skill, `.claude/skills/notecheck/` |

⚠️ **A runbook with a DECISION at the end gets a status.** 🟡 running · ✅ passed · ⛔ failed ·
♻️ recurring (no end date). A recurring runbook never carries a log table — it would grow
forever and bury everything under it.

---

# Runbook 1 · The Sleeper feed watch

**Status: 🟡 RUNNING. Day 1 = Sep 1 2026. Decision due Sep 8 2026.**

## Why you are doing this

The app now carries a layer built from **Sleeper**, a free public API that reports who is
injured and where each player sits on his depth chart. It shipped **reading but not rendering**
— it downloads and it is readable, and nothing in the app touches it.

**Sleeper is somebody else's free API with no version guarantee.** Every other data source in
this repo is a pinned nflverse release; this one can change shape or vanish without notice. The
watch is you checking it behaves for a week before letting it near anything.

⭐ **You are not testing code. The code is tested — 26 guards, 21 negative tests. You are
testing whether a stranger's data feed is trustworthy.**

## The daily command

Open PowerShell, then:

```bash
cd "C:\Users\spenc\OneDrive\Desktop\Projects\Claude Projects\rosterxray-audit"
```

**One command — it pulls the data and prints the report:**

```bash
& "C:\Program Files\Git\bin\bash.exe" scripts/refresh-inseason.sh 2026; node scripts/report-stale-news.mjs
```

⛔ **The two halves are easy to confuse, and only the FIRST one changes anything.**
`report-stale-news.mjs` READS the file; it never rebuilds it. So running it alone — or running
the `built_at` check alone — leaves the data exactly as it was. **If the timestamp did not
move, the refresh did not run.** *(This happened on day 1: the check was run on its own and
returned the timestamp of an earlier build, which reads exactly like a successful run and is
not one.)*

⚠️ **`bash` on its own does NOT work in PowerShell here** — it is not on the PATH. The full
path with the `&` call operator in front of it is required, and it is why the first version of
this instruction failed.

## ⭐⭐ THE MANUAL RUN IS NOW MOSTLY SUPERSEDED — a robot does it (added Sep 6 2026)

**A GitHub Action, `weekly-data-refresh`, now runs this exact refresh on a schedule** — cron
`0 14 * * 2`, so **Tuesdays at 14:00 UTC**. It runs `refresh-inseason.sh`, runs the guards, and
**opens a PR** rather than pushing. It does not touch the default branch, and it fails the run
if the refresh dirtied anything outside `grading/data`.

⭐ **So the watch readings can be read off the PR branch instead of typed by hand.** To see the
latest without running anything:

```bash
git fetch origin && git show origin/data/refresh-2026-W36:grading/data/status_2026.json | head -40
```

⚠️ **What the robot does NOT do, and it is the half that matters:** it runs the refresh, never
`report-stale-news.mjs`. **So the CONTRADICTION count — the number that justifies the whole
layer — is still a manual read.** Weekly is also not daily; a feed that breaks on a Thursday and
recovers by Tuesday is invisible to it.

⛔ **A weekly robot reading is WEAKER evidence than seven daily ones for RELIABILITY** (two
samples cannot show intermittent failure) **and roughly as strong for SHAPE** (five days apart is
a real test of whether the fields moved). Read the Sep 8 decision with that split in mind.

## What a healthy pull looks like

```
5/5  availability + depth chart (Sleeper, live - works pre-season)
wrote .../status_2026.json: 812 players  counts={'WR': 330, 'TE': 198, 'RB': 176, 'QB': 108}
                            depth_chart=544  hard_status=75

Partly refreshed. Some layers updated; others are not published yet.
```

⭐ **"Partly refreshed" is CORRECT right now, not a failure.** Steps 1-4 pull nflverse season
releases, which publish nothing until real games are played, so they 404 and leave their
placeholders alone. **Step 5 is the only one that returns data before Week 1** — which is the
whole reason this layer exists, since the hand-written notes are at their most wrong in exactly
the weeks nflverse is silent. Once the season starts all five fire and the line becomes "Done."

## The four numbers you are watching

| Watch | Healthy | Worry if |
|---|---|---|
| **players** | ~800-830 | below ~600 or above ~1,000 |
| **depth_chart** | ~540 | falls toward zero — the most valuable field went away |
| **hard_status** | ~75, drifting up as cuts and injuries land | swings by hundreds day to day |
| **the script itself** | writes a file | "Sleeper unreachable" more than once in the week |

⭐ **One odd day is not a verdict. A pattern is.** Log it and keep going.

## Two things not to do

⛔ **Do not commit the data file.** The refresh overwrites `grading/data/status_2026.json` with
real players, so `git status` shows it modified every single day. **That is expected — leave
it.** The committed version stays the zero-row placeholder until the watch ends.

⛔ **Do not act on the contradiction list yet.** Read it and judge whether it is finding real
things. Fixing notes is a separate job with its own runbook (`/notecheck`).

## How to tell whether YOUR run actually landed

The file records when it was built. If you are unsure a run took:

```bash
node -e "console.log(require('./grading/data/status_2026.json')._meta.built_at)"
```

That is a UTC timestamp. If it is within a couple of minutes of now, your run landed.

## The decision this ends in

**On Sep 8 2026, read the log table below and pick one:**

| If | Then |
|---|---|
| The four numbers held roughly steady for 7 days | ✅ **PASS** — wire the layer into the player card. That is a real change: it needs a guard-26 update (the no-consumer assertions come out deliberately), a fresh 51-grade calibration, and a browser render |
| They thrashed, or Sleeper was unreachable twice or more | ⛔ **FAIL** — leave it unwired. You lost nothing; the app never depended on it |
| The contradiction list found nothing real all week | ⚠️ **Reconsider the value**, separately from whether the feed is stable. A trustworthy feed that surfaces nothing useful is still not worth rendering |

⛔ **Whatever happens, the feed never gets into the AI prompt.** Your news block reaches the
model under *"override everything above for these players"*, which makes it the
highest-authority thing there. An unattended third-party feed with veto power over every
measured input is not a trade worth making. That one is permanent, not part of this decision.

## 📊 THE LOG — append one row per day, newest at the BOTTOM

*(Chronological on purpose: you are reading a trend, and a trend read bottom-up is harder.)*

| Day | Date | players | depth_chart | hard_status | contradictions | Notes |
|---|---|---|---|---|---|---|
| 0 | Sep 1 | 812 | 544 | 75 | 11 | **Baseline. Both pulls this day were mine, during the build and while verifying the PowerShell command** — so this is ONE reading, not two, and it is not yet evidence of stability. |
| 1 | Sep 1 | 812 | 544 | 75 | 11 | ✅ First run by Spencer, 05:34:36Z. All four numbers identical to baseline. ⚠️ **Not a stability signal** — this pull was 9 minutes after the baseline, so it is the same Sleeper snapshot. It proves the command works end to end. **Day 2 is the first reading that can move.** |
| 2 | Sep 2 | | | | | |
| 3 | Sep 3 | | | | | |
| 4 | Sep 4 | | | | | |
| 5 | Sep 5 | | | | | |
| 6 | Sep 6 | **813** | **571** | **71** | — | ⭐⭐ **NOT a manual run — the new `weekly-data-refresh` GitHub Action produced this at 07:34:50Z and opened PR #98 from `data/refresh-2026-W36`.** ⚠️ **Sep 6 is a SATURDAY: this was a `workflow_dispatch` fired by hand to test the repo permission, NOT the Tuesday cron, which has still never run.** The job is proven end to end (refresh → guards → branch → PR); the SCHEDULE is not, and Sep 8 is its first real firing. All four numbers inside the healthy bands **five days after baseline**: players 812→813, depth_chart 544→571 (firming up pre-season, the right direction), hard_status 75→71. Contradictions not recorded — the workflow runs the refresh, not the report. |
| 7 | Sep 7 | | | | | |
| — | **Sep 8** | | | | | **DECISION:** |

### ⭐ THE NUMBER THAT JUSTIFIES THE WHOLE LAYER, VISIBLE ON DAY 1

The two sections of the report disagree completely, and that disagreement is the point:

```
section 1 (the 45-day prose clock)    0 players — "Nothing to re-validate."
section 2 (the new status clock)     11 players
```

**The instrument that existed said all-clear. The new one found eleven.** They are not
measuring the same thing: section 1 asks *is this note OLD*, section 2 asks *does this note
disagree with today*. **A note written two days ago can be perfectly fresh and completely
wrong**, and nothing in the app could see that before.

### What the contradiction list found on day 1

Eleven players where the feed reports a hard status (IR / PUP / Out / Suspended) that the
freshest hand-written note predates. **Both ends of that list are worth understanding, because
they are why the report says QUESTIONS, NOT CORRECTIONS:**

- ⭐ **`adam randall` is a real catch.** His note, written Aug 30, calls him a rising Baltimore
  rookie whose role is expanding — and that note is fed to the AI as the highest-authority
  block in the prompt. **The feed has him on injured reserve as of Aug 31.** Nothing else in
  the system would ever have said so.
- ⚠️ **`zach charbonnet` is a false positive.** His note already says Reserve/PUP and is simply
  older than the feed. Correct note, no action. **This is exactly why the feed is never allowed
  to "fix" anything on its own.**

---

## 📌 Rules for adding a runbook to this file

**These exist so the index stays readable at twenty runbooks, not just two.**

1. ⭐ **The INDEX row comes first**, before the section. One line: number, name, when you run
   it, status. **If it needs two lines it is not an index row.**
2. ⭐ **Commands go at the TOP of a runbook**, before the reasoning. Someone opening this on a
   Tuesday wants to run the thing, not read about it. The "why" sits under the "how".
3. ⭐ **Every runbook opens with its shell.** A command that fails in the shell you actually
   use is worse than no command — this file exists partly because that happened.
4. ⛔ **A log table lives inside its own runbook and nowhere else**, and only for runbooks that
   END. A recurring job with a growing log buries everything below it; if you need that
   history, it belongs in a data file, not in prose.
5. ⛔ **Delete a finished runbook's steps, keep its decision.** When runbook 1 resolves, the
   commands and the daily table go and one dated line stays saying what was decided and why.
   **A finished procedure left in full is the same failure as a stale handoff** — the next
   reader cannot tell what is still live.
6. ⭐ **If a runbook is really a skill, it goes in `.claude/skills/` and gets a POINTER row
   here**, like `/predraft` and `/notecheck`. A skill fires by name; a runbook needs a human to
   remember it exists. **Prefer the skill.**
