# Analyst Reference — What the App Measures and Why

**Purpose:** a plain-language reference for every analytical input RosterXRay
carries, why each one earns its place, and what is deliberately absent.

This is the *reference* document. `CLAUDE.md` is the *engineering* document —
it records how things were built and what broke. Read this one to understand the
analysis; read that one before changing code.

**Last updated:** Aug 31, 2026

---

## Table of contents

1. [The one idea everything hangs off: stickiness](#1-the-one-idea-everything-hangs-off-stickiness)
2. [How the two machines stay apart](#2-how-the-two-machines-stay-apart)
3. [Tier A — the inputs that carry the analysis](#3-tier-a--the-inputs-that-carry-the-analysis)
4. [Tier B — worth building next](#4-tier-b--worth-building-next)
5. [Tier C — deliberately not built](#5-tier-c--deliberately-not-built)
6. [Complete data layer inventory](#6-complete-data-layer-inventory)
7. [Skills and tooling inventory](#7-skills-and-tooling-inventory)
8. [Standing rules that prevent the recurring mistakes](#8-standing-rules-that-prevent-the-recurring-mistakes)
9. [What I would add next, and why](#9-what-i-would-add-next-and-why)

---

## 1. The one idea everything hangs off: stickiness

Every number in this app was measured by asking one question:

> **If I know last year's figure, is it still true this year?**

Same player, both season transitions (2023→24 and 2024→25), 8+ games in each
season. The result is a correlation, `r`, from 0.00 (a coin flip) to 1.00
(perfectly repeatable).

### The measured table

| Input | r | Read it as |
|---|---|---|
| QB rushing attempts / game | **0.82** | near-certain to repeat |
| Intended air yards (aDOT) | **0.83** | near-certain to repeat |
| aDOT (from air-yards layer) | 0.78 | anchor |
| Air yards share | 0.78 | anchor |
| Targets / game | 0.77 | anchor |
| WOPR | 0.75 | anchor |
| Target share | 0.73 | anchor |
| RB carries / game | 0.73 | anchor *(not yet in the app)* |
| Snap share | 0.71 | anchor |
| **Separation** | **0.66** | reliable |
| Dud rate | 0.67 | reliable |
| Usable rate | 0.65 | reliable |
| QB pass attempts / game | 0.61 | reliable |
| Passing aDOT | 0.49 | soft |
| Spike rate | 0.48 | soft |
| QB fantasy points / game | 0.38 | weak |
| Yards per target | 0.31 | weak |
| EPA per target | 0.27 | weak |
| TD per touch | 0.20 | weak |
| Catch rate (RB) | 0.10 | noise |
| **RB yards per carry** | **0.02** | **a coin flip** |
| Matchup data (FPA), RB | 0.25 | least stable input in the app |
| Matchup data (FPA), TE | 0.19 | |
| Matchup data (FPA), QB | 0.05 | |
| **Matchup data (FPA), WR** | **−0.07** | **negative** |

### What this means in one sentence

> **How much a player is used repeats. How well he did with it does not.**

Volume is a job description; efficiency is what happened. Job descriptions carry
over. Outcomes don't.

### Three consequences worth internalising

**1. The most-quoted RB stat in public analysis is worthless for projection.**
Yards per carry is `r = 0.02`. Never let a YPC figure move a verdict.

**2. WR matchup data is actively misleading.** A defense that was soft against
receivers last year is *very slightly more likely than chance* to be tough this
year. That is why the schedule is a sorter in this app and never a generator.

**3. Stickiness is NECESSARY, not SUFFICIENT.** A jersey number would score 1.00.
This table tells you *what to assume by default*. The Source Hierarchy tells you
*what overrides the default* — and rank 1 there is role **CHANGE**, which is by
definition the part that is not sticky. The two lists are complementary, not
contradictory: a confirmed role change outranks everything precisely because it
**invalidates the sticky baseline**.

### Limits — state these before quoting the numbers

- **Survivorship.** 8+ games in both seasons excludes injury years, so these are
  correlations among players who held a role two years running. True population
  stickiness is lower.
- **Range restriction** biases toward the stable middle for the same reason.
- **Two transitions only.** QB n=26 per transition is small — treat the QB column
  as directional. WR/TE n=149 and RB n=58 are solid.

---

## 2. How the two machines stay apart

There are two separate systems in the app, kept apart on purpose.

| | What it does | Who reads it | Can it move a grade? |
|---|---|---|---|
| **Scoring engine** | Produces the number and the letter | `analyzeRoster` / `analyzeRedraft` | **yes** |
| **Context layer** | Explains *why* a player is what he is | Player card + AI prompt | **no** |

### Why the wall exists

A layer that starts scoring **silently invalidates every calibration figure
recorded in `CLAUDE.md`**. Nothing errors. The numbers just quietly stop meaning
what they meant, a roster graded 8.9 in September re-grades to 8.4 in October
with no change to the players, and every share link stops being comparable.

The Ceiling Shape Layer is the cautionary tale: it shipped with a bug where
grades moved **for the wrong reason** — QBs spike far more often than WRs, so any
roster carrying three QBs got a free bonus. It looked like a working feature.

### What actually scores today

```
Best ball                              Redraft
──────────────────────────────         ──────────────────────────────
Stack loop integrity                   Lineup construction
Three-week coverage (W15/16/17)        Positional depth
Bring-back correlation quality         Bye conflicts
Positional construction                Playoff schedule (W15-17)
Orphan count and quality               Season schedule
Advance Rate Layer      ±1.25          Floor Layer            ±0.5
Ceiling Shape Layer     ±0.5
```

Everything else on this page is context. **If a change moves a grade, it is a
data decision that needs its own calibration run — never a side effect.**

---

## 3. Tier A — the inputs that carry the analysis

### 3.1 Separation · `r = 0.66` · *rank 3, talent in isolation*

**File:** `ngs_receiving_2025.json` → `sep`
**Card section:** Deployment (WR/TE)

**What it is.** Next Gen Stats puts a tracking chip in the ball and measures how
many yards of space a receiver has at the moment the pass arrives.

**Layman's version.** *Does he get open?*

**Why it is essential.** This is the **only number in the entire app that
measures talent instead of opportunity.** Everything else in the receiving block
— target share, WOPR, snap share, targets per game — measures *what the coach
gave him*. Separation measures *whether he deserves it*.

That distinction is what finds a breakout before the market does:

- **High separation on modest volume** → he is already doing the hard part. The
  volume is a coaching decision that can change in a single week.
- **Low separation on heavy volume** → he is being propped up by usage that could
  evaporate.

**Worked example.** AJ Brown posts **2.24 yards of separation — the 8th
percentile among WRs with 40+ targets** — while carrying a top-decile target
share. He is a contested-catch alpha, not a get-open alpha. That tension is
invisible in every other number on his card.

**Position medians:** WR 2.78 · TE 3.45. Read the percentile, not the raw number.

---

### 3.2 Intended air yards · `r = 0.83` · *rank 2, deployment*

**File:** `ngs_receiving_2025.json` → `iay`
**Card section:** Deployment (WR/TE)

**What it is.** How far downfield the ball is travelling when it is thrown at
him, averaged over every target — counted where it was **aimed**, whether or not
he caught it.

**Layman's version.** *Where on the field is he used?*

**Why it is essential.** Two things.

**First, it is the stickiest player input measured anywhere in this project** —
ahead of QB rushing attempts. It is sticky for the same reason aDOT is:
**deployment is a role property, not a performance one.** Where a coach lines a
receiver up and what routes he calls persist across seasons. Whether the ball
arrives does not.

**Second, it describes SHAPE, not just size.** Two receivers with identical
target counts are completely different assets:

| | Low aDOT (~6) | High aDOT (~14) |
|---|---|---|
| Route profile | slants, screens, short in-breakers | digs, posts, go routes |
| Week-to-week | steady floor | boom / bust |
| Best ball value | lower — floor is irrelevant there | **higher — variance is a feature** |
| Redraft value | **higher — a start-every-week floor** | lower |

Before this layer the app could not tell them apart.

**Worked examples.** Rome Odunze 14.1 · AJ Brown 11.6 · Travis Kelce 6.3.

---

### 3.3 Vacated targets · *rank 1, role CHANGE — the highest-value input there is*

**File:** `vacated_2026.json`
**Card section:** Team target turnover

**What it is.** Per team: the share of 2025 targets belonging to players who are
no longer on the roster.

**Layman's version.** *Who left, and how big is the hole they left behind?*

**Why it is essential.** This is **rank 1 in the Source Hierarchy** — role and
opportunity CHANGE, the most causal input in the framework — and the app had no
data file for it at all. It was the single biggest structural gap.

Lens 1 of the framework literally instructs: *"always project who absorbs market
share before ADP reflects it."* Nothing in the app could see the vacancy.

**Targets do not vanish. Somebody catches them.** Finding out who, before ADP
prices it in, is the highest-value thing analysis can do.

**2026 leaderboard:**

```
PIT  57.1%     MIA  56.6%     WAS  46.6%
NYG  42.0%     NE   37.8%     ATL  36.4%
```

**⚠️ It locates the opening. It does not name who fills it.** That stays a
judgement, and the file, the card and the AI prompt all say so — a team number
must never be allowed to read as a player projection.

**Denominator note.** The percentage is *share of the measured pool that left*,
not share of 1.00. The metrics cover drafted players only, so a team's shares do
not sum to 100%. The card prints this qualifier beneath the number, because a
percentage without its denominator is a number nobody can act on.

---

### 3.4 Career arc · *age, experience, draft slot*

**File:** `career_arc_2026.json`
**Card section:** Career arc

**What it is.** Age, seasons of experience and draft slot for 984 players, set
against the fantasy aging curve for the position.

**Layman's version.** *Is the calendar with him or against him?*

**Why it is essential.** It is the cheapest available correction to the single
most common analytical error: **projecting last year forward on a player the
calendar is working against.** A 28-year-old back and a 24-year-old back with
identical 2025 lines are not the same bet.

**The bands:**

| Position | Rising through | Peak | Decline from | Note |
|---|---|---|---|---|
| **RB** | 23 | 26 | **27** | the sharpest curve in fantasy; workload history compounds it |
| **WR** | 24 | 28 | **30** | breakout age matters early; long plateau, gentle fall |
| **TE** | 25 | 29 | **31** | latest-developing position — a 25-year-old TE is often still pre-breakout |
| **QB** | 25 | 32 | **35** | longest runway; rushing ages faster than passing |

TE running the *opposite* way from RB is why TE breakouts feel late — they are.

**⚠️ THE BANDS ARE PRIORS, NOT MEASUREMENTS.** These are published career-arc
priors, **not measured in this repo.** One season of data cannot produce an aging
curve, and a cross-sectional read is confounded by survivorship. **The age is
measured; the band around it is borrowed.** Weigh them. Never quote them as a
finding.

**Worked examples.** Travis Kelce age 36, *decline* · Carnell Tate age 21,
drafted 4th overall, *rising* · Rome Odunze age 24, *rising*.

---

### 3.5 Everything Tier A already had

These predate the Aug 31 additions but belong in the same tier.

| Input | r | Layman's version | Why it matters |
|---|---|---|---|
| **Targets / game** | 0.77 | how often is the ball thrown at him | raw volume, highly repeatable. Nothing else matters if this is low |
| **Air yards share** | 0.78 | his slice of the team's downfield yardage | identifies the deep threat even in a week he catches nothing |
| **Target share** | 0.73 | his slice of team targets | how central he is, independent of team pass volume |
| **WOPR** | 0.75 | target share + air yards share, weighted | the single best one-number opportunity summary |
| **Snap share** | 0.71 | % of offensive plays he is on the field for | route-participation proxy. A low snap share caps everything else |
| **HVT / game** | — | red-zone targets + green-zone carries | scoring equity, tracked separately from raw volume |
| **QB rush att / game** | **0.82** | does he run | **the stickiest input in football.** The part of a QB score that survives a bad passing day |
| **Snap trajectory** | — | W1-9 → W10-18 → last 4 | a season average buries role CHANGE. RJ Harvey averaged 42% and finished at 57% |
| **Teammate absence** | — | who else was on the field | a target share is a share *of* something. Malik Nabers played 4 games, inflating Wan'Dale's 29.8% |
| **Dud rate** | 0.67 | how often he busts | more stable than spike rate. Redraft cares; best ball does not |
| **Usable rate** | 0.65 | how often he is startable | the floor half of the Floor Layer |
| **Spike rate** | 0.48 | how often he wins you a week | **in best ball the more stable metric is the less useful one.** This is why the Ceiling Shape Layer is capped at ±0.5 |

---

## 4. Tier B — worth building next

### 4.1 Targets per game, printed in the AI prompt · `r = 0.77`
**Cost: one line. `tgt` and `gp` are already loaded.**
An anchor-grade number sitting in memory, currently invisible to the model.

### 4.2 Air yards share, printed in the AI prompt · `r = 0.78`
**Cost: one line. `ay_sh` is already loaded, just unprinted.**
Same story. These two are the highest value-to-effort items anywhere on this
list, and neither can touch a grade.

### 4.3 Availability rate
**What:** games played over games possible, across a career.
**Layman's:** *how often does he actually suit up?*
**Why:** every metric in this app is a **per-game rate**. A 17-game season of a
good player beats 11 games of a slightly better one, and nothing currently
expresses that. Best ball feels it hardest — an empty week is a zero you cannot
substitute out of.

### 4.4 Red-zone target share
**What:** his share of team targets inside the 20.
**Layman's:** *does he score, or just catch?*
**Why:** the framework's own Lens 1 calls red-zone work "standalone scoring
equity" and instructs tracking it separately from snap share. It is right, and
the app cannot see it. Touchdowns are where the volatility lives — a receiver who
owns the 10-yard line is a different asset from one who owns the 40.

### 4.5 Carries per game (RB) · `r = 0.73`
**Why not yet:** `build-player-metrics.py` emits no carry count. RB carries are
currently only reachable through the `car` column of `GAME_LOGS`.
**Note:** anchor-grade stickiness, and the RB equivalent of targets per game.

---

## 5. Tier C — deliberately not built

| Item | Why not |
|---|---|
| **Targets per route run (TPRR)** | **Paywalled.** The sharpest single metric in receiving analysis — it separates "the coach throws to him" from "he earns it every snap". No free routes source exists since the NFL participation feed died after 2023. **Never substitute target share for it; they answer different questions.** |
| **Offensive line rankings** | **No free per-player OL data exists** in a rankable form. Pressure rate allowed is team-level and confounded by the QB — a scrambler makes his line look better than it is. |
| **Coverage-scheme splits (man vs zone)** | Paywalled, and the per-player per-season sample is small enough to be noise. |
| **Player-level motion splits** | The `motion_2025.json` layer is **PLAY-level** — it says the offense used motion on that snap, never which player moved. Published player-level splits (PFF, Fantasy Points Data) are paywalled. Treat the app's number as a screen, never as a citable figure. |

---

## 6. Complete data layer inventory

### Scored — FROZEN all season

| File | Feeds | Why frozen |
|---|---|---|
| `player_metrics_2025.json` | `hvt_pg` (Naked RB gate), `usable_rate` (Advance Rate + Floor), `spike_rate` + `nuclear_rate` (Ceiling Shape) | Refreshing it weekly would move every grade for reasons unrelated to the roster, and silently invalidate every recorded calibration. Also: `spike_rate` on four games is noise. |

### Context — refreshes WEEKLY in season

| File | Answers |
|---|---|
| `snap_trajectory_2026.json` | Is his role growing or shrinking *right now* |
| `qb_profile_2026.json` | Rushing volume, pass attempts, passing aDOT |
| `gamelogs_2026.json` | Week-by-week output, as a chart |

### Context — ANNUAL

| File | Answers | Rank |
|---|---|---|
| `ngs_receiving_2025.json` | Does he get open, and where is he used | 2 & 3 |
| `career_arc_2026.json` | Is the calendar with him | — |
| `vacated_2026.json` | Who left, how big is the opening | **1** |
| `player_efficiency_2025.json` | What did he do per touch | 4 |
| `airyards_2025.json` | RB aDOT, team RB air yards, QB dropback drain | 4 |
| `motion_2025.json` | Does this offense use motion (team-scheme screen) | — |
| `sos_2026.json` | Full-season slate difficulty, and the change | 5 |
| `snap_trajectory_2025.json` | Prior-season role direction | 1 |
| `qb_profile_2025.json` | Prior-season QB volume | 2 |
| `gamelogs_2025.json` | Prior-season week-by-week | 4 |

### The split refresh cadence, in one line

> **Anything that SCORES is frozen. Anything that is CONTEXT may refresh.**

Enforced by guard 15, not left as a convention.

---

## 7. Skills and tooling inventory

### Skills

#### `/scout` — `.claude/skills/scout/SKILL.md`

**Trigger:** naming a player and asking what the data says. Also fires on
*"scout X"*, *"is X elite"*, *"should I draft X"*, *"what do the numbers say
about X"*, or asking for a breakdown / profile / read / scouting report.

**What it does:** returns an **elite / volume-mid / contingent / bad** verdict
against his ADP, read from the real app module rather than from memory.

```
node scripts/scout.mjs "Player Name" [--format standard|superflex|yahoo]
```

**The nine-step framework it runs:**

```
[0] Team check          — a MOVED player's numbers describe a job he left
[1] Opportunity         — the only tier that carries to next season
[2] The tiebreaker      — POSITION-SPECIFIC (see below)
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
| RB | **HVT/game + snap share**, plus the receiving tier (65+ rec elite, 40-64 real role, under 40 neither) | air yards share is `r=0.26` for backs and discriminates nothing |
| QB | **Rush attempts/game**, then pass attempts/game | QB points/game is `r=0.38`. Never project a QB from last year's points |

**It says three things out loud every time:** every number is 2025 · efficiency
explains the past and never forecasts · a rookie returns a stated reason, never
an empty answer or a guess.

---

### CLI tools

| Command | What it does |
|---|---|
| `node scripts/grade-cli.mjs <roster> --tournament <key>` | Grade a roster headlessly. **⚠️ `--mode redraft` is silently ignored — the flag is `--redraft`.** Check the `mode` field in the output before trusting a CLI grade. |
| `node scripts/scout.mjs "Name" [--format …]` | The data behind `/scout` |
| `node scripts/report-stale-news.mjs [date]` | **Run this before any draft.** Lists players whose every note is past the 45-day re-validation rule. Takes a date argument, so you can ask "what will be stale on Sept 5" and pre-empt it. |
| `bash scripts/refresh-inseason.sh [season]` | The weekly job. Two downloads, seconds. No-ops safely before Week 1. |
| `python3 scripts/refresh-adp.py [--source underdog\|ffc] [--table data\|yahoo] [--apply]` | ADP drift report. **Reports by default, never auto-applies.** |
| `npm test` | All 22 guards, 401 assertions |
| `npm run build` | Vite production build |

### Data builders

```
build-player-metrics.py     the scored file — regenerate with extreme care
build-ngs-receiving.py      separation + intended air yards
build-career-arc.py         age / experience / draft slot
build-vacated.py            per-team target turnover
build-snap-trajectory.py    W1-9 vs W10-18 role direction
build-qb-profile.py         the three sticky QB inputs
build-gamelogs.py           week-by-week output
build-efficiency.py         per-touch efficiency ranks
build-airyards.py           RB aDOT, team RB air yards, dropback drain
build-motion.py             team-scheme motion split (PLAY-level)
build-sos.py                full-season schedule strength
```

### The 22 guards

Every one exists because something broke. Grouped by what they protect:

| Group | Guards |
|---|---|
| **Name resolution & ADP** | `findplayer` · `adp-delta` · `alias-adp-sync` · `table-coverage` · `no-duplicate-keys` |
| **Roster ingestion** | `extraction-filters` · `extraction-blocks` · `yahoo-share` · `loose-json` |
| **Prose safety** | `no-quoted-negations` · `stale-verdicts` · `player-data` |
| **Scoring containment** | `snap-trajectory` · `refresh-cadence` · `floor-layer` · **`context-layers`** |
| **Scoring correctness** | `playoff-boosts` · `archetypes` |
| **UI** | `player-card` · `color-roles` · `disclosure` · `player-lookup` |

---

## 8. Standing rules that prevent the recurring mistakes

These are the failures that have recurred. Each one cost a debugging session.

### On data

1. **A metrics row carries the OLD team.** `player_metrics_2025.json` stores the
   team a player *played for*, not the team he is on. Check `team` against
   `ADP_DATA` before quoting any 2025 number about a 2026 mover.
2. **Never mix percentile populations.** A rank printed under a population label
   that does not describe it is worse than no rank. NGS ranks against 40+ targets;
   the card ranks against draftable/8-game. They never share a table.
3. **Two scales can live in one file.** `vacated_pct` is percent units (46.6);
   `gone[].tgt_sh` is a fraction (0.247). A `* 100` on the wrong one rendered
   **4660%**.
4. **A borrowed prior is not a finding.** Say so wherever it renders.
5. **`ADP_DATA` takes values only from a best-ball source.** A redraft quote does
   not transfer — the offset ranges from 15 to 62 picks and is not constant.
6. **A screenshot of your own draft board beats any scrape.**

### On prose

7. **`SITUATIONS.trendNote` and `RECENT_NEWS` are pasted verbatim into the AI
   prompt. Anything in them is quotable.** Write affirmatively, present tense,
   about what is true now. **Never quote a superseded claim** — the Diggs
   "unsigned" bug came back *because* the correction quoted it.
8. **Always write the year.** A bare "Aug 6" does not parse and the entry ages
   from an older date instead.
9. **A future date is never the note's currency.** A court date, a contract date
   and a draft date all parse identically to an update stamp.
10. **Search summaries carry no dates.** Check every player-team claim against
    `ADP_DATA` before writing it.

### On code

11. **A filtered name must never be silent.** Junk reaching `notFound` costs one
    dismissable row. A name dropped by a filter costs a player out of the grade
    with no evidence it happened.
12. **One definition or none.** This repo has hit the duplicate-definition class
    **five times** — tier/score, competitive balance, `posColor`, position
    palettes, playoff boosts.
13. **A label that disagrees with its own number reads as confirmation** and is
    worse than no label.
14. **Every disclosure panel is a judgement about reading FREQUENCY, not size.**
    The stack matrix is the tallest block on the page and stays open.
15. **`App.jsx` and `App.jsx.jsx` must be byte-identical after every edit.**

---

## 9. What I would add next, and why

Ranked by value per unit of effort.

### 1. Print targets/game and air yards share in the AI prompt — *one line each*
Two anchor-grade numbers (`r` 0.77 and 0.78) already loaded in memory and
currently invisible to the model. Cannot move a grade. **This is free value and
should be done first.**

### 2. Availability rate — *half a day, free data*
The one dimension nothing in the app expresses. Every metric is per-game;
nothing says "he plays 17". In best ball an empty week is an unsubstitutable
zero, and this is the only layer that would catch it.

### 3. Red-zone target share — *half a day, free data*
The framework explicitly asks for it (Lens 1, "standalone scoring equity") and
the app cannot see it. Touchdowns are where the volatility lives.

### 4. Carries per game — *needs a builder change*
Anchor-grade at `r = 0.73` and the RB counterpart to targets per game.
**⚠️ Requires touching `build-player-metrics.py`, which is the SCORED file.** A
regeneration would re-derive `hvt_pg`, `usable_rate` and `spike_rate` over a pbp
release that may have been revised — so this needs a full calibration run and
should not be bundled with anything else.

### 5. Decide whether separation should SCORE — *a real data decision*
At `r = 0.66` it is more stable than `spike_rate` (0.48), which the Ceiling Shape
Layer already trusts enough to score. The argument for scoring it is that a
roster full of players who cannot get open is genuinely worse than one full of
players who can, and no current input sees that.

The argument against is that separation on 40 targets is thin, the population is
WR/TE only (so it would systematically ignore half a roster), and it would move
every grade. **If it ever ships, it ships as its own change with its own
calibration run and its own cap — never bundled.**

### 6. Structured dates on `RECENT_NEWS` — *maintenance, not a feature*
Currently parsed out of prose. Parsing is reversible and guarded, but 63 of 84
`RECENT_NEWS` entries and only 32 of 132 `trendNote`s carry a parseable date. A
structured field would make freshness computable rather than inferred.

### 7. The `reason`-shaped `SITUATIONS` gap — *a silent hole no guard catches*
128 entries are `trendNote`-shaped, 4 are `reason`-shaped, and
`buildPlayerNews` reads `trendNote` only. Those 4 never render on the card no
matter how fresh they are. One remains unconverted. Either finish the additive
pass or teach `buildPlayerNews` to fall back to `reason`.

---

### One closing observation

The app grades **structure** — stacks, positional shape, playoff schedule — and
it grades that well. What it has historically been thin on is **the players
themselves**: the AI saw an ADP, some outcome rates, and a matchup tier that is
now measured as the *least* reliable input in the building.

The layers added Aug 30-31 put role, deployment, talent, floor and vacancy in
front of the model. Not to change the grade. **To make the paragraph next to the
grade worth reading.**
