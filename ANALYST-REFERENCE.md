# Analyst Reference — What the App Measures and Why

**Purpose:** a plain-language reference for every analytical input RosterXRay
carries, why each one earns its place, and what is deliberately absent.

This is the **analysis** document. `CLAUDE.md` is the **engineering** document —
it records how things were built and what broke, in date order.
`USER-PERSONAS.md` is the **product** document — who is on the other side of the
screen. Read this one to understand the analysis, that one before changing code,
and the personas before changing what the app shows, hides, orders or names.

**New here?** Start at [§13, the plain-English guide](#13--plain-english-guide--every-metric-grouped-by-the-question-it-answers).
It groups every metric by the question it answers and links into the detail.
[§14](#14--seasonal-coverage--what-the-app-is-for-and-when) is what the app
covers in draft season, in season and in the offseason.

**Structure guarded by:** `scripts/test-analyst-reference.mjs` (guard 23)

---

## §0 · How to update this file

> **This section is the contract. Read it before adding anything.**

`CLAUDE.md` is 2,000+ lines in date order, and that is the correct shape for a
build log. It is the wrong shape for a reference: the thing you need is wherever
it happened to be written, and volume buries it. This file is organised by
**input**, not by date, so it stays findable as it grows.

Four rules keep it that way. Guard 23 enforces all four.

### Rule 1 — The INDEX is the entry point. Add the row first.

Every input has exactly one row in [§1](#1--index) and exactly one entry in
[§5](#5--tier-a--the-inputs-that-carry-the-analysis), [§6](#6--tier-b--worth-building-next) or
[§7](#7--tier-c--deliberately-not-built). **A row without an entry, or an entry without a row,
fails the build.** So does the same input appearing in two tiers.

That single constraint is what stops this file drifting into two half-maintained
lists, which is how every reference document dies.

### Rule 2 — Every entry uses the same template. No exceptions.

```markdown
### <Name> · r = <value or —> · <rank or —>

| | |
|---|---|
| **File** | the data file, or `—` |
| **Field** | the JSON key, or `—` |
| **Surfaces** | where a human or the model sees it |
| **Status** | live · proposed · rejected |

**Plain English.** One sentence a non-analyst understands.
**Why it matters.** The argument for its existence.
**Worked example.** Real numbers from real players.
**Gotchas.** What goes wrong. Omit only when genuinely nothing does.
```

The template is what makes entries **comparable**. A reader scanning for "where
does this live" finds it in the same place every time, and a free-form entry that
buries its file path in paragraph three is exactly the volume problem this file
exists to avoid.

### Rule 3 — Every `r` value lives in ONE table. §2 is that table.

An entry heading may restate its `r` for readability, but **guard 23 asserts the
restated number matches §2** at whatever precision the heading uses.

This repo has shipped the duplicate-definition bug **five times** in code —
tier/score, competitive balance, `posColor`, position palettes, playoff boosts.
Prose is not immune. Two copies of a number is one copy and one future lie.

**To change a measured value: edit §2, then re-run the guard.** It will name
every entry that now disagrees.

### Rule 4 — Sections have declared growth behaviour.

| Section | Grows? | On update |
|---|---|---|
| §1 Index | **yes, one row per input** | the only place that lists everything |
| §2 Stickiness table | rarely | canonical. Changing a number here is a measurement, not an edit |
| §3 Source Hierarchy | **no** | the rank definitions. Changing one re-weights every entry |
| §4 Scoring wall | **no** | rewrite in place when the engine changes |
| §5 Tier A | **yes** | new entries; Tier B graduates in |
| §6 Tier B | churns | an item **MOVES** to §5 when built. Never copy |
| §7 Tier C | rarely | add only with the reason it is impossible |
| §8 Data inventory | yes | one row per file |
| §9 Skills & tooling | yes | one entry per skill or command |
| §10 Standing rules | **append-only, never renumber** | a rule earns its number by costing a session |
| §11 Build queue | **prunable** | delete shipped items; they live in §5 now |
| §12 Changelog | **capped at 12** | drop the oldest. Full history is in git |
| §13 Plain-English guide | **one line per input** | navigation only. Detail stays in §5; if they disagree, §5 wins |
| §14 Seasonal coverage | rewrite in place | an audit of the app against the calendar. Re-audit before trusting it |

**§10 and §11 pull in opposite directions on purpose.** Rules accumulate because
each one is a scar and forgetting it costs the same session twice. The build
queue is a snapshot of intent and goes stale — a shipped item left there is worse
than no queue, because the next reader cannot tell what is still true.

### When two inputs would say the same thing

**Do not add the second one.** Merge it into the existing entry as another
`Field` row. Two entries covering one idea is how a reference doubles in length
without gaining anything, and it is the failure this file is shaped to prevent.

---

## §1 · Index

Every input the app carries or has considered. **One row each. This table is the
entry point.**

Legend — **Tier:** A carries the analysis · B is queued · C is impossible.
**Rank:** position in the [Source Hierarchy](#3--the-source-hierarchy--how-inputs-get-weighed)
— 1 = role change, most causal; 5 = matchup data, least stable. §3 defines all five.

| Input | r | Rank | Tier | Status | Scored? |
|---|---|---|---|---|---|
| [Intended air yards](#intended-air-yards--r--083--rank-2) | 0.83 | 2 | A | live | no |
| [QB rushing attempts / game](#qb-rushing-attempts--game--r--082--rank-2) | 0.82 | 2 | A | live | no |
| [Air yards share](#air-yards-share--r--078--rank-2) | 0.78 | 2 | A | live | no |
| [Targets / game](#targets--game--r--077--rank-2) | 0.77 | 2 | A | live | no |
| [WOPR](#wopr--r--075--rank-2) | 0.75 | 2 | A | live | no |
| [Target share](#target-share--r--073--rank-2) | 0.73 | 2 | A | live | no |
| [Snap share](#snap-share--r--071--rank-2) | 0.71 | 2 | A | live | no |
| [Dud rate](#dud-rate--r--067--rank-4) | 0.67 | 4 | A | live | **yes — Floor** |
| [Separation](#separation--r--066--rank-3) | 0.66 | 3 | A | live | no |
| [Usable rate](#usable-rate--r--065--rank-4) | 0.65 | 4 | A | live | **yes — Advance, Floor** |
| [QB pass attempts / game](#qb-pass-attempts--game--r--061--rank-2) | 0.61 | 2 | A | live | no |
| [Spike rate](#spike-rate--r--048--rank-4) | 0.48 | 4 | A | live | **yes — Ceiling** |
| [Snap trajectory](#snap-trajectory--r----rank-1) | — | 1 | A | live | no |
| [Vacated targets](#vacated-targets--r----rank-1) | — | 1 | A | live | no |
| [Red-zone opportunity share](#red-zone-opportunity-share--r----rank-1) | — | 1 | A | live | no |
| [On-field rate](#on-field-rate--r----rank-2) | — | 2 | A | live | no |
| [Teammate absence](#teammate-absence--r----rank-2) | — | 2 | A | live | no |
| [HVT / game](#hvt--game--r----rank-1) | — | 1 | A | live | **yes — Naked RB gate** |
| [Career arc](#career-arc--r----rank) | — | — | A | live | no |
| [Per-touch efficiency](#per-touch-efficiency--r----rank-4) | — | 4 | A | live | no |
| [Matchup data (FPA)](#matchup-data-fpa--r----rank-5) | — | 5 | A | live | **yes — schedule** |
| [RB carries / game](#rb-carries--game--r--073--rank-2) | 0.73 | 2 | B | proposed | no |
| [Targets per route run](#targets-per-route-run--r--067--rank-2) | 0.67 | 2 | A | live | no |
| [Offensive line rank](#offensive-line-rank--r----rank) | — | — | C | rejected | no |
| [Coverage-scheme splits](#coverage-scheme-splits--r--016--rank) | 0.16 | — | A | live | no |
| [Player-level motion](#player-level-motion--r----rank) | — | — | C | rejected | no |

---

## §2 · Stickiness — the canonical table

> **⚠️ THIS IS THE SINGLE SOURCE OF TRUTH FOR EVERY `r` IN THIS FILE.**
> Guard 23 checks every entry heading against it.

Every number was produced by asking one question:

> **If I know last year's figure, is it still true this year?**

Same player, both season transitions (2023→24 and 2024→25), 8+ games in each.
The result is a correlation from 0.00 (a coin flip) to 1.00 (perfectly
repeatable).

| Input | r | Tier |
|---|---|---|
| Intended air yards | 0.826 | anchor |
| QB rushing attempts / game | 0.815 | anchor |
| aDOT (air-yards layer) | 0.784 | anchor |
| Air yards share | 0.780 | anchor |
| Targets / game | 0.774 | anchor |
| WOPR | 0.752 | anchor |
| RB carries / game | 0.730 | anchor |
| Target share | 0.729 | anchor |
| Snap share (RB) | 0.728 | anchor |
| Snap share (WR/TE) | 0.709 | anchor |
| Route share | 0.756 | anchor — but see the entry: it restates snap share |
| Targets per route run | 0.674 | reliable |
| Dud rate | 0.667 | reliable |
| Separation | 0.663 | reliable |
| Usable rate | 0.652 | reliable |
| QB pass attempts / game | 0.605 | reliable |
| Passing aDOT | 0.486 | soft |
| Spike rate | 0.475 | soft |
| QB fantasy points / game | 0.383 | weak |
| Yards per target | 0.308 | weak |
| EPA per target | 0.278 | weak |
| TD per touch | 0.198 | weak |
| Catch rate (RB) | 0.103 | noise |
| **RB yards per carry** | **0.022** | **coin flip** |
| Man rate faced | 0.335 | weak |
| Yards per target vs zone | 0.294 | weak |
| Yards per target vs man | 0.235 | weak |
| **Coverage-scheme splits (man/zone edge)** | **0.161** | **coin flip** |
| Matchup data (FPA) — RB | 0.245 | least stable input in the app |
| Matchup data (FPA) — TE | 0.192 | |
| Matchup data (FPA) — QB | 0.049 | |
| **Matchup data (FPA) — WR** | **−0.073** | **negative** |

### The whole thing in one sentence

> **How much a player is used repeats. How well he did with it does not.**

Volume is a job description; efficiency is what happened. Job descriptions carry
over. Outcomes do not.

### Three consequences worth internalising

**1. The most-quoted RB stat in public analysis is worthless for projection.**
Yards per carry is `0.022`. Never let it move a verdict.

**2. WR matchup data is actively misleading.** A defense soft against receivers
last year is *very slightly more likely than chance* to be tough this year. That
is why the schedule is a sorter in this app and never a generator.

**3. Stickiness is NECESSARY, not SUFFICIENT.** A jersey number would score 1.00.
This table says *what to assume by default*; the Source Hierarchy says *what
overrides the default* — and rank 1 there is role **CHANGE**, which is by
definition the part that is not sticky. Not a contradiction: a confirmed role
change outranks everything precisely because it **invalidates the sticky
baseline**.

### Limits — state these before quoting any number above

- **Survivorship.** 8+ games in both seasons excludes injury years, so these are
  correlations among players who held a role two years running. True population
  stickiness is lower.
- **Range restriction** biases toward the stable middle for the same reason.
- **Two transitions only.** QB n=26 per transition is small — treat that column
  as directional. WR/TE n=149 and RB n=58 are solid.
- **FPA figures are RAW points allowed, not schedule-adjusted.** A defense that
  drew Kelce, Bowers and LaPorta looks soft at TE for reasons unrelated to the
  defense.

---

## §3 · The Source Hierarchy — how inputs get weighed

Every entry in [§5](#5--tier-a--the-inputs-that-carry-the-analysis) carries a
**rank**. This is what it means.

> ⚠️ **TWO DIFFERENT SCALES LIVE IN THIS FILE. Do not confuse them.**
> **Rank 1-5** is the Source Hierarchy: *how much do I trust this input.*
> **Tier A/B/C** is build status: *is it built, queued, or impossible.*
> An input can be rank 1 and Tier B — important and not built yet.

The ordering question is always: **when two things disagree, which do I
believe?** Higher rank wins.

---

### Rank 1 — Did his JOB change?

*What is different about his situation right now that was not true last year.*

A player traded into a starting role. A target hog who left town. A coach naming
a starter. Draft capital. A scheme that fits him.

**Why it is first:** it is the only rank that describes NOW. Everything below
describes what already happened. And it is **causal** — a role change does not
correlate with production, it creates it.

**The apparent contradiction, and the resolution.** Every other rank is ordered
by how REPEATABLE it is. Rank 1 is by definition the part that is NOT
repeatable. That is exactly why it outranks the rest: **a confirmed role change
invalidates the sticky baseline.** Rank 1 is the input that tells you when to
stop trusting ranks 2-4.

**Inputs:** vacated targets · snap trajectory · recent news · career arc ·
red-zone share (the scoring half of opportunity)

---

### Rank 2 — How much does he get?

*How many chances at the ball, and what share of his team's chances.*

**Why it is second: it is the most repeatable thing in football.**

```
targets/game     0.77        snap share       0.71
air yards share  0.78        RB carries/gm    0.73
target share     0.73        QB rush att/gm   0.82
```

**Volume is a job description, and job descriptions carry over.**

**The gate inside it:** snap share caps everything else. Volume ceiling =
routes x targets per route, so a player off the field cannot be rescued by
talent — the Josh Downs gate.

**Inputs:** targets/gm · target share · air yards share · WOPR · snap share ·
HVT/gm · QB volume profile · on-field rate · teammate absence

---

### Rank 3 — Does he deserve it?

*Is he winning, or is a coach simply feeding him.*

**Why it is third: it is the only rank that measures the PLAYER rather than what
someone gave him.** Every rank above it measures opportunity handed down. This
one finds a breakout before the volume shows up — high separation on modest
volume is what that looks like.

**Why not higher:** measured at `0.66`, real but less repeatable than volume.
And talent without opportunity scores zero.

**Inputs:** separation. It is the only rank-3 input the app carries, and the app
had none at all before Aug 31 2026.

---

### Rank 4 — What did his weeks look like?

*When he hit, how big. And how often did he hand you a zero.*

**Why it is fourth:** it DESCRIBES last season rather than predicting the next
one. Spike rate is `0.48`, barely better than a coin flip.

**Why it still matters in best ball:** you win a week with a spike. So this is a
**classifier** — it says what KIND of asset a player is — never a projection.

⚠️ **The honest tension.** Dud rate (`0.67`) is far more repeatable than spike
rate (`0.48`). **In best ball the more reliable number is the less useful one.**
That is why the Ceiling Shape Layer is capped at ±0.5 rather than trusted.

**Inputs:** spike · nuclear · usable · dud · game logs · per-touch efficiency

---

### Rank 5 — Who is he playing?

*Is the defense in front of him any good.*

**Why it is last, and this is the number that should surprise a reader:**

```
RB matchup data   0.245
TE                0.192
QB                0.049
WR               −0.073   ← NEGATIVE
```

A defense that was soft against receivers last year is **very slightly more
likely than chance to be tough this year**. The best figure on that board
explains 6% of next season's variance.

**So why carry it at all?** Because it answers a different question. Ranks 1-4
ask *is he good*. Rank 5 asks *when do his points arrive* — and in a format
where a single week is a 1-of-6 cut, timing is worth real money.

**Inputs:** FPA · season SOS · playoff schedule tiers

---

### The rule that ties it together

> **Ranks 1-4 GENERATE the list. Rank 5 SORTS it.**

**A player never makes or misses a target list because of his December
schedule.** His ranking WITHIN a list may move because of it.

Getting this backwards is the most expensive mistake available here, because the
output looks reasonable either way. A worked example from a real W16 screen:

| Player | Rank 5 said | Ranks 1-4 said | Correct call |
|---|---|---|---|
| Ja'Marr Chase | Smash | elite on all four | **buy** — everything agrees |
| Jonathan Taylor | Smash | 35% nuclear, 67% of goal line | **buy** |
| Chase Brown | *Even* | 56% of inside-10 carries | **buy anyway** — rank 2 beats rank 5 |
| Alec Pierce | *Hard* | 19.0 aDOT, 40% air-yards share | **live** — good rank 2, bad rank 5 |
| TJ Hockenson | Smash | **0% spike rate** | **pass** — rank 4 kills it |
| Bhayshul Tuten | Smash | **11th percentile snaps** | **pass** — rank 2 kills it |

The four middle rows are where the hierarchy earns its keep. **Led by rank 5,
all six of those calls invert.**

---

### Where each rank's confidence comes from

Rank order is about CAUSAL priority. [§2](#2--stickiness--the-canonical-table)
measures a different axis — whether last year's number is still true. The two are
complementary, and both are needed:

- **§2 tells you what to assume by default.**
- **The hierarchy tells you what overrides the default.**

---

## §4 · The scoring wall

Two systems, kept apart on purpose.

| | What it does | Who reads it | Can it move a grade? |
|---|---|---|---|
| **Scoring engine** | produces the number and the letter | `analyzeRoster` / `analyzeRedraft` | **yes** |
| **Context layer** | explains *why* a player is what he is | player card + AI prompt | **no** |

### Why the wall exists

A context layer that starts scoring **silently invalidates every calibration
figure recorded in `CLAUDE.md`.** Nothing errors. The numbers just quietly stop
meaning what they meant, a roster graded 8.9 in September re-grades to 8.4 in
October with no change to the players, and every share link stops being
comparable.

The Ceiling Shape Layer is the cautionary tale: it shipped with a bug where
grades moved **for the wrong reason** — QBs spike far more often than WRs, so any
roster carrying three QBs got a free bonus. **It looked like a working feature.**

### What actually scores today

```
BEST BALL                              REDRAFT
────────────────────────────────       ────────────────────────────────
Stack loop integrity                   Lineup construction
Three-week coverage (W15/16/17)        Positional depth
Bring-back correlation quality         Bye conflicts
Positional construction                Playoff schedule (W15-17)
Orphan count and quality               Season schedule
Advance Rate Layer       ±1.25         Floor Layer            ±0.5
Ceiling Shape Layer      ±0.5
```

Everything else in this file is context. **A change that moves a grade is a data
decision needing its own calibration run — never a side effect.**

### The split refresh cadence

> **Anything that SCORES is frozen. Anything that is CONTEXT may refresh.**

Enforced by guard 15, not left as a convention.

---

## §5 · Tier A — the inputs that carry the analysis

### Intended air yards · r = 0.83 · rank 2

| | |
|---|---|
| **File** | `ngs_receiving_2025.json` |
| **Field** | `iay` |
| **Surfaces** | Player card → Deployment · AI prompt → `deploymentContext` |
| **Status** | live |

**Plain English.** Where on the field is he used — how far downfield the ball is
travelling when it is thrown at him, counted where it was **aimed**, whether or
not he caught it.

**Why it matters.** Two reasons. First, it is **the stickiest player input
measured anywhere in this project**, ahead of QB rushing. It is sticky because
deployment is a *role* property, not a performance one: where a coach lines a
receiver up and what routes he calls persist across seasons, while whether the
ball arrives does not. Second, it describes **shape**, not just size —

| | Low aDOT (~6) | High aDOT (~14) |
|---|---|---|
| Route profile | slants, screens, short in-breakers | digs, posts, go routes |
| Week to week | steady floor | boom / bust |
| Best ball | lower — floor is irrelevant there | **higher — variance is a feature** |
| Redraft | **higher — a start-every-week floor** | lower |

Before this layer the app could not tell two receivers with identical target
counts apart.

**Worked example.** Rome Odunze 14.1 · AJ Brown 11.6 · Travis Kelce 6.3.

**Gotchas.** WR/TE only — NGS carries no RB rows at this gate.

---

### QB rushing attempts / game · r = 0.82 · rank 2

| | |
|---|---|
| **File** | `qb_profile_2025.json` · `qb_profile_2026.json` |
| **Field** | `rush_att_pg` |
| **Surfaces** | Player card → Volume profile · AI prompt → `qbContext` |
| **Status** | live |

**Plain English.** Does he run.

**Why it matters.** The most repeatable thing in football, and **the part of a QB
score that survives a bad passing day.** The konami-code premium is not a
narrative. Pair it with the fact that QB fantasy points per game is barely sticky
at `0.383`: **project a quarterback from volume and deployment, never from last
year's points.**

**Worked example.** 2025 range 1.12 (Goff) to 8.29 (Daniels), league median 3.43.
The prompt flags both tails — at 1.5× median it says RUSHING QB, at 0.55× it says
no rushing floor.

**Gotchas.** This block sits **outside** `metricsContext` deliberately. That
block gates on 8+ games, which drops a QB who missed half a season — and a
seven-game starter is exactly the case where his rushing rate is the most useful
thing you can say about him. Own gate: 6 games, 100 attempts.

---

### Air yards share · r = 0.78 · rank 2

| | |
|---|---|
| **File** | `player_metrics_2025.json` |
| **Field** | `ay_sh` |
| **Surfaces** | Player card → Opportunity · AI prompt → `metricsContext` |
| **Status** | live |

**Plain English.** His slice of all the yardage his quarterback threw downfield.

**Why it matters.** Identifies the deep threat **even in a week he catches
nothing**, because it counts where the ball was aimed. It is the WR/TE tiebreaker
in `/scout`: alpha 32-40%, median ~27%.

**Worked example.** AJ Brown 36% — 88th percentile among draftable WRs.

**Gotchas.** **Useless for running backs** (`0.261`). The RB tiebreaker is
HVT/game plus snap share. Also: currently **absent from the AI prompt** despite
being loaded — see [§6](#targetsgm--ay-share-in-the-prompt--r---rank-2).

---

### Targets / game · r = 0.77 · rank 2

| | |
|---|---|
| **File** | `player_metrics_2025.json` |
| **Field** | `tgt` ÷ `gp` |
| **Surfaces** | Player card → Opportunity · AI prompt → `metricsContext` |
| **Status** | live |

**Plain English.** How often is the ball thrown at him.

**Why it matters.** Raw volume, and among the most repeatable receiving numbers
there is. **Nothing else on a receiver's card matters if this is low.**

**Worked example.** AJ Brown 8.1 — 81st percentile.

**Gotchas.** Computed over **games played**, not a 17-game denominator. Before
Jul 16 2026 full-season denominators understated every partial-season player.
Also absent from the AI prompt — see [§6](#targetsgm--ay-share-in-the-prompt--r---rank-2).

---

### WOPR · r = 0.75 · rank 2

| | |
|---|---|
| **File** | `player_metrics_2025.json` |
| **Field** | `wopr` |
| **Surfaces** | Player card → Opportunity |
| **Status** | live |

**Plain English.** Target share and air yards share combined into one number.

**Why it matters.** The best single-number summary of opportunity available. It
answers "how much of this passing game is his" in one figure, which is why it is
the fastest read on a card.

**Worked example.** AJ Brown 0.70 — 87th percentile.

**Gotchas.** A composite, so it hides which half is driving it. When WOPR is high
and air yards share is low, he is a volume slot player rather than an alpha —
read both.

---

### Target share · r = 0.73 · rank 2

| | |
|---|---|
| **File** | `player_metrics_2025.json` |
| **Field** | `tgt_sh` |
| **Surfaces** | Player card → Opportunity |
| **Status** | live |

**Plain English.** His slice of his team's total targets.

**Why it matters.** How central he is to the passing game, independent of how
often his team throws.

**Worked example.** AJ Brown 29% — 85th percentile.

**Gotchas.** Pair it with pace: **a big share of a low-volume offence is a small
number of footballs.** And a share is a share *of something* — check
[Teammate absence](#teammate-absence--r----rank-2) before trusting one.

---

### Snap share · r = 0.71 · rank 2

| | |
|---|---|
| **File** | `player_metrics_2025.json` |
| **Field** | `snap_sh` |
| **Surfaces** | Player card → Opportunity |
| **Status** | live |

**Plain English.** What share of his offense's plays he is on the field for.

**Why it matters.** The route-participation proxy. **Volume ceiling = routes ×
targets per route, so a low snap share caps everything else** — the Josh Downs
gate. No public routes data exists, so this stands in for it.

**Worked example.** AJ Brown 91% — 92nd percentile.

**Gotchas.** **It is a SEASON AVERAGE and a season average buries role change.**
When it disagrees with [Snap trajectory](#snap-trajectory--r----rank-1), the
trajectory is the newer fact. The card shows both and labels the conflict rather
than hiding one.

---

### Dud rate · r = 0.67 · rank 4

| | |
|---|---|
| **File** | `player_metrics_2025.json` |
| **Field** | `dud_rate` |
| **Surfaces** | Player card → Week outcomes · **Floor Layer (scored, redraft)** |
| **Status** | live |

**Plain English.** How often he busts — under 5 half-PPR points.

**Why it matters.** **Floor is more predictable than ceiling**, at every position.
That is why redraft, where floor *is* the product, scores the stable pair
(`dud_rate` and `usable_rate`) while best ball scores the unstable one.

**Worked example.** Floor Layer blend is `usable_rate − dud_rate`, centred on a
starter-pool baseline: QB 0.882 · RB 0.528 · WR 0.298 · TE 0.133.

**Gotchas.** **In best ball a low dud rate is worth nothing** — floor is
irrelevant and variance is a feature. Never carry a redraft dud-rate argument
into a best-ball verdict.

---

### Separation · r = 0.66 · rank 3

| | |
|---|---|
| **File** | `ngs_receiving_2025.json` |
| **Field** | `sep` |
| **Surfaces** | Player card → Deployment · AI prompt → `deploymentContext` |
| **Status** | live |

**Plain English.** Does he get open — yards of space at the moment the pass
arrives, from the tracking chip in the ball.

**Why it matters.** **The only number in the entire app that measures talent
instead of opportunity.** Every other receiving figure — target share, WOPR, snap
share, targets per game — measures *what the coach gave him*. This measures
*whether he deserves it*. Rank 3 in the Source Hierarchy, a rank the app
previously had no data for at all.

That distinction is what finds a breakout before the market does:

- **High separation, modest volume** → already doing the hard part. Volume is a
  coaching decision that can change in one week.
- **Low separation, heavy volume** → propped up by usage that could evaporate.

**Worked example.** AJ Brown posts **2.24 yards — the 8th percentile** — while
carrying a top-decile target share. A contested-catch alpha, not a get-open
alpha. Invisible in every other number on his card.

**⚠️ RAW SEPARATION IS CONFOUNDED BY ROUTE DEPTH, and heavily.** Measured across
the pool, `corr(separation, intended air yards) = −0.69`: a deeper route gives
the defender more time to close, so separation falls monotonically with aDOT
(WR means run 3.62 at aDOT 0-7 down to 2.45 at 13+). **A raw separation ranking
is therefore substantially a "how short are his routes" ranking**, which rewards
slot and screen usage and punishes every boundary X in the league.

`scripts/ngs-targets.mjs` prints **sep+** beside it — separation over expected at
the depth he is actually used, from a within-position least-squares fit. The
correction is large: Alec Pierce goes from 4th percentile raw to 72nd adjusted on
a 19.0 aDOT, and Khalil Shakir falls from 93rd to 65th once his 3.5-yard aDOT is
accounted for.

**Both are kept.** `sep+` answers *does he beat his assignment*; raw separation
answers *how much space does he actually catch it in*, and a best-ball ceiling
case cares about the second as well as the first. Use `sep+` for a talent claim
and never the raw column alone.

**⚠️ IT ALSO CANNOT ISOLATE MAN COVERAGE.** The figure averages across every
coverage a player faced, so a contested-catch specialist — who beats man by
out-positioning rather than by separating — scores low by construction. The
man/zone split that would qualify it is
[now live](#coverage-scheme-splits--r--016--rank) — and it turned out to measure
r=0.16, so it describes one season and does not settle anything about talent.
**"Beats man coverage" and "creates separation" are different claims, and this
metric only measures the second.** Tee Higgins is the worked example: 0th percentile raw,
83rd of 85 even after the depth adjustment, on a 13.5 aDOT boundary role with 19%
of his team's red-zone targets. The coverage layer says his man/zone split is the
44th percentile — ordinary — so the two together read as a contested-catch profile
that is not converting, rather than as a man-beater the separation metric misses.

**Gotchas.** Position medians differ (WR 2.78 · TE 3.45) — read the percentile.
**NGS has its OWN population** (40+ targets in 2025), which is not the card's
draftable/8-game gate. The two ranks are not interchangeable and never share a
table.

---

### Targets per route run · r = 0.67 · rank 2

| | |
|---|---|
| **File** | `routes_2025.json` |
| **Field** | `tprr` · `routes` · `route_sh` · `tgt` · `gp` |
| **Surfaces** | player card (Route workload) · The Read · `routesContext` in both AI prompts |
| **Status** | live |

**Plain English.** How often he is thrown at on the pass plays he is on the
field for.

**Why it matters.** **It is the only per-OPPORTUNITY rate in the app.** Every
other receiving input measures what a coach GAVE him — target share, WOPR,
targets per game, snap share. This measures what he EARNS when he is out there.
Volume ceiling = routes x rate, so route share caps everything else no matter
how good the rate is: the Josh Downs gate.

**It is not a restatement of volume.** Measured on 2025 it runs r = 0.871
against targets per game and 0.817 against target share. Correlated, as it has
to be — but a quarter of the variance is independent, and the DIVERGENCES are
the whole point. A high rate on ordinary volume is a player earning looks he is
not getting, which is the contingency profile the Shough Rule is about. The
reverse is a role being fed to him that a depth-chart change removes.

**Worked example.** 2025 leaders: Puka Nacua 35.5%, Jaxon Smith-Njigba 33.6%,
Amon-Ra St. Brown 30.4%, Ja'Marr Chase 29.4%, against a WR median of 16.9%.

**Gotchas.** **⚠️ THE DENOMINATOR IS PASS-SNAP PARTICIPATION, NOT CHARTED
ROUTES.** The feed records who was on the field, never who released into a
pattern, so protection snaps inflate the denominator for blocking tight ends
and backs and deflate their rate. Read RB and TE figures as a FLOOR on the true
number — the card says so on their cards and only on theirs — and note the
stability is weaker there too (RB 0.515 against WR/TE 0.687). **Its own
population** (100+ routes in 2025) is not the card's draftable/8-game gate and
not the NGS 40-target gate; five populations now, five printed gates.

**`route_sh` is emitted here and is NOT an independent input.** It correlates
with `snap_sh` at r = 0.957 (WR 0.966). It is TPRR's denominator, shown because
a rate without its sample is unreadable, and the card row says so in place
rather than letting the reader count two signals where there is one. Where the
two do diverge they diverge honestly: Derrick Henry 0.388 route share against
0.545 snap share, because he leaves the field on passing downs.

**⚠️ This spent weeks in Tier C on a false premise.** See
[R19](#analysis) — the claim that the participation feed died after 2023 was
written once, was plausible, and was cited rather than re-tested.

---

### Usable rate · r = 0.65 · rank 4

| | |
|---|---|
| **File** | `player_metrics_2025.json` |
| **Field** | `usable_rate` |
| **Surfaces** | Player card → Week outcomes · **Advance Rate Layer + Floor Layer (scored)** |
| **Status** | live |

**Plain English.** How often he is startable — 10+ half-PPR points.

**Why it matters.** In best ball it feeds the **Advance Rate Layer**, which
scores the W1-14 qualifying round that every other input ignores: a roster that
cannot out-score its pod for fourteen weeks never reaches the playoff geometry
the rest of the grade measures. In redraft it is the positive half of the Floor
Layer.

**Worked example.** Advance Layer centres on 0.53, the median for ADP ≤ 120.

**Gotchas.** Capped contributions in both layers (±1.25 and ±0.5). **Never let
either decide between a stacked and an unstacked build** — the caps exist so they
cannot.

---

### QB pass attempts / game · r = 0.61 · rank 2

| | |
|---|---|
| **File** | `qb_profile_2025.json` · `qb_profile_2026.json` |
| **Field** | `pass_att_pg` |
| **Surfaces** | Player card → Volume profile · AI prompt → `qbContext` |
| **Status** | live |

**Plain English.** How often does he throw.

**Why it matters.** The second half of a QB projection, and the number that sizes
**every pass catcher on his team**. Compound it with `dropback_drain` — the share
of dropbacks lost to sacks and scrambles, which never become a target for anyone.

**Worked example.** 2025 dropback drain runs LAR 4.8% against NYJ 19.1%. That
spread is large enough to temper target-based optimism on any player from a
high-drain offence.

**Gotchas.** Compound drain with low pass volume rather than double-counting it.

---

### Spike rate · r = 0.48 · rank 4

| | |
|---|---|
| **File** | `player_metrics_2025.json` |
| **Field** | `spike_rate`, `nuclear_rate` |
| **Surfaces** | Player card → Week outcomes · **Ceiling Shape Layer (scored, best ball)** |
| **Status** | live |

**Plain English.** How often he wins you a week — 18+ half-PPR (nuclear: 28+).

**Why it matters.** **In best ball a week is won with a spike**, so this is what
the format actually pays for. It is also the genuine tension in this whole file:
**the more stable metric is the less useful one.** Dud rate is more repeatable
and worth nothing here.

**Worked example.** Ceiling Shape Layer: `(spike + nuclear) − positional median`,
averaged, ×2.5, clamped ±0.5. Baselines QB 0.530 · RB 0.235 · WR 0.091 · TE 0.059.

**Gotchas.** **POSITION NORMALISATION IS NOT OPTIONAL.** Raw spike rate is
dominated by quarterbacks — the draftable medians run QB 0.530 against WR 0.091 —
so scoring the raw number hands a bonus to any roster carrying three QBs for a
reason unrelated to ceiling. That bug looked like a working feature.

**Never quote this about one player.** Justin Jefferson carries a 0.000 blend at
roughly ADP 10 — a true description of 2025, not a projection. The layer is safe
because it **averages**; one misleading player moves the score by under 0.02.

---

### Snap trajectory · r = — · rank 1

| | |
|---|---|
| **File** | `snap_trajectory_2025.json` · `snap_trajectory_2026.json` |
| **Field** | `early` / `late` / `last4` / `delta` / `trend` |
| **Surfaces** | Player card → Role trajectory (the **headline**) · AI prompt → `trajectoryContext` |
| **Status** | live |

**Plain English.** Is his role growing or shrinking — first half of the season
against second half, plus his last four games played.

**Why it matters.** **Rank 1 in the Source Hierarchy, and a season average
flattens it into rank 2.** It fails in the direction that matters most: a player
buried in September and starting in December averages out to "committee", which
is exactly what he no longer is.

**Worked example.** RJ Harvey — season 0.421, but W1-9 **0.293 → 0.565** W10-18,
0.620 over his last four. He was graded **fade/falling on four separate rosters**
off the 0.421. The role had already changed and the average is what hid it.

**Gotchas.** **Only players whose role MOVED are listed** — a stable line repeats
what the average already said, so silence means the average is a fair read, not
that data is missing. `last4` is games **played**, not the last four weeks, so an
injured player's exit role is measured on real snaps. `delta` is null unless both
windows clear 3 games. A mid-season team change splices two different jobs into
one delta and is flagged.

---

### Vacated targets · r = — · rank 1

| | |
|---|---|
| **File** | `vacated_2026.json` |
| **Field** | `vacated_pct`, `gone[]` |
| **Surfaces** | Player card → Team target turnover · AI prompt → `vacatedContext` |
| **Status** | live |

**Plain English.** Who left, and how big is the hole they left behind — the share
of a team's 2025 targets belonging to players no longer on the roster.

**Why it matters.** **Rank 1 in the Source Hierarchy and the app had no data file
for it at all.** It was the single biggest structural gap. Lens 1 literally
instructs *"always project who absorbs market share before ADP reflects it"*, and
nothing in the app could see the vacancy. **Targets do not vanish. Somebody
catches them.** Finding out who, before ADP prices it in, is the highest-value
thing analysis can do.

**Worked example.**

```
PIT 57.1%   MIA 56.6%   WAS 46.6%   NYG 42.0%   NE 37.8%   ATL 36.4%
```

**Gotchas.** **It locates the opening. It does not name who fills it** — that
stays a judgement, and the file, card and prompt all say so. The denominator is
the team's *own measured 2025 share*, not 1.00, so the figure is "share of the
measured pool that left"; the card prints that qualifier because a percentage
without its denominator is unusable. **⚠️ Two scales in one file:**
`vacated_pct` is **percent** (46.6), `gone[].tgt_sh` is a **fraction** (0.247) —
a `× 100` on the wrong one rendered 4660%.

---

### Teammate absence · r = — · rank 2

| | |
|---|---|
| **File** | `player_metrics_2025.json` + `gamelogs_2025.json` |
| **Field** | derived — `teammateAbsence()` |
| **Surfaces** | Player card → Who else was on the field · **both** AI prompts |
| **Status** | live |

**Plain English.** Who else was on the field while those numbers were collected.

**Why it matters.** **A target share is a share OF something.** Every opportunity
metric silently assumes the same teammates all season, and when a rival missed
half the year the share describes a lineup that will not recur.

**Worked example.** Malik Nabers played 4 games in 2025, which inflated Wan'Dale
Robinson's 29.8% target share into something the full-strength Giants offense
will not reproduce.

**Gotchas.** **An absence explains where volume came from; it does NOT prove the
volume was hollow.** Several players produced their best games *with* the
teammate active — Gibbs graded better without LaPorta, Pierce better without
Jones. The card shows the split both ways and issues no verdict. Gates: 15%
minimum share, 3-game minimum split, 6 games.

---

### HVT / game · r = — · rank 1

| | |
|---|---|
| **File** | `player_metrics_2025.json` |
| **Field** | `hvt_pg` |
| **Surfaces** | Player card → Opportunity · **Naked RB insulation gate (scored)** |
| **Status** | live |

**Plain English.** High-value touches per game — red-zone targets plus
green-zone carries.

**Why it matters.** **"Just volume" is noise. HVT is signal.** It separates a
back who touches the ball near the end zone from one who accumulates carries
between the 20s, which is the difference between scoring equity and yardage.

**Worked example.** Gate 1 of the Naked RB check is **4.5+ HVT/game**. Fail it
and Gate 2 (zone/PROE composite 0.65+), and the roster takes a scored
`UNINSULATED_NAKED_RB` deduction.

**Gotchas.** It is the RB tiebreaker in `/scout`, alongside snap share — **not**
air yards share, which discriminates nothing for backs.

---

### Career arc · r = — · rank —

| | |
|---|---|
| **File** | `career_arc_2026.json` |
| **Field** | `age`, `exp`, `draft`, `phase` |
| **Surfaces** | Player card → Career arc · AI prompt → `arcContext` |
| **Status** | live |

**Plain English.** Is the calendar with him or against him.

**Why it matters.** The cheapest available correction to the most common
analytical error: **projecting last year forward on a player the calendar is
working against.** A 28-year-old back and a 24-year-old back with identical 2025
lines are not the same bet.

| Position | Rising through | Peak | Decline from | Note |
|---|---|---|---|---|
| **RB** | 23 | 26 | **27** | the sharpest curve in fantasy; workload history compounds it |
| **WR** | 24 | 28 | **30** | breakout age matters early; long plateau, gentle fall |
| **TE** | 25 | 29 | **31** | latest-developing — a 25-year-old TE is often still pre-breakout |
| **QB** | 25 | 32 | **35** | longest runway; rushing ages faster than passing |

TE running the *opposite* way from RB is why TE breakouts feel late. They are.

**Worked example.** Travis Kelce 36, decline · Carnell Tate 21, drafted 4th
overall, rising · Rome Odunze 24, rising.

**Gotchas.** **⚠️ THE BANDS ARE PRIORS, NOT MEASUREMENTS.** Published career-arc
priors, not measured in this repo — one season cannot produce an aging curve and
a cross-sectional read is confounded by survivorship. **The age is measured; the
band around it is borrowed.** Weigh them; never quote them as a finding. The
prompt emits **only the tails**, so silence means the calendar is neutral.

---

### Per-touch efficiency · r = — · rank 4

| | |
|---|---|
| **File** | `player_efficiency_2025.json` · `airyards_2025.json` · `motion_2025.json` |
| **Field** | `rush_eff_rank`, `ngs_rush_rank`, `rec_eff_rank`, `adot` |
| **Surfaces** | Player card → Efficiency (**dimmed**) · AI prompt → `efficiencyContext` |
| **Status** | live |

**Plain English.** What did he do per touch, as opposed to how many he got.

**Why it matters.** It catches two errors the opportunity metrics cannot see:
**volume without efficiency** grading as a strength (McCaffrey 2025 was elite on
every opportunity field and 63rd of 73 in rush efficiency) and **efficiency
without volume** being invisible (Jaylen Warren at a 50.8% snap share).

**Worked example.** **Rushing and receiving are near-uncorrelated for backs
(r=+0.09).** A back can be a bottom-5 runner and an elite receiving back — never
average them into one "efficiency" figure. Where `rush_eff_rank` and
`ngs_rush_rank` diverge, NGS is the better read on *is he good at running*:
Jaylen Warren 51/73 against 8/51, and the gap is touchdowns rather than running.

**Gotchas.** **This layer explains the past and never forecasts.** Yards per
carry `0.022`, yards per target `0.308`, EPA per target `0.278`. The card renders
it dimmed with a grey header for exactly that reason — brightness on this card
means "this should move your opinion". aDOT is the sticky exception (`0.784`)
because it is a role property. The motion layer is **PLAY-level**: it says the
offense used motion, never which player moved.

---

### Coverage-scheme splits · r = 0.16 · rank —

| | |
|---|---|
| **File** | `coverage_2025.json` |
| **Field** | `ypt_man` · `ypt_zone` · `edge` · `man_rate` + target counts |
| **Surfaces** | player card only (Man vs zone, REFERENCE group, dimmed) |
| **Status** | live — **descriptive, deliberately absent from the AI prompt** |

**Plain English.** What he did against man coverage versus zone, last season.

**Why it matters.** It is the qualifier
[separation](#separation--r--066--rank-3) invites and cannot supply: `avg_sep`
averages across every coverage a receiver faced, so a contested-catch profile
who wins by out-positioning rather than by getting open scores low with no way
to say so. This is the only place in the app that can look at that split.

**Worked example.** Tee Higgins, whose reputation is as a man beater: 7.79 y/t
against man on 43 targets, 9.57 against zone on 56 — an edge of **-1.78, the
44th percentile of qualified WRs.** So the honest read is ORDINARY, not poor.

**Gotchas.** **⚠️ IT DOES NOT CARRY. r = 0.161** (23>24 0.199, 24>25 0.122),
which puts it beside RB yards per carry in the coin-flip band, below every
number in the AI prompt. Three consequences, all deliberate: it renders in the
card's REFERENCE group beside per-touch efficiency, **it is the one context
layer withheld from the model entirely** — warning a model about a coin flip is
less reliable than not handing it the number — and nothing scores off it.

**⚠️ THE EDGE IS NOT CENTRED ON ZERO. READ THE PERCENTILE, NEVER THE SIGN.**
Man coverage suppresses yards per target league-wide, so almost everyone is
negative: the 2025 WR median is **-1.48** and the TE median **-1.10**. A
receiver at -1.2 is ABOVE his position median. Anyone reading the bare minus
sign mis-reads most of the league — which is exactly what an earlier reading of
Higgins' -1.78 as "reputation not supported" did.

**⚠️ IT IS NOT A ROUTE-WINNING METRIC.** It inherits separation's aDOT confound
(a deep target is worth more yards whoever is covering), and man coverage puts a
linebacker on a running back, which is a personnel mismatch rather than a skill:
5 of the 7 qualified backs are positive against a WR median of -1.48. **An
earlier ungated pass produced a much louder version of that — a leaderboard
topped by backs at +6 to +11 — and it did not survive the 15-target gate.** The
direction was real; the magnitude was single-digit samples.

**Only 7 RBs clear the gate**, under the 12-player ranking minimum, so RB cards
show no percentile and say why rather than pointing at a number that is not
there.

---

### Matchup data (FPA) · r = — · rank 5

| | |
|---|---|
| **File** | `grading/data/fpa.md` · `sos_2026.json` · `COACHING_ADJ` / `OFFSEASON_ADJ_2026` |
| **Field** | points allowed per position, plus 2026 adjustments |
| **Surfaces** | stack matrix · season schedule grid · **the playoff schedule score** |
| **Status** | live |

**Plain English.** How generous is the defense he is facing.

**Why it matters.** It is the **format** layer, and it is scored — the entire
W15-17 playoff geometry runs on it. But it answers a different question from
everything above: *when do his points arrive*, never *is he good*.

**Worked example.** **A player never makes or misses a target list because of his
December schedule.** His ranking *within* a best-ball list may move because of it.
Generator versus sorter — never conflate them.

**Gotchas.** **The least stable input in the app**, and the only one that goes
negative: WR FPA is `−0.073` across both transitions. Confidence is **per-team,
judged on defensive continuity** — and coordinator continuity and personnel
continuity are separable (KC 2026: scheme intact, four DBs gone; the run defense
qualifies, the pass defense does not). **The FPA Direction Rule is absolute:**
never apply a defense's rating to that same team's offensive players. Game totals
are directional reference, never hard logic gates.

---

### Red-zone opportunity share · r = — · rank 1

| | |
|---|---|
| **File** | `redzone_2025.json` |
| **Field** | `rz_tgt_sh`, `i10_tgt_sh`, `rz_car_sh`, `i10_car_sh`, `i5_*` |
| **Surfaces** | Player card → Red zone · AI prompt → `redzoneContext` |
| **Status** | live |

**Plain English.** Does he score, or just catch.

**Why it matters.** Lens 1 calls red zone and goal line touches **standalone
scoring equity** and instructs tracking them separately from snap share. The app
could not see them. `hvt_pg` was the nearest thing it carried and it is a
per-game **count**, so a back on a team that never reaches the red zone and one
on a team that lives there looked identical — and they are not the same asset.
The **share** isolates the player's claim on his offense's scoring chances, which
is the part that survives a change in team scoring rate.

Touchdowns are where the volatility lives. A receiver who owns the 10-yard line
is a different asset from one who owns the 40, and a big overall target share
with a small red-zone share is a yardage player rather than a scorer.

**Worked example.** Amon-Ra St. Brown **38.9%** of DET's red-zone targets on 35 ·
Hunter Henry 33.9% on 22 · Trey McBride 32.4% on 33. Three zones are carried:
inside 20, inside 10, and goal line inside the 5.

**Gotchas.** **⚠️ THE COUNT TRAVELS WITH THE SHARE, ALWAYS.** Red-zone volume is
a fraction of total volume, so a share is a ratio of two small numbers — "31%"
is unreadable, "31% of 22" is a fact. A share is emitted only when the player
**and** his team clear their gate, so a count with no share means the sample is
too thin to express as a rate. **Goal line is a count only**, never a share.
Red-zone usage is among the most coaching-dependent things in football — a new
OC reassigns a goal-line role in a week, so any dated role note supersedes this.

---

### On-field rate · r = — · rank 2

| | |
|---|---|
| **File** | `availability_2026.json` |
| **Field** | `career`, `recent`, `by_season`, `missed_full_seasons` |
| **Surfaces** | Player card → On-field rate · AI prompt → `availabilityContext` |
| **Status** | live |

**Plain English.** How often does he actually play.

**Why it matters.** **Every other metric in this app is a per-game rate**, which
is right for comparability and means nothing anywhere expressed whether a player
plays at all. A 17-game season of a good player beats 11 games of a slightly
better one. Best ball feels it hardest — an empty week is a zero that cannot be
substituted out of.

**Career and recent are both shown and never averaged.** A clean decade with two
broken years running is a different bet from a steady career at the same figure,
and one number cannot say both.

**Worked example.** Josh Allen 99.1% career · Nick Chubb **71.8% career against
49.0% over the last three** — the split is the finding · McCaffrey 68.4% / 72.5%
· Rashee Rice 54.9%.

**Gotchas.** **⚠️ THE DENOMINATOR IS THE MEASUREMENT.** Counting games played
against games played is circular; counting against 17 skips a fully lost season
entirely and reports the player as durable. A season counts whenever he appears
on that season's **roster**, played or not.

**⚠️ It is named for what it measures.** The gameday inactive list is what would
separate hurt from healthy-and-not-playing, and nflverse does not ship it, so
this counts games with **offensive snaps** — which blends availability with
**role**. A backup who dresses weekly and never plays scores low, which is
correct for fantasy and is **not a medical finding**. Read it beside snap share.
It also cannot separate injury from a coaching decision, a suspension or a
holdout.

Two population decisions carry the file: practice-squad and cut seasons are
excluded (counting them put the league median at **25%**, which measures roster
churn), and the numerator is snaps rather than stat lines (stat lines miss a
blocking TE and a zero-target WR, and put the median at **63%**).

---

## §6 · Tier B — worth building next

### RB carries / game · r = 0.73 · rank 2

| | |
|---|---|
| **File** | would extend `player_metrics_2025.json` |
| **Field** | carry count — **not currently emitted** |
| **Surfaces** | would join Opportunity and `metricsContext` |
| **Status** | proposed |

**Plain English.** How often does he get the ball on the ground.

**Why it matters.** Anchor-grade, and the RB counterpart to targets per game. The
builder tracks carries internally and emits no count; today they are only
reachable through the `car` column of `GAME_LOGS`.

**Gotchas.** **⚠️ Requires regenerating the SCORED file.** That re-derives
`hvt_pg`, `usable_rate` and `spike_rate` over a pbp release that may have been
revised since. Needs a full calibration run and must not be bundled with anything
else.

---

## §7 · Tier C — deliberately not built

> **Every rejection here states the date its impossibility was last verified.**
> Two entries sat in this section on a false premise until Sep 1 2026, because
> "no free source exists" was written once and then cited rather than re-tested.
> Both are now built and live in §5. A rejection ages exactly like a player
> verdict. Re-checking a feed costs one command — see [R19](#analysis).

### Offensive line rank · r = — · rank —

| | |
|---|---|
| **File** | — |
| **Field** | — |
| **Surfaces** | — |
| **Status** | rejected — no free data · last verified Sep 1 2026 |

**Plain English.** How good is the line in front of him.

**Why it matters.** It would qualify both rushing efficiency and QB pressure.

**Gotchas.** **No free per-player OL data exists** in a rankable form, and
team pressure rate allowed is **confounded by the quarterback** — a scrambler
makes his line look better than it is.

---

### Player-level motion · r = — · rank —

| | |
|---|---|
| **File** | `motion_2025.json` — **play-level only** |
| **Field** | `ypt_lift_pct` |
| **Surfaces** | AI prompt, at a 20%+ split only |
| **Status** | rejected as a player metric; retained as a team screen · last verified Jul 26 2026 |

**Plain English.** Does he produce when the offense uses motion.

**Why it matters.** Motion usage is a real scheme property worth knowing at team
level.

**Gotchas.** **FTN's `is_motion` says the OFFENSE used motion on that snap. It
does NOT say which player moved.** So the app measures a team-scheme split
observed on a player's targets. Cross-checked against one public table: same
direction on 5 of 6 receivers, consistently smaller magnitudes, one sign flip.
**Treat as a screen, never as a citable figure, and never present a number from
this file as a player-level motion split.**

---

## §8 · Data layer inventory

### Scored — FROZEN all season

| File | Feeds |
|---|---|
| `player_metrics_2025.json` | `hvt_pg` (Naked RB gate) · `usable_rate` (Advance + Floor) · `spike_rate` + `nuclear_rate` (Ceiling Shape) |

**Why frozen:** refreshing it weekly would move every grade for reasons unrelated
to the roster and silently invalidate every recorded calibration. Also sample
size — `spike_rate` on four games is noise, and would render at full confidence.

### Context — refreshes WEEKLY in season

| File | Answers |
|---|---|
| `snap_trajectory_2026.json` | is his role growing or shrinking right now |
| `qb_profile_2026.json` | rushing volume, pass attempts, passing aDOT |
| `gamelogs_2026.json` | week-by-week output, as a chart |

```
bash scripts/refresh-inseason.sh          # season defaults to 2026
npm test && git add grading/data && git commit
```

### Context — ANNUAL

| File | Answers | Rank |
|---|---|---|
| `ngs_receiving_2025.json` | does he get open, and where is he used | 2 & 3 |
| `routes_2025.json` | how often is he thrown at per route he runs | 2 |
| `coverage_2025.json` | man vs zone last season — **reference, not in the prompt** | — |
| `career_arc_2026.json` | is the calendar with him | — |
| `vacated_2026.json` | who left, how big is the opening | **1** |
| `redzone_2025.json` | does he score, or just catch | **1** |
| `availability_2026.json` | how often does he actually play | 2 |
| `player_efficiency_2025.json` | what did he do per touch | 4 |
| `airyards_2025.json` | RB aDOT, team RB air yards, QB dropback drain | 4 |
| `motion_2025.json` | does this offense use motion (team screen) | — |
| `sos_2026.json` | full-season slate difficulty, and the change | 5 |
| `snap_trajectory_2025.json` | prior-season role direction | 1 |
| `qb_profile_2025.json` | prior-season QB volume | 2 |
| `gamelogs_2025.json` | prior-season week-by-week | 4 |

---

## §9 · Skills and tooling

### Skills

#### `/scout` — `.claude/skills/scout/SKILL.md`

**Triggers on:** naming a player and asking what the data says. Also *"scout X"*,
*"is X elite"*, *"should I draft X"*, *"what do the numbers say about X"*, or a
request for a breakdown / profile / read / scouting report.

**Returns:** an **elite / volume-mid / contingent / bad** verdict against his ADP,
read from the real app module rather than from memory.

```
node scripts/scout.mjs "Player Name" [--format standard|superflex|yahoo]
```

**The nine steps:**

```
[0] Team check          — a MOVED player's numbers describe a job he left
[1] Opportunity         — the only tier that carries to next season
[2] The tiebreaker      — POSITION-SPECIFIC (below)
[3] Conversion          — was the volume worth having
[4] Ceiling shape       — classifies, never projects
[5] Who else played     — the split, not a conclusion
[6] Prose               — role CHANGE outranks every number above it
[7] The price step      — elite AT WHAT COST
[8] Format overlay      — the same data flips the verdict
```

**Step 2 is the one most people get wrong**, by applying the WR version to
everyone:

| Position | Tiebreaker | Why |
|---|---|---|
| WR / TE | **Air yards share** — alpha 32-40%, median ~27% | separates elite from high-volume mid |
| RB | **HVT/game + snap share**, plus the receiving tier (65+ rec elite · 40-64 real role · under 40 neither) | air yards share is `0.261` for backs and discriminates nothing |
| QB | **Rush attempts/game**, then pass attempts/game | QB points/game is `0.383` — never project a QB from last year's points |

**It says three things out loud every time:** every number is 2025 · efficiency
explains the past and never forecasts · a rookie returns a stated reason, never
an empty answer or a guess.

### CLI

| Command | What it does |
|---|---|
| `node scripts/grade-cli.mjs <roster> --tournament <key>` | grade headlessly. Unknown flags and unknown tournament keys exit non-zero with a hint — `--mode redraft` was silently ignored until Sep 1 2026 and graded a redraft roster through the best-ball engine |
| `node scripts/scout.mjs "Name" [--format …]` | the data behind `/scout` |
| `node scripts/report-stale-news.mjs [date]` | **run before any draft.** Lists players whose every note is past the 45-day re-validation rule. Takes a date, so you can ask what will be stale on Sept 5 |
| `bash scripts/refresh-inseason.sh [season]` | the weekly job. Two downloads. No-ops safely before Week 1 |
| `python3 scripts/refresh-adp.py [--source underdog\|ffc] [--table data\|yahoo] [--apply]` | ADP drift report. **Reports by default, never auto-applies** |
| `npm test` | 23 guards |
| `npm run build` | Vite production build |

### Builders

```
build-player-metrics.py     the SCORED file — regenerate with extreme care
build-ngs-receiving.py      separation + intended air yards
build-career-arc.py         age / experience / draft slot
build-vacated.py            per-team target turnover
build-redzone.py            red-zone / inside-10 / goal-line share
build-availability.py       on-field rate, career and recent
build-snap-trajectory.py    W1-9 vs W10-18 role direction
build-qb-profile.py         the three sticky QB inputs
build-gamelogs.py           week-by-week output
build-efficiency.py         per-touch efficiency ranks
build-airyards.py           RB aDOT, team RB air yards, dropback drain
build-motion.py             team-scheme motion split (PLAY-level)
build-sos.py                full-season schedule strength
```

### Guards — every one exists because something broke

| Protects | Guards |
|---|---|
| **Name resolution & ADP** | `findplayer` · `adp-delta` · `alias-adp-sync` · `table-coverage` · `no-duplicate-keys` |
| **Roster ingestion** | `extraction-filters` · `extraction-blocks` · `yahoo-share` · `loose-json` |
| **Prose safety** | `no-quoted-negations` · `stale-verdicts` · `player-data` |
| **Scoring containment** | `snap-trajectory` · `refresh-cadence` · `floor-layer` · `context-layers` |
| **Scoring correctness** | `playoff-boosts` · `archetypes` |
| **UI** | `player-card` · `color-roles` · `disclosure` · `player-lookup` |
| **This file** | `analyst-reference` |

---

## §10 · Standing rules

> **Append-only. Never renumber — rules get cited by number.**
> A rule earns a number by costing a debugging session.

### Data

**R1.** A metrics row carries the **OLD team**. `player_metrics_2025.json` stores
the team a player *played for*. Check `team` against `ADP_DATA` before quoting
any 2025 number about a 2026 mover.

**R2.** **Never mix percentile populations.** A rank printed under a population
label that does not describe it is worse than no rank.

**R3.** **Two scales can live in one file.** `vacated_pct` is percent units
(46.6); `gone[].tgt_sh` is a fraction (0.247).

**R4.** **A borrowed prior is not a finding.** Say so wherever it renders.

**R5.** **`ADP_DATA` takes values only from a best-ball source.** A redraft quote
does not transfer — the offset ranges 15 to 62 picks and is not constant.

**R6.** **A screenshot of your own draft board beats any scrape.**

### Prose

**R7.** `SITUATIONS.trendNote` and `RECENT_NEWS` are **pasted verbatim into the
AI prompt. Anything in them is quotable.** Write affirmatively, present tense,
about what is true now. **Never quote a superseded claim** — the Diggs bug came
back *because* the correction quoted it.

**R8.** **Always write the year.** A bare "Aug 6" does not parse, and the entry
ages from an older date instead.

**R9.** **A future date is never the note's currency.** A court date, a contract
date and a draft date all parse identically to an update stamp.

**R10.** **Search summaries carry no dates.** Check every player-team claim
against `ADP_DATA` before writing it.

### Code

**R11.** **A filtered name must never be silent.** Junk reaching `notFound` costs
one dismissable row; a name dropped by a filter costs a player out of the grade
with no evidence it happened.

**R12.** **One definition or none.** This repo has hit the duplicate-definition
class **five times**.

**R13.** **A label that disagrees with its own number reads as confirmation** and
is worse than no label.

**R14.** **Disclosure is a judgement about reading FREQUENCY, not size.** The
stack matrix is the tallest block on the page and stays open.

**R15.** **`App.jsx` and `App.jsx.jsx` must be byte-identical after every edit.**

### Analysis

**R16.** **Generator versus sorter.** Player-level inputs decide *is he good*;
format-level inputs decide *when his points arrive*. A player never makes or
misses a list because of his December schedule.

**R17.** **Efficiency on small volume is noise**, never a signal. Sub-gate
players carry a null rank rather than a flattering one.

**R18.** **Separate standalone value from contingent value explicitly**, in every
analysis.

**R19.** **A "this is impossible" note has no freshness rule and needs one.** Two
Tier C rejections survived on a premise that was false when written down and
never re-tested. Date every rejection, and re-check the feed before citing it —
it costs one command.

---

## §11 · Build queue

> **Prunable. Delete a line the moment it ships — it lives in §5 then.**
> A shipped item left here is worse than no queue, because the next reader cannot
> tell what is still true.

| # | Item | Effort | Moves grades? |
|---|---|---|---|
| 1 | [RB carries / game](#rb-carries--game--r--073--rank-2) | builder change | **⚠️ regenerates the scored file** |
| 2 | Decide whether separation should SCORE | a real data decision | **yes** |
| 3 | Structured `date` on `RECENT_NEWS` (SITUATIONS already reads one) | maintenance | no |
| 4 | Re-verify the remaining Tier C rejections against their stated dates | one command each | no |
| 5 | **Fix `tgt_sh` for mid-season movers in `build-player-metrics.py`** | one denominator change | **only when the scored file is next legitimately regenerated** |

**On #5.** Found Sep 1 2026 by validating the volume twin against 2025: nine
players disagree by more than five points, all traded mid-season, all inflated,
because the builder divides a full-season target count by one team's totals.
**It has never moved a grade** — neither engine reads `tgt_sh`. **Do NOT
regenerate the frozen file to fix it**; that moves every grade and invalidates
every calibration on file. It rides along with the next legitimate rebuild.

**Shipped Sep 1 2026 and pruned from this queue:** targets per route run and
coverage-scheme splits. Both now live in §5. **The lesson worth keeping is the
measurement order** — TPRR came out at r=0.674 and shipped as a real input,
while the man/zone edge came out at r=0.161 and shipped as reference the model
never sees. Neither outcome was knowable before it was measured, and building
both and then deciding is what kept a coin flip out of the prompt.

**On #2.** At `0.663` separation is more stable than `spike_rate` (`0.475`),
which the Ceiling Shape Layer already trusts enough to score. **For:** a roster
full of players who cannot get open is genuinely worse than one full of players
who can, and no current input sees that. **Against:** separation on 40 targets is
thin, the population is WR/TE only so it would systematically ignore half a
roster, and it would move every grade. **If it ships, it ships alone, with its
own calibration run and its own cap.**

---

## §12 · Changelog

> **Capped at 12 entries. Drop the oldest — full history is in git.**

| Date | Change |
|---|---|
| Sep 1 2026 | Current-week awareness and a current-season volume twin — the in-season transition |
| Sep 1 2026 | §13 plain-English guide and §14 seasonal coverage audit |
| Sep 1 2026 | TPRR (r=0.67) and man/zone coverage (r=0.16) built — Tier C to Tier A in one day |
| Sep 1 2026 | Separation is confounded by route depth (r=−0.69); sep+ added |
| Sep 1 2026 | §3 defines the Source Hierarchy — the `rank` field was used 28 times and never explained |
| Sep 1 2026 | Cutdown-day news sweep: Jacobs on the exempt list, 7 entries refreshed |
| Sep 1 2026 | SITUATIONS `reason` entries and structured dates now reach the card |
| Sep 1 2026 | Persona sweep of both sides: results now scroll into view on analyze |
| Sep 1 2026 | USER-PERSONAS.md, and the card regrouped into the four questions a reader asks |
| Sep 1 2026 | The Read on the player card, and one accent per group rather than per section |
| Sep 1 2026 | Red-zone share and on-field rate — context only, 39 grades identical |
| Sep 1 2026 | grade-cli validates its flags rather than ignoring a typo |

---


---

## §13 · Plain-English guide — every metric, grouped by the question it answers

> **START HERE if you are new to the file, or writing for a non-analyst reader.**
>
> **This section is NAVIGATION, not content.** One line per input, grouped by the
> question a human actually asks, each linking to its full entry in §5. It exists
> because §1 lists inputs in stickiness order, which is the right order for
> deciding what to trust and the wrong order for learning what things mean.
>
> **Keep the one-liners short and keep the detail in §5.** Guard 23 asserts every
> §1 input appears here exactly once, so a new input cannot be added without a
> plain-English sentence. If a line here and its §5 entry ever disagree, §5 wins.

### 1. "Is his job changing?" — the most causal thing you can know

These override everything below them. That is the whole point of rank 1: a
confirmed role change **invalidates the sticky baseline** rather than competing
with it.

| Metric | In plain English |
|---|---|
| [Snap trajectory](#snap-trajectory--r----rank-1) | Was he on the field more in December than in September |
| [Vacated targets](#vacated-targets--r----rank-1) | How much of last year's target pie left the building |
| [Red-zone opportunity share](#red-zone-opportunity-share--r----rank-1) | Does he get the ball where points actually happen |
| [HVT / game](#hvt--game--r----rank-1) | Touches that score, as opposed to touches that pad yardage |

### 2. "How much work does he get?" — the volume floor

Volume is a job description, and job descriptions carry over. This is the most
repeatable family in the app and the one to build a projection on.

| Metric | In plain English |
|---|---|
| [Targets / game](#targets--game--r--077--rank-2) | Raw volume. Nothing else survives this being low |
| [Air yards share](#air-yards-share--r--078--rank-2) | Of all the yardage his QB throws toward, how much is aimed at him |
| [Target share](#target-share--r--073--rank-2) | How central he is, independent of how often his team throws |
| [WOPR](#wopr--r--075--rank-2) | Targets and air yards blended into one number |
| [Snap share](#snap-share--r--071--rank-2) | Is he even on the field |
| [Targets per route run](#targets-per-route-run--r--067--rank-2) | **How often he is thrown at per route he runs.** The only per-opportunity rate here |
| [Intended air yards](#intended-air-yards--r--083--rank-2) | How far downfield he is used. The stickiest player number in the app |
| [QB rushing attempts / game](#qb-rushing-attempts--game--r--082--rank-2) | The single most repeatable thing a quarterback does |
| [QB pass attempts / game](#qb-pass-attempts--game--r--061--rank-2) | How much his offence throws at all |
| [RB carries / game](#rb-carries--game--r--073--rank-2) | Ground volume. Queued, not built |
| [Teammate absence](#teammate-absence--r----rank-2) | Did his numbers arrive with the alpha hurt |
| [On-field rate](#on-field-rate--r----rank-2) | How often he plays at all, measured across his career |

### 3. "Is he good, separate from what he is given?"

The only family that measures the PLAYER rather than his opportunity. Everything
above says what a coach handed him; this says whether he is earning it.

| Metric | In plain English |
|---|---|
| [Separation](#separation--r--066--rank-3) | Yards of space between him and the defender when the ball arrives |

### 4. "What did he actually do?" — descriptive, never predictive

Read these to explain what happened. Never to argue what will happen.

| Metric | In plain English |
|---|---|
| [Spike rate](#spike-rate--r--048--rank-4) | How often he won you a week outright |
| [Usable rate](#usable-rate--r--065--rank-4) | How often he was startable |
| [Dud rate](#dud-rate--r--067--rank-4) | How often he cost you one |
| [Per-touch efficiency](#per-touch-efficiency--r----rank-4) | Yards per carry, per target. Among the least repeatable numbers in football |
| [Coverage-scheme splits](#coverage-scheme-splits--r--016--rank) | What he did against man versus zone. A coin flip year to year |

### 5. "What could change it?" — the outlook

| Metric | In plain English |
|---|---|
| [Career arc](#career-arc--r----rank) | Is the calendar with him or against him |

### 6. "When do his points arrive?" — format, not talent

**A player never makes or misses a list because of his December schedule.** This
family SORTS a shortlist. It never builds one.

| Metric | In plain English |
|---|---|
| [Matchup data (FPA)](#matchup-data-fpa--r----rank-5) | How generous his opponents are. The least stable input in the building |

### 7. Considered and not built

| Metric | Why not |
|---|---|
| [Offensive line rank](#offensive-line-rank--r----rank) | No free per-player data, and team pressure rate is confounded by the quarterback |
| [Player-level motion](#player-level-motion--r----rank) | The feed says the OFFENCE used motion, never which player moved |

### The two rankings, and why they disagree

**Importance** is how causal a metric is. **Stickiness** is whether last year's
number is still true. They are different axes and the app needs both.

| | High stickiness | Low stickiness |
|---|---|---|
| **High importance** | targets/gm · air yards share · TPRR · QB rush att | **role change · vacated targets · dated news** |
| **Low importance** | (a jersey number would score 1.00) | RB yards per carry · man/zone edge |

**Top-left is your default assumption. Top-right is what overrides it.**

Rank 1 is deliberately the least sticky family in the app. Two failure modes fall
out of collapsing the axes:

- **Rank by stickiness alone** and you project from last season forever, missing
  every breakout the moment a role changes.
- **Rank by importance alone** and you chase every camp report with no baseline
  to weigh it against.

### The order to work in, on the clock

1. **Did something change?** News, trajectory, vacancy, team change. If yes, much
   of what follows describes a job he no longer holds.
2. **Volume floor.** Targets/gm and air yards share. Route share is the ceiling:
   he cannot beat what he is not on the field for.
3. **Is the volume earned?** TPRR and separation. **The divergence from step 2 is
   the signal** — a high rate on modest volume is the contingency profile, the
   reverse is a fed role one depth-chart move removes.
4. **Scoring equity.** Red zone. Volume between the 20s and goal-line work are
   different assets.
5. **Ceiling shape.** Spike rate. Capped at ±0.5 in the grade for a reason.
6. **Schedule.** Sorts the shortlist. Never builds it.

---

## §14 · Seasonal coverage — what the app is for, and when

> **Audited against the code on Sep 1 2026, not asserted.** Re-audit before
> trusting this section; it describes an architecture that is being changed.

The app was built for draft season and its architecture says so. That is worth
stating plainly, because every gap below follows from it.

### Draft season — complete

26 inputs, 14 tournament configs, best-ball ADP from a like-for-like source,
stack geometry, positional archetypes, the playoff-schedule engine. Nothing
material missing.

### In season — the machinery exists and points at the wrong weeks

**THE SINGLE LARGEST FINDING: "today" existed and reached exactly one panel.**

⚠️ **A first pass of this audit reported that no current-week state existed
anywhere. That was wrong** — `getNflWeek()` has been in the file since before
this audit, deriving the week from `SEASON_START`. The grep that produced the
claim was case-sensitive and missed it. Corrected here rather than quietly, per
the same rule that governs a stale verdict.

What was actually true:

- `lineupConfidence` computes start/sit intel for **all 17 weeks**. Built, works.
- `getNflWeek()` existed with **exactly one consumer**: the redraft lineup-
  confidence week strip.
- **The AI prompt ignored it entirely** and filtered to `week >= 15`.
- Nothing else consumed it: not the weekly grid, not bench moves, not best ball,
  not the data-vintage footer.
- It is **calendar-derived**, so it says Week 8 whether or not the weekly data
  refresh has been run since Week 3.

So the app knew the date and almost nothing acted on it, and what did act on it
could not tell the reader its data was stale.

**Closed Sep 1 2026.** `seasonNow()` is now the single definition and carries
the calendar week AND the data vintage together. Both AI prompts open by naming
the week; the start/sit filter is `week >= 15 || week === current`; the lineup
panel warns when the refresh has fallen behind. **A lag of exactly 1 is the
healthy steady state** — after week N is played the data covers N and the
decision is N+1 — so only a larger gap warns. Guard 24.

**Four remaining gaps, in priority order:**

| # | Gap | Why it matters |
|---|---|---|
| 1 | **No free-agent pool** | The app grades a roster you already hold. The #1 weekly job in redraft is "who do I add," and nothing ranks players you do NOT roster |
| 2 | **News is hand-maintained** | A 30-45 day freshness rule is right for August. In October it is three days |
| 3 | **No opponent awareness** | Weekly head-to-head decides whether you need floor or ceiling this week |
| 4 | **Rest-of-season SOS** | `sos_2026.json` is a static full-season figure. In Week 10 the played half is noise |

**Closed Sep 1 2026: the anchors now update.** `volume_2026.json` is a
context-only twin of the frozen scored file, carrying targets/gm, target share,
air yards share, WOPR and carries/gm on the current season. It costs no extra
network — the weekly job already downloads `stats_player_week_<season>.csv` for
the QB profile and the game logs, so this is a third parse of a file on disk.
Red-zone share and TPRR are NOT twinned, because they need the pbp and
participation releases, which are large weekly downloads. That trade has not
been made.

### Offseason — better covered than it looks

Vacated targets, career arc with draft capital, coaching adjustments and the
situations corpus already make a real offseason toolkit: *who left, who aged, who
changed staff, whose role opened.* What is missing is **rookie evaluation** (no
prospect model; draft capital exists in `career_arc` and nothing else does) and
**dynasty value curves**.

### ⚠️ The constraint that shapes every in-season answer

**`player_metrics_2025.json` is frozen all season and must stay frozen.** It
feeds four scored inputs, so refreshing it would move every grade for reasons
unrelated to the roster and silently invalidate every calibration on file.

The consequence is easy to miss: **the scored anchors describe LAST season for
the whole of this one.** The fix is never to thaw the frozen file. It is to ship
a **context-only current-season twin** and render both vintages, which is the
same pattern `snap_trajectory`, `qb_profile` and `gamelogs` already use.

**Both vintages are always shown. Never swapped.** "38% in 2025, 61% through W7"
says more than either number alone, and a layer that silently changes which year
it describes is the stale-data trap in a new costume.

### One closing observation

The app grades **structure** — stacks, positional shape, playoff schedule — and
it grades that well. What it has historically been thin on is **the players
themselves**: the AI saw an ADP, some outcome rates, and a matchup tier that is
now measured as the *least* reliable input in the building.

The layers added Aug 30-31 put role, deployment, talent, floor and vacancy in
front of the model. Not to change the grade. **To make the paragraph next to the
grade worth reading.**
