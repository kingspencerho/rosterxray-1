# Analyst Reference — What the App Measures and Why

**Purpose:** a plain-language reference for every analytical input RosterXRay
carries, why each one earns its place, and what is deliberately absent.

This is the **analysis** document. `CLAUDE.md` is the **engineering** document —
it records how things were built and what broke, in date order.
`USER-PERSONAS.md` is the **product** document — who is on the other side of the
screen. Read this one to understand the analysis, that one before changing code,
and the personas before changing what the app shows, hides, orders or names.

> ## 📖 **WANT THE PLAIN-ENGLISH VERSION? READ [METRICS-PLAIN-ENGLISH.md](METRICS-PLAIN-ENGLISH.md).**
> **Every metric grouped by the QUESTION it answers, in Source Hierarchy order, with a real
> player attached to each one** — the meaning, the argument, the worked example and the trap,
> with the File/Field/Surfaces machinery stripped out.
> ⛔ **It is GENERATED from this file** (`python scripts/build-plain-english.py`), so it cannot
> drift and it cannot disagree. **This file stays the single source of truth; §5 wins on any
> conflict.** Rebuild it whenever §2, §3 or an entry in §5 changes.

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
| §14a Open gaps | **prunable** | a handoff. Delete a gap when it closes, like §11 |

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
| [Expected fantasy points](#expected-fantasy-points--r----rank-2) | — | 2 | A | live | no |
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
| **Defence blitz rate** | **0.646** | **reliable** |
| **Defence two-high rate** | **0.559** | **soft** |
| **Defence box count** | 0.532 | soft — but see the entry: it discriminates nothing |
| **Defence man rate** | **0.462** | **soft** |
| Man rate faced | 0.335 | weak |
| Yards per target vs zone | 0.294 | weak |
| Yards per target vs man | 0.235 | weak |
| **Coverage-scheme splits (man/zone edge)** | **0.161** | **coin flip** |
| Matchup data (FPA) — RB | 0.245 | least stable input in the app |
| Matchup data (FPA) — TE | 0.192 | |
| Matchup data (FPA) — QB | 0.049 | |
| **Matchup data (FPA) — WR** | **−0.073** | **negative** |

### ⭐⭐ THE FOUR DEFENCE-SIDE ROWS ARE NEW (Sep 17, 2026) AND THEY ARE NOT THE COIN FLIP

⛔⛔ **DO NOT CONFUSE THEM WITH `Coverage-scheme splits (man/zone edge) 0.161`.** That row
measures A RECEIVER'S yards-per-target EDGE against man versus zone. **These four measure what a
DEFENCE DOES** — how often it plays man, how often it sits two-high, how often it sends five.
**Different question, different answer: `0.462` against `0.161`, roughly three times as
repeatable.** The `0.161` finding is correct and it never said anything about this.

**Measured the same way as everything else in this table** — same team, both transitions, from the
nflverse `pbp_participation` release (`defense_man_zone_type`, `defense_coverage_type`,
`number_of_pass_rushers`, `defenders_in_box`). 32 defences qualify in every season at a 100-play
gate. The defence is derived from the game id and `possession_team`; participation carries no team
column, so that derivation IS the join.

⭐ **Blitz rate at `0.646` sits in the reliable band with TPRR (`0.674`), dud rate (`0.667`) and
separation (`0.663`).** It is a legitimate input by this file's own bar.

⛔⛔ **BOX COUNT IS THE CAUTIONARY ONE AND IT IS WHY SPREAD MUST BE CHECKED BESIDE `r`.** It
repeats at `0.532`, and the entire league sits between **5.99 and 6.49 defenders, sd `0.11`**.
**It is sticky and it discriminates nothing.** A jersey number would score 1.00 — the rule this
file already states, caught in the wild.

**The three that do have spread, 2025:**
```
man rate    19.0% (MIN) to 44.4% (DEN)   mean 31.8%  sd 7.5%
two-high    31.8%        to 59.1% (MIN)  mean 42.9%  sd 6.5%
blitz       17.6%        to 46.2% (MIN)  mean 27.4%  sd 5.7%
```
⭐ **MIN is the outlier on all three at once** — least man, most two-high, most blitz. That is one
identifiable scheme, and it is the defence Winks describes in prose as keeping backs in to block.
**Two independent methods naming the same team is the closest thing to corroboration here.**

⚠⚠ **AVAILABILITY IS THE BLOCKER, NOT THE MEASUREMENT.** `pbp_participation_2026.parquet`
**returns 404** — probed Sep 17 2026. The 2023, 2024 and 2025 files exist. **So this can only ever
be a PRESEASON/ANNUAL layer until nflverse publishes the current year**, and a coordinator change
invalidates a team's row the moment it happens. ⚠️ Re-probe before building; a
data-availability claim ages exactly like a player verdict, which is R19.

⚠️ **AND STABILITY IS NOT USEFULNESS.** These say a defence's tendency repeats. **Nothing here
measures whether knowing it improves a fantasy decision** — that is a second study, against
player outcomes, and it has not been run.

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

### ⭐⭐ §2b · THE IN-SEASON CROSSOVER — when THIS season beats LAST season (Sep 13, 2026)

**His question: the app grades matchups off 2025 FPA. Now that games are being played, should it use
2026 instead?** Measured on the 2025 game logs — points allowed to draftable players, by defense, by
position — asking whether FPA through week N predicts the REST of that same season.

| pos | last year *(banked §2)* | W1-3 | W1-4 | W1-5 | W1-6 | W1-8 |
|---|---|---|---|---|---|---|
| QB | `0.049` | **0.369** | 0.332 | 0.351 | 0.329 | 0.266 |
| RB | `0.245` | -0.123 | -0.057 | 0.115 | 0.148 | 0.101 |
| WR | `-0.073` | **0.531** | **0.615** | **0.569** | 0.418 | **0.521** |
| TE | `0.192` | 0.281 | 0.314 | 0.275 | **0.426** | 0.322 |

⭐⭐⭐ **WR IS THE HEADLINE AND IT INVERTS COMPLETELY.** **It is the WORST cross-season input in this
app at `-0.073` — literally negative — and one of the best WITHIN a season at `0.531` after three
games.** ⭐ **Same metric, opposite verdict, depending which question is asked.** **A wideout gets
targeted whether his team is ahead or behind; game script does not erase his opportunity.**

⛔⛔ **STATE THIS BAR BEFORE QUOTING ANY NUMBER ABOVE: with `n = 31` defenses, an `r` must reach about
`0.355` before it is distinguishable from noise.** **So RB fails on BOTH sides — `0.245` and `0.148`
are each below it.** ⚠️ **An earlier draft of this finding read *"last year wins for RB,"* which is
WRONG and implies last year works. It does not. NEITHER predicts.** **TE at three games (`0.281`) is
also under the bar, though still better than the `0.192` it replaces.**

### ⭐⭐⭐ WHY RUNNING BACKS BEHAVE THIS WAY — a real mechanism, not a data quirk

**A run defence is genuinely STABLE.** It is mostly linemen and linebackers, units that turn over
slowly — which is exactly why RB is the STICKIEST of the four across seasons. ⛔ **But "fantasy points
allowed to a running back" does not measure the defence. It measures THE GAME.** **A team that is
winning runs the clock out and its back sees 25 carries; a team that is losing throws and the same
back sees 8.** ⭐ **So the underlying thing is stable and the instrument is noise.**
⚠️ **A second problem stacks on it: a defence’s RB figure rests on ~`1.79` draftable backs per game
against a receiver’s `2.29`** — the thinnest sample of any skill position.

### ⛔⛔ THE TEST I APPLIED WAS THE WRONG ONE, AND HIS CATCH IS THE RULING

**I recommended leaving the RB pill on 2025 because current-season data does not FORECAST better.**
**His answer:** *"i still want to know whats happening currently during my season... i would rather
show it than rely on last years data."*

> ## ⭐⭐⭐ **HE IS RIGHT, AND THE REASON IS THAT THE PILL DESCRIBES — IT DOES NOT FORECAST.**
> ## **A correlation asks whether the RANKING PERSISTS. It never asks whether the number DESCRIBES THE TEAM THAT EXISTS NOW.**

**Those come apart exactly where it matters: a defence that lost three starters in August is a
different defence, and last season’s number describes a team that no longer exists.** ⛔ **Judging a
descriptive display by a predictive test is the same class of error as the leverage panel printing
"ownership" for a projection — right instrument, wrong question.**

### The gates that fall out, and why there is only ONE

```
QB · WR · TE    3 games      the current season becomes the better input almost at once
RB              4 games      SAMPLE PARITY, not predictiveness — 1.79 backs/game against
                             a receiver 2.29, so RB needs ~4 games for the same number
                             of observations WR has at 3
```

⚠️ **PER-POSITION GATES WERE REJECTED AND HIS CATCH IS WHY.** **Separate gates put up to THREE
VINTAGES ON SCREEN AT ONCE** — at Week 4 the WR and QB pills would read 2026 while TE read 2025 —
**which is unexplainable in a one-line footer.** ⭐ **One gate, and TE is carried at three games
because the question is "is it BETTER than what it replaces" (`0.281` vs `0.192`), not "is it
significant." Those are different bars, and conflating them is what produced the error above.**

### ⭐ HIS RULING ON PLACEMENT — no flag on the pill

**I proposed stepping the RB pill back with a line reading *"run matchups barely repeat — the weakest
read here."* He rejected it:** *"that doesnt invite users to question why this is the case?... why
give them a reason to doubt when it was never an issue in the first place?"*
⭐⭐ **He is right, and the sharper reason is that the line was a VERDICT rather than PROVENANCE.**
**Every existing disclosure in this app says what a number IS and where it came from — `2025 data`,
`not schedule-adjusted`, `480 simulated rosters`. None passes judgement on whether a number is any
good.** ⛔ **A verdict invites "says who?" and needs a paragraph of statistics to defend, in the one
place a reader has no patience for one.**
✅ **DECIDED: the RB pill renders exactly like the others — no dimming, no caveat, no flag. The vintage
stamp in the existing results footer (`FPA: 2025 Rotowire`, App.jsx ~18059) becomes dynamic and carries
the whole disclosure. The mechanism above lives HERE and in the `<Explainer>` that already sits directly
above `<MatchupLegend />` — findable by the reader who asks, invisible to the one who does not.**

### ⚠️ Limits — state these before quoting the crossover table

- **Points allowed to DRAFTABLE players only**, which is what `gamelogs_2025.json` covers. A proxy for
  true FPA, not true FPA.
- **One season**, against year-over-year figures measured across two transitions.
- **`n = 31` defences**, hence the `0.355` bar.
- ⚠️ **The declining tail is partly an ARTIFACT** — as N grows the "rest of season" target shrinks and
  gets noisier. **Do NOT read `W1-4` as optimal.**
- **Raw, not schedule-adjusted, on both sides.** Partly cancels; not entirely.

---

### ⛔⛔ §2c · SCHEDULE-ADJUSTED FPA WAS BUILT, MEASURED AND REJECTED (Sep 17, 2026)

**He approved a full recalibration of the matchup layer**, on the strength of the caveat this file
and CLAUDE.md have both carried since Aug 25:

> *"These are RAW points allowed, NOT schedule-adjusted. A defence that drew Kelce, Bowers and
> LaPorta looks soft at TE for reasons unrelated to the defence."*

**The caveat is true. Correcting it does not work, and the measurement says so clearly enough that
no code was changed.** ⛔ **90 grades byte-identical, because nothing shipped.**

### THE TEST, and it is the same one §2b runs

For each season, position and cut-week N, over the same draftable population §2b used:

```
RAW(D)    mean points allowed per game by defence D, weeks 1..N
ADJ(D)    the same, minus each opponent offence's own strength at that position,
          LEAVE-ONE-OUT so D's own games never feed the baseline it is corrected against
TARGET    RAW points allowed per game by D, weeks N+1..18, same season
```

⛔ **THE TARGET IS RAW ON PURPOSE.** A manager's points are raw. The pill answers *"how many points
will my guy score against this defence"*, not *"how good is this defence in the abstract"* — and
scoring the target adjusted would be grading the adjustment against itself.

### ✅ THE HARNESS REPRODUCES §2b's PUBLISHED TABLE EXACTLY, which is what earns it a verdict

```
pos   §2b W1-3   mine    §2b W1-4   mine    §2b W1-6   mine
QB      0.369    0.370     0.332    0.332     0.329    0.329
RB     -0.123   -0.123    -0.057   -0.057     0.148    0.148
WR      0.531    0.531     0.615    0.615     0.418    0.418
TE      0.281    0.281     0.314    0.314     0.426    0.426
```

⭐ **Every value to three decimals.** A harness that cannot reproduce the baseline has no standing to
overturn it — the same discipline `build-fpa-current.py` used when it validated against the Rotowire
table it replaces at `r = 0.994-0.999`.

### ⛔⛔ THE VERDICT: EVERY POSITION'S ANSWER FLIPS SIGN BETWEEN ONE SEASON AND THREE

Measured on 2025 alone, the adjustment looks like a major win at TE and a major loss at RB:

```
2025 only, delta (adjusted r minus raw r)
        cut 3    cut 4    cut 5    cut 6    cut 8
TE     +0.229   +0.227   +0.248   +0.177   +0.083     <- looks decisive
RB     -0.125   -0.154   -0.145   -0.180   -0.135     <- looks decisive, other way
WR     -0.083   -0.064   -0.035   -0.050   -0.037
```

**TE at cut 3 goes from `0.281` — under the `0.355` noise bar — to `0.510`, comfortably over it. On
one season that is a shipping result, and it is exactly the position the caveat names.**

Pooled over 2023-25 it evaporates:

```
pooled, three seasons        cut 3    cut 4    cut 5    cut 6    cut 8
TE   delta                  +0.051   +0.040   +0.077   +0.029   -0.037
RB   delta                  -0.028   +0.028   +0.029   +0.034   +0.066
WR   delta                  -0.035   -0.035   +0.017   +0.049   +0.052
QB   delta                  -0.061   -0.025   -0.026   +0.019   +0.030
                     11 cells help by >0.02 · 7 hurt by >0.02 · 2 neither
```

⭐⭐⭐ **THE PER-SEASON SPREAD IS FOUR TO EIGHT TIMES THE EFFECT.** That is the whole finding:

```
TE delta, cut 3     2023 -0.211   2024 +0.134   2025 +0.229      swing 0.44
RB delta, cut 6     2023 +0.030   2024 +0.253   2025 -0.180      swing 0.43
QB delta, cut 3     2023 -0.208   2024 -0.052   2025 +0.075      swing 0.28
```

**A quantity whose sign depends on which season you measured it in is not an effect.** ⛔ **And note
which season would have been picked: 2025, because that is the season §2b used and the one on disk.
Measuring only it produces "adjust TE, it is worth +0.23" — a scored change to every matchup pill in
the app, resting entirely on one year.** ⭐ **This is the sample-of-one rule landing on a
CALIBRATION rather than on a claim about a corpus.**

### ⭐ WHY IT FAILS, and it is NOT that the confound is imaginary

The confound is real — a defence genuinely does draw an easier or harder set of pass-catchers. **The
correction fails because it is estimated from the same tiny sample it is correcting.** At cut 3 an
opponent's baseline rests on two games, leave-one-out, so the app would be subtracting one noisy
number from another and calling the result cleaner. **At `n = 32` defences and three to eight games,
the noise the adjustment ADDS is the same size as the confound it REMOVES.**

⚠️ **A better estimator was not built, and here is why that does not change the verdict:** a
two-way iterative fit or a ridge shrink would reduce the added noise, not the 0.43-swing
season-to-season instability, because that instability is in the DATA rather than in the estimator.
Nothing recoverable from three to eight games bridges it.

### ⛔⛔ THE SECOND FINDING, AND IT IS LARGER THAN THE FIRST: §2b's HEADLINE IS ONE SEASON AND DOES NOT REPLICATE

§2b's Limits block already says *"one season"*. **Nobody had measured what that costs.** On the same
draftable population, raw FPA through week 3 predicting the rest of that season:

```
WR    2023 +0.121    2024 -0.230    2025 +0.531     pooled  0.141
TE    2023 -0.140    2024 +0.118    2025 +0.281     pooled  0.087
RB    2023 +0.157    2024 -0.020    2025 -0.123     pooled  0.005
QB    2023 +0.245    2024 +0.221    2025 +0.370     pooled  0.279
```

⛔ **`WR 0.531` is the three-star headline of §2b — *"one of the best within a season"* — and 2024
is `-0.230`.** **Pooled it is `0.141`, well under the `0.355` bar this file states beside it.** ⭐
**QB is the only position whose sign is stable across all three seasons, and it never clears the bar
either.**

> ## ⚠️ WHAT THIS DOES **NOT** DO: IT DOES NOT PULL THE LIVE FPA LAYER.
> **His ruling already decided that on other grounds, and the ruling is untouched:** *"i still want
> to know whats happening currently during my season."* ⭐ **THE PILL DESCRIBES, IT DOES NOT
> FORECAST** — a defence that lost three starters in August is a different defence, and last
> season's number describes a team that is gone. **That argument never depended on the correlation,
> which is precisely why it survives the correlation not replicating.**
>
> ⛔ **What must change is how the NUMBER is quoted.** Per the provenance rule, MEASURED carries its
> `n`: **`WR 0.531` is `MEASURED, one season`, not a property of the metric.** Do not cite the §2b
> table as evidence that live FPA forecasts better. Cite his ruling, which is what the layer
> actually stands on.

### Reproduce

```
curl -sSL -o wk2023.csv https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2023.csv
python scripts/measure-schedule-adjustment.py --draftable          # three seasons
python scripts/measure-schedule-adjustment.py 2025 --draftable     # reproduces the §2b table
```

⚠️ **It imports `points()` and `normalize()` from `build-fpa-current.py` rather than retyping them.**
A calibration that scores differently from the builder it is judging measures the gap between two
scoring functions — the duplicate-definition class, pointed at a measurement instead of at code.

---

### ⭐⭐ §2d · THE ROLLING WINDOW — measured, and the three metrics give three different answers (Sep 17, 2026)

`scripts/measure-rolling-window.py`. **NOTHING SHIPPED YET — no App.jsx, no `grading/data`, no
builder changed.** Team trends are context only, so none of this can move a grade; what it can do
is stop the panel printing a worse number than it has to.

**The question.** `build-teamtrends.py` computes PROE, neutral-script pace and the defensive funnel
PER SEASON, and its gates need roughly 300 / 200 / 350 plays — about week 5, week 5 and week 10. So
for the first month the app has no current-season figure and **falls back to last season entirely.**
A rolling window of the last K games is never empty: in week 2 it is two games of this season and
four from the end of last.

### ✅ THE COLLECTOR REPRODUCES THE SHIPPED BUILDER — 96 of 96 values

32 teams x 3 metrics against the committed `teamtrends_2025.json`, zero mismatches, asserted by
`--selftest`. ⭐ **Same discipline §2c used and the reason its verdict was trusted: a harness that
cannot reproduce the thing it is judging is measuring its own reimplementation.** The neutral-script
definition, the pace bounds and `fnum()` are IMPORTED from the builder rather than retyped.

### The test

```
PRIOR     the metric over all of season S-1
TODATE    the metric over weeks 1..N of season S          <- what the app uses past the gate
ROLL(K)   the last K team-games ending at week N, crossing into S-1 as needed
TARGET    the metric over weeks N+1..18 of season S
```

⛔ **The target is the REST OF THE CURRENT SEASON** — not next season, and not the full season,
because including weeks 1..N would let TODATE predict itself.

### ⭐⭐ PROE — a rolling 6-game window beats the prior-season fallback in ALL THREE SEASONS, but only early

```
roll6 minus prior          2023     2024     2025    seasons won
week 2                   +0.033   +0.041   +0.120       3 of 3
week 3                   +0.047   +0.067   +0.247       3 of 3
week 4                   +0.112   -0.034   +0.315       2 of 3
week 6                   +0.188   -0.055   +0.409       2 of 3
week 8                   +0.098   -0.099   +0.400       2 of 3
```

⭐ **Weeks 2 and 3 are the only cells where ANY predictor beats `prior` in all three seasons, and
`roll6` is the only predictor that does it.** That is exactly the window where the app currently has
nothing and shows last season. `todate` manages only 2 of 3 at every cut, and `roll10` is 1 of 3 at
week 2 — **a six-game window is doing the work, not "rolling" in general.**

⚠️ **Read the size honestly: two of the three margins at week 2 are `+0.03` and `+0.04`, well inside
what a difference of two `r` values can produce by chance at `n = 32`.** **The replicated DIRECTION
is the finding; the pooled `+0.065` is carried mostly by 2025**, where `prior` collapses to `0.231`
because the 2024-to-2025 PROE relationship was unusually weak.

⛔ **From week 4 on there is no stable winner** — 2024 flips to `prior` while 2023 and 2025 stay with
the current season. Every predictor clears the `0.349` bar at most cuts, so PROE is genuinely
predictable; the question is only which window, and past week 3 the answer depends on the season.

### ⛔⛔ PACE — THE CURRENT SEASON LOSES TO LAST SEASON IN 15 OF 15 CELLS

```
todate minus prior         2023     2024     2025    seasons won
week 2                   -0.054   -0.208   -0.220       0 of 3
week 3                   -0.076   -0.211   -0.231       0 of 3
week 4                   -0.116   -0.232   -0.339       0 of 3
week 6                   -0.027   -0.129   -0.219       0 of 3
week 8                   -0.074   -0.156   -0.247       0 of 3
```

**Every season, every cut, without exception.** `prior` runs `0.34-0.57`; `todate` runs `0.17-0.41`.
Rolling windows land between them and beat `prior` only at weeks 2-3, and only in 2 of 3 seasons.

⚠️ **THE OBVIOUS OBJECTION IS THIN SAMPLES, AND IT DOES NOT EXPLAIN IT.** At week 2 a team has very
few neutral snaps, so `todate` losing there proves little. **But the app does not use `todate` at
week 2 — it uses it from the gate at ~week 5.** At weeks 6 and 8, where the sample is at or past
that gate, `prior` still wins 3 of 3 and 3 of 3.

> ## ⛔ SO THE SHIPPED BEHAVIOUR SWITCHES TO A WORSE NUMBER, ON THIS TEST.
> **Neutral-script pace is a slow-moving team property. Last season measures it on a full year;
> half a season measures it on less, in a sample bent by whatever game scripts happened.**

### ⛔⛔ FUNNEL — NOTHING PREDICTS IT, AND THE SIGN FLIPS BY SEASON

```
pooled          week 2   week 3   week 4   week 6   week 8
prior           -0.064   -0.052   -0.043   +0.001   +0.007
todate          -0.058   -0.137   -0.022   +0.050   +0.086
roll10          -0.186   -0.263   -0.150   -0.105   -0.024
```

**Not one cell clears the `0.349` bar and most are negative.** Per season it is worse than the
pooled means suggest: `todate` at week 6 is **`+0.422` in 2023 and `-0.304` in 2024**.

⭐ **This is §2c's finding on a different layer.** A defence's pass-minus-rush EPA gap through week N
carries essentially no information about its gap over the rest of that same season. ⚠️ **The panel
prints `pass funnel` / `run funnel` labels off exactly this number**, and a reader will act on a
label as though it forecasts.

### ✅✅ HIS RULING, Sep 17 2026 — OPTION B SHIPPED: PACE ONLY

**He was given three options and chose B: change pace, leave pass rate and the funnel alone.**

⭐ **The implementation is not "use last season" — it is USE THE COMPLETED SEASON.** `COMPLETE_TRENDS`
is derived from `_meta.season_complete`, so the moment the current season finishes, pace comes from
it. **That is the same rule rather than an exception to it**, and it is what keeps the change from
quietly becoming a permanent pin to an ageing year.

⚠️ **PACE HAD BEEN RIDING ALONG WITH PASS RATE, WHICH IS WHY THIS WAS INVISIBLE.** `pickTrend` chose
ONE vintage for the whole offence half, gated on `offReady` — *does this team have a PROE value*. So
the moment a team cleared the 300-play PROE gate around week 5, **pace switched to the live season
too, on whatever sample it happened to have.** Nothing named pace in that decision.

⛔ **SO PACE NOW CARRIES ITS OWN VINTAGE LABEL.** Pass rate can read 2026 while pace reads 2025 on
the same line, and the render names both. The existing comment there already warned that taking one
vintage for a whole half "can name a season that did not produce the number beside it" — **this
change is the case that warning was written for.**

✅ **Verified: 90 grades BYTE-IDENTICAL** against a pristine worktree (15 tournaments x 5 fixtures
plus 3 leagues x 5) — team trends are context only and the calibration is the proof, not the claim.
**42 guards green, mirror identical, LF preserved, `vite build` clean.**

⚠️ **IT IS INERT TODAY AND THAT IS EXPECTED.** At week 1 nothing clears a gate, so both halves
already fell back to 2025 and the rendered panel is unchanged — verified in a browser: every
tendency line reads `2025 season`, 0 sub-32px targets, no console error. **The change bites at
about week 5.** Guard 39 therefore proves it BEHAVIOURALLY, extracting `pickTrend` with
`new Function` and running it against a live-shaped current season the committed data cannot
produce — the technique guards 29 and 41 adopted after a string-match sabotage slipped through.

**6 sabotages, all caught:** pace falling back to the live season, `COMPLETE_TRENDS` pinned to the
prior season, pace borrowing the offence half's vintage, the pace vintage dropped, an absent team
silently inheriting live pace, and the reader not being told.

⛔ **NOT SHIPPED, on his call: the pass-rate rolling window and the funnel wording.** Both findings
stand as recorded above; neither was acted on.

### ⛔ WHAT WAS NOT DONE, AND WHY IT IS HIS CALL

**No behaviour changed.** Two of these findings argue for changing what vintage the panel prints,
and that runs straight into his standing ruling on the matchup pill:

> ⭐⭐⭐ **THE PILL DESCRIBES. IT DOES NOT FORECAST.** *"i still want to know whats happening
> currently during my season."*

**That ruling beat a predictive argument once already, and it was the right call.** It may well
cover pace too — a reader asking *"is this offence playing fast this year"* is asking a descriptive
question, and answering it with last season's number is the stale-data trap wearing a correlation.

⚠️ **The honest distinction, and it is not decisive either way:** the FPA pill is labelled as a
description of a defence, while the pace and PROE lines are read to anticipate an upcoming game,
which is forecasting. **That is an argument, not a measurement, so it does not get to overrule him.**

### Reproduce

```
curl -sSL -o pbp_2025.csv.gz https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2025.csv.gz
python scripts/measure-rolling-window.py --selftest      # 96/96 against the shipped builder
python scripts/measure-rolling-window.py                 # needs 2022-2025 for three prior-season pairs
```

⚠️ **THE OFFSEASON SITS INSIDE EVERY ROLLING WINDOW.** A team that changed coordinators is two
teams and `roll(K)` averages them. **Historical coordinator data does not exist in this repo**, so
this cannot be split by continuity — which means **a rolling win is a win DESPITE that confound**,
and a rolling loss does not prove the window is wrong.

---

### ⛔ §2e · NEUTRAL-SCRIPT USAGE — measured and rejected, and it completes a pattern (Sep 17, 2026)

`scripts/measure-neutral-usage.py`. **NOTHING SHIPPED.** No App.jsx, no `grading/data`, no builder.

**The idea, and it is a good one.** Every usage number in this app — target share, carry share,
targets per game — is measured over ALL situations. A back's carries are inflated when his team is
ahead and a receiver's targets are inflated when it is behind, so those numbers blend the ROLE a
coach gave him with the SCOREBOARD he happened to play in front of. §2b already names that mechanism
as the reason RB matchup data does not repeat: *"it does not measure the defence, it measures THE
GAME."*

⭐ **And the app already believes it for PACE** — `build-teamtrends.py` measures pace on neutral
snaps only. So this asks whether the same filter belongs on player usage. **The constants are
IMPORTED from that builder**, so there is one definition of neutral in the repo rather than two.

### ⭐ THIS TEST HAS POWER, UNLIKE §2c AND §2d

Those compare 31-32 defences or teams, where an `r` must reach `~0.355` to clear noise. **This
compares 60-174 PLAYERS**, so the bar is nearer `0.10-0.14` and a consistent `0.03` is worth
reading.

### TARGET SHARE — raw wins in 12 of 12 cells

```
neutral minus raw          2023     2024     2025      n
week 3, by score         -0.073   -0.163   -0.073   88-116
week 4, by score         -0.046   -0.058   -0.085   122-139
week 6, by score         -0.015   -0.068   -0.018   158-164
week 8, by score         -0.003   -0.004   -0.039   167-174
```

**Every season, every cut, both definitions of neutral** (the score rule and a 20-80% win-probability
band). ⛔ **And the penalty is LARGEST EARLY — `-0.103` pooled at week 3 — which is precisely where
the filter was supposed to help most.**

### CARRY SHARE — no difference at all

Deltas run `-0.038` to `+0.052` and pool to between `-0.011` and `+0.021`. **Inside chance at every
cut.** The one nominal win (week 3, win-probability band, `+0.021`) is a third of the noise bar.

### ⭐⭐ WHY IT FAILS — two mechanisms, and the second is the interesting one

1. **IT THROWS AWAY HALF THE DATA.** The score rule keeps 44% of pass plays and 51% of runs, so an
   already-thin three-week sample is halved. **The confound removed is smaller than the noise added**
   — which is exactly §2c's finding in a different costume.
2. ⭐ **GARBAGE TIME IS PART OF THE JOB, AND IT RECURS.** A receiver who eats targets while his team
   trails will do it again, because **game script is itself stable at team level — bad teams keep
   losing.** So the "contamination" is correlated with itself across weeks, and removing it deletes
   real predictive signal rather than noise. ⛔ **A confound that repeats is not a confound for a
   forecasting question; it is information.**

> ## ⭐⭐⭐ THE PATTERN ACROSS ALL THREE MEASUREMENTS, AND IT IS THE REUSABLE PART
>
> ```
> §2c  schedule-adjusted FPA      SUBTRACTS data (a baseline estimated from a subset)   lost
> §2e  neutral-script usage       SUBTRACTS data (discards ~half the plays)             lost
> §2d  completed-season pace      ADDS data (17 games instead of 5)                     won 15/15
> ```
>
> **CORRECTIONS THAT SUBTRACT DATA LOSE. CORRECTIONS THAT ADD DATA WIN.** At the sample sizes this
> app actually has in-season — three to eight games, 32 teams — **the noise a correction introduces
> is reliably larger than the confound it removes.** The only one of the three that shipped is the
> one that made the sample BIGGER.
>
> ⚠️ **This is a prior, not a law.** It says where to look first and what to expect, and it does not
> excuse skipping the measurement — §2d's own PROE half beat the prior season by subtracting nothing
> and adding little. **But a proposal that begins "filter out the contaminated cases" should now
> carry the burden of proof rather than the benefit of the doubt.**

### Reproduce

```
python scripts/measure-neutral-usage.py --selftest    # proves both filters keep a usable slice
python scripts/measure-neutral-usage.py               # needs pbp for 2023-2025
```

⚠️ **THE TARGET IS RAW USAGE ON PURPOSE.** A manager's points come from every situation, garbage
time included. **A neutral-script number that describes the role more truthfully but predicts the
box score worse is not an improvement here** — and that is exactly what it turned out to be.

---

### ⭐⭐ §2f · DEFENCE-SIDE SCHEME RATES — built, and the chain caveat is the point (Sep 17, 2026)

`scripts/measure-defense-scheme.py` -> `scripts/build-defense-scheme.py` ->
`grading/data/defense_scheme_2025.json`. **Consumer is `scripts/matchup-brief.py` ONLY.** No
App.jsx change, no `grading/data` file that any engine reads — **`git status` shows no App.jsx diff
at all, which is stronger than a calibration run.**

**The gap.** `matchup-brief.py` printed two gaps AS gaps, and CLAUDE.md called the first *"the
highest-value data addition for P3"*: **there is no defence-side scheme profile** —
`coverage_2025.json` is man rate **faced by a receiver**, an offence-side measurement wearing a
defensive name. This closes it. **Route depth is still open.**

### ⚠️ MY FIRST PROBE WAS WRONG AND WOULD HAVE PRODUCED A FALSE "STILL BLOCKED"

I probed `pbp_participation_2026.csv.gz`, got 404, and nearly recorded the item as still blocked.
**2025 returns 404 on that URL too — and 2025 is a season this app already ships two layers from.**
CLAUDE.md states it plainly: *"participation ships parquet-only; there is no csv.gz asset."*

✅ **Re-probed with the right asset AND a control: parquet returns 200 for 2023, 2024 and 2025 and
404 for 2026.** So the block is real, and now it is verified rather than inherited. ⭐ **A control
is what separates "the thing is missing" from "I asked the wrong question"** — the same discipline
§2c used to earn its verdict.

### WHAT REPEATS — 6 of 14, measured across 2023>2024 and 2024>2025, n=32, bar 0.355

```
blitz_rate      0.622   REPEATS        cov_cover_0   0.304   noise
cov_cover_1     0.598   REPEATS        cov_cover_3   0.292   noise
pressure_rate   0.510   REPEATS        box_mean      0.207   noise
man_rate        0.462   REPEATS        cov_cover_6   0.119   noise
cov_2_man       0.417   REPEATS        cov_cover_4   0.109   noise
cov_cover_2     0.389   REPEATS        cov_combo     0.033   noise
                                       cov_cover_9   0.002   noise
                                       cov_blown    -0.131   noise
```

⭐⭐ **`man_rate` lands on `0.462` — the exact figure banked Sep 1 2026 by a different session
through `nflreadpy`.** This build reads the parquet with **pyarrow** instead, because `nflreadpy`
and `polars` are not installed on this machine (which is why `build-routes.py` and
`build-coverage.py` cannot be re-run here). **Two toolchains, one number.** The classified-play
count reproduces too: **22,055**, asserted in the builder's selftest.

⛔ **The eight that fail are recorded in `_meta.not_emitted` WITH THEIR r, not silently dropped** —
same contract `ngs_receiving` uses, because otherwise a future session re-adds one on intuition.

### ⛔⛔ STICKY IS NOT USEFUL, AND HERE THE CHAIN IS THE WHOLE CAVEAT

```
  "this defence plays man 41% of the time"     r = 0.462   sticky
x "your receiver gains Y against man"          r = 0.161   COIN FLIP
= a start/sit recommendation                               NOISE
```

**The product is dominated by the noisy term.** §2 already withholds that receiver edge from the AI
prompt for exactly this reason. ⭐ **So this file DESCRIBES A DEFENCE and cannot support "start him
against this coverage"** — the builder says so in `_meta.rules.descriptive`, the brief prints it
under every scheme block, and the brief's selftest asserts the sentence is there.

⚠️ **That is not a reason to skip it.** The brief's stated job is to print inputs and leave
contradictions standing; P3's questions 3 and 4 are *what does this defence do*, which is
descriptive by construction. **Blitz and pressure rate are the more promising half** — they connect
to sacks, time to throw and checkdowns.

⛔⛔ **CORRECTED Sep 17 2026 — THAT WAS AN ARGUMENT, AND §2g MEASURED IT AND KILLED IT.**
A blitz-heavy defence is **not measurably different within a season** on any outcome tested:
sack rate `0.090`, hit rate `0.195`, EPA per dropback `-0.157` — all under the `0.355` bar and
most flipping sign between seasons. **The chain dies at the same middle link the man/zone chain
died at.** ⭐ **The layer is unchanged, because it was built descriptive and brief-only for
exactly this reason.**

### ⛔ THREE PRE-EXISTING BUGS IN matchup-brief.py, ALL HIDDEN BEHIND EACH OTHER

Wiring Q3 in surfaced them, and the order matters — each one hid the next.

1. **THE SELFTEST WAS PINNED TO `brief("DAL", "NYG")`.** `gameenv_2026.json` is a WEEKLY snapshot,
   so when the board rotated to week 2 that call printed *"no game"* and returned — **every
   assertion after it stopped running.** The selftest exited 1 while reporting nothing about what
   it was meant to check. ⭐ **Verified pre-existing by running the unmodified file in place: 6
   checks, exit 1, identical.** The fixture is now derived from whatever the board holds. **Same
   class as the Sep 6 pinned clock — a fixed fixture is a maintenance deadline dressed as a test.**
2. ⛔⛔ **`funnel_read` WAS DEAD FOR ALL 32 TEAMS.** It fell back to 2025 only when the 2026 **row**
   was missing — but `teamtrends_2026` carries every team from week 1 with **null values** below
   each gate, so the row is truthy, `or` short-circuits, and it reported *"no defensive trends on
   file"* league-wide **while the 2025 numbers sat one file over.** ⭐ **Exactly the same shape as
   the App.jsx pace bug fixed the same day: a truthiness test on the CONTAINER instead of on the
   VALUE.**
3. ⛔⛔⛔ **AND ONE ASSERTION WAS PASSING FOR THE WRONG REASON.** *"A changed DC voids the funnel"*
   expects `None` — and was getting `None` from the dead fallback rather than from the DC rule. **A
   false pass is worse than a failure, because nothing looks at it again.** It now asserts the data
   resolves FIRST, so a `None` can only mean the rule fired.

⚠️ **Two more assertions pinned DAL and NYG for play-caller status, with a comment saying so.** Both
derive their team from the file now. **37 checks, 0 failures — the brief's selftest passes for the
first time since the board rotated.**

### Reproduce

```
curl -sSL -o part_2025.parquet https://github.com/nflverse/nflverse-data/releases/download/pbp_participation/pbp_participation_2025.parquet
python scripts/measure-defense-scheme.py --selftest    # reproduces the banked 22,055
python scripts/measure-defense-scheme.py               # stickiness, 3 seasons
python scripts/build-defense-scheme.py part_2025.parquet grading/data/defense_scheme_2025.json 2025
python scripts/matchup-brief.py --selftest
```

⚠️ **ANNUAL cadence, and there is no 2026 twin** until nflverse publishes participation for it. The
scheme read therefore describes LAST season, and the brief says so where it prints.

---

### ⛔⛔ §2g · THE BLITZ CHAIN IS DEAD AT LINK 2 (Sep 17, 2026)

`scripts/measure-blitz-consequences.py`. **NOTHING SHIPPED, and nothing needs removing** — the
scheme layer stays exactly as §2f built it, descriptive and brief-only.

**§2f closed by arguing that blitz rate was the promising half:** it repeats at `r = 0.622`, and
unlike the man/zone chain it acts on things that are themselves measurable — sacks, time to throw,
how deep the ball goes. ⭐ **That was an ARGUMENT and §2f labelled it one. This measures it, and it
is wrong.**

### THE THREE LINKS, and the cheapest one is the one that kills it

```
LINK 1   does blitz rate repeat?               r = 0.622   YES (§2f)
LINK 2   does it DO anything within a season?               NO   <- dead here
LINK 3   does knowing it in advance help?                   moot
```

### ⛔ LINK 2 — a blitz-heavy defence is not measurably different

`r(blitz rate, outcome allowed)`, same season, n = 32:

```
outcome           2023     2024     2025     mean
sack_rate       -0.185   +0.192   +0.262    0.090
qb_hit_rate     -0.114   +0.468   +0.230    0.195
adot_allowed    -0.110   +0.300   +0.037    0.076
comp_pct        +0.141   -0.233   -0.034   -0.042
epa_per_db      -0.032   -0.281   -0.158   -0.157
time_to_throw   -0.307   -0.182   -0.399   -0.296
```

**Not one clears the `0.355` bar, and four of six flip sign between seasons.** ⛔ **A defence that
blitzes more does not take more sacks, hit the quarterback more, or give up different yardage in
any way that survives a second season.**

⭐ **ONE REAL EFFECT SURVIVES AND IT IS UNUSABLE.** `time_to_throw` is negative in all three
seasons and it is the right sign — blitzing forces the ball out faster, which is the mechanism
working exactly as advertised. **It is still under the bar, and time to throw is not a fantasy
input.** The mechanism is real and too small to act on.

### LINK 3 — and the honest reading of the one row that looks like a win

```
outcome        2023>24  2024>25  blitz->now  own prior    delta   verdict
sack_rate        0.237    0.471       0.354      0.112   +0.242   knife-edge, see below
qb_hit_rate      0.295    0.426       0.360      0.409   -0.049   own prior is better
time_to_throw   -0.312   -0.128      -0.220      0.339   -0.119   own prior is better
adot_allowed     0.151    0.078       0.115      0.296   -0.182   own prior is better
```

⚠️⚠️ **`sack_rate` DESERVES THE SCRUTINY IT NEARLY ESCAPED.** At `0.354` against a baseline of
`0.112` it is the biggest apparent gain in the table — **and my first run labelled it "blitz
ADDS".** Three things say it is not a finding:

1. **It is `0.001` under the noise bar.** A verdict that swings on a thousandth is not a verdict.
2. **The two transitions are `0.237` and `0.471`.** One is well under the bar and one is over —
   **the pooled number is one transition carrying the other**, which is the failure §2c and §2e
   were both killed by.
3. ⛔ **THERE IS NO MECHANISM UNDER IT.** Link 2 says blitzing does not produce sacks within a
   season (`0.090`, sign-flipping). **A cross-season link with no within-season cause is an
   artefact**, not a discovery.

⭐ **A genuine secondary finding, and it is the more useful one: SACK RATE ALLOWED BARELY REPEATS
AT ALL — its own prior is `r = 0.112`.** A defence's sack rate is not a stable property of that
defence. That is worth knowing independently of blitzing, and it is why the baseline here is so
low that a noisy predictor could clear it.

### ⚠️ TWO FLAWS IN MY OWN INSTRUMENT, CAUGHT BEFORE THE VERDICT

Both would have produced a false positive, and both are the repo's own recorded lessons:

1. **LINK 3 PRINTED ONLY A POOLED MEAN.** I printed per-season rows for link 2 and a single mean
   for link 3 — in a repo where the last three measurements were decided by a per-season sign flip.
   Now per-transition.
2. ⛔ **THE VERDICT COULD DECLARE A WINNER BETWEEN TWO NOISE VALUES.** `int_rate` read *"blitz
   ADDS"* at `r = -0.088` against a baseline of `0.008`. **Both mean nothing; the delta rule
   compared them anyway.** The verdict now requires the predictor itself to clear the bar first.

### ⭐⭐ THE REUSABLE RULE: WHEN A PROPOSAL IS A CHAIN, TEST THE MIDDLE LINK FIRST

A chain is only as strong as its weakest link, and **the middle link is usually the cheapest to
test and the likeliest to be zero.** Here link 1 was already measured and encouraging, and link 3
is the expensive question everyone wants answered — but link 2, *does this thing do anything at
all*, settles it in one correlation.

⛔ **The man/zone chain failed the same way**: sticky tendency (0.462) times a coin-flip receiver
edge (0.161). **Two chains, two dead middles.** Before building on "X is sticky, and X affects Y",
measure whether X affects Y.

### What this changes

**Nothing in the app, and nothing in `defense_scheme_2025.json`.** The layer was built as
descriptive and brief-only precisely because §2f could not vouch for the chain. ⭐ **That caution
is now vindicated rather than regretted** — had the scheme profile been wired into the AI prompt or
a start/sit hint on the strength of "blitz rate is sticky", this measurement would be a retraction
instead of a footnote.

### Reproduce

```
python scripts/measure-blitz-consequences.py --selftest
python scripts/measure-blitz-consequences.py
```

---

### ⭐⭐ §2h · POSITION PERCENTILES REACH THE SCRIPTS (Sep 17, 2026)

`scripts/matchup-brief.py` + `scripts/test-percentile-parity.mjs` (guard 43).
⛔ **NO App.jsx CHANGE — `git status` shows no diff on either app file, which is stronger than a
calibration run.** Nothing new was invented here.

**WHAT PROMPTED IT, and it is a real error, not a hypothetical.** A FLEX comparison in this repo set
an RB's dud rate beside a WR's and invited them to be read as equals. **RB median dud rate is 11.8%;
WR median is 35.3%.** Same number, opposite meaning — a 23.5% dud rate is a *good* wide receiver and
a *bad* running back. The raw table said the reverse of the truth and the recommendation was wrong.

### ⭐⭐⭐ THE FEATURE ALREADY EXISTED, AND THAT IS THE FINDING

**App.jsx has had `CARD_PERCENTILES` and `cardPercentile` all along.** The card already prints
`29%ile` beside every metric, its glossary already explains *"50 is the median starter… a
60th-percentile TE and a 60th-percentile WR are equally ordinary for their job"*, it already carries
a 12-player floor, an `invert` flag for dud rate, a named population, and a comment warning against
ranking a partial season against a full-season pool.

⛔ **What it did NOT have was any way for a SCRIPT to see it.** The pools are built at module load
inside the browser bundle and never written to `grading/data`. So `matchup-brief.py` — the instrument
built from his own Sunday decision procedure — printed raw numbers with no baseline.

⭐ **The gap was never "the app cannot rank by position." It was "the ranking does not leave the
browser."** Checking that first turned a feature build into a 40-line mirror plus a guard.

### ⛔⛔ TWO BUGS THE PARITY GUARD CAUGHT ON ITS FIRST RUN

Both would have shipped silently, and **neither is findable by reading the two sources side by side.**

**1 · THE POPULATION SILENTLY DIVERGED.** The Python reused `CUR_TEAM`, whose keys run through
`_nm()` — lowercase, no punctuation, no generational suffix. **App.jsx gates on a RAW lookup,
`!ADP_DATA[name]`.** The normalised set admitted **4 extra RBs, 5 extra WRs and 2 extra TEs**, which
moved every percentile by about a point. Small enough to ship, wrong everywhere.

**2 · ⭐⭐⭐ PYTHON AND JAVASCRIPT ROUND HALVES IN OPPOSITE DIRECTIONS.** Python's `round()` is
banker's rounding, half to **even**. JavaScript's `Math.round` sends half **up**. On the 40-player TE
snap-share pool that is an exact-half case three times over — `13/40 = 32.5`, `25/40 = 62.5`,
`5/40 = 12.5` — so three tight ends read one point lower in the brief than on their own card, forever.
Fixed with `math.floor(x + 0.5)`.

> ## ⭐⭐⭐ **THE REUSABLE RULE: A PARITY GUARD MUST RUN BOTH IMPLEMENTATIONS, NEVER COMPARE THEIR TEXT.**
> **Both sources said `round(below / n * 100)`.** A string-matching guard would have called them
> identical for as long as the file existed. The guard extracts `cardPercentile` out of App.jsx with
> `new Function`, executes it against every draftable player, and compares to the Python's own output —
> **1,448 rows, and it failed on all three of these before it passed.** It carries a must-fail case:
> one perturbed value must be caught.

⚠️ **THE DISCREPANCY IN 1 IS NOT RESOLVED, ONLY MADE VISIBLE.** The Python now matches App.jsx
exactly, which is what parity means. **But the normalised match is arguably the better one** — those
eleven players differ only in name spelling between two files, and App.jsx's raw lookup drops them
from the pool. ⛔ **That is a question about App.jsx, and it is not this pass's to answer.**

### What it prints

```
Malik Washington       WOPR  0.27 (19)  tgt sh 14.0% (30)  snap 57.0% (30)  dud 52.9% (32)
Devon Achane           WOPR  0.30 (95)  tgt sh 19.3% (95)  snap 75.4% (90)  dud  0.0% (100)
```

**The parenthesised number is his rank against draftable players at his own position with 8+ games.**
A thin pool prints `(--)` rather than a flattering number.

### Reproduce

```
python scripts/matchup-brief.py MIA SF
node scripts/test-percentile-parity.mjs
```

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

### Expected fantasy points · r = — · rank 2

| | |
|---|---|
| **File** | `expected_2025.json` · `expected_2026.json` |
| **Field** | `exp_pg` · `act_pg` · `diff_pg` · `exp_rank` |
| **Surfaces** | player card → Expected points |
| **Status** | live |

**Plain English.** Given the chances he actually got — the targets, how far
downfield they were thrown, the carries, where they started — how many points
should that have been worth? Then set it beside what he really scored.

**Why it matters.** Every other opportunity input here reports a SHARE. A share
says how much of a pie he owns and nothing about how big the pie is or where on
the field it sits. **This converts the whole opportunity set into one number on
the SAME SCALE AS THE OUTPUT**, which is what lets a receiving role and a
goal-line role be compared without hand-waving.

⭐⭐⭐ **AND ITS VALUE IS BOUNDED, MEASURED, AND SMALLER THAN ANYONE SELLS IT.**
The claim everywhere is that expected points "is more predictive than actual
points." **Tested on 2023-25 pooled, it is only true while the sample is tiny:**

```
through   EXPECTED   actual     edge        n
W1-1        0.697     0.630   +0.066      886   <- a real edge
W1-2        0.760     0.734   +0.026      752   <- a real edge
W1-3        0.767     0.751   +0.016      657      gone
W1-4        0.796     0.781   +0.015      808      gone
W1-8        0.802     0.800   +0.002      964      gone
```
**It is a SMALL-SAMPLE NOISE FILTER, not a better metric.** After one game,
actual points are dominated by whether a touchdown happened and expected points
are not — so expected wins. **By Week 3 the two are the same number wearing
different clothes.**

⛔ **The cross-season test returns NOTHING, and that is consistent rather than
contradictory.** Predicting next season's points per game, `n=243/232`, 8+ games
both sides: expected `0.804` against actual `0.798` overall, and actual
marginally AHEAD at QB and RB. **Over a full season the two converge, so a
season-long expected figure carries no extra information.** Do not build a
projection on it.

⚠️ **This is the RB-pill error in a new costume, and it is worth naming.** The
first test run here was the cross-season one, it came back null, and that nearly
killed the layer. **The pill DESCRIBES; it does not forecast** — his Sep 13
ruling — and expected points is used in Week 2 to judge a Week 1 box score, not
to project next August. **Right instrument, wrong question.**

**Worked example.** Week 1 2026: Kenneth Walker scored `32.6` on `23.7`
expected, `+8.9`. Jahmyr Gibbs scored `33.1` on `30.6`, `+2.5`. **Same headline
week; one of them was bought with opportunity and the other was not.**

**Gotchas.** ⛔⛔ **THE SOURCE FILE IS FULL PPR AND ITS TOTALS ARE UNUSED.**
Verified by reconstructing `total_fantasy_points_exp` from the component columns
across four players — full PPR to `0.02`. This app is half-PPR with 4-point
passing TDs, so the builder recomputes both sides from components with this
repo's own `SCORE` dict. Copying their total would print a PPR number on a
half-PPR card. ⚠️ **`diff_pg` REPEATS AT ONLY `0.21` year over year** — which
is the point: if the gap between actual and expected were skill it would repeat,
and it mostly does not. **Never read it as a talent rating.** ⚠️ **It is a
MODEL, and not Hayden Winks' model** — his published Gibbs figure (`28.4`) does
not reproduce here under any single scoring, so never present it as reproducing
his.

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

> ⚠️ **"Rejected" here means NOT SCORED, which is not the same as absent.** Offensive line rank was built as a CONTEXT layer on Sep 11 2026 and stays in this section, because the thing that was rejected — letting it move a grade — is still rejected and always will be. ⭐ **A metric can be on a card and out of the engine at the same time; this section is about the engine.**

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
| **Status** | rejected **as a scored input, permanently** — it is an opinion and has no `r`. ⭐ **BUILT Sep 11 2026 AS CONTEXT**: `oline_2026.json`, RB/QB cards only, notable teams only. · last verified **Sep 11 2026** |

**Plain English.** How good is the line in front of him.

**Why it matters.** It would qualify both rushing efficiency and QB pressure.

**Gotchas.** **No free per-player OL data exists** in a rankable form, and
team pressure rate allowed is **confounded by the quarterback** — a scrambler
makes his line look better than it is.

> ### ⚠️ RE-VERIFIED Sep 11 2026, AND THE REJECTION SURVIVED FOR A DIFFERENT REASON THAN THE ONE WRITTEN HERE
>
> **What was checked:** PFF publishes a free, public, weekly-updated ranking of all
> 32 offensive lines with the five named starters per team —
> `pff.com/news/nfl-offensive-line-rankings-2026`. Not paywalled; the full article
> reads with `defuddle parse <url> --md`.
>
> ⛔ **So "no free data" was too strong and is now retired as the reason.** A free
> TEAM-level source exists. What the original line got right, and what still holds,
> is the narrower claim: **no free PER-PLAYER OL grade data** — PFF quotes
> individual grades inside the prose but publishes no dataset.
>
> ⛔⛔ **THE REASON IT STAYS REJECTED IS NEW, AND IT IS STRONGER THAN THE OLD ONE:
> the ranking is a HAND-ASSIGNED OPINION, not a measurement.** The author states the
> method in the article — each starter is given a score **between 5 and 10 in 0.5
> increments**, shaped by three years of PFF grades, averaged with extra weight on
> the tackles. **There is nothing to compute a year-over-year `r` against**, so it can
> never clear the stability bar every scored input in this app had to clear. ⭐ It is
> a `SEEN`-class input by the provenance table: good for context and options, never
> for "this works".
>
> ⚠️ **AND THE CHEAP AUTOMATED VERSION DOES NOT EXIST EITHER — MEASURED, not assumed.**
> The obvious shortcut was to widen `POSITIONS` in `scripts/build-status.py`, since
> the Sleeper feed already downloads weekly and carries linemen. **It carries the
> players and publishes no depth chart for them.** Counted against the live feed
> (12,227 players) on Sep 11 2026:
>
> ```
> pos    on a team    with depth_chart_order
> OL          248              0
> OT           66              0
> T            49              0
> C            29              0
> G            59              1
> (for contrast: WR 312/209 · RB 185/122 · QB 117/92 · TE 197/141)
> ```
>
> ⭐ **So Sleeper can tell you a lineman is hurt and cannot tell you he was a starter.**
> An IR'd franchise left tackle and an IR'd third-string guard are indistinguishable
> in that feed. **Identifying the five starters requires the PFF article or hand entry;
> there is no free feed for it.**
>
> ⭐⭐ **WHAT THE ARTICLE IS ACTUALLY GOOD FOR, and it is not the ranking.** Its real
> content is CHANGE: Tunsil out (Commanders, top-20 → 32nd), both Carolina tackles out
> (top-12 → 26th), Biadasz out for the season (Chargers), Cade Mays out (Lions, 13th →
> 19th). **Change outranks level in the Source Hierarchy, and a team that just lost its
> left tackle is information nothing else in this app can see.** A team sitting 7th all
> season is not.
>
> ⛔ **If it is ever built: context only, RB and QB cards only, rendered as a TIER
> ("top-10 line") rather than a rank ("7th").** A hand-assigned 0.5-increment score does
> not support the precision a rank implies — **the same mistake the leverage panel made
> on Sep 6 2026, when it printed "sharp ownership" for a projection and had to be
> corrected.**

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

#### `/predraft` — `.claude/skills/predraft/SKILL.md`

**Triggers on:** being about to draft or grade for real. Also *"predraft"*,
*"is the data current"*, *"check the data"*, *"what's stale"*.

**Does:** runs the four read-only reports in order — `report-stale-news.mjs`,
`refresh-adp.py` (both tables), `refresh-inseason.sh`, `npm test` — and reports
current / drifted / stale per layer.

**Exists because** §9's *"run before any draft"* instruction on
`report-stale-news.mjs` was a table row inside a 1,700-line file, which is a
place instructions go to be unread. **It reads and never writes**; applying any
drift stays a deliberate act.

⚠️ **A pass is narrower than it looks.** It ages notes against the clock. It
cannot tell you a note is WRONG, only that it is OLD — and a note written
yesterday and already inverted by a transaction reports as current. That gap is
GAP 1 in §14a and this skill does not close it.

#### `/notecheck` — `.claude/skills/notecheck/SKILL.md`

**Triggers on:** adding, editing or reviewing any `RECENT_NEWS` / `SITUATIONS`
entry, `trendNote`, verdict or reason. Also *"notecheck"*, *"check this note"*.

**Does:** seven checks in order — team against `ADP_DATA` ([R1](#data),
[R10](#prose)) · date present, real and the note's own ([R8](#prose),
[R9](#prose)) · no superseded claim restated inside the correction
([R7](#prose)) · assertion weighed against its evidence · label agrees with its
own number ([R13](#code)) · borrowed priors declared ([R4](#data)) · hierarchy,
where role CHANGE outranks every number.

**Exists because** this is the most repeated failure class in the repo — the
seven wrong notes in the Aug 3 2026 re-validation, the Diggs bug that returned
*because the correction quoted the superseded claim*, the eleven role and injury
corrections on the draft-report branch, and the stale-team-label class. The
rules were already written; nothing ran them. `test-stale-verdicts`,
`test-player-data` and `test-no-quoted-negations` cover the mechanical half.
**This is the judgement half.**

⚠️ **The reason it outranks its apparent size:** `RECENT_NEWS` reaches the model
under the header *"breaking updates — override everything above for these
players"*, which makes it the **highest-authority block in the prompt**, above
the situations block labelled ground truth. A wrong note overrules the metrics
rather than sitting beside them.

### CLI

| Command | What it does |
|---|---|
| `node scripts/grade-cli.mjs <roster> --tournament <key>` | grade headlessly. Unknown flags and unknown tournament keys exit non-zero with a hint — `--mode redraft` was silently ignored until Sep 1 2026 and graded a redraft roster through the best-ball engine |
| `node scripts/scout.mjs "Name" [--format …]` | the data behind `/scout` |
| `node scripts/report-stale-news.mjs [date]` | **run before any draft.** TWO sections since Sep 1 2026: (1) players whose every note is past the 45-day re-validation rule, (2) **CONTRADICTED** — the status feed reports a hard unavailability the freshest note predates. Section 2 asks questions and never edits a note. Takes a date |
| `bash scripts/refresh-inseason.sh [season] [--live-only]` | the weekly job, **8 steps as of Sep 13 2026**. Steps 1-6 are nflverse season releases and no-op safely before Week 1; **steps 7 (Sleeper) and 8 (lines/projections) are live and return data pre-season**, so a partial run is normal and is reported as `Partly refreshed`. `--live-only` runs 7-8 alone for the Saturday pass. ⚠️ Two steps both printed `5/8` until Sep 13 — the live-FPA step took a number team trends already held |
| `python scripts/coaching-adj-impact.py [--inert]` | **what each `COACHING_ADJ` delta actually DOES.** The matchup score is strictly tier-banded, so a delta crossing no rank boundary cannot move a grade for ANY roster — **WAS +0.75 and NYJ +0.25 cross none and are INERT.** Needs no roster, changes nothing. ⭐ Run it before and after touching a delta |
| `python3 scripts/refresh-adp.py [--source underdog\|ffc] [--table data\|yahoo] [--apply]` | ADP drift report. **Reports by default, never auto-applies** |
| `npm test` | **41 guards**, chained with `&&`, so the run stops at the first failure |
| `node scripts/test-stale-depth-claims.mjs [--selftest]` | **guard 41 (Sep 13 2026) - a depth chart is a weekly fact.** Rule 1 fails any entry claiming a job is permanently settled (*the job is settled*, *no leash*), year-round. Rule 2 fails an entry stating a CURRENT depth-chart position off a date more than 7 days old, **in season only**, unless it says when it will be re-checked. ⭐ Calibrated against all 294 prose entries before shipping: a broad role regex flagged 36 and was rejected as a wall; this one flags what is actually stale. `--selftest` proves both rules fire and that correct prose does not |
| `npm run build` | Vite production build |

### Runbooks

`RUNBOOKS.md` holds the procedures a HUMAN runs on a schedule, with the exact commands for
PowerShell and a log table where the runbook ends in a decision. It is procedure, never project
state — `CLAUDE.md` stays the single context handoff.

Live: **the Sleeper feed watch** (daily to Sep 8 2026), which gates whether the status layer is
allowed to render.

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
build-status.py             availability + depth-chart slot (Sleeper, NOT nflverse)
```

### Guards — every one exists because something broke

| Protects | Guards |
|---|---|
| **Name resolution & ADP** | `findplayer` · `adp-delta` · `alias-adp-sync` · `table-coverage` · `no-duplicate-keys` |
| **Roster ingestion** | `extraction-filters` · `extraction-blocks` · `yahoo-share` · `loose-json` |
| **Prose safety** | `no-quoted-negations` · `stale-verdicts` · `player-data` |
| **Scoring containment** | `snap-trajectory` · `refresh-cadence` · `floor-layer` · `context-layers` · `status-layer` |
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

**R20.** **`bash -n` proves a script PARSES, never that its arguments are the ones you
meant.** A literal `
` reached a line continuation in `refresh-inseason.sh`; outside quotes
that is an escaped `n`, so it became an extra ARGUMENT and shifted `argv`. Syntax check
passed. Run the script.

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

### ⭐⭐ §11b · The Winks teardown — five instruments, ranked by what they would buy (Sep 17, 2026)

**Source:** Hayden Winks, *RB Blueprint for Week 2*, Yahoo Fantasy, Sep 16 2026. Read in full —
5,219 words and all 22 graphics, at full resolution. **His data source is `nflfastR`, the same
release this repo builds on**, so nothing below needs a paid feed.

⛔ **PROVENANCE: `SEEN`, n = 1 analyst.** This is how one respected operator does it, looked at
directly. **It is not evidence that any of it WORKS** — no failure sample exists, he publishes only
his own method, and nothing here has been measured for stability against this repo's own `r` bar.
**Every item below is a candidate to MEASURE, never a finding to adopt.**

| # | What he has | What we have | Gap |
|---|---|---|---|
| **A** | **Expected fantasy points (xFP)** per player per game | nothing | ⭐⭐⭐ the spine of his whole read |
| **B** | **Schedule-adjusted FPA** — defence +/- vs each opponent's OWN baseline | raw FPA, confounded, and §2 says so | ⭐⭐⭐ our stated caveat, solved |
| **C** | **Usage plotted against game state** — every touch by minute and win probability | nothing | ⭐⭐ separates real role from garbage time |
| **D** | **Rolling windows that cross the season boundary** (last 10 games; 2025 W20–2026 W1) | season-bucketed files behind play-count gates | ⭐⭐ ours are EMPTY in September |
| **E** | **Defence-side scheme rates** (MAN%, 2HI%, BLITZ%) | offence-side only | ⭐ already flagged by `matchup-brief.py` |

**A — EXPECTED FANTASY POINTS.** He reports every player as *actual on expected*: "James Cook 8.4
half-PPR points on 11.4 expected." **It converts opportunity into one number on the same scale as
the output**, which is what lets him compare a receiving role against a goal-line role without
hand-waving. ⭐ **The data already sits in an nflverse release this repo consumes** —
`ffopportunity`, read by `build-efficiency.py` via `nfl.load_ff_opportunity`. ⚠️ It needs
`nflreadpy` + `polars`, which every in-season builder deliberately avoids, so this is an ANNUAL
layer or a dependency decision, not a weekly one.

⭐⭐ **His two-number shorthand is free and worth stealing on its own: "RB12 on RB11 usage."**
Finish rank ON usage rank, in one phrase. The gap between them IS the luck.

**B — SCHEDULE-ADJUSTED FPA.** His own words: *"Each defense's +/- allowed versus their opponents'
baselines. Ex: +42 rush yards means opponents facing that defense averaged 42 more rush yards than
their typical average."* ⛔⛔ **§2 of this file has carried the raw-FPA caveat since Aug 25 and
never closed it** — *"a defense that drew Kelce, Bowers and LaPorta looks soft at TE for reasons
unrelated to the defense."* **This is that fix, and it is computable from data already on disk.**
⚠️ **FPA IS SCORED here** (the matchup pills, the playoff geometry), so changing it moves every
grade and needs its own calibration. It is a data decision, not a cleanup.

**C — USAGE AGAINST GAME STATE.** His RB Rotation chart plots every touch on minutes-into-game
against in-game win probability, marking passing downs, inside-the-5 and fumbles. ⭐⭐ **It answers
the question one week of usage cannot otherwise answer: was this role, or was this the scoreboard?**
`win_prob` and `game_seconds_remaining` are already columns in the pbp release this repo downloads
weekly. **The chart is one rendering of it; the useful half is a per-player split of touches by
win-probability band.**

**D — ROLLING WINDOWS.** His neutral pass rate is *"over each team's previous 10 games"* and his
team usage bar is stamped *"2025 W20 – 2026 W1"*. ⛔ **Both cross the season boundary. Ours do
not, and that is why `teamtrends_2026` is empty until roughly Week 5** — PROE needs 300 plays, the
funnel 350 per side, and a season-bucketed file cannot borrow from December. **A rolling window is
always populated and always current.** ⚠️ It also blends two coaching staffs across an offseason,
which is exactly the confound the per-season split exists to avoid. **Neither is obviously right;
this is a measurement to run, not a change to make.**

**E — DEFENCE-SIDE SCHEME.** His matchup table carries MAN%, two-high% and BLITZ% per defence.
⚠⚠ **DO NOT read this repo's `r = 0.161` as a refutation.** That figure measures a RECEIVER'S
yards-per-target EDGE against man versus zone, year over year. **A defence's man RATE is a team
tendency and a different measurement entirely**, and this repo has never measured its stability.
`coverage_2025.json` is man rate FACED BY a receiver — an offence-side number wearing a defensive
name — which `scripts/matchup-brief.py` already names as its top data gap.

### ⭐⭐ THE SHOW, MEASURED — and it uses a DIFFERENT toolkit from the article

**"32 Teams. 32 Fantasy Football Facts to BULLY Week 2"**, Yahoo Fantasy / Josh & Hayden,
Sep 16 2026. **141 minutes, 31,492 words of transcript, all 96 storyboard grids read.** Same
analyst, six times the words, and **the instruments do not match the article's.**

**Their stated method, first sentence of the show:** *"this is stats versus film — we go and
watch all 16 games from the weekend... and compare that to the stats, the spreadsheets, the
analytics, the underlying metrics."* ⭐ **Two independent passes over the same week, and the
product is where they DISAGREE.** Structurally the same device as this file's own
volume-versus-TPRR divergence, run across mediums instead of across metrics.
**Running order: ~10 headline teams (injuries and depth-chart changes), then alphabetical 32.**

**What they actually cite, counted over the full transcript:**
```
routes                65     red zone / goal line   25     target share      9
snap share/count      45     injury / depth chart   25     blitz, pressure   8
carry share           27     neutral pass rate      15     man/zone          6
usage (generic)       25     tape / film            15     air yards         5
                             expected points        13     EPA               3
                                                           ADP               0
```
⭐⭐⭐ **ROUTES IS FIRST BY A FACTOR OF 1.4 OVER SNAPS, AND ADP IS ZERO.** In season, the price
you paid is irrelevant and route participation is the spine. **This repo shipped TPRR on Sep 1 and
calls it the only per-opportunity rate in the app** — the show independently treats its
denominator as the most important number on the board.
⭐ **And they never quote a rate without its denominator**: *"91% of the routes on a team with 67
dropbacks"*, *"ran 29 routes on 40 dropbacks."* Same discipline this file already imposes on
red-zone share.

⛔⛔ **THE MARKET FINDING, AND IT INVERTS THE ARTICLE.** Counted across 141 minutes:
```
point spread quoted as a line     0        over/under or game total     0
implied team total                6        Vegas / betting / market     3
```
**The ARTICLE leads all 45 players with a market-derived yardage projection and an implied team
total.** ⭐ **The SHOW — where they actually argue toward a conclusion — barely mentions
either.** Same analyst, same week. **Read that as the market being a FRAMING device for a written
ranking, and usage being the reasoning engine.** ⚠️ Auto-captions, so a mangled number is
possible; zero point-spread mentions in 141 minutes is not a transcription artefact.

**The reasoning chain, caught whole at 07:32–07:54 and worth reading as the template:**
> Rashee Rice *"was targeted on 6.9% of his routes in that game — the lowest of his career, if you
> throw out the one game he ran three routes before tearing his ACL... you've got to go back to his
> rookie season to get games consistently under 20% targets per route run. The Broncos just decided
> to play man coverage and took these guys away. And in week two they get a Colts defense that
> played over 60% man coverage on second to fourth down."*

⭐⭐ **Four moves in twenty seconds: a per-opportunity rate → against HIS OWN career baseline →
with a contaminated game explicitly excluded → explained by a defence's scheme → projected onto
next week's defence's scheme.** **Three of those four are things this repo either has or just
measured.** The sample-hygiene move — naming the game he is throwing out and why — is the one
worth stealing outright.

**On screen (96 storyboard grids, sampled across the full runtime):** a player box-score card per
subject, a running fantasy-points ticker, **and Winks' own charts screen-shared live — the Week 1
RB Rotation scatter, the Game Script 2×2, TE and RB Fantasy Usage By Team, and the dark
schedule-adjusted matchups table.** ⭐ **The article's five instruments ARE the show's
instruments.** One toolkit, two mediums.

⚠️ **WHAT COULD NOT BE READ, stated rather than implied: the video itself is 403-blocked.**
yt-dlp's section download fails against ffmpeg 8.x, a direct stream pull returns 403, and a full
video-only download returns 403. **Storyboards at 320×180 per frame were the working route** —
enough to identify WHICH chart is on screen, **never enough to read a value off it.** Every number
above comes from the transcript or from the article's own full-resolution graphics.
⚠️ **And the storyboard parts are JPEG here, not the WEBP `scraping-routing.md` records.** The
header is lowercase `Content-type`, which is why a case-sensitive grep reports zero image parts.
**Detect the magic bytes; do not assume the format.**

### What he does that is NOT worth copying, and why

⛔ **The per-player film notes** — named offensive linemen, route types charted by hand ("both of
his screen targets, his lone play-action leak target"), tape reads on vision and burst. **That is
manual charting by a full-time analyst and cannot be automated.** It is also where most of his
words go, and it is the half this app deliberately does not compete on.
⚠️ **Betting-market yardage projections** as the headline number. He leads every player with one.
**We already carry spreads and implied totals** in `gameenv_<season>.json`; a per-player yardage
prop is a different feed, priced per market per game, and §2b's own reasoning applies — it is a
forecast, not a memory, so it is worth having and it is not free.

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

### ⭐⭐ §11c · SAMPLE HYGIENE, AND THE SHOW'S TWO MISSING METRICS (Sep 17, 2026)

`scripts/matchup-brief.py` + `scripts/measure-partial-games.py`. **His instruction, two parts: add
Winks' sample-hygiene move, and make routes / snap share / usage / red zone / pass rate available to
a sit-start read whether or not they are app features.** ⛔ **NO App.jsx CHANGE.**

### ⭐⭐⭐ THE BRIEF WAS MISSING THE SHOW'S MOST-CITED METRIC

§11b counted citations across 141 minutes: **routes 65, snap share 45, carry share 27, red zone 25,
ADP zero.** The usage block printed WOPR, target share, snap share and dud rate — **neither routes
nor red zone.** It was missing the show's number one and number three.

Both now print, with percentiles, on their own line:

```
Jerry Jeudy     WOPR 0.53 (67)  tgt sh 20.2% (61)  snap 84.5% (79)  dud 58.8% (27)
                routes 92% (90)  TPRR 0.180 (56)  rz tgt sh 16% (49)   [own population]
```

⛔ **`[own population]` IS NOT DECORATION.** `routes_2025` gates on route participation and
`redzone_2025` emits a share only when the player AND his team clear an opportunity gate, so **each
file's membership IS its population and it is not the draftable-8-games population the first line
uses.** App.jsx says the same thing about its NGS table in as many words. **A player absent from one
of these is unranked, never a zero.**

### ⭐⭐ THE HYGIENE THRESHOLD IS MEASURED, WHICH IS THE ONLY REASON IT IS DEFENSIBLE

A season rate silently averages a three-snap injury exit with fifteen full games. The move is to name
the contaminated game and give the rate without it. **The threshold decides everything, so it was
measured rather than chosen** — `measure-partial-games.py`, whole 2025 corpus, 170 players, 2,470
games:

```
frac   %games flagged   %players with >=1
0.15        1.34              15.9
0.20        2.67              30.0      <- chosen
0.30        5.18              46.5
0.50       13.60              83.5
```

⛔ **The curve climbs gently to 0.30 and then accelerates. At 0.50 it calls 13.6% of all games
contaminated, which is not finding injuries — it is finding ordinary variance, and it would let any
week that spoiled a story be discarded.**

⭐ **A game is scored against THE PLAYER'S OWN MEDIAN, never a league bar.** Six targets is a quiet
Sunday for one receiver and a career day for another.

✅ **VALIDATED BY READING WHAT IT CATCHES, not just by the curve:** CeeDee Lamb on 1 target against a
10 median, Amon-Ra St. Brown 1 against 10, AJ Brown 1 against 9, Kimani Vidal with zero opportunities
against 13. **None of those is a quiet day.**

⚠️ **IT CATCHES TWO CAUSES AND CANNOT TELL THEM APART: a mid-game exit and a Week 18 rest** (James
Cook, 2 opportunities against a 20 median). Both contaminate a rate, so both are worth printing —
**which is why the line says "partial" and not "injured."**

⛔ **IT RECOMPUTES ONLY WHAT IT HONESTLY CAN.** Targets per game, yes — the game log carries per-game
targets. **A target SHARE needs that team's per-game totals, which no file here carries, so a share is
flagged as contaminated and never re-derived.** Inventing it would be worse than leaving it.

### ⛔ THREE DISPLAY BUGS, AND ONE WAS PRE-EXISTING

Adding a percentile beside each number exposed them — **the rank and the value were contradicting
each other and nothing had ever put them side by side.**

1. ⛔⛔ **A NULL SNAP SHARE PRINTED AS `0.0%`.** `num()` coerces `None` to zero, so Chris Godwin and
   Harold Fannin — both of whom played all season — read as never having taken a snap. **The new
   percentile column said `(--)` right beside it, so the row asserted he never played AND that he
   could not be ranked.** Now prints `--`.
2. `route_sh` printed raw (`routes 0.917`) instead of as a percentage.
3. Red-zone shares printed **wrong by a factor of a hundred** (`rz tgt sh 0.2%` for 20%).

### Reproduce

```
python scripts/measure-partial-games.py
python scripts/matchup-brief.py CLE TB
python scripts/matchup-brief.py --selftest
```

---
### ⛔⛔ §11d · THE CROSS-FILE NAME JOIN, AND WHAT ONE-SIDED NORMALISATION COST (Sep 17, 2026)

`scripts/matchup-brief.py` + `scripts/measure-name-joins.py`. ⛔ **NO App.jsx CHANGE.**

**THE SYMPTOM.** The brief printed **Kenny Gainwell** under *"Q7b NO 2025 DATA — every read above is
BLIND to these starters"* while his 2025 row sat one file over as **`kenneth gainwell`**. ⛔ **A
96th-percentile targets-per-route-run and a 94th-percentile red-zone target share — 16 carries
inside the 10, 9 inside the 5 — were suppressed from a live lineup decision, and the disclosure
block asserted the opposite of the truth.** Chris Godwin and Harold Fannin were listed the same way.

**THE CAUSE.** Every layer in `grading/data` keys players by NAME and **only `redzone_2025` carries
a stable id**, so a lookup across files is a string match with nothing verifying it.

⭐⭐ **AND THE PARTICULAR BUG IS WORTH NAMING: `q7b_unmeasured` NORMALISED ONE SIDE.** It ran `_nm()`
on the depth-chart name and then looked the result up in a dict whose **own keys are raw**. ⛔
**Normalising one side of a comparison is worse than normalising neither — it looks careful and it
fails silently.**

### THE RESIDUE WAS MEASURED, SO THE ALIAS LIST STAYS SHORT

`measure-name-joins.py`, `player_metrics_2025` against each layer:

```
                          raw hit   after _nm()   rescued
routes_2025                   299          299         0
redzone_2025                  255          268        13
gamelogs_2025                 219          231        12

status_2026 starters called unmeasured:  464 raw  ->  445 after _nm()
FALSE "no data" claims fixed by normalisation alone:  19
```

⭐ **Normalisation alone is worth 19 false disclosures** — Godwin, Fannin, Deebo Samuel, Brian Thomas
Jr, Kenneth Walker III, Luther Burden III and a dozen more. **Nicknames need an alias, and an alias
is dangerous in a way a miss is not: a WRONG one merges two players' seasons into one row.**

### ⭐⭐⭐ SO EVERY ALIAS IS PROVEN, AND THE FIRST TEST THAT PROVED THEM WAS BROKEN

**Three aliases ship: `kenneth/kenny gainwell`, `joshua/josh palmer`, `zonovan/bam knight`.**

⛔ **The first verification said Kyle Allen and Josh Allen were the same person.** It collected rows
only for names that EXIST, and `kyle allen` is in no 2025 file — so it compared Josh Allen against
himself and found perfect agreement. **A test that passes for the wrong reason is worse than no
test**, and it is the same guard-that-cannot-fail class §2h ran into.

**THE BAR THAT SURVIVED, all three required:**
1. **both spellings appear somewhere**
2. ⭐ **never in the SAME file** — Kyle Allen and Josh Allen are both in `status_2026`, and that is
   precisely what proves they are two people
3. **position agrees, and team agrees AMONG FILES OF THE SAME SEASON**

⚠️ **Condition 3's season clause is not a detail.** It first rejected Gainwell for "disagreeing" PIT
against TB. **That is a TRANSFER, not a contradiction** — 2025 layers say PIT, `status_2026` says TB,
and both are correct.

### ⛔ TWO MORE BUGS FOUND BY READING THE OUTPUT, NOT THE CODE

1. ⛔⛔ **THE FIRST FIX MADE THE LIST LONGER.** `find_row` read `sub(layer, "players")`, but
   `player_metrics` and `gamelogs` are **FLAT** — names at the top level beside `_meta`. So every
   flat-file lookup returned `None`, Q7b gained **Bucky Irving, Cade Otton and Emeka Egbuka** while
   their full rows printed three lines above, **and the hygiene detector died silently at the same
   time.** ⭐ **It looked like a longer list, never like an error.**
2. **A must-fail case stopped being able to fail.** The hygiene fixture was keyed `__selftest__`, and
   the new resolver filters a leading underscore as metadata — so *"a flat season flags NOTHING"*
   was passing because the row was invisible, not because the season was flat.

### Reproduce

```
python scripts/measure-name-joins.py
python scripts/matchup-brief.py CLE TB
python scripts/matchup-brief.py --selftest
```

⚠️ **`npm test` is RED on an unrelated pre-existing failure** — guard 12 flags two Tua Tagovailoa
prose entries whose depth-chart claim is dated 8 days back with Week 2 games played on top of it.
**Verified pre-existing by stashing every change here and re-running: identical failure at HEAD.**

---
### ⛔ §11e · THE TEAM-CODE ALIAS WAS NEVER MISSING — THE CHECK WAS (Sep 19, 2026)

`scripts/test-team-alias.mjs` (guard 44). ⛔ **NO App.jsx CHANGE, and no alias added.**

**THE SYMPTOM.** During a live lineup question, a query for Washington's game returned *no game*.
`status_2026` files them as **`WAS`**; `gameenv_2026` files them as **`WSH`**. Same split on the
Rams: **`LA`** and **`LAR`**.

⭐⭐ **THE DIAGNOSIS IS THE POINT, AND IT IS NOT WHAT IT LOOKED LIKE.** Both files already handle
it — `TEAM_SPELLINGS` exists in App.jsx AND in `matchup-brief.py`, and App.jsx's own comment records
this biting twice already: *"the Sep 11 LA/LAR bug was exactly this… every Rams card silently lost a
section. WSH joins it for the same reason."*

⛔ **So the alias was fine. What did not exist was anything that would tell you when it stopped
being enough.** An ad-hoc query that does not route through the helper returns nothing, in silence,
and reads exactly like a team with no game.

### WHAT THE GUARD CHECKS, and only the third one is new

1. **THE TWO MAPS AGREE.** The alias is typed twice, in two languages. ⭐ **Compared as SETS, not
   order** — App.jsx lists the canonical spelling first, the Python lists the asked-for one first,
   and both are correct for a try-every-spelling lookup.
2. **THE MAP IS SYMMETRIC.** If `WAS` maps to both but `WSH` maps only to itself, half the lookups
   still fail and the map still looks complete. **That is the must-fail case.**
3. ⭐⭐ **EVERY TEAM CODE PRESENT IN `grading/data` RESOLVES.** **Nothing checked this before.** A
   third spelling arriving in a new feed would have behaved exactly like the first two did — silently
   — until it emptied somebody's lineup read on a Sunday.

✅ **AND IT CONFIRMS THE ALIAS IS LOAD-BEARING RATHER THAN DECORATIVE:** all four spellings appear
in real files today — `LAR` in `coverage_2025`, `LA` in `career_arc_2026`, `WAS` in
`career_arc_2026`, `WSH` in `gameenv_2026`.

⚠️ **WHAT IT DOES NOT DO: add the alias to new code.** A future script that hand-rolls a team lookup
will still fail. **The guard proves the MAP is sound; it cannot force a caller to use it.** The
callers that matter (`sub_team`, `lookupTeam`, `is_team`) already do.

### Reproduce

```
node scripts/test-team-alias.mjs
```

---
### ⭐⭐ §11f · CURRENT-SEASON SNAP SHARE, A COMPARISON MODE, AND HIS ROSTER (Sep 19, 2026)

`scripts/build-snap-current.py` + `grading/data/snap_current_2026.json` + scout `--vs` / `--roster`
+ guard 45. ⛔ **NO App.jsx CHANGE.**

**WHAT PROMPTED IT.** A flex decision turned on whether a receiver was a full-time player, and the
app could not answer. `routes_2025` is last season; `snap_trajectory_2026` is **correctly empty**
because a trajectory needs 3 games in each window and it was week 2. **The number came from an
outside article.**

### ⭐⭐⭐ THE BLOCKER WAS NOT WHAT IT LOOKED LIKE

The obvious build was a 2026 ROUTES layer. ⛔ **It is genuinely blocked upstream:**
`pbp_participation_2026.parquet` returns **404** while 2023, 2024 and 2025 all return 200 — probed
with controls, so the gap is real rather than a wrong URL.

⭐ **But `routes_2025`'s own metadata says route share measures against snap share at `r = 0.957`
and "must never be presented as a separate signal."** So the question *is he full-time* does not
need routes at all. ✅ **`snap_counts_2026.csv.gz` returns 200.** The layer was one download away.

**MEASURED, and it reproduces the finding that decided the call:**

```
                    week-1 snap %     (the article's route %)
Malik Washington         98%               route leader
Makai Lemon              64%                   85%
Chris Rodriguez          40%                    -
Antonio Williams         37%                   29%
Keaton Mitchell          31%                   31%
```

⛔⛔ **AND THEY ARE NOT THE SAME NUMBER — the label matters.** 37 against 29, and 64 against 85.
**Close enough to answer *is he full-time*; never close enough to quote as a route number.** The
builder's `_meta.is_not` says so and guard 45 asserts it, because a drifting label is how a snap
figure ends up cited as a route figure.

### What shipped

| | |
|---|---|
| **A · snap share** | 423 players, per week, **rank 2 and CURRENT so it outranks the 2025 rows** |
| **B · `--vs`** | two players, one table, this season above last — the shape he picked Sep 17 |
| **C · `--roster`** | passed **by PATH**, so his roster stays in the private repo |

⭐⭐ **C's real value is that a handcuff is DETECTED rather than remembered.** Same NFL team, same
position, and he already holds the man in front: *"same team + position you also hold: Omarion
Hampton (DC1)."* That is the reasoning that was being done by hand.

### ⛔ A PARTIAL WEEK IS PART OF THE OUTPUT, NOT A FOOTNOTE

Week 2 held **93 rows against week 1's 1,492** — one Thursday game. A mean that blends it gives two
teams a denominator nobody else has. `weeks_complete` and `weeks_partial` are separate fields and
the tool prints the warning.

### ⚠️ THREE BUGS, AND TWO ARE THE SAME RECORDED TRAP

1. ⛔ **The escape trap, third variant.** A regex written as `\r?\n` reached the file as real control
   characters and broke the parse. **The banked fix was *anchor on escape-free text*; that covers
   ANCHORS and not CONTENT.** Extended: build backslashes at runtime (`String.fromCharCode`,
   `new RegExp`) when writing code through a heredoc.
2. ⛔ **`card.metrics` rows have no `key` field.** `card.redzone` rows do, so a lookup by key
   printed a dash for target share, WOPR and dud rate on a player who has all three. Matches on
   label now.
3. ⚠️ **The skill file is CRLF in a repo that pins LF.** `.gitattributes` normalises it on commit, so
   nothing is broken — but an anchor spanning a line break must use the file's own ending.

### Reproduce

```
python scripts/build-snap-current.py <snap_counts_2026.csv.gz> grading/data/snap_current_2026.json 2026
node scripts/scout.mjs "Malik Washington" --vs "Antonio Williams" --format yahoo
node scripts/test-snap-current.mjs
```

---
### ⭐⭐ §11g · IS THE OUTSIDE METHOD BETTER FOR START/SIT, AND WHAT SHOULD WE TAKE (Sep 19, 2026)

**His question, and it is narrower than it first looks:** *"when I ask who should I start or who should
I pick up… I want to know if his method is effective in analyzing this and whether we should
incorporate how he analyzes players."* ⛔ **Not *is his product better* — he already knows the app does
a different job. The question is whether his INPUTS would change a start/sit call.**

**Source:** Pat Kerrane's per-player percentile tables (Legendary Upside, Week 2 2026). **PROVENANCE:
`SEEN`, n = 1 analyst, one week.** ⛔ **This is apprenticeship, not evidence that his method works.**

### ⭐⭐⭐ THE FINDING: HIS VERDICTS ALREADY COLLAPSE TO OUR TOP TWO RANKS

His tables carry ~20 rows per player. **His actual verdicts do not use them.** Traced across every
player call in one article:

| His call | What drove it | Rank |
|---|---|---|
| Antonio Williams, won't start him | 29% route participation | **2** |
| Malik Washington, dart throw | route leader, but aDOT moved 5.4 → 15.8 | **1-2** |
| KC Concepcion, dart throw | part-time slot, Jeudy ahead of him | **1** |
| Omarion Hampton, concerning | 58% snaps, 57% carry share, 0 targets | **2** |

⭐ **Role and volume decide; the exotic columns are supporting evidence, never the driver.** So
adopting his whole table would change **very few** start/sit calls. **What would change calls is the
handful of columns that are LEADING indicators of role rather than descriptions of last Sunday.**

### THE ADOPTION TABLE

| His metric | Verdict | Why |
|---|---|---|
| **Expected Points / Game** | ✅ **ADOPT — and it is FREE** | rank-2 OPPORTUNITY, not efficiency. **`expected_2026.json` already holds 312 players with `exp_pg`, `act_pg`, `diff_pg`.** Built, current, and walled off as `context_only` |
| **First-read target rate** | ✅ **ADOPT if a source exists** | separates *the play was designed for him* from *he got it when the first read was covered*. **Target share cannot tell those apart.** Intent precedes outcome, so it leads role |
| Double coverage %, YPT > expected | ⚠️ **ADOPT AS EXPLANATION ONLY** | the coverage edge is `r = 0.161`, a coin flip. ⛔ **Never a start/sit input.** ✅ **But it answers *should I panic about last week*, which the app currently cannot** |
| RYOE, Elusive Rating, Breakaway Yds | ⛔ **DO NOT ADOPT for start/sit** | RB efficiency, `r` 0.02-0.31. Describes the past |
| Slot rate, screen yard %, 1st down/route | ⚠️ **texture, not a decider** | useful for reading a role, unmeasured for stability here |

### ⚠️ THE TIMING NOTE THAT MAKES EXPECTED POINTS URGENT RATHER THAN NICE

Guard 42 measured that expected points beats actual points as a predictor **only early**: `+0.066`
after one game, `+0.026` after two, `+0.016` by three, `+0.002` by week eight. ⭐⭐ **So its value is
highest RIGHT NOW and decays to nothing by midseason.** Adopting it in week 2 is the whole window;
adopting it in November is pointless.

### ⛔ A CORRECTION MADE IN THE SAME SESSION

A session claimed the app has **no** first-read metric. **It does — in the hand-written PROSE**
(*"an 80th-percentile first-read target rate"*, Juwan Johnson's note). **There is no data file, no
column and no percentile.** ⭐ **The distinction matters: a number somebody looked up once is not a
metric the tool computes**, and describing the second as the first overstates what the app can do.

### ⚠️ WHAT HIS TABLES DO NOT CARRY, AND IT IS THE ONE THING WE HAVE

**No stability figure anywhere.** Every row is a percentile; none says whether the number survives to
next week. On one back's sheet, Breakaway Yards and Elusive Rating sit two rows apart with equal
visual weight — and one of them is close to a coin flip year over year. ⛔ **Our `r` column is the
only thing in either system that separates a repeatable edge from a story about last Sunday.**

⚠️ **AND A POPULATION WARNING, from his own sheet.** One row reads `RB Rank 2 / Percentile 2`;
another `RB Rank 18 / Percentile 2`. **Rank 2 of ~30 is not the 2nd percentile.** The likely
explanation is two different populations — rank among qualified, percentile among all — **and the
reader cannot tell, because neither column names its population.** ⭐ **That is exactly the error a
session made on a FLEX call two days earlier, and the reason our percentiles are required to print
their gate.**

### ✅ ADOPTED Sep 19 2026 — EXPECTED POINTS IS NOW ON THE SCOUT CARD

**`[1c] EXPECTED POINTS` in `scripts/scout.mjs`, and in the `--vs` table.** No new data was
built: `expected_2026.json` already held 312 players and was only ever rendered as a hint.

⭐⭐ **ITS FIRST OUTPUT WAS A REAL SIGNAL.** Malik Washington, week 1: **expected 10.59/gm, rank 22
of 127 WRs — 83rd percentile — against a 61st-percentile opportunity in 2025.** He scored 6.8. **The
opportunity moved up sharply and the points have not followed yet**, which is the buy-shaped pattern
first-read rate exists to find, reached by a different road.

⚠️ **One game, and the +/- is not a forecast.** Both are printed beside it.

**FOUR RULES ARE ENFORCED BY GUARD 42 rather than remembered**, because printing a number where a
lineup gets set is different exposure from storing it: the rank is on EXPECTED not actual · the
+/- is stated as neither forecast nor skill rating · it is never attributed to Hayden Winks · and
**the layer stays `context_only` and out of the AI prompt** — a leak into either engine moves grades
by a fraction and invalidates every calibration figure in the repo.

⭐ **The percentile is DERIVED from the rank and position count the file already publishes, never
recomputed.** Two ways of producing one number is how they drift apart.

---
### ⭐⭐⭐ §11h · FIRST-READ TARGETS — BUILT, MEASURED, AND THE HEADLINE NUMBER WAS A CONFOUND (Sep 19, 2026)

`scripts/build-first-read.py` + `scripts/measure-first-read.py` +
`grading/data/first_read_2026.json` + guard 46. ⛔ **NO App.jsx CHANGE.**

**§11g listed this as the highest-value gap and recorded *"no source in hand."* ⛔ That was wrong.**

### THE SOURCE EXISTED, AND THE FIRST PROBE MISSED IT

`ftn_charting` carries **`read_thrown`** — which read in the progression the quarterback threw to —
and **2026 is published.** ⚠️ **The first probe 404'd on a GUESSED filename** (`.csv.gz`; the assets
are `.csv`). **The banked rule — never declare a route dead on one attempt — is the only reason it
was checked twice.** Joined to play-by-play on `(game_id, play_id)`: **1,146 of 1,146 plays matched.**

**Decoding it:** first read `1`, second read `2`, checkdown `CHK`, scramble drill `SD`, designed
`DES`. In 2025 those total **20,123**, against the 19,830 dropbacks `routes_2025` independently
records — two files agreeing without being asked to.

### ⛔ THE NAME BUG, AND IT IS THE THIRD INSTANCE THIS WEEK

The first build keyed on `receiver_player_name`, which play-by-play stores **abbreviated** —
`M.Evans`. Stripping the period produced `mevans`, so the layer **could not join to a single other
file** and every player asked for came back ABSENT.

⭐⭐ **THE FIX IS THE ONE THE WHOLE WEEK HAS BEEN POINTING AT: key on the GSIS id.**
`receiver_player_id` is stable, the nflverse `players` release maps it to a display name, and the
name becomes a LABEL derived from the id rather than the join itself. **253 players, 0 unresolved
ids.** *(§11d and §11e were both name-join failures. This is the first layer built id-first.)*

### ⭐⭐⭐ WHAT IT MEASURES — AND THE NUMBER THAT NEARLY SHIPPED AS A FINDING

```
DOES IT REPEAT?          2022>23   2023>24   2024>25    MEAN
  fr_share                 0.850     0.782     0.773    0.802
  fr_rate                  0.911     0.912     0.900    0.908   <- the trap
```

⛔⛔ **`0.908` WOULD HAVE BEEN THE STICKIEST INPUT MEASURED ANYWHERE IN THIS APP**, above intended
air yards at `0.826`. **It is measuring POSITION.** Within position:

```
  WITHIN     n    fr_rate r      median fr_rate
  WR       263       0.567            0.73
  TE       103       0.400            0.59
  RB        85       0.244            0.19
```

**Backs check down, receivers are the design, tight ends sit between — so pooling them builds three
clusters and the correlation reads "positions stay positions."** ⭐ **The repo's own rule caught it:
name the search that would falsify the conclusion and run that one too. One run.**

### AND THE SECOND QUESTION KILLED HALF THE METRIC

```
  overlap with target share:   fr_rate 0.38      fr_share 0.89
```

⛔ **`fr_share` is a restatement** — the same ruling `route_sh` got against `snap_sh` at `0.957`.
✅ **`fr_rate` shares only ~14% of its variance with target share, so it is genuinely NEW.**

> ## ✅ THE RULING: USE `fr_rate` AT WR (`0.567`, reliable). CAUTIOUSLY AT TE (`0.400`, soft).
> ## ⛔ NOT AT RB (`0.244`). NEVER QUOTE THE POOLED `0.908`.

### What it says about his own roster, week 1

```
  Amon-Ra St. Brown   37.5% of DET first reads   22.2% of his targets were design
  George Pickens      29.4%                      83.3%
  KC Concepcion       28.6%                      80.0%
  Malik Washington    14.3%                      25.0%
```

⚠️ **The flex call was made partly on *"8 targets, team high."* Only 2 of those 8 were first reads.**
**One game, and `n=8`** — but it is the exact distinction the metric exists to draw, pointing the
other way from the raw count.

### Reproduce

```
python scripts/build-first-read.py <ftn.csv> <pbp.csv.gz> <players.csv.gz> <out.json> <season>
python scripts/measure-first-read.py --dir <folder> --players <players.csv.gz>
node scripts/test-first-read.mjs
```

---
### ⭐⭐ §11i · A MISSING DENOMINATOR CAN BE DERIVED FROM A PUBLISHED RATE (Sep 19, 2026)

**His challenge:** *"wait you cant get this route participation data online?"* ⭐ **He was right to
push.** A session had checked ONE source, found it missing, and written the metric off.

### ⛔ FIVE FREE SOURCES CHECKED, AND ROUTES IS GENUINELY NOT IN ANY OF THEM

| source | routes? |
|---|---|
| `pbp_participation` 2026 | ⛔ **404** — and 2023/24/25 all return 200, so the gap is real, not a bad URL |
| `ftn_charting` | ⛔ play-level; carries no on-field player list |
| `nextgen_stats` | ⛔ no 2026 receiving asset published |
| `pfr_advstats` | ⛔ drops, broken tackles, passer rating |
| `stats_player_week` | ⛔ 150 columns, none of them routes |

**Route share needs *who was on the field for each pass play*.** ⛔ **The providers who have it now
sell it, and scraping a subscription data product is out** — the same ruling
`bbmdb-portfolio-analysis.md` already makes: *"never scrape bbmdb's computed numbers in — that is
their product."*

### ⭐⭐⭐ BUT THE NUMBER WAS REACHABLE ANYWAY, AND THE RECIPE GENERALISES

**An analyst published a RATE whose denominator was the missing number.** Concepcion at *2.15 yards
per route run*, and his receiving yards are in the box score:

```
43 receiving yards ÷ 2.15 yards per route = 20 routes
20 routes ÷ 30 CLE dropbacks               = 67% route share
```

> ## **THE RECIPE: when a denominator is paywalled, look for a published RATE that uses it. A rate
> ## plus one free number gives the denominator back by division.**

**YPRR gives routes. Targets per route gives routes. Points per snap gives snaps.** ⭐ **The
paywalled quantity is often sitting inside a number somebody quoted for free.**

⚠️ **PRECISION IS BOUNDED BY THE ROUNDING.** `2.15` could be `2.145` to `2.155`, so 20 routes is
**±1**. ⛔ **Fine for *is he full-time*; never quote it as exact, and never stack another derivation
on top of it.**

### WHAT IT SETTLED, AND IT WENT AGAINST THE PERSON WHO FOUND IT

```
                  routes      tgt/route     air yds
  Lemon        28  (85%)        14.3%          0
  Concepcion   20  (67%)        25.0%         63
```

⭐ **His instinct was right — Lemon does run far more routes.** ⛔ **And it lost anyway: Concepcion
is targeted on a quarter of his routes against one in seven, on eight FEWER routes, at real depth.**
**Being on the field is rank 2; being thrown to is the half of rank 2 that scores.** *(And targets
per route run is `r = 0.674` and NOT a restatement of snap share, which route share is at 0.957.)*

---
### ⭐⭐ §11j · A BLITZ DOES NOT FEED THE TIGHT END. IT STARVES THE RUNNING BACK (Sep 19, 2026)

**His question:** *"would this benefit Fannin their TE more than the receivers?"* ⭐ **It is a
measurable question, so it was measured rather than reasoned about.**

**MEASURED: 2025, n = 17,437 targeted pass plays**, FTN charting joined to play-by-play on
`(game_id, play_id)`, positions resolved through the GSIS id. **Blitz = 5+ pass rushers**, the
standard definition, **12.7% of plays** — which lands on the league blitz rate the scheme file
already carries.

```
  share of targets      WR      TE      RB
  no blitz            56.9%   23.5%   19.6%
  BLITZ               62.7%   25.3%   12.0%
  change               +5.8    +1.8    -7.6
```

⛔⛔ **THE FOLK MODEL IS WRONG. It says: blitz forces a quick throw, the quick throw is a checkdown,
so the tight end and the back eat.** ✅ **What actually happens: the RECEIVERS eat, by three times
as much as the tight end, and it comes almost entirely out of the RUNNING BACK.**

⭐⭐⭐ **THE MECHANISM THAT FITS THE NUMBERS: a blitzing defence keeps the back IN TO BLOCK.** He
cannot run a route he is not running, so his share collapses and the routes still on the field
absorb it. **That explains all three columns at once, which the checkdown story does not.**

⚠️ **AND THE DEPTH BARELY MOVES**, which is the other half of the folk model failing: WR `11.0 → 10.9`,
TE `6.3 → 6.0`, RB `0.1 → -0.3`. **A blitz does not meaningfully shorten the throw.**

### ⭐⭐⭐ §11k · ONE CROSSWALK, ONE RESOLVER, ONE GUARD — THE FIX FOR THE SILENT NAME JOIN (Sep 19, 2026)

**Plain version first.** Every layer in `grading/data/` is keyed by a player's
NAME, and the feeds spell names differently. nflverse says `Kenny Gainwell`;
the snap feed said `Kenneth Gainwell`. A lookup on the wrong spelling returned
nothing.

⛔⛔ **THE BUG WAS NEVER THAT NAMES WERE USED. IT WAS THAT A MISS WAS SILENT.**
A back with an 84th-percentile 2025 season printed `no 2025 row`, which reads
exactly like *this player has no data*. **An absence that looks like a fact is
the worst failure this tool can have, because nothing about it invites a second
look.** It surfaced only because he asked to elaborate on one player.

#### The three pieces

| Piece | File | What it does |
|---|---|---|
| **The crosswalk** | `scripts/build-player-ids.py` → `grading/data/player_ids.json` | name → `gsis_id` off the nflverse players release. **6,997 players, 8,012 names, 48,074 alt ids** (pfr/pff/espn/esb/nfl/otc/smart). Scope `last_season >= 2018` |
| **The resolver** | `pickRowFor()` in `scripts/scout.mjs` | raw key → canonical name → id → a reverse index of the LAYER's own keys |
| **The guard** | `scripts/test-player-ids.mjs` (guard 47) | a resolution RATE per layer, with a floor that fails on regression |

#### The disambiguation ladder — it refuses rather than guesses

Two real players normalise to `antonio williams`, and one is on his roster.
⛔ **A wrong player is worse than a missing one**, so an ambiguous name
resolves to NOTHING on its own and is rescued one rung up:

```
by_name             antonio williams          -> (refused)
by_name_pos         antonio williams|WR       -> 00-0041040
by_name_pos_team    antonio williams|WR|BUF   -> 00-0041040
```

✅ **91 names collide, 83 rescued by position.** Both properties are asserted:
the safety one (ambiguity refuses) and the usefulness one (position rescues).

#### ⭐⭐ Why the GUARD was the piece worth building, not the migration

**A migration fixes the layers somebody migrates.** The guard fails on a layer
nobody has touched — including one built next month by someone who never read
this section. Floor 80%; the 19 real layers run **91-100%**.

⭐ **Its sabotage is the point:** a layer keyed the way the feeds key it
(`J.Smith`, `M.Evans`) must come back BELOW the floor. **If that sabotage
passes, the floor is decorative and the silent-absence bug is back.**

#### Two traps hit building it

1. ⛔ **Temporal dead zone.** The crosswalk loader was declared below its first
   use. `const` is not hoisted, so the section threw `ReferenceError` and the
   symptom was an EMPTY section — **the same shape as the bug being fixed.**
2. ⚠️ **Deleting the hand-written aliases caused a regression.** The crosswalk
   knew CANONICAL names; the layers are keyed by FEED spellings. Fixed twice
   over: `variants()` harvests `first_name` / `common_first_name` /
   `football_name` from the release, and the resolver keeps a reverse index of
   each layer's own keys by id.

**MEASURED**, `n=19` layers, every one above the floor. Join-rate measurement
it replaced: `scripts/measure-name-joins.py`.

### ⭐⭐⭐ §11l · A SNAP SHARE MEANS NOTHING WITHOUT THE ROOM AROUND IT (Sep 19, 2026)

**Plain version first: a player's snap share is only readable against the shares
of the other players at his position on his team.** 37% is a demotion or a
specialist role depending entirely on who has the other 63%, and the card never
said.

⛔⛔ **WHAT IT COST.** Pittsburgh lists **Jaylen Warren DC1** and **Rico Dowdle
DC2**. Week 1: **Warren 37% of snaps, Dowdle 58%.** A comparison was run for
his lineup, the 37% was spotted, and it shipped as *"a committee number, watch
the Pittsburgh backfield"* — a hedge, not an answer. **One query would have
named Dowdle.** He asked why the rosters weren't up to date; the roster feed was
current to four days prior and correct. **The tool even printed
`*** MOVED: 2025 numbers are CAR, he is now PIT ***`.** The gap was the question,
not the data.

⭐⭐ **AND THE ANSWER INVERTED THE WORRY RATHER THAN CONFIRMING IT.** Warren took
**16 touches on 25 snaps**; Dowdle **13 on 39**. Warren outscored him 7.8 to 3.1.
The low share was the **passing-down role in a split defined by down** — Dowdle
early downs, Warren third down — so it was never evidence of a demotion.
⚠️ **A hedge can be wrong in the optimistic direction too.**

#### Why `rosterMatesOn` did not catch it

The existing helper answers *"do I own two players in the same backfield"* — a
handcuff check across **his own roster**. ⛔ **Dowdle is not on his roster**, so
nothing fired. **The threat to a player you start is usually a player you do not
own**, which is the opposite population.

#### What it prints

```
  SNAP SHARE this season  37%  over 1 game(s)  (latest 37%)
  THE ROOM at RB on PIT  (his share is above)
    DC2  rico dowdle             58% snaps
    DC4  eli heidenreich          4% snaps
    A DEPTH-CHART LABEL IS NOT A ROLE. Compare the SHARES, not the DC numbers.
```

Capped at five and filtered to a real share or `DC <= 4`, because an unfiltered
WR room prints nine camp bodies and the three names that matter stop standing out.

#### ⭐ The guard protects against SILENCE, not wrongness

**Guard 48 (`test-scout-room.mjs`), 12 assertions.** If `roomOn` ever returns
nothing — a renamed status field, a changed team code, a filter that
over-filters — **the section simply does not print and the output looks exactly
as finished as it does today.** So the guard asserts the room **IS there**, not
only that it is right when present. It also asserts every name resolves to the
same team and position in `status_2026`, and its sabotage plants a LAC back in a
PIT room and requires the check to reject it.

**MEASURED**, `n=2` rooms end to end (PIT RB, IND WR) inside a 2,196-assertion
suite, exit 0.

### ⭐⭐⭐ §11m · COVERAGE SHAPE, MEASURED — AND IT INVERTED THE FOLK MODEL AGAIN (Sep 20, 2026)

**His instruction:** *"add coverage shape into our future analysis as well, i want to
know what defenses run and what offense pieces exploit them."*

#### The conflict that had to be resolved first

`build-coverage.py` already kills coverage as a predictor, PER PLAYER: the man/zone
edge repeats at **r = 0.161**, a coin flip, on about 70 targets. It is withheld from
the app AI on purpose.

⭐⭐ **His ask survives that, because it is a DIFFERENT question.** Not *how does
this receiver do against man* (n about 70, noise) but *which ARCHETYPE does a
coverage shape feed*, pooled over the season (n about 16,700). **Same upgrade §11j
made for blitz.** His own Sep 17 ruling already permits it: a metric the app will
not use can still be shown in conversation.

#### MEASURED, 2025, league-wide, n = 16,687 labelled targeted pass plays

```
MAN vs ZONE          WR      TE      RB        behindLOS  short0-9  mid10-19  deep20+
  zone             55.3%   24.5%   20.1%          19.7%     49.1%     20.3%    10.9%
  MAN              64.8%   23.1%   12.1%          12.3%     49.5%     24.6%    13.6%
  change            +9.4    -1.4    -8.0           -7.4      +0.4      +4.3     +2.7

COVER-2 vs REST      WR      TE      RB        behindLOS  short0-9  mid10-19  deep20+
  other cov        59.7%   23.9%   16.4%          16.3%     48.3%     22.9%    12.5%
  COVER-2          54.3%   24.8%   20.9%          20.4%     51.7%     18.1%     9.7%
  change            -5.4    +0.9    +4.4           +4.1      +3.4      -4.8     -2.7
```

⭐⭐ **MAN COVERAGE REPRODUCES §11j EXACTLY, FROM A DIFFERENT FEED.** Receivers
`+9.4`, backs `-8.0`, and the throw goes DEEPER not shorter. **Two independent
measurements now say the same thing: whatever keeps a back out of the route tree
hands his targets to the receivers.**

⛔⛔ **AND COVER-2 INVERTED WHAT I TOLD HIM ONE TURN EARLIER.** I wrote that
cover-2 *"squeezes the middle, which is exactly where a slot receiver operates"* and
used it as a point AGAINST starting Makai Lemon. **The count says cover-2 pushes
targets SHORTER: behind the line `+4.1`, short `+3.4`, and what actually gets
squeezed is the MIDDLE DEPTH, `mid 10-19` at `-4.8`, plus deep at `-2.7`.**
**Lemon ran 4 targets for 0 air yards and -5 yards — he works at and behind the
line, which is the band cover-2 FEEDS.** ✅ **The Boston call still stood on rank 1
and rank 2 alone; the coverage sentence was struck, not the conclusion.**

⭐ **The reusable form: a cover-2 defence surrenders the flat and the checkdown and
takes away the dig and the post. A man defence surrenders downfield receiver work
and takes away the back.**

#### ⚠⚠ THE CONFOUND, NAMED BECAUSE IT IS NOT RULED OUT

**These are DESCRIPTIONS, not causes.** Coverage is not called at random:
**cover-2 is a protect-the-lead call**, so the offence facing it is often trailing
and throwing underneath, and **man is called on third down and near the goal line.**
⛔ **So some of every row above may be DOWN, DISTANCE AND GAME SCRIPT rather than
coverage.** Nothing here is shown to repeat year to year either.
✅ **Usable to ORDER two close options. Never to make a good player bad.**

**Reproduce:** `python scripts/measure-coverage-consequences.py --season 2025`
(`--selftest` has four assertions incl. a must-fail proving unlabelled coverage
rows are dropped rather than silently bucketed).

### ⭐⭐⭐ §11n · A PER-GAME EXPECTED OVER A PARTIAL APPEARANCE IS DILUTED, AND NOTHING SAYS SO (Sep 20, 2026)

**His catch:** *"how are we assessing wentz... if hes not in the app doesnt that mean
hes not accurately assessed? if you dont have information on him please go online."*

⛔⛔ **TWO FAILURES IN ONE ANSWER, AND BOTH WERE MINE.**

**1 · `findPlayer` IS ADP-GATED.** It resolves against `ADP_DATA` / `ADP_SUPERFLEX` /
`ADP_YAHOO`. **Carson Wentz was an undrafted backup in August, so he has no ADP row and
the comparison column printed `NO MATCH`** — while he holds a `status_2026` row, a
crosswalk id, a `player_metrics_2025` row AND an `expected_2026` row. **Fourth instance
this session of an absence that reads like a fact.** ✅ Fix belongs in `scout.mjs`, not
`App.jsx`: fall back to the crosswalk + status population when `findPlayer` returns null.

**2 · AND THE NUMBER I FELL BACK ON WAS WORSE THAN NO NUMBER.** `expected_2026` gave
Wentz `exp_pg 10.12, rank 29/37, gp 1`. **He entered that game in the FIRST QUARTER**
after Kyler Murray was concussed — 12-of-19, 133 yards, 3 TD, 17.2 actual in roughly
three quarters of relief. ⛔ **`gp` counts a partial appearance as a whole game, so the
per-game rate is divided by a denominator the player never played.** Nothing in the
output flags it. **I quoted `10.12` against Shough's `28.29` and told him the decision
"isn't close." The gap was an artifact.**

⭐ **THE RULE: before quoting any `exp_pg` at `gp <= 2`, check whether the games were
STARTS.** `matchup-brief.py` already has `partial_games()` at a measured 0.20 threshold
— **the concept exists in this repo and is simply not wired into the expected block.**

#### ⭐⭐ AND THE SECOND HALF, WHICH IS THE BANKED RULE I ONLY HALF-RAN

CLAUDE.md says: *if the files do not have the answer, say so, THEN ACTUALLY SEARCH.*
**I said so and stopped.** He had to ask. ⛔ **A stated gap is not a discharged gap.**
**One search settled all three open questions in under a minute:** Wentz starts with
Murray in protocol; his last line was relief, not a start; and **his Chicago claim was
RIGHT — the Bears allowed 37 in a 59-37 game.**

#### ⚠⚠ THE TENSION WORTH KEEPING: EXPECTED LOOKS BACKWARD, THE MARKET LOOKS FORWARD

**`expected_2026` prices the opportunity an offence handed a player LAST week. The
implied team total prices THIS week.** For Shough they disagree hard — `28.29` expected
against a **19-point implied team total**, the lowest on his board. ⭐ **Per
`betting/BETTING-ANALYSIS.md` the closing line is unbiased, so on a forward question the
market is the better input and a one-game expected is not entitled to overrule it.**

**MEASURED**, n=1 diluted case found; the ADP gate is confirmed by reading `findPlayer`.

### ⭐⭐ §11o · BOTH 11n FAILURES ARE FIXED, AND THE SCOPE OF THE FIX IS THE DESIGN (Sep 20, 2026)

**`resolvePlayer()` in `scout.mjs`** tries `findPlayer` first, then falls back to the
2026 depth chart resolved through the crosswalk, and marks the hit `noAdp`. The card
then prints a banner saying WHY the ADP-derived rows are thin instead of the whole
player vanishing. ✅ **Wentz now renders — and surfaces `2025 expected 17.47/gm, rank
17 of 81, 79th percentile over 5 gp`, which is a far better read on him as a starter
than the diluted current-season number I had been quoting.**
⛔ **The fallback must NOT make everything resolve.** A typo that becomes a confident
card about the wrong person is worse than the bug. Guard 50 asserts a nonsense name
still exits non-zero.

**The dilution flag** prints the per-week snap share under any `THIS SEASON` expected
row at `gp <= 2`, and calls it a **PARTIAL START** only when a QB is under 90%.

> ## ⭐⭐ **THE QB-ONLY SCOPE IS THE WHOLE DESIGN, NOT A SHORTCUT.**
> **A quarterback either started or he did not, so a low share means he entered or
> left.** ⛔ **For a back or receiver a low share is usually his ROLE.** Flagging
> Jaylen Warren's 37% as a "partial game" would be flatly false and would manufacture
> the exact confident-wrong output the flag exists to prevent. **He gets pointed at
> THE ROOM instead.** Guard 50 asserts both directions.

⚠️ **AND A CORRECTION TO 11n, WHICH OVERSTATED ITS OWN CASE.** 11n called the 10.12
an artifact. **Wentz played 83% of the snaps, not a quarter of the game** — dilution of
roughly a sixth, not three quarters. **The larger driver was real: Minnesota ran 65
offensive snaps to New Orleans' 90, because the Vikings were LEADING.** ⭐ **A
correction is not exempt from being checked.**

**Guard 50, 12 assertions**, both must-fail directions proven.

### ⭐⭐⭐ §11p · CUSTOM SCORING INVALIDATES THE EXPECTED MODEL, AND IT REVERSED A CALL (Sep 20, 2026)

**He sent his league settings and asked whether they change the assessment. They did.**

⛔⛔ **THE APP'S `expected_*` IS HALF-PPR. A league with custom scoring is being priced
under rules it does not use, and NOTHING IN THE OUTPUT SAYS SO.** Every figure quoted for
his 2QB league had the wrong scoring underneath it.

#### The two settings that did the damage, both invisible to the model

| setting | league | Yahoo default | who it pays |
|---|---|---|---|
| **Completions** | **0.1** | 0 | **volume passers** — 27 attempts is ~1.7 pts before a yard |
| **Rushing 1st downs** | **0.5** | 0 | **rushing QBs and short-yardage backs** |
| Receiving 1st downs | 0.5 | 0 | possession receivers, high catch rate |
| Receptions | 1 | 0.5 | full PPR |
| 40+ yd play / TD | 1 / 2 | 0 | explosive players, deep threats |

⚠⚠ **AND THE APP CANNOT COMPUTE TWO OF THE THREE BIGGEST ONES.** `gamelogs_*` carries
**`att`, not completions**, and carries **no first-down data at all**. So a repricing is
REASONED, never MEASURED. **Say which.**

#### ⭐⭐ THE CALL IT REVERSED, AND THE REASONING ERROR UNDERNEATH IT

**I had recommended benching Malik Willis for Carson Wentz**, on the grounds that Minnesota
was implied for 22 and Miami for 15.5.

⛔⛔ **THAT LOGIC RUNS BACKWARDS FOR A QUARTERBACK.** A 13.5-point underdog THROWS MORE.
**A low implied team total is a volume signal for its passer, not a warning about him** —
trailing badly is the classic high-attempt quarterback environment, and at 0.1 a completion
the garbage time pays. **I used a TEAM-SCORING proxy for a PLAYER-VOLUME question.**

✅ **Repriced off the real week-1 lines: Willis ~21.7, Wentz ~18.5.** Willis ran 6 times for
39 and a score; Wentz has no rushing floor, and his big week was **3 passing TDs on 19
attempts** — the least repeatable line in football, and a shape this scoring does not reward.

#### The rule

⭐ **BEFORE ANY LINEUP ANSWER, ASK WHAT THE LEAGUE ACTUALLY SCORES.** Scoring is not a
detail that shifts a number — **it changes which ARCHETYPE wins**, and here it flipped a
recommendation. ✅ **His four rosters now record their scoring in the file header.**
⚠️ **A repricing that estimates completions or first downs is REASONED.** The direction
survives; the digits do not.

### ⭐⭐⭐ §11q · THE REPRICER — STOP ESTIMATING CUSTOM SCORING, COUNT IT (Sep 20, 2026)

§11p had to reprice his league BY HAND and tag the result REASONED, because
`gamelogs_*` carries `att` and not completions, and no first-down or sack data at
all. **`scripts/reprice.py` reads play-by-play directly, so every term is COUNTED.**

⛔ **It keys on GSIS id, never on the pbp name field.** Those are abbreviated
(`T.Shough`), and §11h records a whole measurement that came back empty for exactly
that reason.

#### What it found, and the shape of the answer is the point

**Week 1 under league 967682 scoring** *(completions 0.1, pass TD 5, INT -2,
**sacks -1.5**, 1st downs 0.1, +2 at 300 yds and +3 at 400)*:

```
  TYLER SHOUGH  30.20            CARSON WENTZ  17.72
    35 completions      +3.50      12 completions      +1.20
    410 pass yds       +16.40      133 pass yds        +5.32
      yardage bonus     +5.00      3 pass TD          +15.00
    3 pass TD          +15.00      3 sacks             -4.50
    19 pass 1st dn      +1.90      7 pass 1st dn       +0.70
    2 forty-yd comp     +3.00
    2 INT               -4.00
    5 SACKS             -7.50
    2 fumbles, 1 lost   -4.00
```

⭐⭐ **SHOUGH WON BY 12.5 WHILE ABSORBING 15.5 POINTS OF PENALTIES** — in the one
league of his that charges for sacks, interceptions AND fumbles. That is the
strongest form a result can take.

⭐⭐⭐ **AND THE DECISIVE READ IS WHERE THE POINTS CAME FROM, NOT THE TOTAL.**
**15 of Wentz's 17.72 were three passing touchdowns on NINETEEN attempts** — the
least repeatable line in football. **Shough's came from volume**: completions,
first downs and yardage bonuses, which this scoring pays for and which repeat.

⛔ **AND THE SACK PENALTY DOES NOT FAVOUR WENTZ, WHICH IS THE OPPOSITE OF THE
INTUITION.** Sack RATE: Shough `5/61 = 8.2%`, **Wentz `3/22 = 13.6%`.** Per dropback
Wentz was sacked more often. **A raw sack COUNT compared across two very different
attempt volumes is the same error as comparing a raw dud rate across positions.**

#### ⚠⚠ The ambiguity it refuses to hide

Yahoo prints *"2 points at 300 yards; 3 points at 400 yards"* and stacks milestone
bonuses. **Top-tier-only would read 28.20 instead of 30.20.** `--bonus-top` prints
the other reading and the output flags any line where they differ. ⛔ **A silent
choice between two readings is the failure this file exists to stop.**

**Guard 51** runs the selftest and **pins both transcribed league tables**, because a
scoring table copied off a settings page by eye is exactly what rots. It asserts the
contrast that decides players: **first downs pay 0.1 in one league and 0.5 in the
other, and only one charges for a sack.**

### ⭐⭐⭐ §11r · A MEAN CANNOT ANSWER A START/SIT CALL. THE SHAPE CAN. (Sep 20, 2026)

**His question, and it is the sharpest one he has asked:** *“knowing the chances of
shough having an average game or a really bad game would actually help me decide… if he
has a good chance of posting a decent floor game i dont mind keeping him in.”*

⭐ **He asked for a DISTRIBUTION, not a projection.** `scripts/qb-floor.py` reprices every
game a QB has played under a named league and reports the spread and how much of the
downside is penalty-driven. **It imports `reprice.py`'s scoring rather than restating it**
— two scoring tables drift, and this repo has paid for that class a dozen times.

#### ⛔⛔ ALL THREE PLANKS OF HIS OWN HYPOTHESIS WERE CONTRADICTED

**He reasoned: Baltimore is good, so Shough gives back points; Wentz has the better line,
so start Wentz.** Measured over 2025 plus 2026 week 1, in his league's scoring:

```
                    games   median   20+     15+     under 8   penalty given back
Tyler Shough          11     19.3    45%     64%       18%     median 6.5, 55% of games >6
Carson Wentz           6     15.1     0%     67%       17%     median 8.0, 50% of games >6

BAL defence    1.78 sacks/gm  0.67 INT/gm   costs a QB 4.0 pts/gm in this scoring
CHI defence    2.06 sacks/gm  1.33 INT/gm   costs a QB 5.8 pts/gm
```

**1 · BALTIMORE IS THE SOFTER DEFENCE.** Chicago takes back **5.8 points a game** to
Baltimore's **4.0** — more sacks and TWICE the interceptions. **Wentz faces the more
punishing defence, not Shough.**

**2 · WENTZ IS THE MORE PENALTY-PRONE QB.** Median given back **8.0 against 6.5**. The
better offensive line (12th vs 16th, same PFF tier) does not show up in his results.

**3 · THE FLOORS ARE INDISTINGUISHABLE** — 64% vs 67% at 15+, 18% vs 17% under 8 —
**and only one of them has a ceiling.** ⭐⭐ **Wentz has NEVER reached 20 points in this
scoring in six games, including one where he threw FIFTY-THREE times.** Shough has cleared
20 in five of eleven.

⭐⭐⭐ **SO THE TRADE IS NOT FLOOR-FOR-CEILING. IT IS THE SAME FLOOR, A WORSE
OPPONENT, A WORSE PENALTY PROFILE, AND NO CEILING.**

#### ⭐ The attempts check is what killed the obvious objection

Wentz's zero-for-six at 20+ would be meaningless if those were relief appearances. **They
are not: 23, 53, 37, 44, 32, 23 attempts.** Four are full starts. ⛔ **Check whether a
sample is what it claims BEFORE reading a rate off it** — §11n is the same lesson on a
diluted per-game denominator.

⚠️ **PROVENANCE: `n = 11` and `n = 6`, both small; the defensive rates are `n = 18` games
each and are solid.** A distribution describes games already played. Shough's eleven are
mostly his rookie season and his best game is the most recent one, which cuts in his favour
and is not in the rate.

### ⛔ A FALSE ALARM WORTH RECORDING, BECAUSE THE FIX WAS A DENOMINATOR

The first run looked wrong: blitzes were **29% of targeted passes** against a league rate near 13%,
and the definition was nearly widened to "fix" it. ✅ **Nothing was wrong.** `n_blitzers >= 1` is
**13.8% of ALL plays**, and roughly half of all plays are passes — so 13.8% of everything IS ~29% of
passes. ⭐ **Two correct numbers with different denominators look exactly like one broken number.**
**Checking before adjusting is what kept the finding intact.**

### What it is worth, and what it is not

✅ **It answers a recurring question in one line: a blitz-heavy opponent is a small positive for a
tight end and a real positive for a receiver, and a genuine negative for a pass-catching back.**

⛔⛔ **IT STILL CANNOT DECIDE A LINEUP.** This is a LEAGUE AVERAGE across a full season. What a
specific receiver does against a specific coverage repeats at `r = 0.161`, a coin flip, and nothing
here changes that. ⭐ **It describes a tendency at the position level; it is not a player-level
edge, and the two must never be swapped.**

⚠️ **One season, and the blitz label is one charting provider's judgement.**

---
## §12 · Changelog

> **Capped at 12 entries. Drop the oldest — full history is in git.**

| Date | Change |
|---|---|
| Sep 5 2026 | §15 — TEP banked (reference only); count corrected to 3 TEs at every anchor tier |
| Sep 3 2026 | Yahoo Fantasy API pull — real free agents, live roster, this week's opponent |
| Sep 2 2026 | Turn-aware reaches — a reach is only a reach if the player survives to your next pick |
| Sep 2 2026 | findPlayer step 5 repairs a one-character surname misread; test-findplayer could not fail |
| Sep 2 2026 | A negated affiliation is still an affiliation — guard 12 rule 3 |
| Sep 1 2026 | The Rottweiler added — the first format whose two weekly gates are exactly equal |
| Sep 1 2026 | §14a — the three open in-season gaps, written as a handoff |
| Sep 1 2026 | Waiver-target pool: the first feature that ranks players you do NOT roster |
| Sep 1 2026 | TPRR (r=0.67) and man/zone coverage (r=0.16) built — Tier C to Tier A in one day |
| Sep 1 2026 | Separation is confounded by route depth (r=−0.69); sep+ added |
| Sep 1 2026 | §3 defines the Source Hierarchy — the `rank` field was used 28 times and never explained |
| Sep 1 2026 | Cutdown-day news sweep: Jacobs on the exempt list, 7 entries refreshed |

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
| [Expected fantasy points](#expected-fantasy-points--r----rank-2) | What his chances SHOULD have been worth, in points. Beats actual points only in weeks 1-2 |
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
| ~~1~~ | ~~No free-agent pool~~ | **CLOSED Sep 1 2026** — see below |
| 1 | **News is hand-maintained** | A 30-45 day freshness rule is right for August. In October it is three days. **Needs a sourcing decision, not just code — see §14a** |
| 2 | **No opponent awareness** | Weekly head-to-head decides whether you need floor or ceiling this week |
| 3 | **Rest-of-season SOS** | `sos_2026.json` is a static full-season figure. In Week 10 the played half is noise |

**Closed Sep 1 2026: the waiver pool.** `buildFreeAgentPool` ranks every player
not on your roster, scored on role change, volume, targets per route,
availability and separation — Source Hierarchy order, **with matchup data
deliberately absent from the score.** Redraft only: Underdog best-ball rosters
lock after the draft, so a waiver pool there is a feature that cannot be acted on.

**⚠️ It states its own limit on screen, because the limit is real: the app does
not know the other rosters in your league.** It ranks players not on YOUR roster
that a league of this depth plausibly leaves unrostered, and offers an exclusion
box rather than pretending to see a waiver wire it cannot. Guard 25.

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

## §14a · The three open in-season gaps — a handoff

> **Written Sep 1 2026 for a session picking this up cold.** Sources below were
> probed on that date and returned 200; re-check before building, per
> [R19](#analysis).

### GAP 1 — News is hand-maintained, and October breaks the freshness rule

> ## ✅ HALF CLOSED, Sep 1 2026. The STATUS half shipped as `grading/data/status_2026.json`
> ## (Sleeper, context-only, **not wired to App.jsx at all** pending a one-week watch of the
> ## feed). The PROSE half is unchanged and correctly stays hand-written — the split below
> ## was MEASURED afterwards and 0 of 15 sampled entries could be supplied by a feed.
> ## Full record: CLAUDE.md § The Status Layer. **What remains open: the layer is unwired,
> ## and a depth-chart CHANGE is undetectable because the file is a snapshot with no history.**

**Current state, measured:** `RECENT_NEWS` holds **87 entries (66KB)** and
`SITUATIONS` **143 (88KB)**, all written by hand. `parseNewsDate` extracts a
date from the prose (or reads a structured `date` field), and the card ages each
note against the framework's **30-45 day** re-validation rule.
`scripts/report-stale-news.mjs` enumerates what has expired; it currently
returns zero.

**Why it breaks in season.** Thirty days is a reasonable shelf life for an
August camp report. In October a depth chart can invert in a week, and this
season already produced two entries that inverted inside 48 hours (Alec Pierce
activated off PUP; Josh Jacobs to the Commissioner's Exempt List the day after
an entry described an open review).

### ⚠️ THE DECISION IS NOT "REPLACE THE PROSE WITH A FEED". IT IS A SPLIT.

The layer is carrying two different things and only one of them is automatable:

| | Automatable | Example |
|---|---|---|
| **Structured status** | **yes, free, weekly** | out / questionable, depth-chart slot, team change, PUP |
| **Analytical judgement** | **no** | *"the filing carries no domestic-violence designation, which weakens the case for the six-game baseline"* |

**No free feed produces the second kind, and it is the reason the entries are
worth reading.** So the shape to aim at is: automate the facts, keep the
argument by hand, and let each carry its own freshness clock.

### The two free sources, both verified Sep 1 2026

**A. nflverse `injuries` release** — `injuries_<season>.csv.gz`, HTTP 200,
124KB, **6,068 rows for 2025, weeks 1-22.**

```
gsis_id · full_name · team · week · position
report_status            Out 1,396 · Questionable 1,281 · Doubtful 106
practice_status          Full / Limited / Did Not Participate
report_primary_injury    body part
```

- ~~**Joins on `gsis_id`**, the same key every other layer uses.~~ ⛔ **CORRECTED Sep 1 2026, and BOTH HALVES WERE WRONG.** nflverse does carry `gsis_id`, but **no layer in `grading/data/` keys on it** — all 19 files key on a LOWERCASED FULL NAME (checked, not assumed). And the source that shipped, Sleeper, carries `gsis_id` on **147 of 812 skill players, 18%**. So this is a NAME-RESOLUTION problem, the class that produced `findPlayer`, the alias table and three guards — see `build-status.py`'s header.
- **Drops straight into `refresh-inseason.sh`** as a fourth builder.
- ⚠️ **It is the official injury report and nothing else.** No trades, no
  suspensions, no depth-chart moves, no coaching changes. Jacobs on the exempt
  list, Kaleb Johnson traded to GB, Penix winning a job — this source sees none
  of them.
- ⚠️ Game-week cadence, so it lags a mid-week transaction.

**B. Sleeper public players API** — `api.sleeper.app/v1/players/nfl`, no auth,
HTTP 200, **14.6MB, 12,225 players.**

```
injury_status · injury_body_part · injury_notes · status (Active/Inactive/PUP)
depth_chart_order · news_updated (epoch ms)
```

- **`depth_chart_order` is the valuable field.** Role change is rank 1 in the
  hierarchy and the app currently infers it only from snap trajectory, which
  lags by a week. A depth-chart slot is same-day.
- **`news_updated` gives a real timestamp**, which is exactly what
  `parseNewsDate` has to reconstruct from prose today.
- ⚠️ **14.6MB must never be committed.** A builder extracts the draftable
  players and writes a small file, the way every other layer does.
- ⚠️ Third-party, unversioned, and it can change shape without notice — unlike
  a pinned nflverse release. Treat availability as a runtime risk.

### What a session needs to decide, in order

1. **Do the two clocks get different thresholds?** Recommended: status ~7 days
   in season, analytical prose 21-30. Today one rule covers both.
2. **Which source, or both?** nflverse is the safer dependency and covers the
   injury report; Sleeper adds depth chart and a real timestamp. They are not
   redundant.
3. **What happens on a CONFLICT** between a fetched status and a hand-written
   note? The existing rule says the freshest dated entry wins, but a same-day
   feed will out-date every prose note permanently, which would quietly demote
   the analysis to decoration. **This is the part most likely to go wrong.**
4. **Does any of it reach the AI prompt?** `RECENT_NEWS` is pasted verbatim
   today ([R7](#prose)), so a fetched field lands in front of the model the
   moment it is added.

**Constraint that does not move:** whatever ships is CONTEXT. It must not reach
`analyzeRoster` or `analyzeRedraft`, and it needs a containment guard like every
layer since Jul 26 2026.

### GAP 2 — No opponent awareness in redraft

The app grades a roster against the schedule. It never asks **who you are
playing this week**, which is what decides whether you want floor or ceiling.
A heavy favourite wants floor; a big underdog needs variance.

Smallest honest version: one input for the opponent's projected total, and a
line on the lineup panel saying which way to lean. **The app cannot see the
other manager's roster**, so anything more is asserting what it does not know —
same rule the waiver pool follows.

### GAP 3 — `sos_2026.json` has no rest-of-season view

It is a static full-season figure. In Week 10 the played half is noise and the
number is describing games that already happened. A `remaining` field computed
from the current week would fix it, and the current week is now available from
`seasonNow()`.

⚠️ Inherits the standing caveat: defensive quality is pinned at 2025 for both
seasons, and **the SOS rank convention is INVERTED** relative to
`getMatchupTier` (rank 1 = easiest slate there, softest single opponent here).
Never compare the two numbers directly.

---

### One closing observation

The app grades **structure** — stacks, positional shape, playoff schedule — and
it grades that well. What it has historically been thin on is **the players
themselves**: the AI saw an ADP, some outcome rates, and a matchup tier that is
now measured as the *least* reliable input in the building.

The layers added Aug 30-31 put role, deployment, talent, floor and vacancy in
front of the model. Not to change the grade. **To make the paragraph next to the
grade worth reading.**

---

## §15 · TEP scoring — the TE-premium variant

> **Banked Sep 5 2026 as REFERENCE ONLY. Nothing here is wired to the app and
> nothing should be.** The scoring engine is half-PPR throughout; a TEP roster
> graded through `analyzeRoster` gets its STRUCTURE read correctly and its TIGHT
> ENDS undervalued. Making the grade TEP-aware would touch every TE evaluation in
> every format and need its own calibration. **Read this section when a TEP roster
> arrives; do not act on it in code.**

### What TEP is

**Tight end receptions score 1.0; every other reception scores 0.5.** Underdog
runs it as a slate variant (The TEP Frenchie, 2026: $5 · 22,320 entries · $100k ·
18 rounds · QB1/RB2/WR3/TE1/FLEX1/BENCH10). Everything else is standard
half-PPR with 4pt passing TDs.

### ⚠️ IT IS A McBRIDE TAX, NOT A POSITIONAL RESHUFFLE

The delta is `+0.5 × receptions`, so it scales with volume — and reception counts
among startable TEs are compressed (4.0-4.8/gm), which makes the effect far
flatter than the format's reputation.

```
2025, value over replacement (TE12 baseline)      half-PPR    TEP    change
TE1  McBride   126 rec                              6.12      8.00   +1.88
TE2  Kraft      64 rec                              3.90      4.10   +0.20
TE3  Kittle     57 rec                              3.34      4.07   +0.73
TE4  Bowers     64 rec                              3.10      3.93   +0.84
TE6  Pitts      88 rec                              1.06      1.76   +0.70
TE8  Fannin     72 rec                              0.65      1.07   +0.42
```

**Only the single elite-volume TE gains meaningfully.** TE2 through TE12 move
+0.20 to +0.85, which is noise at draft-capital scale.

**And the TE curve stays UNDER the WR curve at every rank even in TEP** — TE1
18.58 against WR1 19.41, TE3 14.65 against WR3 15.69.

### Where it DOES change something: the flex

```
              half-PPR    TEP
TE12             8.75    10.58
WR30             9.52     9.52
WR36             8.78     8.78
```

In half-PPR your TE2 and WR4 are interchangeable in the flex. In TEP the tight
end wins by roughly two points. **That is the real structural shift, and it is an
argument for MORE tight ends, never for EARLIER ones.**

### ⚠️⚠️ THE CEILING ON TE VALUE IS LOWER THAN SIX OTHER PLAYERS' — STRUCTURAL

The one finding here that does not depend on knowing which TE hits:

```
CEILING on VOR by position (TEP, 2025, 12-team QB1/RB2/WR3/TE1/FLEX1)
  RB  McCaffrey   10.45      TE  McBride   8.00   <- TEP's absolute best case
  WR  Nacua       10.02      QB  Allen     5.33

six non-TEs exceed the best possible TE:
  McCaffrey 10.45 · Nacua 10.02 · Taylor 8.78 · Bijan 8.31 · JSN 8.29 · Gibbs 8.26
```

**Even a perfect TE pick is worth less than the top ~6 non-TEs**, so a TE inside
the first six picks is dominated regardless of which one you take. That is the
only hard constraint in this section; everything else is market-dependent.

### The marginal-TE gradient — REPRICED AT ACTUAL DRAFT COST

Max-of-N per week on 2025 logs, anchors listed at what they REALLY cost rather
than at app ADP. **The better and more durable the anchor, the less every
additional TE is worth — and the room total barely moves across the whole range.**

```
anchor          went at   TE1 alone   +TE2    +TE3    +TE4    room
McBride              10      17.79    +2.22   +0.89   +0.08   20.99
Bowers                6      10.25    +4.64   +2.25   +0.64   17.78
Kraft                38       6.89    +6.78   +2.56   +1.33   17.56
Pitts                47      11.71    +3.84   +0.92   +0.54   17.01
Kelce                95      11.00    +3.63   +1.08   +1.28   16.98
Kittle               83       9.04    +5.28   +1.59   +0.58   16.49
Ferguson            105      10.86    +3.22   +1.34   +0.92   16.34
Warren               22      10.64    +3.61   +1.48   +0.55   16.28
```

**Every room except McBride's lands between 16.3 and 17.8.** A round-1 tight end
buys about 1.5 points a week over a tenth-round one, and costs a first-round pick
to do it.

### ⚠️⚠️ CORRECTED Sep 5 2026 — THE COUNT IS 3, WHATEVER THE ANCHOR

**This section originally read "elite anchor -> 2 TEs, good -> 3, none -> 4."
That was WRONG, and it was wrong because the gradient above measures the TE SLOT
ONLY.** Max-of-N asks which tight end fills one lineup spot. It cannot see the
FLEX — and the flex is the entire structural point of TEP.

```
                                McBride's TE2 is worth
max-of-N   (TE slot only)              +2.22
full roster (slot + FLEX)              +4.31     <- nearly double
```

Re-run as a full-season optimal lineup across all three anchor tiers, swapping
only what each path actually forces you to give up:

```
anchor tier                          1 TE     2 TE     3 TE     4 TE    best
ELITE   McBride  (10, lose Taylor)  119.25   123.56   124.53   123.15   3 TE
MID     Kittle   (57, lose Moore)   121.82   130.02   131.91   131.74   3 TE
NONE    Ferguson-led (actual)       123.64   128.74   129.85   129.70   3 TE
```

**Three is optimal at every tier and it is not close.** One tight end is
catastrophic in all three (-4 to -10 a week). Two is a large step up. Four is
slightly negative, because by then the extra TE is crowding out the receivers
competing for the same flex slot.

**The anchor changes WHICH tight ends you own and WHAT YOU PAY. It does not
change how many.**

### A single TE is the worst construction available in this format

Best ball has no waiver wire, so one tight end means a **zero in that slot every
week he is out** — in the format where that slot is worth the most. McBride
missed one week in 2025, so the +4.31 baseline is measured on a near-perfect
season. Simulated across missed time:

```
games the anchor misses    TE slot solo    with TE2    TE2 is worth
   0                          17.79          20.01        +2.22
   2                          15.69          18.81        +3.12
   4                          13.60          17.65        +4.05
   6                          11.49          16.42        +4.93
   8                           9.43          15.28        +5.84
```

At roster level with four games missed the 2-TE build gains **+6.08** over solo.
**The insurance case is the part to weight, because it does not depend on the
anchor repeating a career year.**

### ⚠️ TE2 QUALITY MATTERS — a last-round dart does not function as one

```
TE2 = Hunter Henry  (pick 129)    +2.22 in the TE slot
TE2 = Parkinson     (pick 189)    +0.08
```

Henry at 10.52/gm out-scores McBride in enough weeks to actually win the slot;
Parkinson at 9.27 almost never does. **Spend a real pick on TE2 — rounds 11-13,
not round 16.** The third TE is where a late dart belongs.

### ⚠️ TESTED END TO END ON A REAL ROSTER — the anchor paths LOSE

Full-season optimal-lineup simulation, seat 9, swapping only what the pick
actually forces you to give up:

```
build                                     pts/wk   vs actual
ACTUAL — Taylor R1, 4 late TEs            127.54       —
McBRIDE R1 (lose Jon Taylor), 2 TEs       123.56    -3.98
KITTLE at 57 (lose DJ Moore), 3 TEs       129.29    +1.76
ACTUAL with Otton instead of Helm         128.19    +0.66
```

**Taking the best tight end in the format at pick 9 cost 3.98 points a week**,
because it costs an 8.78-VOR running back and the TE room was already covered.
**The winning path was the middle-round anchor nobody wanted.**

### ⚠️⚠️ THE ANCHOR COMES TO YOU — BUT YOU HAVE TO ACTUALLY TAKE HIM

The most useful single view is the menu at each of your own picks. George Kittle
(14.68 TEP/g, 4.10 VOR) **sat on the board through SIX consecutive picks**:

```
pick   best TE available    VOR      what was taken instead   VOR
   9   McBride     18.58    8.00     Jonathan Taylor          8.78   correct
  16   Kittle      14.68    4.10     CeeDee Lamb              3.19   -0.91
  33   Kittle      14.68    4.10     DeVonta Smith            0.22   -3.88
  40   Kittle      14.68    4.10     Josh Allen               5.33   correct
  57   Kittle      14.68    4.10     DJ Moore                -0.72   -4.82
  64   Kittle      14.68    4.10     Jaylen Warren            1.26   -2.84
  81   Kittle      14.68    4.10     Dak Prescott             0.75   -3.35
  88   Goedert     12.34    1.76     RJ Harvey               -0.29   -2.05
 105   Ferguson    10.95    0.36     Ferguson                 0.36   taken
```

**He was the best player available at five of the six**, and went at 83 to
someone else. Pick 9 (Taylor over McBride) and pick 40 (Allen over Kittle) were
the only two correct passes.

**So "wait" is only half the rule, and the passive half.** The market's
overpricing collapses somewhere in the middle rounds and leaves a genuine anchor
sitting there — the discipline is to notice and take him, not to keep waiting
until round 12 on principle.

### ⚠️ TE ADP INFLATES, AND THE TOP INFLATES WORST — measure it as a SHARE OF PRICE

From one full 12-team TEP board (216 picks, Sep 5 2026): **38 TEs drafted, 17.6%
of the draft, 3.17 per team.** Against `ADP_DATA` (half-PPR priced) the median
TE went **+29.1 picks early**, +35.9 inside the first 110.

**RAW PICK DELTAS LIE AT BOTH ENDS OF A DRAFT, and reading them cost a wrong
recommendation before it was caught.** +15 picks at pick 6 means passing on
fifteen first-rounders; +30 at pick 189 costs nearly nothing, because the talent
curve is flat there. Measured as a share of ADP the ranking inverts completely:

```
                  picks early    % of ADP        raw-delta read    correct read
Loveland  pick 12     +34           74%          "modest"          worst reach
Bowers    pick  6     +15           71%          "cheapest"        2nd worst
Warren    pick 22     +42           66%
McBride   pick 10     +15           60%          "cheapest"        4th worst
Kittle    pick 83     +34           29%          "expensive"       first fair price
Henry     pick 129    +21           14%          "cheap"           cheapest
```

**Always express draft-price deviation as a proportion when comparing across
rounds.** This is the same class as the turn-aware reach fix in CLAUDE.md: a
pick number is not a constant unit of cost.

### What the early TEs actually cost

VOR against the best non-TE taken in the next twelve picks, same board:

```
pick   6  Bowers    VOR  3.93   passed on McCaffrey 10.45   COST -6.51
pick  10  McBride   VOR  8.00   passed on Achane     7.02   WON  +0.98
pick  12  Loveland  VOR -0.26   passed on Achane     7.02   COST -7.29
pick  22  Warren    VOR  0.51   passed on Pickens    4.94   COST -4.43
pick  38  Kraft     VOR  4.07   passed on Josh Allen 5.33   COST -1.27
pick  39  LaPorta   VOR  1.30   passed on Josh Allen 5.33   COST -4.04
pick  47  Pitts     VOR  1.82   passed on Lamar     -1.04   WON  +2.86
```

**Two of seven early TE picks beat their opportunity cost.** Loveland at 12 was a
BELOW-REPLACEMENT tight end taken in the first round.

### The operational rule

**Cap the premium at ~30% over normal-format ADP.** On the observed board that
produced a clean crossover: no TE was buyable before **Harold Fannin at pick 71**;
**Kittle at 83** was the first one worth wanting; 23 of 32 cleared the cap and all
of them went after 71.

```
1. Never a TE inside the first six picks.           structural, always holds
2. Watch the room. 50%+ reaches mean keep waiting.  market-dependent
3. Buy the moment a real TE is BEST AVAILABLE.      Kittle from pick 16 on
4. Then take THREE. Not two, not four -- see the correction below.
```

**Step 3 is the one that was nearly missed.** An earlier draft of this section
said "buy under a ~30% premium, which was pick 71 here" — true, and passive. The
simulation says the best available path was **Kittle at 57**, fourteen picks
before the premium rule would have cleared him, because by then he was simply the
best player on the board.

**"Wait until 70" is NOT a law — it is what this room's bidding produced.** In a
room that does not reach, the crossover moves earlier and an anchor at a fair
price is worth taking.

### Confidence

**The market half is 38 real picks and I would trust it directionally.** The
"which TE was good" half is **one season used as hindsight (points/gm r=0.699)** —
Kittle looks like the best buy partly because he produced in 11 games, and that
~80% availability is exactly why he fell to 83. **n = 1 draft board.** Re-measure
against a second TEP draft before treating any threshold here as settled.


---

### ⭐⭐⭐ §11s · THE WEEK 2 REFRESH FOUND THREE BUGS, AND THE WORST ONE PRINTED A CLEAN ZERO (Sep 22, 2026)

**Plain version first: pulling Week 2 was meant to be a data chore. It uncovered
three separate ways this toolchain reports something false without erroring.**
All three are the same disease in different clothes — **an answer that looks
finished and is not** — which is the root cause already banked eleven times.

#### 1 · THE TUESDAY TRAP: a refresh DELETED the only forward-looking input

`refresh-inseason.sh` step 9 asked ESPN for the current week and got **2**.
Week 2 was already over. **A finished game carries no betting odds**, so the
pass wrote **16 unpriced games over 16 priced ones** and the implied totals and
spreads — CHECK 4 of the seven checks, the only layer in the app that looks
FORWARD — were gone.

⭐ **ESPN's "current week" is the week that just ENDED until it rolls over
mid-week.** Nothing in the script knew that, and the refresh is designed to run
on exactly the day the bug fires.

✅ **FIXED.** The step now tests whether every game in the week is `post` and
advances to the next week if so. Verified end to end: `week 2 is already final -
advancing to 3`, 16 of 16 priced.
⭐ **Guard 34 caught it** by failing on a zero-priced file, which is the guard
earning its keep. **But it only fires at `npm test`, AFTER the good file is
already overwritten** — so a guard that catches a destructive write is a second
line, never the first.

#### 2 · THE ROOM WAS READING A FILE NOTHING REFRESHED

`snap_current_2026.json` said `weeks_covered: 2` and **only two teams had a
Week 2 row** — it was built on the Saturday, so its Week 2 was the Thursday
night game alone. ⛔ **`build-snap-current.py` is not in `refresh-inseason.sh`
at any step.**

⚠️ **THAT FILE IS WHAT THE ROOM BLOCK READS**, and THE ROOM is **check 1** of
the seven — *who else is in the room*. So the check built to stop the Jaylen
Warren failure was itself running on stale data.
✅ Rebuilt: 454 players, 30 teams in week 2. **Wired into step 1 of the refresh
script**, reusing the snap_counts download step 1 already makes.

##### ⛔⛔ 2b · AND THE REBUILD PRODUCED A FOURTH BUG, WHICH I BANKED AS FACT

The 30 teams were **LA and NYG short, and I wrote here that they were ON BYE.**
**They were not. Nobody was on bye.** The game logs carried all 32 teams for
week 2 the whole time — **snap_counts simply had not published those two games
yet.** Caught because Wan'Dale Robinson scored 1.9 for a team I had just called
idle, and the contradiction was checkable in one query.

⭐⭐⭐ **THE MECHANISM IS THE ONE THIS SECTION IS ABOUT, POINTED AT ME RATHER
THAN AT THE CODE.** `build-snap-current.py` calls a week **complete at 30-plus
teams** — deliberately, because two teams really are on bye most weeks. **So a
real bye and an unpublished release render identically, and the file says
`complete` for both.** I read a gap, reached for the pleasant explanation, and
did not check it against a source that knows the schedule.

⛔ **A GAP IS NOT A REASON FOR A GAP.** The file cannot tell the two apart —
nothing in `snap_counts` says who was scheduled — so it must not guess, and
neither should a reader.

✅ **FIXED, and the fix is disclosure rather than cleverness:** `_meta` now
carries **`weeks_missing_teams`**, naming every team with no row in a week, with
a caveat saying it does not say WHY and that a week can be `complete` and still
be missing two. **`{"2": ["LA", "NYG"]}` is now printed instead of inferred.**

#### 3 · TWO REAL PLAYERS SHARE A NAME, AND THE REPRICER PICKED THE WRONG ONE

⛔⛔ **THE WORST OF THE THREE, because it did not fail — it priced a starter at
a confident `0.0 PTS`.**

The crosswalk drops an ambiguous name from `by_name` and keeps both entries in
`by_name_pos`:

```
justin jefferson|WR  ->  00-0036322     (the receiver)
justin jefferson|LB  ->  00-0041075     (a linebacker)
```

`reprice.py` looped `by_name_pos`, took **the first key in dict order** and
broke. `LB` sorts before `WR`. **A linebacker has no offensive play-by-play
rows, so the line priced to a clean zero** and printed in the column beside the
real players with no warning — for a **WR1 who had just played 100% of snaps.**

⭐⭐⭐ **THE REUSABLE LESSON: a wrong-player zero is worse than a crash.** A
crash gets fixed in a minute. **A zero gets believed, and it gets a starter
benched.** And it renders *identically* to a real zero, which is the
silent-absence class — **except this one also passed the absence check**, since
the name did resolve. It resolved to a person.

✅ **FIXED, and the shape of the fix is the point:**
- candidates are filtered to the positions the tool can actually price;
- exactly one skill match wins (Jefferson now prices at 8.7, not 0.0);
- **two skill matches is a HARD STOP naming both**, never a silent pick;
- the error hands over the escape hatch: `reprice.py ... "Antonio Williams|WR"`.

⚠️ **A refusal is the right output here.** `Antonio Williams` is a real RB *and*
a real WR; nothing in a roster file says which, so the tool must ask.

#### 4 · AND THE SAME THREE FUNCTIONS WERE DUPLICATED, AGAIN

`norm()` and the resolver existed **twice** — once in `reprice.py`, once in
`qb-floor.py`. ⛔ **Twelfth instance of the duplicate-definition class in this
repo.** Both copies also missed the generational suffix that
`build-player-ids.py` strips when it BUILDS the crosswalk, so
**`Michael Pittman Jr.`, `Luther Burden III`, `Chris Rodriguez Jr.` and
`Michael Penix Jr.` — four players on his rosters at once — were unresolvable.**
`scout.mjs`'s `nmKey` has stripped suffixes since the fourth instance; the two
python scripts never caught up and **nothing compared them.**

✅ `qb-floor.py` now imports `norm`, `score`, `LEAGUES` and `resolve_ids` from
`reprice.py`. One definition each.

#### 5 · THE GUARD, AND WHY IT DOES NOT STRING-MATCH

Guard 51 gained six assertions that **RUN both normalizers and compare their
output**, rather than asserting a regex looks right.
⭐ **The first draft of that block did string-match — and its regex was wrong,
so it would have passed itself.** That is the guard-that-cannot-fail class,
caught live while writing the guard for it.
✅ **Sabotage-proven:** removing the suffix strip fails 4 assertions; restoring
it passes all 6.

#### 6 · VALIDATION, BECAUSE A MEASUREMENT IS NOT TRUSTED UNTIL IT REPRODUCES

The repriced Week 2 lines were checked against `gamelogs_2026` — a **different
feed** (nflverse `stats_player`) than the repricer's play-by-play.
✅ **13 of 14 agree to the rounding.** The one gap is **Denzel Boston, +1.0**,
and it is **explained rather than excused**: he caught a 40-plus-yard TD, which
Football Baybee pays a point for and a generic half-PPR feed cannot see.
**A disagreement you can name is a validation; one you cannot is a bug.**

⛔ **WHAT IS STILL ABSENT AT TWO WEEKS, and none of it is a lookup failure:**
`snap_trajectory_2026` wrote **0 players** (a split-half needs more than one
week a side), `volume_2026` trend reads `insufficient` for all 302, and FPA
holds 2 weeks against 3-and-4-week gates. ⭐ **So RANK 1 of the Source
Hierarchy — role CHANGE — has no data yet, and will not until about Week 4.**
Say that out loud rather than letting rank 2 quietly stand in for it.
