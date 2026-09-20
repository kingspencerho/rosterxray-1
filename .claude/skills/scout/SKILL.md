---
name: scout
description: Read one player's data and return an elite / mid / bad verdict against his ADP. Use whenever the user names a player and asks what the data says, whether he is worth his price, or wants a breakdown, profile, read or scouting report on him. Also triggers on "scout X", "is X elite", "should I draft X", "should I start X", "start or sit X", "X or Y this week", "what do the numbers say about X".
---

# Scout — elite / mid / bad, from the data

## Run this first, always

```
node scripts/scout.mjs "Player Name" [--format standard|superflex|yahoo]
```

**Never answer from memory.** The single largest failure mode for this task is
recalling a number instead of reading one. The script prints the real values
from the real app module. If it returns NO MATCH, say so and stop — do not
substitute training knowledge of a player's stats.

Use `--format yahoo` when the question is redraft, `--format superflex` for
superflex. The ADP and the market label change with it.

## Two players, one table — use this for any start/sit

```
node scripts/scout.mjs "Player A" --vs "Player B" --format yahoo
```

**This is the shape he picked (CLAUDE.md, Sep 17): the table, then the call.**
It prints THIS season above the 2025 rows, because rank 1 and 2 decide. ⛔ **Do
not paste the full single-player dump for a start/sit question** — it is ~60
lines per player and buries the comparison.

## HOW TO READ A COMPARISON — his shape, banked Sep 19 2026

**He named this one as the analysis he wants: *"especially on the same team, this
is how I want it to be analyzed."*** The script prints the inputs. **These eight
moves are the half it cannot do, and they run in this order.**

**1 · SAY WHETHER HE EVEN OWNS HIM, AND WHAT THE MOVE COSTS.** The table tags
`[YOURS]`. ⛔ **A comparison against a player he would have to ADD is a different
question** — it costs a roster spot and usually a second drop. Say so in the
first line or the whole answer is answering something he did not ask.

**2 · NAME THE SHAPE BEFORE THE NUMBERS.** *"These two are near-opposites"* or
*"same role, different volume."* ⭐ **He reads the table faster once he knows what
he is looking for.** A table with no thesis is a data dump.

**3 · SAME TEAM MEANS THE ENVIRONMENT CANNOT BREAK THE TIE.** Quarterback, game
script and team total are identical, so ⛔ **every argument about the offence
applies to both equally and is worth nothing here.** It reduces to ROLE and
MATCHUP. The script detects this and prints it.

**4 · READ aDOT AGAINST TARGETS, NEVER ALONE.** ⭐⭐ **Two players with four
targets each are not comparable until you know the depth.** 28.5 yards and 12.6
yards are different assets, different floors and different failure modes. **A
deep profile needs protection AND accuracy; a short one needs neither.**

**5 · GIVE THE OPPONENT'S SCHEME BOTH WAYS, then discount it.** A blitz forces
the ball out fast, which hurts a deep threat — **and it empties the coverage
behind, which is exactly how a deep threat eats.** ⛔ **Say both, then say it
decides nothing: the receiver-versus-coverage edge repeats at `r = 0.161`.**

**6 · MATCH THE INJURY TO THE ALIGNMENT.** ⭐⭐ **A hurt corner only matters to
the man lining up across from him.** A left receiver draws the right corner; a
slot receiver draws the nickel. ⚠️ **And hold it loosely — a depth-chart label is
not a snap-by-snap assignment, and Questionable is not Out.**

**7 · ONE REASON FOR THE VERDICT, and name the confidence.** Not a recap of the
table. **The single line that decided it**, plus LOW when it is low.

**8 · GIVE THE OTHER CASE ITS OWN SENTENCE.** *"If you need a ceiling rather than
a floor, the other one is the better swing."* ⭐ **Floor and ceiling are different
questions and he may be asking the one you did not answer.**

⚠️ **AND CLOSE ON WHETHER EITHER IS ACTUALLY STARTABLE.** *"You are choosing
between the 86th and 39th-ranked receiver in expected points"* is more useful
than a confident verdict, **because it tells him how much the decision is worth
agonising over.**

## His roster, when the question involves it

```
node scripts/scout.mjs "Player" --roster "../fantasy-roster-quitters.md"
```

⛔ **THE ROSTER LIVES IN THE PRIVATE REPO AND IS PASSED BY PATH.** This repo is
PUBLIC; his rosters and leagues never enter it. Guard 45 asserts no roster file
is ever checked in here.
⭐ **What it buys: handcuffs are DETECTED, not remembered.** Same NFL team, same
position, and he already holds the man in front — that is what makes a backup
worth a roster spot, and it is the reasoning that otherwise gets done by hand.

---

## THE FIVE RANKS — read in this order, always

**Every metric below belongs to a rank, and the rank decides how much it is
allowed to move the answer.** This is the app's Source Hierarchy. The canonical
text lives in `CLAUDE.md` and `api/analyze.js`, and the `r` behind every number
is `ANALYST-REFERENCE.md` section 2. ⛔ **Do not restate either from memory.**

| Rank | The question | May it decide? | Prints at |
|---|---|---|---|
| **1** | Has his **job changed**? | ✅ **outranks everything** | `[0]` `[5b]` `[6]` |
| **2** | How much **work** does he get? | ✅ **yes** | `[1]` `[1b]` |
| 3 | Is he actually **good**? | ⚠️ supporting | `[2]` |
| 4 | What **shape** are his weeks? | ⚠️ supporting | `[3]` |
| 5 | Who is he **playing**? | ⛔ **orders close options only** | not in this script |

> **The operative rule: matchup NEVER makes a good player bad or a bad player good.**

⭐⭐ **THE WHOLE TABLE IN ONE LINE: volume repeats, efficiency does not.** How
often he touches the ball is stable (`r` 0.71-0.83). How well he does it mostly
is not — RB yards per carry is `r=0.022`, a coin flip.

⛔ **Name the rank that decided.** An answer listing metrics without saying which
rank settled it is a data dump, not a read.

---

## The framework, in order

### [0] Team check — this gates everything
If the card reports **MOVED**, every number below describes a job he no
longer has. Say so in the first line of the answer. A 30% target share on a
team he left is a fact about that team, not a projection.

### [1] Opportunity decides the tier
Targets/game, target share, snap share, WOPR — `r ≈ 0.65-0.78`, the only tier
that carries to next season.

**Elite = 85th+ percentile on three of four.** Always print the population the
percentile is drawn from; a rate without its population means nothing.

### [1b] Route workload and scoring equity — still rank 2

**Route share and targets per route run.** ⭐⭐⭐ **Routes is the most-cited
metric in this lane, and it was missing from this framework until Sep 19 2026:**
across 141 minutes of in-season analysis, routes drew 65 mentions against snap
share's 45, carry share's 27, red zone's 25 — **and ADP's zero.** In season, what
he cost is irrelevant and route participation is the spine.

**Red-zone and inside-10 share are scoring equity, and they are NOT volume.** A
30% target share with no red-zone role is a different asset from the same share
with one.

### [2] The tiebreaker, and it is POSITION-SPECIFIC

**This is the step most people get wrong by applying the WR version to everyone.**

| Position | The tiebreaker | Why |
|---|---|---|
| **WR / TE** | **Air yards share.** Alpha 32-40%, median ~27% | separates elite from high-volume mid |
| **RB** | **HVT/game + snap share**, and the receiving tier: 65+ rec = elite receiving back, 40-64 = real receiving role, under 40 = neither | air-yards share is `r=0.26` for backs and discriminates nothing |
| **QB** | **Rush attempts/game** (`r=0.815`, the stickiest input measured anywhere), then pass attempts/game (`r=0.605`) | QB points/game is `r=0.383` — barely sticky. Never project a QB from last year's points |

**TE baselines differ from WR.** Median spike blend is 0.059 at TE against 0.091
at WR, so a 10% TE spike rate is strong where a 10% WR spike rate is median.
Use the percentile, which already handles this.

### [3] Conversion — was the volume worth having
Yds/target, TD rate, HVT/game, aDOT. Elite receivers turn share into scoring
equity; a 30% target share with 0.9 HVT/game did not.

**aDOT is the exception among efficiency-shaped numbers** (`r=0.784`) because it
is a ROLE property, not a performance one. Deployment persists; outcomes do not.

### [4] Ceiling shape classifies, never projects
Spike / usable / dud. **Read the percentile, never the raw rate** — 13% spike
sounds terrible and is the 67th percentile.

Then look at **which games produced the spikes**. The script prints targets and
air yards for each. A player whose spikes all required 2x his normal air yards
has an air-yards-dependent ceiling, not a target-dependent one — that is a
different bet and a different lever.

### [5] Who else was on the field
Steps 1-4 silently assume the same teammates. The script prints the split.
**An absence explains where volume came from; it does not prove the volume was
hollow.** Check whether his best games came with the teammate active before
concluding anything.

### [5b] THIS SEASON — rank 1, and it outranks every 2025 number

Depth chart, injury designation, and the weeks actually played. ⛔ **When 2025
and 2026 disagree, 2026 wins** — that is what rank 1 means. A season average
describes the job he used to have.

⚠️ **An empty [5b] is a stated gap, never a licence to lean harder on 2025.**

### [6] Prose outranks every number above
Role CHANGE is rank 1 in the Source Hierarchy precisely because it invalidates
the sticky baseline. **Print the age of any verdict you lean on** — past 45 days
it needs re-validation, and say so rather than quoting it as current.

### [7] The price step — DRAFT ONLY

⛔ **Skip this in season.** ADP answers *was he worth the pick*, which is settled
once the season starts, and the lane measures ADP at **zero** mentions across 141
minutes of in-season analysis. In a start/sit question the comparison is against
**the other player in the decision**, never against a price.
Elite/mid/bad describes the player. The question is always **at this cost**.
State the ADP delta and what has to be true at that price.

### [8] The format overlay is decisive, not a footnote
The same data flips the verdict. A low dud rate is a floor virtue: valuable in
redraft, worth nothing in best ball, where floor is irrelevant and variance is a
feature. **Give the verdict per format when they differ.**

---

## Output

```
CLAIM: [one sentence]
TIER: Elite / Volume-mid / Contingent / Bad — [the two numbers that decide it]
OPPORTUNITY: [the percentiles, with their population]
THE TIEBREAKER: [air yards for WR/TE, HVT+role for RB, rush att for QB]
CONVERSION: [did the share become points]
CEILING SHAPE: [percentile, and what his spikes required]
CONTEXT: [team change, teammate absence, trajectory — or explicitly none]
PROSE: [dated role news, with its age]
AT ADP: [delta, and what must be true at this price]
FORMAT: [best ball vs redraft where they differ]
VERDICT: Target / Hold / Fade / Dart / Contingent-only
Confidence: HIGH / MEDIUM / SPECULATIVE
```

## The three archetypes

- **Elite** — high opportunity **and** high tiebreaker **and** high spike
- **Volume-mid** — high opportunity, median tiebreaker, low spike
- **Bad** — low opportunity, whatever the efficiency. Efficiency on small volume
  is noise, not a signal

## Say these out loud, every time

- ⛔ **CORRECTED Sep 19 2026. This line used to read *"Every number is 2025.
  There is no 2026 data in this app."* True when written, FALSE now** — and this
  file told every session to say it out loud. `status_2026` carries the depth
  chart and injuries; `gamelogs_2026` carries real weeks. **A framework whose
  stated limit is wrong is worse than one with no limits, because it argues
  against looking.**
- Sections **1-4 are 2025**; **5b is the season being played**. When they
  disagree, **5b wins**.
- **Efficiency explains the past and never forecasts** — RB yards per carry is
  `r=0.02`, a coin flip.
- A **rookie or sub-gate player returns no data**, and that is a stated reason,
  never an empty answer or a guess.
