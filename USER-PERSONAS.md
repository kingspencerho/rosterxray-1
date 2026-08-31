# Who Uses RosterXRay

**Purpose:** establish who is on the other side of the screen, so design
decisions are answers to someone's question rather than to a designer's taste.

Read this before changing what the app shows, hides, collapses, orders, or
names. `ANALYST-REFERENCE.md` says what the app measures; `CLAUDE.md` says how it
was built; **this says who it is for.**

**Last updated:** Sep 1, 2026

---

## The two axes, and why one is not enough

The card was designed against expertise alone and it failed, because expertise
is only half of what varies.

| Axis | What it controls |
|---|---|
| **INTENT** — what they are trying to do right now | what they need to SEE |
| **EXPERTISE** — how much vocabulary they have | how it needs to be SAID |

**These are independent.** A portfolio drafter on his 40th entry may not know
what WOPR is. A first-time user may be a football analyst who has never used
this app. Designing for one axis produces a page that is right for one quadrant
and wrong for three.

```
                    BEGINNER            EXPERT
  RESEARCHING       needs vocabulary    needs provenance
  ON THE CLOCK      needs a verdict     needs one number, fast
```

**The bottom-left quadrant is the hardest and the most common**, and it is the
one the card served worst: someone mid-draft, on a phone, with 30 seconds, who
does not know which of fourteen sections to look at.

---

## Intent: four personas

Ordered by how much of the app's traffic each one plausibly represents. Every
claim below is grounded in something the app or its history already tells us,
noted inline — none of it is invented demographics.

---

### P1 · The Portfolio Drafter *(primary)*

> *"I just drafted my 40th Puppy entry. Is this one different, and what's wrong
> with it?"*

**Evidence he exists:** the app models **14 tournaments** with max entries from
3 to 150, and the ones with 150-entry caps (BBM VII, Puppy 3, Puppy 4, Field
General) are the largest fields on the board.

| | |
|---|---|
| **Where** | Underdog, phone, between drafts |
| **Time budget** | seconds — he has another draft queued |
| **Arrives with** | a screenshot, because that is how rosters actually arrive |
| **Asks** | is this build sound, and what is its single biggest flaw |
| **Ignores** | individual player detail. He drafted 18 guys and has 39 other teams |

**What he needs to piece together:** the grade alone is useless to him — every
entry grades somewhere. He needs **the delta**: what is different about *this*
one. Stack integrity, the dead week, the uninsulated back.

**What benefits him:** a named flaw he can avoid repeating in the next draft.
The value compounds across a portfolio in a way it never does for one team.

**Design consequence.** Strengths and weaknesses stay open at rest, however tall.
The stack matrix is the tallest block on the results page (1,340px) and stays
open, because **it is why the page exists** for him.

---

### P2 · The On-The-Clock Drafter

> *"He's there at 84. Do I take him?"*

**Evidence he exists:** the player lookup was added on a direct request — *"if I
just want to search for a player in general, not on my roster."* That is a
research gesture made mid-session, not after it.

| | |
|---|---|
| **Where** | mid-draft, phone, timer running |
| **Time budget** | **under 30 seconds**, and it is hard |
| **Asks** | is this player worth *this pick* |
| **Ignores** | anything that takes a second tap |

**What he needs to piece together:** three things at once — is his role good, is
it stable, and is the price right. **The app has all three and made him assemble
them from six sections.**

**What benefits him:** one paragraph he can read in the time it takes the pick
before him to come in.

**Design consequence.** This persona is why **The Read** exists and why it sits
first. It is also the argument against a skill-level toggle: **a toggle is a tap,
and he does not have one.** One design that works at a glance beats two designs
behind a switch.

---

### P3 · The Season-Long Manager

> *"Do I start Chubb this week, and who on my bench is dead weight?"*

**Evidence he exists:** the redraft engine, the Yahoo/Sleeper share-card parsers,
`league.playoffWeeks`, the Floor Layer, and BENCH MOVES.

| | |
|---|---|
| **Where** | Yahoo or Sleeper, weekly, often Sunday morning |
| **Time budget** | minutes — he is not on a clock |
| **Asks** | start/sit, and who to cut for a waiver add |
| **Cares about** | floor, availability, the next four weeks |

**What he needs to piece together:** **he is the only persona who genuinely
needs availability and floor**, and the only one for whom a dud rate is worth
more than a spike rate. Best ball has no lineup; he submits one every week.

**What benefits him:** the reason a player is startable, not just that he is.

**Design consequence.** The Floor Layer scores redraft and nothing else. Redraft
keeps its own competitive-balance thresholds and its own calibration. **Never
carry a best-ball argument into his mode** — floor is irrelevant in one and the
product in the other.

---

### P4 · The Skeptic

> *"Where did this number come from, and what season is it?"*

**Evidence he exists:** this app's entire prose layer is written defensively —
population gates printed on every percentile, vintage labels on every figure,
`r` values beside every metric. That is a design already shaped by an audience
that checks.

| | |
|---|---|
| **Where** | anywhere, usually once, deciding whether to trust the tool |
| **Time budget** | patient, and unforgiving |
| **Asks** | is this defensible |
| **Bounces on** | one number that is obviously wrong or unsourced |

**What he needs to piece together:** provenance. Which season, which population,
which gate, and how stable the input is.

**What benefits him:** being told the limits before he finds them. **A stated
weakness buys more trust than a hidden one costs.**

**Design consequence.** Every gate, vintage and `r` stays visible. He is also
why **The Read issues no verdict** — a verdict he disagrees with loses him
permanently, where a described number he disagrees with is just a number.

---

## Expertise: what changes per level

Orthogonal to the four personas above. Any of them can be at any level.

### Beginner

**Needs vocabulary before anything else.** "WOPR 0.70" is not a fact to him, it
is a foreign word. He is also the reader most at risk of the app's most subtle
failure: **treating every number on screen as equally trustworthy.**

- Plain-English sentences before jargon
- Position-relative framing — "more than 81% of WRs" beats "8.1"
- An explicit signal that some numbers matter more than others

### Intermediate

Knows the terms, has not internalised the hierarchy. **His characteristic error
is reading a season average as a current role** — which is precisely how RJ
Harvey graded fade/falling on four rosters.

- Wants the CONFLICT surfaced, not resolved: season average against trajectory,
  volume against separation, career against recent
- Wants to know which of two disagreeing numbers is the newer fact

### Expert

Wants the number and its provenance, fast, and wants to disagree with the app's
framing.

- Raw values, gates, vintages
- No inference he did not ask for
- Nothing hidden behind a click he cannot see the existence of

---

## What every persona needs, regardless

Six requirements that survived the persona split. **These are the design floor.**

1. **A starting point.** Fourteen equally-weighted sections has no entry point at
   any expertise level. The measurement that proved this: the card was 14
   sections and 1,732px, ordered by when each was added.
2. **Position-relative numbers.** An absolute figure is meaningless without the
   population, at every level of expertise.
3. **Conflicts named, never hidden.** Where two numbers disagree, showing one is
   a lie by omission and showing both without saying so is confusing. Say which
   is newer.
4. **Absence made visible.** A missing number must state why. This is the
   silent-drop rule and it is a user requirement, not just an engineering one —
   a blank space is indistinguishable from a bug.
5. **No verdict presented as current.** The Diggs failure. It costs the Skeptic
   permanently and misleads the Beginner, who cannot tell a stale verdict from a
   fresh one.
6. **Nothing that costs a tap the On-The-Clock drafter does not have.** The
   headline must be readable without interaction.

---

## Design rules this produces

| Rule | Serves | Because |
|---|---|---|
| The headline is a **plain-English paragraph**, first, no tap | P2, Beginner | 30 seconds, no vocabulary |
| It **describes numbers, never issues verdicts** | P4, Beginner | trust, and the Diggs failure |
| Sections are grouped by **the question they answer** | all | fourteen peers has no order |
| **What stays open is what is read every visit**, not what is small | P1, P2 | reading frequency, not size |
| **Colour encodes one meaning**, and chrome is hueless | all | seventeen meanings do not fit on 360° |
| **Gates and vintages always print** | P4, Expert | provenance is the trust mechanism |
| **Percentiles run one direction** | Beginner | "below 92%" inverts on a reader |
| Redraft and best ball **never share an argument** | P3 | floor is the product in one, irrelevant in the other |

---

## Who this app is NOT for

Saying this plainly prevents scope creep.

- **Someone who wants projections.** This app grades what you built and describes
  who is on it. It does not project points, and every layer is labelled to
  prevent it being read that way.
- **Someone who wants to be told what to draft.** It names flaws and describes
  players. The pick stays the user's.
- **Dynasty and keeper managers.** Nothing in the app models multi-year value,
  contracts or rookie-pick capital. Career arc is the closest thing and it is a
  borrowed prior, not a dynasty model.
