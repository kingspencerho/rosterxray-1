---
name: notecheck
description: Verify a RECENT_NEWS or SITUATIONS entry before it is written or committed. Checks the team against ADP_DATA, the date, whether it quotes a superseded claim, and whether the prose asserts more than the evidence carries. Use whenever adding, editing or reviewing a player note, trendNote, verdict or reason in App.jsx, or when the user says "notecheck", "check this note", "is this note right", or pastes a news update to add.
---

# Notecheck — before a note goes in

## Why this exists

**This is the repo's most expensive recurring failure, and it has cost four
separate sessions:** the seven factually-wrong notes found in the Aug 3 2026
defensive re-validation, the Diggs bug that came back *because the correction
quoted the claim it was correcting*, the eleven role and injury corrections on
the draft-report branch, and the stale-team-label class.

The rules already exist as **R1, R7, R9, R10**. Nothing runs them.
`test-stale-verdicts` and `test-player-data` catch the mechanical half; the
judgement half is unguarded. **This skill is the judgement half.**

⚠️ **Why it matters more than it looks.** `RECENT_NEWS` is not merely pasted
into the AI prompt — it is pasted under the header *"Recent news (breaking
updates — override everything above for these players)"*. It is the
**highest-authority block in the prompt**, outranking the situations block that
is labelled ground truth. A wrong note does not sit quietly beside the metrics.
It overrules them.

---

## The seven checks, in order

### 1. TEAM — check it, never recall it (R1, R10)

Read the player's `team` in `ADP_DATA` and confirm the note agrees.

**Search summaries carry no dates**, so a source describing last season reads
identically to one describing this season. `player_metrics_2025.json` labels a
player with the team he played MOST of 2025 for, so a midseason trade carries
the old label forever.

⛔ A logo and a target-share number must never share a card without a cleared
2026 role.

### 2. DATE — is it present, real, and the note's own? (R8, R9)

- **Always write the year.** A bare "Aug 6" does not parse and the entry ages
  from an older date.
- **A future date is never the note's currency.** A court date, a contract date
  and a draft date all parse identically to an update stamp.
- An entry gets **appended to**, so the LATEST date in it is its currency — both
  the prose date and a structured `date` field are read and the later wins.

### 3. SUPERSEDED CLAIMS — the Diggs trap (R7)

**Never restate the old claim inside the correction.** Everything in
`trendNote` and `RECENT_NEWS` is quotable verbatim, so a sentence written to
say *"the earlier report that X was wrong"* ships the string X straight to the
model.

**Write affirmatively, present tense, about what is true now.**

### 4. ASSERTION vs EVIDENCE

Name what the claim rests on. One preseason game, one beat-writer sentence and
a depth chart are three different weights.

If it rests on one exhibition line, the note says so. Existing entries do this
well — *"Treat that as a PROJECTION rather than a confirmed role"* — and that
sentence is the model, not the exception.

### 5. THE LABEL AGREES WITH ITS OWN NUMBER (R13)

A label that disagrees with the number beside it **reads as confirmation** and
is worse than no label.

### 6. BORROWED PRIORS (R4)

A borrowed prior is not a finding. If an aging band or a positional baseline is
doing the work, say so wherever it renders.

### 7. HIERARCHY — is this rank 1, or is it dressed up as rank 1?

Per `CLAUDE.md` § Source Hierarchy: **role CHANGE outranks every number.** A
note describing efficiency, a matchup or a box score is not a role change and
must not be written as one. Matchup data orders close options; it never makes a
good player bad.

---

## Output

Per note: **PASS**, or the specific check that fails and the exact rewrite.

⛔ **Never rewrite a note into a stronger claim than its evidence.** If the
evidence is thin, the correct output is a thinner note, not a better-worded one.

⛔ **Never assert a team, a status or a date from memory.** If `ADP_DATA` does
not carry it and no source is at hand, the honest output is *"unverified — do
not commit yet"*.

---

## After a note changes

```
npm test
```

`test-stale-verdicts`, `test-player-data` and `test-no-quoted-negations` all
read this data. And per **R15**, `App.jsx` and `App.jsx.jsx` must be
byte-identical afterwards:

```
cmp App.jsx App.jsx.jsx
```
