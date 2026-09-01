---
name: predraft
description: Check whether the app's data is still true before a draft or a grading session. Runs the stale-news report, the ADP drift report, the in-season refresh and the guards, then says plainly what is current and what is not. Use whenever the user is about to draft, says "predraft", "am I ready to draft", "is the data current", "check the data", "what's stale", or opens a session intending to grade real rosters.
---

# Predraft — is the data still true?

## Why this exists

`ANALYST-REFERENCE.md` §9 says `report-stale-news.mjs` should be **run before any
draft**. That instruction lives in a table row inside a 1,700-line file, so it is
read roughly never. This skill is that instruction, given a name.

**It reads. It does not fix.** Every command below reports; none of them writes.
Applying anything is a separate, deliberate act by Spencer.

---

## Run all four, in this order

### 1. Stale notes — the one the framework actually asks for

```
node scripts/report-stale-news.mjs
```

Lists players whose every note has passed the **30-45 day** re-validation rule.
It takes an optional date, so ask it about the future when a draft is scheduled:

```
node scripts/report-stale-news.mjs 2026-09-12
```

**Read it like this.** Zero rows is a pass. Any row is a player whose card will
render a caution and whose prose should not drive a pick until re-checked.

⚠️ **A pass here is narrower than it looks.** The report ages notes against the
clock. It cannot tell you a note is *wrong* — only that it is *old*. A note
written yesterday and already inverted by a transaction reports as current.

### 2. ADP drift

```
python3 scripts/refresh-adp.py --source underdog --table data
python3 scripts/refresh-adp.py --source ffc --table yahoo
```

**Reports by default and never auto-applies**, which is the whole reason it is
safe to run here. Read the drift, do not apply it mid-session.

⚠️ `ADP_DATA` takes best-ball values only (**R5**). A redraft quote does not
transfer — the offset ranges 15 to 62 picks and is not constant.

### 3. In-season refresh, once the season has started

```
bash scripts/refresh-inseason.sh
```

Two downloads. **No-ops safely before Week 1**, so running it in August is
harmless rather than wrong.

### 4. The guards

```
npm test
```

25 guards as of Sep 2026. Every one exists because something broke. A red guard
is a finding, never an obstacle — **never relax an assertion to get a pass.**

---

## What to report back

Four lines, in the order above, each saying current / drifted / stale — then one
line naming the single thing most likely to mislead a pick today.

⛔ **Do not end with a recommendation to draft anyone.** This skill grades the
DATA, not the players. `/scout` grades players.

---

## The three things this cannot see

1. **A transaction from today.** `RECENT_NEWS` and `SITUATIONS` are
   hand-maintained. Two entries inverted inside 48 hours this season — Alec
   Pierce off PUP, Josh Jacobs to the exempt list — and no report catches that.
2. **A wrong note that is recent.** See the caveat under step 1.
3. **A stale team label.** `player_metrics_2025.json` stores the team a player
   played MOST of 2025 for, so a midseason trade carries the old label forever
   (**R1**). Check `team` against `ADP_DATA` before quoting any 2025 number
   about a 2026 mover.

**If the question is "is this specific note still true", that is a reading job,
not a tooling job.** Use `notecheck`.
