# What Legendary Upside changes about RosterXRay — the Aug 25, 2026 audit

> ## THE ONE SENTENCE
> **The corpus does not challenge your framework. It fills the single hole your own framework
> already names** — `CLAUDE.md` says TPRR and route participation "would slot" into metric tier 2
> and "no public routes data exists... stays paywalled." **You now own that paywall, and the
> numbers are in the prose: 371 YPRR figures, 75 route-participation figures, 46 TPRR figures.**

**Provenance.** Everything below is **MEASURED** from `_corpus/legendary-upside/` (50 articles,
270,529 words) against this repo's `CLAUDE.md`, `grading/data/breakouts-2026.md` and
`grading/data/player_metrics_2025.json`. Where something is inference it is tagged **REASONED**.

**Coverage: 40 of the 41 players on your 2026 breakout board appear in the corpus.** Only
Jadarian Price is thin. This is not a source that touches your board at the edges.

---

## 1. ⭐⭐ THE GAP IT FILLS — route data, tier 2 of your own hierarchy

**What your framework says now.** `CLAUDE.md` metric hierarchy, tier 2:

> *"(True YPRR/TPRR and route participation would slot here — no public routes data exists, the
> NFL participation feed died after 2023; `snap_sh` in player_metrics is the route-participation
> proxy... Volume ceiling = routes x TPRR, so a low snap/route share caps everything else — the
> Josh Downs gate.)"*

And separately: *"TPRR — the source's 'intent' metric, and its sharpest idea — needs routes run
and stays paywalled... **Do NOT substitute target share for it.**"*

**What is now on disk.** Route-based figures quoted per player in the prose:

| Metric | Count in corpus |
|---|---|
| YPRR figures | **371** |
| Route participation figures | **75** |
| TPRR figures | **46** |
| First-read target rate figures | 7 |

Worked examples of the exact shape your hierarchy wanted: *"unless McDaniel stops limiting his
top WRs to well below 85% route participation, we need outsized target rates to generate
high-end volume"* — that is the volume-ceiling constraint stated as a coaching property. And
*"both TEs were hurt by Charlie Kolar's 27% route participation on play action dropbacks"* — a
split (play-action route participation) that `snap_sh` cannot express at all.

**The consequence.** `snap_sh` was standing in for route share because nothing better existed.
For the ~50-80 players the corpus discusses in depth, a real number now exists. **This does not
become a data file** — it is prose, per player, unevenly available. Treat it as a manual override
for named players, in the same slot SITUATIONS/RECENT_NEWS occupies.

⛔ **Do not build a scraper for this.** The figures are scattered across sentences in 50
articles, not tabulated. The ranking tables are images — **981 images against 95 markdown table
rows** across the corpus.

## 2. ⭐ THE METRIC THAT UPGRADES A TIER — first-read target rate

**What it is, plainly.** How often a receiver is the play's *intended first look*, as a share of
his routes. Not whether he caught it, not whether the ball came — whether the play was designed
to go to him first.

**Why it matters to you specifically.** Your tier 1 is *"Role/opportunity CHANGE — most causal,
freshest."* Your tier 2 is opportunity volume. **First-read target rate is a tier-1 metric, not a
tier-2 one** — it measures how the offense was *designed*, which is upstream of target share.

**The measured evidence, three separate breakouts, same signal, same jump:**

| Player | Year before | Breakout year |
|---|---|---|
| Calvin Ridley | 16% | **22%** (2020) |
| Amon-Ra St. Brown | 17% | **23%** (2022) |
| Cooper Kupp | 18% | **24%** (2021) |

**A ~6-point jump into the low 20s, three times.** *(n=3 and hand-picked by the author, so this
is a pattern to test, not a threshold to hardcode. **REASONED** beyond the three numbers.)*

**Where it plugs in.** Lens 1 already says *"Subdivide target share: inside-20 targets and air
yards share are the real signal."* First-read rate is the same idea one level deeper — and unlike
air-yards share it is a **change** metric, which is the only kind your hierarchy ranks first.

## 3. THE FOUR BREAKOUT FACTORS vs your Lens 1

Kerrane's framework for mid-round WR breakouts, built from every WR drafted rounds 4-6 since
2018 who hit 16+ PPR/game with a 12%+ best-ball win rate:

| His factor | Your framework already has | Verdict |
|---|---|---|
| **Becoming a higher-priority target** | Lens 1 target-share subdivision | ⭐ **UPGRADE** — he has a sharper metric (first-read rate) for the same idea |
| **More route volume** | tier 2 volume; `snap_sh` proxy | ⭐ **UPGRADE** — real route participation numbers now exist |
| **Upgraded QB play** | Lens 3 *"QB situation grade on WR verdicts"* | ✅ **MATCH** — you already require this |
| **Undervalued TD equity** | Lens 1 *"Red zone and goal line touches are standalone scoring equity signals"* | ✅ **MATCH** |

⭐ **Two of four you already had. Two of four he does better, and both are the ones that needed
data you did not have.**

## 4. ⭐ THE PARLAY TEST — your galaxy-brain rule, made countable

**Your rule today** (Lens 5): *"the signal that a thesis has crossed into galaxy-brain territory
is when it requires multiple unconfirmed assumptions to hold simultaneously."*

**True, and it has no procedure.** Nothing tells you how to detect it.

**What Kerrane does instead — he enumerates the parlay out loud.** On Rome Odunze:

> *"we need quite the parlay. We need Caleb Williams to improve dramatically, for the Bears to be
> willing to run their offense through his arm, and for Odunze to produce far more efficiently
> than he did as a rookie, while emerging as the receiving focal point ahead of D.J. Moore, and
> then also hold off a rookie emergence from Luther Burden or Colston Loveland."*

**Five conditions, listed, then priced.** That is your rule with a countable output. **The
smallest useful change in this whole document: on any breakout thesis, write the parlay as a
numbered list before assigning conviction.** A thesis needing five independent things is not
"aggressive," it is a five-leg parlay, and saying so out loud is what stops it.

## 5. ⭐ THE PRICE-PRECEDENT TEST — an addition to your ADP Delta Rule

**What you do now.** ADP delta is mandatory on every verdict — the gap between your valuation
and market price.

**What he adds.** Compare the price to *the last player who fit this exact profile*:

> *"Last year, coming off a similarly disappointing rookie season, Jaxon Smith-Njigba was a
> seventh-round pick... We're paying a ~15 pick premium on the same bet. And because of that
> premium, if Odunze doesn't hit, it's going to hurt a lot more."*

**Why this is different from your ADP delta.** Yours asks *is he mispriced against my number?*
This asks *is the archetype mispriced against what it cost last time?* It catches a whole
category getting expensive, which a per-player delta cannot see. **REASONED** — the method is
his; the claim that it complements your rule is my inference.

## 6. THE TWO APPARENT CONFLICTS ON YOUR BOARD — and neither is real

Apex Score rates two of your conviction-tier players as fades. **The author disavows both in the
same articles**, which is the single most important thing in this section.

| Player | Your board | Apex Score | What Irby actually writes |
|---|---|---|---|
| **Omarion Hampton** | RB **#1**, conviction tier | 6.65, **21st** (bearish) | *"his 2025 is basically a throwaway not even worth considering. **His upside profile should be better than Apex Score indicates.**"* — missed 7 games, compromised OL, Roman offense, now McDaniel |
| **Parker Washington** | WR **#8** | 3.92, **69th** (bearish) | *"this is a two-year model, and Washington's 2024 stuff is like a lead weight dragging it down... doesn't seem like such a bad deal in the fifth round to me when properly contextualized"* |

⭐⭐ **This is your own source-hierarchy rule proven by an outside model.** Your law says *"matchup
tiers and FPA decide ORDERING between otherwise-close options. They never make a good player bad."*
Apex Score is a different metric with the same failure mode — **and its own author applies your
rule to it.** Both flags are sample artifacts (missed games, a dragging prior year), exactly the
class of contamination your Stat Validity Auditor exists to catch.

⛔ **Nothing on your board should move because of an Apex Score.**

## 7. ⚠️ WHAT IS DATED AND MUST NOT BE USED AS A LIVE VERDICT

**The corpus spans Aug 2023 to Aug 2026.** Most Breakout Hunting articles are **2025** pieces
about the **2025** season. Their conclusions are historical.

Worked example: the Odunze article concludes ***"Odunze is fade"*** — dated **Aug 8, 2025**, at a
2025 ADP of 60, reasoning from a 2025 depth chart (D.J. Moore ahead, Burden and Loveland
arriving as rookies). **Your 2026 thesis is a different argument** (man/press percentiles through
a lost year, Moore's outside snaps vacated).

⭐ **The rule: take the METHOD from the old articles and the VERDICTS only from the current-season
ones.** A 2025 fade call is not evidence against a 2026 buy.

## 8. WHAT IT DOES NOT CHANGE — where you are already ahead

- **Your ceiling-shape layer stays tier 4.** Apex Score is a serious attempt to make
  ceiling-shape data predictive via two-year weighting and stability testing, and its author still
  says *"Apex Score is not the whole solution"* and expects it to degrade out of sample. Your
  demotion of spike/dud/usable to "descriptive, not projection" is the more conservative call and
  nothing here overturns it.
- **Your position normalisation is more rigorous than his.** Your baselines are computed medians
  (`{QB .530, RB .235, WR .091, TE .059}`) with a guard test. His 3-6-9-3 apex definition (three
  QBs and TEs, six RBs, nine WRs) is a reasoned convention he presents as *"for whatever that's
  worth."* **Do not replace a measured baseline with his convention.**
- **Everything structural** — stacking, playoff windows, construction, orphan classification,
  advance rate, blowout risk. The corpus is a player-evaluation source and says nothing about
  roster architecture.
- **His correlation thresholds are usable as-is:** above 0.4 meaningful for WRs, above 0.5 highly
  significant, five-to-ten-year window, anchored to next-season PPR — with his own caveat that the
  *ordering* of stats between studies is unstable and only the persistence of a signal matters.

## 9. WHAT TO ACTUALLY DO, RANKED

| # | Action | Cost | Why this order |
|---|---|---|---|
| 1 | **Write the parlay as a numbered list on every breakout thesis** | free, prose rule | No data needed, applies to work you already do, and Lens 5's galaxy-brain rule has no procedure without it |
| 2 | **Pull route participation / TPRR / YPRR for the ~40 board players** and put them in SITUATIONS as dated manual entries | one sitting | Closes the named tier-2 gap for exactly the players you actually draft |
| 3 | **Add first-read target rate to Lens 1** as a tier-1 change signal | small edit | Sharper than the target-share subdivision already there |
| 4 | **Add the price-precedent check to the ADP Delta Rule** | small edit | Catches archetype inflation a per-player delta cannot see |
| 5 | ⛔ **Do not import Apex Score into the grade** | — | Circular against your 2025 metrics, and its own author overrules it on two of your conviction players |

---

**Related:** [APEX-SCORE-COMPARISON.md](APEX-SCORE-COMPARISON.md) — the 48-player join, the
circularity problem, and the eight disagreements. Corpus and its two harvest rails are documented
in the main project `CLAUDE.md`.
