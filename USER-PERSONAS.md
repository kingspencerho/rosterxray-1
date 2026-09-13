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

### P3 · The Season-Long Manager  ⭐ REWRITTEN Sep 13 2026 FROM HIS OWN SUNDAY LOOP

> ## ⭐⭐⭐ **THIS ENTRY WAS A GUESS UNTIL SEP 13, AND THE GUESS WAS WRONG IN A SPECIFIC WAY.**
> **The Sep 1 version read:** *"Do I start Chubb this week, and who on my bench is dead weight?"*,
> **asking for start/sit and waiver cuts, caring about FLOOR, AVAILABILITY and the next four weeks.**
> ⛔ **He described his actual Sunday morning and NONE of those words appear in it.** **He does not
> ask for a floor. He asks WHY a matchup tilts, and whether the personnel on the field can exploit it.**
> ⚠️ **PROVENANCE: `HIS`, `n=1`.** **He is a real user of exactly this product in exactly these formats,
> which is the strongest evidence this file has ever had — and it is still one person.** ⛔ **Do not
> restate it as "users want."**

> *"whose o line is better, how often they run and pass, what defensive schemes does a certain team run,
> what players does the opposing team have that could possibly counter that scheme, weaknesses that a
> certain teams defense has (like giving up the deep ball for example), and if the opposing team has
> players who stretch the field to exploit those holes."*
> — **his words, and his framing: *"questions in my head that i have on sunday mornings when i make sit
> and start decisions."***

**Evidence he exists:** he is one, and he said so. *(Also: the redraft engine, the Yahoo/Sleeper
share-card parsers, `league.playoffWeeks`, the Floor Layer and BENCH MOVES were all built for him.)*

| | |
|---|---|
| **Where** | Sunday morning, before lineups lock |
| **Time budget** | minutes — he is not on a clock, and he is willing to read |
| **Asks** | ⭐ **not "who do I start" — "WHY does this matchup tilt, and can these players exploit it"** |
| **Cares about** | structural advantage: line play, tendency, scheme, and the personnel that counters it |
| **Ignores** | a verdict with nothing under it. **His own words on the incumbent: *"its recs and analysis suck imo, and i dont trust it because theres nothing backing up their recommendations."*** |

### ⭐⭐ THE SIX QUESTIONS — this is the in-season SPEC, in his order

| # | His question | Data on disk | State |
|---|---|---|---|
| 1 | whose O-line is better | `oline_2026` — rank, tier, **and in-season changes** | ✅ |
| 2 | how often they run and pass | `teamtrends.off` — `proe`, `pace` | ✅ |
| 3 | what scheme the defense runs | `coverage_2025` is man rate **FACED BY A RECEIVER**, not a defensive tendency | ⚠️ partial |
| 4 | who on the other side counters that scheme | `coverage_2025.edge`, `ypt_man` vs `ypt_zone` per player | ✅ |
| 5 | that defense's weakness *(e.g. the deep ball)* | `teamtrends.def` gives run-vs-pass EPA and funnel — **nothing by route DEPTH** | ⚠️ partial |
| 6 | who can stretch the field to exploit it | `ngs_receiving` — intended air yards + separation, 120 players | ✅ |

⛔⛔ **THE TWO GAPS SHARE ONE ROOT CAUSE, and naming it is the point: the app has rich OFFENCE-side
player data and TEAM-level defensive EPA, and no DEFENCE-side positional or scheme profile.** **FPA is
the closest thing and it is rank 5 of 5.** ⭐ **A defence-side profile is the single highest-value data
addition for this persona.**

⭐⭐ **THE RULE THAT UNLOCKS MOST OF IT:** the app **withholds** coverage data from the AI because it
measured `r = 0.161` year over year. **That rule protects THE GRADE from inputs that do not repeat.**
⛔ **It does not mean the data is useless — it still DESCRIBES what happened, and description is exactly
what question 3 and 4 need.** ✅ **Withheld from SCORING is not the same as unavailable to a READER.**

**What he needs to piece together:** all six answers live in different files and nothing joins them.
**He is doing the join in his head every Sunday.**

**What benefits him:** the six answers for one game, on one screen, with the disagreements left in.
*(Worked Sep 13 on `DAL @ NYG`: the Giants are a run funnel — rush EPA `+0.167` vs pass `+0.028` — and
Dallas just lost LG Tyler Smith for 4-6 weeks. **The matchup says run at them; the injury says Dallas is
less equipped to than last week.** ⭐ **Two true facts pointing opposite ways is a better input to his
judgement than a verdict would be, and it is the shape the output should take.**)*

**Design consequence.** ⛔ **This is NOT a start/sit recommender** — the not-for list below still governs,
the pick stays the user's. ⭐⭐ **And it is the clearest example of the complementary ruling above: Yahoo
tells him the projected points. Nothing on the market tells him the Giants funnel to the run but Dallas
lost their left guard.** ✅ **The Floor Layer paragraph from the Sep 1 version still stands as ENGINE
behaviour — floor scores redraft and nothing else — it just is not what he opens the app to read.**

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
7. **The result must arrive in the viewport.** Measured Sep 1 2026: after
   Analyze the page did not move, leaving the grade 1,200px below the fold in
   both modes. A result the reader has to go looking for is a result they did
   not get.

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
| **Analyze scrolls the results into view** | P1, P2 | forty entries x 1,200px of scrolling |
| Redraft and best ball **never share an argument** | P3 | floor is the product in one, irrelevant in the other |

---

## ⭐⭐ WHAT THIS APP IS RELATIVE TO THE FANTASY APPS (his ruling, Sep 13, 2026)

**His words:** *"i dont want to be just like any of the fantasy apps on the market... my app is
supposed to provide stuff that people cant get from their fantasy apps... more like a complementary
app rather than something that is trying to compete with these apps that already have huge loyal
audiences."*

> ## **IT IS A COMPLEMENT, NOT A SUBSTITUTE. Nobody is being asked to leave Yahoo, Sleeper or
> ## Underdog. They open this IN ADDITION, for something those apps do not do.**

⛔ **WHAT THIS RULES OUT, and it is the scope creep this file exists to stop:** live scoring · a
lineup setter · waiver claims · trade execution · push alerts · news feeds · anything whose honest
description is *"the same thing Yahoo does."* **Those apps have the roster, the league, the
transactions and the audience. Rebuilding any of it is a fight over ground already held, with
worse data.**

⭐⭐ **AND IT ANSWERS THE IN-SEASON QUESTION, which is why it is banked here rather than in a
strategy note.** *(Sep 13: he asked whether 2025 spike/dud rates are the right thing to headline
for a redraft user in season.)* **The complementary answer is not "show in-season stats" — Yahoo
already shows those, live, with the actual scoring attached. It is: SHOW WHAT CHANGED ABOUT THE
ROSTER HE BUILT, AND WHAT THAT MEANS FOR HOW HE BUILT IT.**

| A fantasy app answers | This app answers |
|---|---|
| how many points did he score | **did his ROLE change** *(rank 1 in the Source Hierarchy, refreshed weekly)* |
| who is on your bench | **which bench spot is load-bearing, and what breaks without it** |
| his projection this week | **how confident that class of number is, and how old it is** |
| a start/sit verdict | ⛔ **not this — the pick stays the user's, see the not-for list below** |
| nothing | **"we do not know," said out loud** |

⭐ **THE CONSEQUENCE FOR THE GRADE, and it cuts against the obvious read: the grade becomes MORE
central in season, not less.** **Construction quality is the one thing the incumbent apps do not
produce at all** — their screens are per-player points and projections. **It is the defensible
half, so an in-season build extends the grade into the season rather than replacing it with a
stat feed.**

⚠️ **PROVENANCE: this is HIS ruling, so it is not mine to overrule.** The competitor half is
SEEN — two screen recordings of the Yahoo and Underdog iOS apps, read frame by frame Sep 13 2026.
**No scan has measured what users of those apps actually want, so nothing here claims that.**

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
