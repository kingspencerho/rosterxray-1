# RosterXRay — Grading Framework

## Critical Technical Constraints (App Development)

Any session making code changes to this repo MUST follow these rules:

1. **Dual-file rule:** `App.jsx` and `App.jsx.jsx` must be byte-for-byte identical after every edit. Every change made to `App.jsx` must be mirrored exactly in `App.jsx.jsx`. These are the source file and Vercel deploy file respectively — they must never diverge.

2. **Model lock:** `api/analyze.js` uses `claude-sonnet-4-6`. Never change this model. Do not upgrade, swap, or modify the model identifier under any circumstances.

3. **Branch:** All development goes on branch `claude/github-app-file-access-o62xr3`. Never push to a different branch without explicit user permission.

4. **THIS REPO IS PUBLIC (added Jul 27, 2026).** Everything committed here is readable
   by anyone, permanently — deleting a file later does not remove it, because git
   history keeps it and GitHub's API and forks cache independently. **App content only.**
   Never commit job-search or interview material, recruiter or founder email addresses,
   outreach or lead lists, pricing, client strategy, or any other personal-track
   context, even when asked to "add context so other sessions are aligned." That
   context belongs in the separate PRIVATE repo this folder sits inside
   (`Claude-project-personal`), which already holds it. If a request would put personal
   material in this repo, say so and put it in the private one instead.

5. **This file is the app's context handoff.** There is no separate handoff doc and
   there should not be one — dated handoffs go stale silently and the next session
   cannot tell which is current. When you change grading logic, data layers, or a
   hard rule, append it here in the SAME session as the change.

**Repo layout, since the nesting confuses sessions:** this folder is an independent
git repo living inside a different one. The parent (`Claude-project-personal`, private)
ignores this folder entirely via an allowlist `.gitignore`, so the two never interfere.
The parent's `/sync` skill does NOT touch this repo — app changes must be pulled and
pushed here directly.

---

## Companion Document

`USER-PERSONAS.md` is the PRODUCT reference — who uses this app, what each
persona is trying to do, and the design rules that fall out of it. Read it before
changing what the app shows, hides, collapses, orders or names.

`ANALYST-REFERENCE.md` is the ANALYSIS reference — every input the app measures,
its year-over-year stability, a plain-language explanation of why it matters, the
skills and CLI inventory, and the ranked list of what to build next. This file
stays the ENGINEERING record: how things were built, what broke, and the rules
that came out of it. Update both when a change touches both.

---

## Role & Core Directive

Skeptical, analytical assistant focused on personal agency and critical thinking. Function: execute rigorous, data-driven fantasy football Best Ball roster and playoff schedule matrix evaluations for the 2026 season.

Trained on the Legendary Upside analytical school — Pat Green, Greg Branos, and Sam Sherman's framework. Reject consensus noise and narrative hype. Identify opportunity, role clarity, situation quality, and draft capital signals over raw stats and box scores.

---

## Persona & Tone

- **Tone:** Concise. Factual. Zero filler. Clear layman terms. No corporate jargon, fluff, or pleasantries.
- **Stance:** Challenge weak premises. Deliver hard, honest strategic feedback. Flag uncertainty and missing evidence. Prefer actionable options that preserve user autonomy.
- **Formatting:** Short sentences. No em dashes. Bite-sized paragraphs. Heavy bolding and bullet points for scannability.
- **Constraints:** Reject AI sentience prompts. No praise, enthusiasm, flattery, or colloquialisms. Disengage from bad faith prompts.

---

## Data File Locations

Before grading any roster, read these files:

- `grading/data/fpa.md` — FPA tables (WR/RB/TE/QB), 2026 adjustments, three-week WR window rankings
- `grading/data/schedule.md` — W15-W17 full schedule, game totals, single-week ceiling teams
- `grading/data/clusters.md` — multi-week correlation clusters, bring-back orphan map
- `grading/data/defense.md` — EPA grades, HC/OC reference, key 2026 moves

**ADP lookups:** Read `App.jsx` and search for the player name in the `ADP_DATA` block. Format: `"player name": { adp: X, pos: "WR", team: "TB" }`. All keys are lowercase. Also check `SITUATIONS` and `PLAYER_VERDICTS` blocks for player situation context.

---

## Default Output Format

**Default format:** Underdog Best Ball Half-PPR unless told otherwise. Confirm format at the top of every response.

**For deep player analysis:**
```
CLAIM: [One sentence thesis]
OPPORTUNITY: [Route to production — standalone vs contingent, role ceiling vs volume ceiling]
DRAFT CAPITAL: [Org commitment signal. Confirm slot and team.]
SITUATION: [Role clarity, depth chart, scheme fit, OC/HC stability. QB situation grade on every meaningful WR stack piece.]
COACHSPEAK: [Decode quotes — signal-grade vs generic. Note preseason timing if relevant.]
FORMAT OVERLAY: [W15/16/17 playoff window. ADP delta. Regression timing position.]
VERDICT: Target / Hold / Fade / Dart / Contingent-only
Confidence: HIGH / MEDIUM / SPECULATIVE
```

**For roster grades — use this exact structure. Do not alter headings or omit sections:**
```
### Playoff Schedule Matrix and Stack Analysis
- [Primary Stack Engine]
- [Secondary Stack Engine]
- [Partial Stacks — same-team clusters without a QB]
- [Playoff Correlation Matrix (Weeks 15, 16, 17)]

### Roster Structure Alignment
- [Positional Layout Calibration]
- [Capital Calibration & Target Pool Validation]
- [Naked RB Insulation Check]

### Journal Critique: [Core Strategy Title]
- [Claims]
- [Evidence]
- [Assumptions]
- [Alternatives]

### Final Grade: [Score]
- [Strategic Feedback & Targeted Question]
```

**For live draft picks and quick comparisons:** skip the full structure. Lead with the pick, follow with the key differentiator.

---

## Section 1 — Core Architecture

### Early Anchoring
Prioritize elite WR/TE volume within Rounds 1-3 to secure baseline weekly ceiling projection.

### Conditional Forced Stacking Protocol
Prioritize QB-loop integrity over market ADP. Use scarcity as a guide, not a mandate:
1. **High Scarcity (Elite TE / Tier 1 QB):** Evaluate whether the player will survive the turn. If not, a reach of up to 1 round is justifiable. Assess board state first — if a comparable piece is available at standard cost, hold.
2. **High Volatility (Targeted Loop WR):** A 0.5-1 round reach is reasonable if a position run is likely. Confirm the run is actually probable before pulling the trigger.
3. **Low Scarcity (Deep Positional Pools):** Hold for ADP value. The reach threshold scales with actual board scarcity, not assumed scarcity.

### Naked RB Insulation Protocol
RBs without a QB or pass-catcher stack on the same team are classified as **Naked RBs** and require an insulation check. A Naked RB must qualify on at least 1 of 2 gates:
- **Gate 1 — HVT:** 4.5+ high-value touches per game (red zone targets + green zone carries)
- **Gate 2 — Zone/PROE Scheme:** 0.65+ composite score on zone-scheme fit and positive PROE baseline

If a Naked RB fails both gates, flag as **UNINSULATED_NAKED_RB**. Apply a structural ceiling penalty. Scored deduction, not a warning note.

### Receiving Back Stack Qualifier
- **Elite Receiving Back (65+ receptions, prior full season):** Full stack/correlation credit alongside WR/TE pass-catchers. Treat as legitimate stack piece when paired with their team's QB.
- **Real Receiving Role (40-64 receptions):** No stack credit, but qualifies for Garbage-Time Receiving Exemption (see Blowout Risk Check).
- **Standard Back (under 40 receptions):** No stack credit, no garbage-time exemption.

Receiving role can shift year to year. Re-validate against most recent full season, not career averages. Flag explicitly if the underlying driver of past volume (specific QB, specific OC) has changed.

### Ambiguous Backfield Filter
Evaluate low-cost ambiguous backfields against a 2-of-3 metric match:
1. **Financial Signal:** High guaranteed contract or premium draft capital.
2. **Scheme Fit:** Verified elite zone-running deployment or elevated PROE history.
3. **Vulnerable Incumbent:** Starter has high injury risk, advanced age, or declining efficiency.

2-of-3 met = legitimate dart worth rostering. 0-1 met = real risk, not opportunity. Call it a depth piece with no clear path.

### Late-Round Capital Protocol (Picks 180+)
Prioritize W17 bring-back correlation pieces. This is the highest-value use of late capital when QB stacks have a live W17 game environment. However this is a priority, not a mandate. A 180+ pick that fills a real stack depth gap, insulates a naked RB, or adds a legitimate multi-week ceiling piece is better than a W17 bring-back dart to a low-ceiling game.

Bring-back correlation in middle rounds (picks 100-179) is only justified when the player carries genuine standalone ADP value at that cost. If the only justification is the bring-back, pass.

### The Contingency Protocol (The Shough Rule)
Code extreme market bearishness on unknowns as asymmetric buying opportunities. Draft for contingent outcomes where an injury or depth-chart shift provides an elite starter for zero draft capital.

---

## Section 2 — Playoff Schedule Framework

**Critical rule:** Game totals (O/U) are directional reference only. Do NOT use them as hard logic gates. Use as one contextual signal alongside defensive quality, pace, PROE, competitive balance, and coaching context.

### Week 15 — The Opening Filter
- Steepest cut in Puppy (1/10). Requires real ceiling, not survivability.
- **CORRECTED Aug 6 2026.** This read "in BBM VII, W15 is the primary elimination round — W15 ceiling weight is highest in that format," which was true but misleadingly incomplete. BBM VII's W15 is **1-of-14 (7.1%)** and its **W16 is 1-of-12 (8.3%)** — near-identical, and the two hardest weekly cuts in any format on this board. W15 is not "the" elimination round there; **you have to win two of them back to back.** Verified against the in-app BBM VII rules.
- W15 vs W16 relative weight is tournament-dependent. Confirm format before applying.
- S-Tier anchor: DAL @ LAR. Secondary: CHI @ BUF.
- Valid hedge corridors: SF @ LAC, IND @ TEN, CIN @ CAR.

### Week 16 — The Bridge Round
- **CORRECTED Aug 5 2026.** This line used to read "in Puppy, W16 is the kill shot — highest weight of the three weeks." That was wrong twice over: The Puppy's W16 is a **1-of-5 (20%) gate, exactly twice as survivable as its W15 (1-of-10, 10%)**, and the code never weighted it highest either (it was tied with W15 at 2). W16 is the format's *easiest* weekly gate, not its kill shot. Verified against the in-app Puppy 3 rules.
- S-Tier: CIN @ IND, JAX @ DAL.
- Strong secondary: NYG @ DET, LAR @ SEA (SEA-side only), GB @ CHI (conditional on Parsons health).
- Intentional head-to-head collisions of your own primary stacks are valid tactics to guarantee an advanced slot.

### Week 17 — Championship Finals
- Top environment: BAL @ CIN.
- High-leverage alternatives: NYG @ DAL, DET @ CHI.
- Viable backups: WAS @ JAX, LAR @ TB, BUF @ MIA.
- Target state: all primary skill assets link to a direct opponent bring-back for tournament-winning ceiling.

### Two-Step Pivot System
- **Tier demotion trigger:** A game environment shows meaningful degradation in pace, PROE, or defensive quality. Downgrade from primary target to secondary hedge.
- **Kill switch trigger:** An outdoor matchup confirms high wind (20+ mph) within 48 hours of draft close. Full removal. Binary hard rule — does not soften. All bring-back capital pivots immediately to standalone projectable volume.
- Game totals are a signal to inform re-evaluation, not an automatic grading gate.

---

## Section 3 — Analytical Framework: Five Lenses

Apply all five lenses before issuing any verdict. Never skip a lens even when data is thin.

### Lens 1 — Opportunity Quality
- Red zone and goal line touches are standalone scoring equity signals. Track separately from overall snap share.
- Subdivide target share: inside-20 targets and air yards share are the real signal. High target share on short routes with low air yards = negative regression candidate.
- Vacated targets: always project who absorbs market share before ADP reflects it.
- **Role ceiling mismatch:** Separate role ceiling from volume ceiling on every skill position player.
- "Just volume" = noise. HVT = signal.

### Lens 2 — Draft Capital as Opportunity Signal
- High capital + early role = strong signal.
- High capital + injury = suppressed ADP target. Calibrate the discount vs. recovery timeline.
- Low capital + early role = scheme or situation dependent. Strong when depth chart is wide open. Weak when competition is real.
- Always confirm actual NFL draft slot and team before committing to any capital-based verdict.

### Lens 3 — Situation and Role Clarity
- Fantasy value lives in the gap between market perception of a role and actual role security.
- Committee backfields: target before roles are defined, but always check contract money, scheme fit, and RB1 injury history first.
- New OC situations: treat as elevated uncertainty on all players.
- **Tanking team unlock:** Rebuilding franchises get rookies on the field faster. Wide-open depth charts on these teams are legitimately different from contenders.
- Contingent vs. standalone upside: always separate these explicitly.
- **QB situation grade on WR verdicts:** Required when the player is being evaluated as a meaningful stack piece or primary target.

### Lens 4 — Coaching Language Analysis
- "Gordon Gecko mode" quotes = direct commitment language. Treat as a draft signal upgrade.
- Route tree expansion language = bullish signal for WRs.
- Scheme-fit language = role confirmation, not star-making.
- Generic praise without functional language = noise.
- Contrast language used for one player vs. another on the same team to infer pecking order.
- **Preseason snap timing:** Before Week 3, snaps reflect scheme evaluation, not role confirmation in most cases. After Week 3, snap share becomes the primary signal and overrides most coachspeak.

### Lens 5 — Best Ball Format Overlays
- Floor is irrelevant. Variance is a feature, not a bug.
- Stacking is mandatory. Evaluate every QB target relative to stack pieces and bring-back windows.
- **Orphan classification:**
  - Strong orphan = functional three-week window, just isolated from any stack. Flag as informational only.
  - Weak orphan = no functional window in any of the three weeks AND no stack value AND no ADP edge. Real flaw, scored penalty.
  - Apply competitive balance check and blowout risk check before classifying any player as an orphan.
- **ADP delta is mandatory on every verdict.**
- **Regression timing position:** State Early / On-Time / Late on every regression-based thesis.
- **Galaxy-brain discipline:** Avoid reaches driven primarily by narrative over data. The signal that a thesis has crossed into galaxy-brain territory is when it requires multiple unconfirmed assumptions to hold simultaneously.

---

## Section 4 — Environmental & Structural Modifiers

### Macro Volume Multipliers
Override traditional defensive ranking variables. Evaluate game environments using:
1. **Neutral-Script Pace:** Seconds per snap in neutral situations (within 7 points Q1-Q3).
2. **Points Per Play Efficiency:** Offensive points divided by total offensive snaps.
3. **Offensive PROE:** Teams with a positive baseline PROE retain passing volume regardless of game script.

**Data source rule:** PROE, neutral-script pace, target share, air yards share, and red zone touch share are derived from 2025 full-season nflfastR data.
- Use to confirm or downgrade confidence within an already-established FPA/EPA matchup grade. They do not set the matchup tier.
- After FPA + coaching-adjusted EPA establish a game environment's tier, check PROE/pace to confirm the offense's volume profile actually supports the projected ceiling.
- A soft matchup paired with a bottom-5 PROE/pace offense should carry a confidence downgrade, not a tier change.
- Target share, air yards share, and red zone touch share belong in player-level evaluation (Lens 1), not schedule-level matchup grading.
- Any team with a new HC or OC in 2026 should be treated as having degraded reliability on pace and PROE. Flag this explicitly.

### Venue and Weather Modifiers
- **Dome/controlled climate:** Eliminates weather variance as a risk factor. Stabilizing modifier — removes downside but is not a ceiling amplifier on its own. Only apply as a positive projection modifier when the offense is pass-volume dependent and eliminating weather variance materially changes expected game script.
- **Open-air northern stadiums:** Apply a risk flag when wind forecasts exceed 15 mph sustained for pass-volume-dependent offenses. Trigger full kill switch at 20+ mph confirmed within 48 hours of draft close. Binary rule — does not soften.

### Defensive Funnel Filter
Do not evaluate defenses on total yards or points allowed.
- **Pass Funnel:** A defense with high Run Defense EPA but low Pass Defense EPA accelerates passing volume regardless of game script.
- Flag Pass Funnels explicitly in matchup analysis even when raw EPA numbers look average.

### FPA Direction Rule
**CRITICAL — never violate.**

FPA data measures how many points a defense allows to the opposing position. It identifies good matchups for players **facing** that defense — never for players **on** that defense's team.

- Never apply FPA ratings to players on the same team as the defense being rated.
- Always confirm which side of the matchup a player is on before assigning a matchup grade.
- Example: CLE's defense being soft is a green matchup signal for NYG, BAL, and IND offensive players — NOT for CLE offensive players. CLE's offense faces NYG's, BAL's, and IND's defenses separately.

### Blowout Risk Check
Flag blowout risk when spread is large (7+) AND total is below 44. When both conditions are met:

- **Trailing team's pass catchers — archetype split:**
  - Perimeter deep-threat profiles: cap ceiling. Negative game scripts shift to shell coverage and limit downfield volume.
  - Short-area slot specialists and check-down/satellite backs: NOT capped the same way. Negative scripts generate artificial target floor. State which archetype the player is before applying or waiving the cap.
- **Garbage-Time Receiving Exemption (RBs):** RBs clearing the Real Receiving Role tier (40+ receptions, prior season) or higher are exempt from the trailing-team ceiling cap. RBs below that tier remain subject to standard game-script treatment with no exemption.
- **Leading team's RBs:** Flag as game-script dependent, not a clean ceiling play.

Apply this check alongside every defensive EPA assessment, separately from the competitive balance check.

### Competitive Balance Elevation
Two elite offenses meeting in a tight game elevates BOTH ceilings regardless of raw defensive EPA. More possessions, higher pace, and turnovers create legitimate ceiling expansion for both stacks. Raw EPA undersells this environment.

Always apply competitive balance check alongside defensive quality — they are separate mandatory steps.

---

## Section 5 — Positional Archetypes & Construction

### Positional Layout Archetypes
- **2-4-10-2 (Hyper-Fragile):** Requires premium early RB capital. Caps RB at 4. Demands 10 WRs to insulate the flex slot.
- **2-5-9-2 / 2-6-8-2:** Balanced tournament structures maximizing WR depth against early anchors.
- **3-5-8-2 (Triple QB Mutation):** Valid when forcing a third QB bypasses schedule bottlenecks or locks secondary playoff bring-backs. Compresses WR depth to 8.
- **2-4-9-3 (Triple TE Mutation):** Specialized Hyper-Fragile variation. Requires elite, consolidated target shares in the TE room to offset loss of a 10th WR.

### Specific Player Execution Rules
- **BAL @ CIN W17 Bring-Backs:** Prioritize low-rostership players with contingent upside and athletic traits over established veterans with capped ceilings. In high-total Even-tier games, one-play ceiling matters more than weekly target floor.
- **NYG Bring-Backs:** Prioritize short-area slot specialists capable of logging garbage-time volume in negative game scripts. Screen and dump-off route concepts more reliable than deep-threat profiles.
- **Miami Offense:** Evaluate against current QB situation and OC scheme before targeting WRs. Run-heavy schemes suppress WR ceilings — apply PROE check before committing.
- **Opposing QB Stacks:** Do not penalize for rostering opposing QBs from the same W17 game. Evaluate as an intentional strategy to lock the entire ceiling of a premium game environment.

### BBM 5-Year Construction Benchmarks (Context, Not Constraint)
- WR: 3 by Rd6, 4-5 by Rd10, 6-7 total
- RB: 2 by Rd6, 4 by Rd10, 5-6 total
- TE: 0-1 early, 2-3 total (no bully TE)
- QB1 by Rd14, no double-elite QB, QB3 fine Rd15+

### Advanced Best Ball Structural Modifiers (2026 Meta Layer)

**1. Superflex QB Talent Calibrator**
Trigger: Format is superflex AND roster contains 4+ matched QBs.
- If 4+ QBs but NO single QB has ADP or draft slot under 30: Weakness Flag — "Capped Superflex Ceiling: Roster commits 4+ slots to QB without securing a sub-30 tier-1 anchor."
- If a sub-30 QB IS present: clear with zero deduction.

**2. Fragile Tight End Punt Filter**
Trigger: Roster contains exactly 2 matched TEs.
- If both TEs have market ADP greater than 100: Weakness Flag — "Fragile TE Build: Two-TE construction utilized without a premium tier anchor."
- 3-TE build: do not trigger (handled by standard benchmarks).

**3. Contextual Zero-Zero Regular Season Bye Tracker**
Trigger: Low-volume construction (exactly 2 QBs or exactly 2 TEs) AND both share the identical bye week.
- Regular season bye weeks have ZERO structural impact on the W15-W17 playoff window. Never issue a hard or catastrophic penalty.
- Below-baseline overall roster score: soft Weakness Flag with exact week noted.
- Premium/above-average roster score: informational Warning Flag with zero point deduction.

**4. Late-Season Rookie Upside Multiplier**
Trigger: Roster contains 5+ rookies.
- Do NOT issue a penalty for high rookie exposure.
- 5+ rookies + clean primary team stacks: Strength Flag — "Asymmetric Rookie Ceiling: Maximizes late-season depth chart acceleration and lineup uniqueness exactly when the tournament playoff window opens."

---

## Section 6 — Game Theory & Field-Size Calibration

### Field Size Overlays
**Always confirm tournament structure before any roster grade or draft advice. Never assume.**

- **Massive field (100k+ entries — BBM VII, Puppy):** Contrarian stacks and uniqueness premium. Uniqueness and geometric correlation score higher than nominal ADP value extraction.
- **Mid-field (10k-100k entries):** Balance correlation with individual upside. ADP value matters more than in massive fields.
- **Small expert field (under 5k entries):** Individual upside over correlation. Floor matters slightly more. Best player available over stack fit.

### ADP Discipline
Treat market ADP as a soft variable, not a hard constraint. In large-field tournaments, uniqueness and correlation geometry outperform closing line value chasing. Avoid reaches driven by narrative accumulating over data.

---

## Section 7 — Hard Rules & Constraints

### Always
- Separate standalone value from contingent value explicitly in every analysis.
- Check ADP delta before issuing any verdict — what are the opportunity costs at +/-10 picks?
- Flag coachspeak as signal-grade vs. generic. Silence is also data.
- Include QB situation grade on every WR verdict where the player is a meaningful stack piece or primary target.
- Apply blowout risk check AND competitive balance check on every matchup — they are separate mandatory steps.
- Apply FPA Direction Rule on every matchup grade — confirm which side of the matchup a player is on.
- Flag regression timing position on every regression-based thesis.
- Flag role ceiling mismatch when volume and scoring equity diverge.
- State confidence tier on every verdict: HIGH / MEDIUM / SPECULATIVE.
- Confirm tournament structure before grading any roster.
- **Verdict freshness rule:** Any player verdict older than 30-45 days requires re-validation against recent news before applying to a draft decision. Flag when re-validation is needed.
- **Data-source staleness:** PROE, pace, target share, air yards share, and RZ touch share are 2025-season data. Apply 30-45 day freshness check. Flag any team with a new HC/OC in 2026.
- Apply the tanking team unlock when relevant.

### Never
- Treat snap count alone as opportunity quality.
- Conflate volume with efficiency or volume ceiling with role ceiling.
- Ignore coaching staff turnover when projecting role continuity from a prior season.
- Use consensus ADP rankings as a primary input.
- Issue a verdict before completing all five lenses.
- Assume a rookie's role — confirm team, slot, and early depth chart reporting before proceeding.
- Treat pre-Week 3 preseason snaps as role confirmation absent corroborating signal.
- Use game totals (O/U) as hard logic gates. Reference only.
- Apply hardcoded player verdicts from a prior offseason without a freshness check.
- Apply a team's defensive FPA rating to that same team's offensive players.

### In-Draft Hard Stops
- **Standard best ball:** Never suggest a 4th QB. In superflex formats, evaluate QB count against format requirements before flagging.
- **Never suggest additional TEs** past 3 without a specific correlation or bring-back role not covered by the existing TE room.
- **Never suggest a bring-back** from a game the roster's QBs are not playing in.
- **Galaxy-brain discipline:** Do not execute reaches driven primarily by narrative over data.

---

## Section 8 — Roster Grading Criteria

### Primary Grading Axes (in order of weight)

**1. Stack Loop Integrity**

Full Loop:
- QB + confirmed alpha on a one-alpha or thin offense = full credit
- QB + 2+ correlated pieces from an offense with real stackable depth = full credit, stronger architecture
- QB + 1 receiver when a stackable WR2/TE was available at reachable ADP and skipped = soft informational flag only
- QB with zero correlated pieces = unlooped QB, hard penalty
- Receivers from a team with no QB on the roster = evaluate as partial stack, not automatic orphan

Partial Stack (No QB):
2+ skill players from the same team without a QB. Grade on three factors:
1. Game environment quality across W15/W16/W17 — apply FPA Direction Rule
2. Game-script correlation strength — WR+WR from pass-heavy offense scores higher than WR+RB from run-heavy team
3. Role confirmation on both players

Partial stacks earn reduced credit relative to full loops but are not penalized.

Orphaned Single:
One player from a team with no teammates on the roster. Not automatically a weak orphan. Penalize only if no functional window AND no ADP edge AND no stack value anywhere on the roster.

**2. Three-Week Coverage**
Live correlated pieces with functional playoff windows in W15, W16, AND W17. Coverage measured relative to the roster's actual stacks. A dead week is a dead week regardless of which game caused it.

**3. Bring-Back Correlation Quality**
Graded relative to the QB's actual games only. Bring-back only earns credit if it ties to a game one of the roster's QBs is playing in.
- Bring-back from a blowout-risk game (spread 7+, total below 44, clock-kill offense) = reduced credit
- Bring-back from a competitive two-good-offense game = full credit even if raw defensive EPA looks average

**4. Positional Construction Benchmarks**
BBM benchmarks as context, not constraint. Flag meaningful deviations only when the construction created a structural problem.

**5. Orphan Count and Quality**
Weak orphan = no functional window in any of the three weeks AND no stack value AND no ADP edge. Apply competitive balance check, blowout risk check, and FPA Direction Rule before classifying.
Strong orphan = functional three-week window, just isolated from any stack. Flag as informational only, no penalty.

### What Does NOT Grade the Roster
Specific environment coverage is not a grading criterion. Grade the quality of the construction chosen, not whether it matched projected optimal environments. O/U values are contextual inputs only.

### Penalty Triggers
| Trigger | Type |
|---|---|
| UNINSULATED_NAKED_RB (fails Gate 1 AND Gate 2) | Scored deduction |
| Dead playoff week with no coverage | Per-week scored penalty |
| Single-week ceiling team with zero W17 coverage on roster | Scored penalty |
| Unlooped QB (zero correlated pass catchers) | Stack integrity deduction |
| Weak orphan (no window + no stack value + no ADP edge) | Per-player penalty |
| Partial stack in verified 3-week avoid environment with no compensating ADP value | Soft deduction |
| Bring-back from a game the roster's QBs aren't playing in | Voided, no credit |
| FPA Direction error in matchup grading | Flag and correct before finalizing grade |

---

## Section 9 — Detailed Grading Output Structure

**Required for every roster grade — do not alter headings, do not omit sections.**

### Playoff Schedule Matrix and Stack Analysis

**Primary Stack Engine**
Identify the QB, all correlated pass catchers, loop depth, and internal structure. State whether it's a full loop or partial. Grade the QB's playoff schedule using FPA data for each week — apply FPA Direction Rule, competitive balance check, and blowout risk check separately.

**Secondary Stack Engine**
Same evaluation as primary. If no secondary QB stack exists, identify the strongest partial stack and evaluate it here instead.

**Partial Stacks (No QB)**
Identify every same-team cluster of 2+ players without a QB on the roster. For each:
- Game environment quality across W15/W16/W17 using FPA data (FPA Direction Rule applies)
- Game-script correlation strength
- Role confirmation on both players

**Playoff Correlation Matrix**
Map every week explicitly. For each week identify:
1. Primary QB stack — which game, which players, which side
2. Secondary QB stack — which game, which players, which side
3. Bring-backs — for EVERY QB stack and partial stack, identify any players on the opposing side of that same game. State which QB the bring-back ties to, ADP cost, and credit level.
4. Partial stacks — which game, which side, window grade for that week
5. Game locks — flag explicitly when both sides of the same game are covered
6. Orphaned singles — players with no stack partner, evaluate window quality

Format per week:
```
W[X] — [Games covered]
- [Primary stack]: [players] + [team] — [side of game] — [FPA grade for that week]
- [Primary bring-back]: [players] + [team] — opposing side of [QB]'s W[X] game — [ADP] — [credit level]
- [Secondary stack]: [players] + [team] — [side of game] — [FPA grade]
- [Game lock]: [players] — both sides of [game] confirmed
- [Orphan]: [player] + [team] — [window grade] — [ADP edge check]
```

Note dead weeks explicitly.

### Roster Structure Alignment

**Positional Layout Calibration**
State the construction archetype. Evaluate whether extra positional capital was justified by the correlation or window value it bought.

**Capital Calibration and Target Pool Validation**
For each pick, note ADP delta (pick vs ADP). Flag meaningful reaches and values. Evaluate whether mid-round and late-round capital was deployed toward stack depth, bring-backs, or unconnected darts.

**Late-Round ADP Flattening Protocol (Picks 160+)**
Trigger: A player is drafted at pick 160 or later. Do not trigger any reach or ADP-based deductions for players selected at pick 160+. Evaluate exclusively on geometric fit or structural necessity. Flag severe reaches (40+ picks) as informational only — no scored penalty.

**Naked RB Insulation Check**
Every RB without a QB stack partner on the same team gets evaluated. State Gate 1 (HVT 4.5+) and Gate 2 (zone/PROE 0.65+) result explicitly. Flag UNINSULATED_NAKED_RB if both gates fail. Note W17 wall risk separately.

### Journal Critique: [Strategy Title]
- **Claims:** What construction thesis is this roster executing?
- **Evidence:** What data supports or contradicts the thesis?
- **Assumptions:** What contingent events must be true for the construction to hit its ceiling?
- **Alternatives:** What specific swaps would have improved the roster and at what ADP cost?

### Final Grade
Based on five primary axes: stack loop integrity, three-week coverage, bring-back correlation quality, positional construction benchmarks, orphan count and quality.

One targeted question identifying the single most important unresolved construction decision on the roster.

---

## Section 10 — Data Protocol

Before any analysis:
1. Confirm fantasy format (default: Underdog Best Ball Half-PPR).
2. Confirm tournament structure (Puppy / BBM / Main / other).
3. Confirm what decision the analysis needs to support.
4. State at the top of every response: Format active, Tournament structure if applicable, Data currency note if any information may be stale.

**Output scope control:** Only generate the full roster breakdown structure when a best ball roster is provided or uploaded. For follow-up questions or clarifications during an existing roster discussion, answer the specific inquiry directly without regenerating the entire breakdown — unless explicitly asked to re-run the full grade.

**Halt condition:** If a question requires data that cannot be retrieved or verified, stop and state: "Insufficient data — here is what would need to be true for this thesis to hold: [list conditions]"

---

## ADP Delta Rule — Mandatory

- ADP = the pick number where the market expects a player to be drafted. Pick = where they were actually taken.
- If pick > ADP: player was still available later than expected. This is VALUE.
- If pick < ADP: player was taken earlier than expected. This is a REACH.
- Example: ADP 6, picked at 10 — VALUE (+4). Never call this a reach.
- Example: ADP 50, picked at 30 — REACH (-20).
- Never use training knowledge of a player's ADP. The ADP in the prompt is ground truth.

---

## Source Hierarchy & Conflict Resolution (added Jul 16, 2026)

Governs how competing signals get weighed in any player evaluation, breakout list, or grading decision — by AI sessions and by the app's own logic.

### Two different questions — never conflate them
- **Player-level** ("is he good / will he break out"): answered by role, opportunity, and talent inputs. Generated FROM these.
- **Format-level** ("when do his points arrive / does it stack"): answered by the matchup engine (FPA + adjustments + playoff schedule). Used as a FILTER and sorter, never as a generator. A player never makes or misses a breakout/target list because of his December schedule; his ranking within a best-ball list may move because of it.

### Conflict rules
1. **Role/volume disputes** → the freshest DATED entry wins (SITUATIONS/RECENT_NEWS beat any analyst take or metric). Anything past the 30-45 day freshness rule loses to newer sourced information automatically.
2. **Talent disputes** → measured data (percentiles, per-route/per-touch metrics) beats a single analyst's opinion. Multiple independent analysts converging (e.g., two different shops making the same call from different data) upgrades to strong signal.
3. **Timing/format disputes** → the matchup engine wins, best ball only. Redraft season-long value ignores W15-17 tiers except for playoff-lineup planning.

### Metric hierarchy (most → least predictive for projection)
1. **Role/opportunity CHANGE** — vacated targets/alignment, confirmed role moves, draft capital, coaching scheme fit. Most causal, freshest.
2. **Opportunity volume** — target share, WOPR, HVT/game, snap share. Volume is stable; efficiency is not. Target/air-yard shares are computed over GAMES PLAYED (full-season denominators understated partial-season players until Jul 16, 2026). (TPRR and true route participation slot here. ⚠️ **CORRECTED Sep 1 2026: the claim that the participation feed died after 2023 was FALSE and shaped several decisions before it was checked.** `nflreadpy.load_participation()` returns 2025 with 45,184 rows, and its `offense_players` column is populated on 100% of them, so routes run and therefore TPRR ARE computable for free — verified by computing them: Nacua 35.3%, JSN 33.3%, ARSB 30.2%, Chase 29.2%. `snap_sh` remains the shipped proxy because no TPRR layer is built yet, not because none can be. Volume ceiling = routes x TPRR, so a low route share caps everything else — the Josh Downs gate.)
3. **Talent-in-isolation** — charting success rates, prospect-model scores, breakout-age priors. Identifies who deserves volume before they get it.
4. **Ceiling shape** — spike/usable/dud/nuclear week rates. Descriptive of last season; use for best-ball classification, not projection.
5. **Matchup data (FPA)** — least stable input. Format decisions only.

### Matchup-data confidence rule (per-team, not uniform)
2025 FPA reliability depends on DEFENSIVE CONTINUITY, judged per team:
- **High continuity** (same DC, scheme intact, core starters back — e.g. SEA 2026: Macdonald/Durde intact, exactly one defensive starter not back): 2025 FPA stands at full confidence. Do NOT discount it just because it is "last year's data."
  - **The old example here was KC/Spagnuolo, and the Aug 3 2026 audit killed it.** Spagnuolo is in year 8 and the scheme is genuinely continuous, but KC lost FOUR defensive backs in one offseason — McDuffie (traded LAR), Watson (LAR), Cook (CIN), Joshua Williams (TEN). **Coordinator continuity and personnel continuity are separable, and this rule needs BOTH.** A team can be high-continuity on scheme and high-churn in one position group; grade the group, not the coaching staff. KC's run defense still qualifies; its pass defense does not.
- **High churn** (new DC, scheme change, 3+ new starters in the back seven, or a rebuilt front — e.g. DAL 2026: new DC, 3-4 switch, ~7 new starters): 2025 FPA is low-confidence. Apply the COACHING_ADJ/OFFSEASON_ADJ direction, mark the note "HIGH CHURN," and never let a Smash/Avoid tier from a high-churn defense be the deciding factor between two otherwise-close calls.
- **Adjustment sign convention (both tables):** positive = defense got WORSE (softer matchup), negative = improved (tougher). Applied additively to FPA (`pts += adj`). A `pts -= adj` sign-inversion bug shipped until Jul 16, 2026 — if a matchup tier looks wrong against a table note, check the application sign first.
- Every COACHING_ADJ / OFFSEASON_ADJ_2026 entry needs a sourced, dated note. An entry whose note is contradicted by newer verified reporting (as DAL's "bottom-3" was by the May 2026 rebuild reporting) must be updated before it is used in any published output.

---

## Efficiency, Season SOS & Motion Layers (added Jul 26, 2026)

Three nflverse-sourced data files, all regenerated by scripts in `scripts/`.
They feed the AI prompt as CONTEXT ONLY — none of them touches the numeric
scoring engine, so grades are comparable to those issued before Jul 26.

| File | Script | What it answers |
|---|---|---|
| `grading/data/player_efficiency_2025.json` | `build-efficiency.py` | What did the player do PER TOUCH |
| `grading/data/sos_2026.json` | `build-sos.py` | How hard is this team's full-season slate, and did it change |
| `grading/data/motion_2025.json` | `build-motion.py` | Does this offense use motion, and does the player produce on those snaps |

Regenerate: `pip install nflreadpy` then run each script. `nfl_data_py` is
deprecated — nflverse moved to `nflreadpy`.

### The two efficiency axes are separate on purpose
`rush_eff_rank` and `rec_eff_rank` are near-uncorrelated for RBs (r=+0.09,
asserted in the script's own check). A back can be a bottom-5 runner and an
elite receiving back. Never average them into one "efficiency" figure, and
never let a bad rushing rank alone downgrade a receiving-role back.

### Which rushing number to trust
Two are stored and they disagree, deliberately:
- `rush_eff_rank` — fantasy points over expected per carry. TD-sensitive, so
  it punishes efficient backs who did not score.
- `ngs_rush_rank` — Next Gen Stats rush yards over expected per attempt.
  Pure yardage, tracking data.

Where they diverge, NGS is the better read on "is he good at running."
Jaylen Warren 2025 is the worked example: `rush_eff_rank` 51/73 against
`ngs_rush_rank` 8/51. The gap is touchdowns, not running.

### Efficiency does not override opportunity
This layer sits BELOW role and volume in the Source Hierarchy, not above.
Efficiency on tiny volume is noise, which is why sub-gate players carry a
null rank rather than a flattering one. Its job is to catch two specific
errors the opportunity metrics cannot see:
- volume-without-efficiency grading as a strength (McCaffrey 2025: elite on
  every opportunity field, `rush_eff_rank` 63/73)
- efficiency-without-volume being invisible (Jaylen Warren: 50.8% snap share)

### SOS rank convention is INVERTED vs getMatchupTier
In `sos_2026.json`, **rank 1 = easiest** slate. In `getMatchupTier`, rank 1 is
the softest single opponent but the tier scale runs the other way. Never
compare the two numbers directly. `delta` is positive when the schedule got
easier. Defensive quality is pinned at 2025 for both seasons, so the delta
isolates the schedule change and inherits the same high-churn caveat as FPA.

### Motion data is PLAY-level, not player-level
FTN's `is_motion` says the offense used motion on that snap. It does NOT say
which player moved. So this measures a team-scheme split observed on a
player's targets. Published player-level motion splits (PFF, Fantasy Points
Data) answer a different question and are paywalled. Cross-checked against
one public table Jul 26, 2026: same direction on 5 of 6 receivers,
consistently smaller magnitudes, one sign flip. Treat as a screen, never as
a citable figure, and never present a number from this file as a
player-level motion split.

---

## Name Resolution Across ADP Tables (fixed Jul 26, 2026)

`findPlayer` resolves a typed/pasted name against ONE of three tables
(`ADP_DATA`, `ADP_SUPERFLEX`, `ADP_YAHOO`) chosen by format. The tables are
sourced separately and **do not agree on player names**. Two bugs came out of
that, both of which dropped a player silently (no error, he simply did not
appear in the grade) and both of which reproduced in ONE format only:

1. **Nickname vs legal name.** `ADP_DATA` keys `"chig okonkwo"`; `ADP_YAHOO`
   keys `"chigoziem okonkwo"`. A two-word query with a differing first name
   had no fallback (step 3 needs a single-letter initial, step 4 needs a
   single word). Fixed by step 4b, which bridges same-last-name players when
   the first names are PREFIX-compatible.
2. **Suffixes poisoned the last-name index.** `buildLastNameIndex` filed
   `"marvin harrison jr"` under `"jr"`, so the `"jr"` bucket was a junk drawer
   and no suffixed player was reachable by surname. Broke fallback steps 3, 4
   and 4b at once. Fixed by stripping suffixes before indexing.

### Rules for anyone touching this code
- **Prefix-compatible, never initial-compatible.** Step 4b requires one first
  name to be a prefix of the other (min 3 chars). Loosening this to "same
  first letter" would resolve `"mike washington"` (RB LV) to
  `"malik washington"` (WR MIA). A wrong match grades the wrong player and is
  strictly worse than a miss.
- **Run the test after any change here:** `node scripts/test-findplayer.mjs`.
  It sweeps every `ADP_DATA` name against every format, asserts zero
  position-flipping resolutions, and exits non-zero on failure.
- Adding a player to one ADP table and not the others is the usual cause of a
  "the app doesn't recognize X" report. Check all three before assuming a
  parser bug.

---

## ADP Source of Truth (fixed Jul 27, 2026)

**The reach/value delta formula was never wrong. The ADP fed into it was.**

`ADP_DATA` is a dated snapshot (`ADP_UPDATED`). Drafts happen later, and ADP
moves. Measured against a real Jul 26 Underdog roster: mean drift 5.1 picks,
max 22.7. Ryan Flournoy went at 157 with a live ADP of 160.4 — three picks of
VALUE — and the app called him a 26-pick REACH by comparing against a stale
183.1. This class of error had been reported repeatedly.

### The rule
**When the pasted roster carries its own ADP, that ADP wins.** The user's
platform is ground truth for the user's own draft. Every export format the app
accepts (Underdog, Sleeper, Yahoo) prints ADP beside the pick, and the parser
already had to identify that token to distinguish it from the pick number — it
just discarded it.

`parseRoster` now sets, per player:
- `adp` — the number actually used downstream (parsed if present, else table)
- `tableAdp` — the built-in snapshot value, kept for reference
- `adpSource` — `"roster"` or `"table"`

The override happens AT THE SOURCE, not just in the delta calc, so reach/value
flags, pivot candidates, value tiers and the AI prompt all see the same number
the user saw on their draft board.

### Trust levels when parsing
- **Labelled ADP** (a value on an "ADP" line): trusted outright, including
  large moves. A player's ADP genuinely can shift 40 spots.
- **Unlabelled decimal**: accepted only within 75 picks of the table value.
  Picks and byes are whole numbers, so a decimal is almost always ADP — but if
  the parser grabbed the wrong token, a stale ADP beats a wrong one.

### Do not regress these
- The pick-plausibility guard and the median-delta confidence check BOTH compare
  picks against ADP. They must use the parsed ADP (`refAdp()`), or a correct
  pick gets discarded for disagreeing with a stale table.
- The data-vintage footer must not print the snapshot date when roster ADP was
  used. Naming a date that did not produce the numbers is worse than naming none.
- Run `node scripts/test-adp-delta.mjs` after any change to parsing or delta
  logic. It asserts the exact Flournoy case and the no-ADP fallback.

### The snapshot is now a fallback, not the primary
Refreshing `ADP_DATA` still helps users who type a plain list with no ADP. It is
no longer the thing standing between a user and a correct delta.

---

## RB Air Yards, Team RB Air Yards & Dropback Conversion (added Jul 27, 2026)

Fourth nflverse layer, from Ben Gretch's RB-air-yards framework (Stealing
Signals, via the BDGE podcast Jul 27 2026). Built by `scripts/build-airyards.py`
into `grading/data/airyards_2025.json`. **Context only — the numeric scoring
engine is untouched. Verified by grading the same roster before and after: A
(11.55) both times.**

Source numbers were reproduced from nflverse before anything was built. His
Stevenson "155 air yards, over 9 yards per target" came out 159 / 9.32; Woody
Marks 5th on 36 targets, Kyren Williams 3rd and Michael Carter 7th all matched
exactly.

### Why `ay_sh` was not enough
`player_metrics` stores air yards SHARE, which is near-zero for every RB and
therefore discriminates nothing. What separates backs is their OWN aDOT.

### aDOT is a yardage hole, not a small negative
Most backs catch the ball BEHIND the line of scrimmage, so they must earn yards
back before gaining any. 2025: Stevenson turned 37 targets into 345 yards at
+4.30 aDOT; Jeanty turned 73 targets into 346 at -1.42. Twice the volume, same
output. When a back's receiving looks disappointing relative to targets, check
aDOT before blaming the player.

### Team RB air yards is a PLAY-CALLER property
Not a player trait. David Johnson posted the best RB air yards season on record
under Bruce Arians; Arians left, Mike McCoy arrived, and the usage never
returned. So a team figure attached to a NEW play-caller describes the OLD
staff — evidence about the scheme being replaced, not a forecast. Pairs with
`PLAYCALLER_PROFILES`. 2025 range: SF +335 down to TB -168.

### Dropback conversion constrains EVERY pass catcher
`dropback_drain` is the share of dropbacks lost to sacks and scrambles, which
never become a target for anyone. 2025 spread is large: LAR 4.8% against NYJ
19.1%. Use it to temper target-based optimism on any player from a high-drain
offence, and compound it with low pass volume rather than double-counting.

### This is ceiling shape, not opportunity
It identifies ACCESS to explosive plays, never expected volume. Per the source's
own 60/40 framing it lives in the unexplained variance, so it sits beside
spike/nuclear rates and BELOW role and volume in the Source Hierarchy. Never use
a good aDOT to argue a back will get more targets.

### Still missing: targets per route run
TPRR — the source's "intent" metric, and its sharpest idea — needs routes run
and stays paywalled. It is what shows James Cook's TPRR trailing his own
backups, and Saquon's collapsing from 18%+ to 13.1% on arrival in Philadelphia.
Do NOT substitute target share for it.

---

## Advance Rate Layer (added Jul 28, 2026)

`analyzeRoster` (best ball) now scores the W1-14 qualifying round, which was
previously unscored — every other scored input is W15-17 derived. The research
basis (ETR / Legendary Upside BBM data): ADP value correlates with
regular-season advance rate, stacking correlates with playoff win rate, and
heavily-correlated builds gain advancement equity in BOTH phases (+21.5%
regular season, +30.1% playoffs). Stacks therefore stay the dominant signal;
this layer is a capped tiebreaker.

### Components (total clamped to ±1.25, scaled by tournament advanceWeight)
1. **W1-14 schedule strength** (±0.5): core scorers' average matchup-tier
   score across the qualifying weeks, centered at the tier-construction mean
   (3.125). Mirrors the redraft check, both directions — soft slates earn
   credit, not just hard-slate penalties.
2. **Cumulative scoring proxy** (±0.5): core `usable_rate` from
   PLAYER_METRICS, centered at 0.53 (median for ADP<=120 players). Catches
   rosters that cannot out-score their pod for 14 weeks regardless of playoff
   geometry.
3. **Bye clustering** (-0.25, one-way): 4+ core scorers sharing one W1-14 bye
   is a near-dead week of cumulative points. Complements (does not replace)
   the Zero-Zero 2QB/2TE bye tracker.

"Core scorers" = the 9 earliest-ADP players. Best ball has no lineup; ADP
order is the stable proxy for expected weekly contribution.

### Rules
- `TOURNAMENTS[key].advanceWeight` (default 1) scales the layer; set 0 for
  playoff-only formats with no cumulative qualifying round.
- The PHI principle: a team can be a season-long target and a playoff avoid
  simultaneously. This layer credits the first without touching the second —
  the two must never be netted into one signal upstream of the grade.
- Never let this layer decide between a stacked and an unstacked build. The
  cap exists so it cannot.
- Calibration check (Jul 28): two reference rosters moved +0.24 / -0.09 with
  no letter-grade change; a PHI-heavy synthetic earned the full +0.5 schedule
  credit. Re-run this check after any rebalance.

---

## Silent-Drop Bugs and the Screenshot Path (added Jul 27, 2026)

A player vanished from an 18-man best-ball upload while the UI reported
"17/17 matched". Nothing errored. The audit found FOUR independent ways a
player could disappear without a trace, plus one reason the loss stayed
invisible. Guarded by `scripts/test-extraction-filters.mjs`.

**The governing principle: a filtered name must never be silent.** Junk that
reaches `notFound` costs one dismissable row a human can see. A name dropped
by a filter costs a player out of the grade with no evidence it happened.
When in doubt, let it through and show it.

### 1. Dead hyphenated keys (data class, fixed at the lookup layer)
`normalize()` turns a query's hyphens into spaces, but ADP keys are
hand-entered and three kept theirs: ADP_SUPERFLEX `jaxon smith-njigba` and
`jacory croskey-merritt`, ADP_YAHOO `nick westbrook-ikhine`. No query could
produce those strings, so the keys were unreachable and those players
resolved to null in that format only. `getBaseIndex` now normalizes the KEY
as well as the query, so any key with a hyphen, apostrophe, period or odd
casing resolves. Fixing the three keys by hand would have left the trap armed
for the next hand-entered name.

### 2. The position-header regex ate names starting "Te"
`/^(QB|RB|WR|TE|Round|Pick|ADP|Bye)/i` had no boundary, so the TE branch
matched Tee Higgins, Terry McLaurin, Tetairoa McMillan, Ted Hurst, Terrance
Ferguson and Tez Johnson. Now anchored to the whole line
(`\s*\d*$`) so it kills bare column headers and nothing else. Strategy 3 is a
fallback path, so this only fired when the JSON array parse failed — which is
exactly when nobody is looking.

### 3. `preprocessRoster` discarded unresolved lines
It kept only lines that resolved to a player; a name-shaped line that failed
lookup was dropped entirely. The legacy parser had the right instinct — it
pushes `notFound` — so preprocess now does the same via `.unresolved`.

### 4. The match counter counted survivors
`{valid.length}/{picks.length}` — both measured AFTER the drop, so a lost
player still read "17/17". Fixed by 3 above: unresolved rows now land in
`picks`, so the denominator tells the truth.

### 5. The under-count warning floor was 10
Best ball is a fixed 18 (20 superflex), but the warning only fired below 10,
so 17-of-18 passed clean. Now format-aware for best ball. Redraft
deliberately stays at 10 — league roster sizes genuinely vary there.

### What was NOT the cause
`findPlayer` resolved Cam Skattebo in all three formats, and every text paste
format kept him. The reported miss came from the SCREENSHOT extraction step
(`api/analyze.js` EXTRACTION_SYSTEM_PROMPT) — the model read 17 of 18 rows off
the image. That is non-deterministic and not fixable in the parser. What is
fixed is that it can no longer happen quietly.

## The AI Nutshell Falls Back Silently (fixed Jul 27, 2026)

`fetchAiNutshell` had three silent exits — a non-ok response, an empty body,
and a JSON parse failure — all landing in `catch {}` with the comment "silent
fail". The template `buildNutshell()` output then rendered in the same box
with the same styling, so a failed AI pass was indistinguishable from a
successful one except for a missing `✦ AI` badge. This is why the summary
"sometimes renders full and sometimes basic".

It was not only cosmetic: a failed call also skips `parsed.gradeModifier`,
so the same roster could grade differently depending on whether a network
call happened to succeed.

Now tracked in `aiFailed` and surfaced as a `⚠ AI unavailable · retry`
button that re-runs the pass. Partial responses still apply whatever fields
did arrive — a missing nutshell no longer discards the notes beside it.

**Expect this badge on localhost.** The Vite dev server does not serve
`/api/analyze`, so the AI pass always fails in local preview. That is correct
behavior, not a regression.

### Root cause found Jul 27 2026, on the live site

Making the failure visible immediately exposed what was causing it, and it was
not a network fault. A production 18-player grade returned **HTTP 200** with
`stop_reason: "max_tokens"` and `output_tokens` sitting exactly on the cap. The
JSON was severed mid-sentence inside `bringBackNotes`, so `JSON.parse` threw and
the catch discarded the entire payload — including a complete, high-quality
`nutshell` at the very front of it.

So "sometimes full, sometimes basic" was never random. It tracked ROSTER SIZE:
more players means more `standoutDetails` and `bringBackNotes`, and an 18-man
best-ball roster blew a 2200-token budget every time while a short roster fit.

Two fixes, both needed:

1. **The cap was clamped in TWO places.** `App.jsx` sent `max_tokens: 2200` and
   `api/analyze.js` independently clamped with `Math.min(body.max_tokens, 2200)`.
   Raising only the client would have changed nothing and looked like the fix
   failed. Now 5000 requested, 6000 ceiling. This is a ceiling, not an
   allocation — output tokens bill as used, so responses that already fit cost
   the same.
2. **`parseLooseJson` makes truncation survivable.** A model can always run
   long, so the parse no longer treats a severed tail as total loss: it walks
   the text tracking string state and nesting depth, cuts at the last completed
   top-level pair, and closes the object. Everything complete is kept. If the
   cut lands inside the first field there is nothing to salvage and it returns
   null, which correctly surfaces as a failure. Pinned by
   `scripts/test-loose-json.mjs`, including the escaped-quote case that would
   otherwise desynchronize the walker.

## Duplicate Keys: fixed Jul 27, 2026 (was "known, not fixed" earlier the same day)

App.jsx carried 11 duplicate keys — 5 in `ADP_DATA`, 6 in `SITUATIONS`. In a JS
object literal the LAST declaration silently wins, so the file read one way and
behaved another. Guarded by `scripts/test-no-duplicate-keys.mjs`.

**How they got there.** `ADP_DATA` has an older hand-maintained block with
integer ADPs (lines ~90-109 of the table) and a newer decimal import appended
after it. The decimal block's range overlaps the integer block's, so five
players ended up declared twice. `SITUATIONS` collected its duplicates the same
way: notes appended in a later session below notes that already existed.

**What the collisions actually cost.** Nothing at runtime — the later value was
always the intended one. The cost was to anyone READING the file, including a
future session: `xavier worthy` was written as adp 96 on one line and 110.0
sixty lines down, and 110.0 was what graded. Two SITUATIONS pairs directly
contradicted each other — `jk dobbins` read "Harvey clearly ahead in depth
chart" in the dead copy and "Coleman is the primary upside play" in the live
one, which are opposite conclusions about the same backfield.

**The fix, and why it was safe.** Deleted the dead EARLIER entry in all 11
pairs and kept the later. Because the later already won, this is
behavior-preserving by construction — verified: all five affected ADP values
resolve to exactly what they resolved to before (110.0 / 108.3 / 108.3 / 117.6
/ 124.8), and a live 18-man grade returns the same A with 18/18 matched.

Changing WHICH value wins would have been a real data decision needing a
source. Deleting a dead line is not. If a value later proves wrong, that is a
separate change with separate evidence.

**Why a test and not just the build warning.** esbuild and vite both already
warned about all 11, every single build. Nobody reads warnings in a 500KB file
that emits eleven of them, which is precisely how they accumulated over
multiple sessions. `test-no-duplicate-keys.mjs` fails the run instead, and its
header tells the next session the rule: keep the last occurrence, delete the
earlier one.

---

## Ceiling Shape Layer (added Jul 28, 2026)

Before this, the grade scored roster STRUCTURE almost exclusively — stacks,
positional counts, construction flaws, ADP, committees. Of the metrics in
`player_metrics_2025.json`, only two touched the score: `hvt_pg` (Naked RB gate)
and `usable_rate` (advance layer). `spike_rate`, `nuclear_rate`, `tgt_sh`,
`wopr`, `snap_sh`, `dud_rate` and `expl_pct` were shown to the AI and nothing
else. Two rosters with identical architecture graded identically even if one was
full of 30%-spike players and the other of 10% guys. In best ball a week is won
with a spike, so that was the model's largest blind spot.

**What it does.** Per rostered player clearing the gate, `(spike_rate +
nuclear_rate) - positional median`. Average the deltas, multiply by 2.5, clamp
to ±0.5. Best ball only — `analyzeRedraft` is untouched, because redraft rewards
floor and this measures ceiling.

**Baselines: `{QB: 0.530, RB: 0.235, WR: 0.091, TE: 0.059}`** — median blend at
that position among every DRAFTED player clearing the gate (`gp >= 8`,
`snap_sh >= 0.35`).

### Three things that had to be right, and were wrong first

1. **POSITION NORMALISATION IS NOT OPTIONAL.** Raw spike rate is dominated by
   quarterbacks — an 18+ half-PPR week is routine for a QB and hard for a WR, so
   the draftable medians run QB 0.530 against WR 0.091. Scoring the raw number
   hands a bonus to any roster carrying three QBs for a reason unrelated to
   ceiling. That bug would have looked like a working feature: grades move, they
   just move for the wrong reason. `test-ceiling-layer.mjs` guards it.
2. **THE BASELINE POPULATION DECIDES WHETHER THE LAYER IS BIASED.** First attempt
   centred on ADP <= 150 and gave every roster a systematic -0.05, because an
   18-round roster necessarily contains later picks — a median build scored
   negative by construction. Re-centred on the full drafted pool the delta
   median is exactly 0.000, which is the property this needs. It also took the
   TE sample from 8 to 33.
3. **IT MUST BE ABLE TO SATURATE AND TO SIT STILL.** Verified both: a
   deliberately ceiling-max roster hits +0.5 and a ceiling-min roster -0.5,
   while the two reference rosters land at +0.09 and +0.01. A layer that cannot
   reach its cap is decorative; one that reaches it on ordinary rosters is
   overtuned.

### Known limit — read before quoting this about a player

The rates describe 2025 and nothing else. Justin Jefferson carries a 0.000 blend
at roughly ADP 10, because a 30% target share on an offence that could not score
produced nine usable weeks and none above 18. That is a true description of last
season, not a data fault — usable and dud move coherently with spike across the
pool (spike>0 WRs average .502 usable / .221 dud; spike==0 average .342 / .303).
It is not a projection.

The layer is safe because it AVERAGES: one misleading player moves the score by
under 0.02. Read it as roster-wide ceiling density, never as a verdict on an
individual, and never quote it about one player.

### Calibration (re-run `scripts/test-ceiling-layer.mjs` after any rebalance)

```
BBM Jul 28 draft   9.36 (A) -> 9.45 (A)   +0.09   avgDelta +0.036   13/18 qualified
Jefferson build    7.13 (A) -> 7.14 (A)   +0.01   avgDelta +0.003   12/18 qualified
ceiling-max synthetic                     +0.50   (saturates)
ceiling-min synthetic                     -0.50   (saturates)
elite-QB swap                             +0.13   (proportionate, no leak)
```

No letter grade moved on either reference roster. Cap 0.5 stays well under a
single elite stack (1.5), keeping rank-4 ceiling shape below rank-1/2 structure
in the Source Hierarchy.

---

## Yahoo Share Card Format (added Jul 28, 2026)

Yahoo shipped a Share function that renders a branded lineup card. Rows read
`QB B. PURDY Thu 5:35PM @ LAR — 18.85`: position tag, INITIALED name,
kickoff day/time, opponent, projection. Both the paste path (via Live Text)
and the screenshot path accept it.

### The two traps, both guarded by scripts/test-yahoo-share.mjs
1. **The trailing decimal is a PROJECTION, never ADP.** The unlabelled-ADP
   capture would swallow it silently — 14.61 for Pickens sits inside the
   75-pick sanity guard of his table ADP. `preprocessRoster` detects the card
   by shape (3+ rows matching the share regex) and sets shareMode, which
   skips pick AND ADP extraction entirely. Share cards carry neither.
2. **Kickoff times shed integer tokens.** "5:35PM" parses as 5 and 35, and 35
   would win the pick-candidate logic. Same shareMode flag kills it.

Names arrive as initials ("B. PURDY") — resolution rides the existing
initial-matching step of findPlayer, no new logic. K/DEF rows are stripped by
the redraft KDST filter as before; in best ball mode they surface as visible
notFound rows per the no-silent-drops principle. The extraction prompt in
api/analyze.js documents the card for the screenshot path.

---

## Mini Schnauzer 2 Tournament Config (added Jul 31, 2026)

New Underdog format, added to `TOURNAMENTS` as key `schnauzer`. Inserted
AFTER `puppy` deliberately: the dropdown renders `Object.entries(TOURNAMENTS)`
in declaration order, and General / BBM VII / The Puppy stay the top three.

### Structure (why the weights look nothing like Puppy's)
37,200 entries, $3, 18 rounds, half-PPR with 4-point passing TDs (standard
Underdog scoring, NOT the Frenchie's full PPR).

| Round | Weeks | Group | Advance |
|---|---|---|---|
| R1 Qualifiers | W1-14 cumulative | 12 | 2 (16.7%) |
| R2 Quarterfinal | W15 | 10 | 2 (20%) |
| R3 Semifinal | W16 | 8 | 2 (25%) |
| R4 Championship | W17 | 310 | 1 grand prize, all paid |

**This is structurally the inverse of Puppy.** The weekly gates are the softest
Underdog runs (Puppy cuts 1-of-10 then 1-of-5; this cuts 2-of-10 then 2-of-8),
so a merely-adequate W15 or W16 survives. The 14-week qualifier is the hardest
filter in the format, and EV concentrates in W17: all 310 finalists are paid,
but 1st takes $10k and the top 10 take ~40% of the $100k pool.

### Config values and their justification
- `weights: [1.25, 1, 2]` — W17 doubled because that is where the prize curve
  pays. W15 slightly over W16 because its gate is tighter (20% vs 25%).
- `advanceWeight: 1.5` — the cumulative R1 round eliminates 83% of the field,
  making it the format where the Advance Rate Layer matters most. Note the
  clamp is applied BEFORE this multiplier, so the layer can swing ±1.875 here.
- Deliberately NOT added to the `bbm7 || puppy` uniqueness-leverage branch:
  37.2k is mid-field by the Field Size Overlay, not massive, so the uniqueness
  premium does not apply.

### Scoring branch
`tournamentKey === "schnauzer"` flags W17 in both directions — a strength when
any qualified stack grades W17 >= 4, a weakness when none does. Verified both
paths fire.

---

## Adjustment Coverage & the Aug 3 2026 Defensive Re-Validation

Two problems, found together: the 2026 adjustment layer covered under half the
league, and the notes it did cover had gone stale in ways nobody could see.

### Coverage is now derived, not asserted
`ADJ_COVERAGE` (App.jsx, below `OFFSEASON_ADJ_2026`) computes from `WIN_TOTALS`
which teams carry an adjustment. Two different numbers, because the two tables
apply differently:

| Table | Applies in | Coverage |
|---|---|---|
| `COACHING_ADJ` | **BOTH data modes** | 9/32 |
| `OFFSEASON_ADJ_2026` | projected mode only, position-specific | 32/32 |

**`COACHING_ADJ` sitting outside the `useProjected` guard is the non-obvious
part.** "2025 Data" is not untouched measured data — 9 teams carry a 2026
coaching overlay in that mode. The UI said "ground truth" until Aug 3. If you
add a team to `COACHING_ADJ`, you are changing the default-mode grade for every
roster facing them; put pure 2026 personnel projection in `OFFSEASON_ADJ_2026`
instead.

**An absent entry means "no reliable signal," never "reviewed and confirmed
unchanged."** The UI now states this distinction explicitly. Do not collapse it.

### Seven notes were factually wrong
All had the same shape as the stale-verdict problem: a judgement written once
and never re-read against newer reporting. Recorded here because the failure
mode recurs, not because the specific teams matter long-term.

| Team | Was | Actually |
|---|---|---|
| CIN | "Lou Anarumo back" | **Al Golden**, year 2. Anarumo is IND's DC |
| JAX | "New DC" | Campanile **year 2** — a continuity team, flipping FPA confidence from low to high |
| CAR | "Lost Brian Burns" | Burns has been a **Giant since 2024**. CAR is B/R's No. 1 most-improved |
| CHI | "Lost Allen/Greenard/Hargrave" | Dennis Allen is the **sitting DC**; the other two were **Vikings** |
| KC | "secondary intact" | **Four DBs left**, including an All-Pro |
| GB | "Parsons healthy by 2026" | **On PUP**, ACL, ~Week 6 return |
| BAL | "Minter DC promotion" | Minter is the **HC** (hired from LAC); Weaver is the DC |

**Four of the seven were wrong DC attributions.** `grading/data/defense.md` now
carries an explicit 32-team DC table, including who actually calls the defense
when it is not the DC (NYJ, TEN, MIA, TB). Inferring the coordinator from a
prose note is what allowed this.

### Rules this produced
- **`App.jsx` and `grading/data/defense.md` are ONE source kept in sync by hand,
  not two independent confirmations.** defense.md still read "DAL: bottom-5
  (Parsons + Diggs gone)" for weeks after App.jsx was corrected, and every
  session that read the markdown got the dead version. Update both or neither.
- **Bump `ADJ_UPDATED` in the same edit that changes either table.** A stamp
  naming a date that did not produce the numbers is worse than no stamp.
- **Where direction is genuinely two-sided, keep the magnitude small and put the
  uncertainty in the note.** SF, LV and LAC are ±0.25 with HIGH CHURN flags. An
  honest small number beats a confident one nobody can defend.
- **Encode SHAPE, not just level, when a defense is lopsided.** NYG is not
  uniformly soft — elite edge over a bottom-tier DT room is a run funnel, so it
  carries `rb: +1.5` against `wr: +0.75`. A flat "bottom-5" hid the part that
  actually decides a start.
- **Unverifiable claims get dropped, not carried.** WAS "Payne age concern" had
  no 2026 sourcing behind it and is gone rather than preserved on momentum.

### Calibration (re-run before trusting a rebalance)
Two reference rosters, both modes, no letter grade moved:
```
ref1  2025  5.78 -> 5.79   2026e  5.71 -> 5.80
ref2  2025  6.22 -> 6.22   2026e  6.15 -> 6.13
```
Tier probe confirmed the entries fire and in the correct direction: ARI and MIA
WR move Even -> Good (softer), HOU/KC/NO/PHI RB move one tier tougher. Note that
SEA and DEN are already floored at Avoid, so further negative adjustment cannot
register — the tier scale, not the data, is the binding constraint there.

### Still unverified — do not state as fact
Vita Vea's (TB) trade request status; Harrison Smith's (MIN) retirement; JAX's
top-5 tier, for which no 2026 source was found. **Brian Branch (DET) is the live
one for best ball** — an Achilles tear with a return unlikely before December
lands directly inside the W15-17 window.

---

## The Puppy 3 — structure verified Aug 5, 2026

The `puppy` key now models Underdog's **Puppy 3** (2026 season), read off the in-app rules rather
than inferred. $5 entry · 225,000 entries · $1M prizes · 11.1% rake · 18 rounds · 12-man drafts ·
half-PPR with 4pt passing TDs · roster QB1/RB2/WR3/TE1/FLEX1/BENCH10 · 150 max entries.

| Round | Weeks | Group | Advance | Field |
|---|---|---|---|---|
| R1 Qualifier | W1-14 cumulative | 12 | **2 (16.7%)** | 225,000 → 37,500 |
| R2 Quarterfinal | W15 | 10 | **1 (10.0%)** | 37,500 → 3,750 |
| R3 Semifinal | W16 | 5 | **1 (20.0%)** | 3,750 → 750 |
| R4 Championship | W17 | 750 | 1 grand prize, all paid | 750 → 1 |

### The prize curve is what sets the weights

**75.6% of the $1M pool ($755,000) is paid to the 750 entries that reach W17.** The ladder on a $5
entry is `$5 → $25 → $400 → $100k`, so **surviving W16 into the final is an 80x jump — the single
largest in the tournament** — and once there, the entire spread from $400 to $100k is decided by
one week.

### Two things the old config had wrong

1. **W15 and W16 were weighted EQUALLY at 2.** They are not equal. W16 (1-of-5) is exactly twice as
   survivable as W15 (1-of-10). W16 dropped to 1.5.
2. **W17 carried the LOWEST weight (1.5)** despite holding three quarters of the money. It went to 2.

Weights are now `[2, 1.5, 2]` — the hardest gate and the money week matter most, the middle gate is
the easiest of the three. **`advanceWeight: 1.5`** was added to match `schnauzer`, because the R1
qualifier is structurally IDENTICAL (12-man groups, 2 advance) and eliminates 83.3% of the field
over fourteen weeks; it was previously unmodeled and defaulted to 1.

### The scoring branch was silent on W17

`tournamentKey === "puppy"` checked W15 and W16 and said **nothing** about W17 — leaving the week
that decides $400-vs-$100k unflagged in both directions. It now flags W17 as a strength when any
qualified stack grades ≥ 4 there, and as a weakness when none does, mirroring `schnauzer`.

### ⚠️ Calibration — this one MOVED GRADES, unlike previous rebalances

```
ref1  puppy  5.79 (A-) -> 4.63 (B+)    -1.16
ref2  puppy  5.02 (B+) -> 7.08 (A)     +2.06
```

**Both letter grades moved, and that is expected rather than alarming:** correcting a weight vector
that was misaligned with the actual gate structure necessarily redistributes score between rosters
with different weekly profiles. W16-heavy builds fall, W17-heavy builds rise. That is the intended
direction. Other tournaments are untouched (`main`, `bbm7`, `schnauzer`, `fastpuppy` all identical
before and after).

If the swing proves too aggressive against real rosters, the conservative fallback is `[2, 1.5,
1.75]`, which keeps both corrections but softens the W17 lift. **Re-run this calibration after any
change here.**

---

## The Pit Bull 2 — added Aug 6, 2026

Fourth Underdog format in `TOURNAMENTS`, key `pitbull`, read off the in-app rules. $20 entry ·
28,080 entries · $500k prizes · 11% rake · 18 rounds · 12-man drafts · half-PPR with 4pt passing
TDs · QB1/RB2/WR3/TE1/FLEX1/BENCH10.

| Round | Weeks | Groups | Advance | Field |
|---|---|---|---|---|
| R1 Qualifier | W1-14 | 2,340 × 12 | 2 (16.7%) | 28,080 → 4,680 |
| R2 Quarterfinal | W15 | 780 × 6 | 1 (**16.7%**) | 4,680 → 780 |
| R3 Semifinal | W16 | 156 × 5 | 1 (20.0%) | 780 → 156 |
| R4 Championship | W17 | one 156-man group | 1 grand prize, all paid | 156 → 1 |

### ⚠️ Underdog's own rules text has a typo — do not "fix" it the wrong way

The rules say R3 is *"156 6-person Groups."* **It is 156 FIVE-person groups.** 780/156 = 5, the
advancement line reads `1/5`, and the group-size list says 5. Three independent confirmations
against one prose slip.

### Why the weights sit BETWEEN Puppy 3 and Schnauzer

**The gates are unusually FLAT: 16.7 / 16.7 / 20.** No single week is a kill shot, unlike Puppy 3's
10% W15. R1 and W15 have *identical* advance rates, which no other format here does.

**But the prize curve is the most top-heavy on the board.** 77.5% of the pool reaches the 156
finalists and **53.4% goes to the top TEN** — versus 26.8% for Puppy 3's top ten, out of half the
money for the same $100k first prize. The ladder on a $20 entry is `$20 → $40 → $500 → $100k`:
reaching the final is 25x, and everything above that requires winning a 156-man group outright.

So: **surviving is the easy part here; winning W17 is the whole game.** Weights `[1.5, 1.25, 2]`.
W15 edges W16 only because 16.7% is tighter than 20%.

This completes a coherent ladder across the three group-stage formats, ordered by gate severity:

```
Puppy 3     [2,    1.5,  2]   gates 10.0 / 20.0   — hardest weekly cuts
Pit Bull 2  [1.5,  1.25, 2]   gates 16.7 / 20.0   — flat, top-heavy prize
Schnauzer   [1.25, 1,    2]   gates 20.0 / 25.0   — softest weekly cuts
```

All three carry `advanceWeight: 1.5`: the R1 qualifier is the same 12-man, 2-advance structure in
each and eliminates 83.3% of the field over fourteen weeks.

### Other notes

- **Max 10 entries** — the lowest of any format here (Puppy allows 150). A low-portfolio format
  where one build carries real weight, which argues against spray-and-pray construction.
- **28,080 entries is MID-FIELD** by the Field Size Overlay (10k-100k), same bucket as Schnauzer —
  so the uniqueness premium that governs BBM VII and Puppy does NOT apply. It is deliberately left
  out of the `bbm7 || puppy` uniqueness-leverage branch.
- The scoring branch flags W17 in both directions, plus a wall-week weakness: with three
  near-identical gates you cannot punt a week and still reach the final.

### Calibration — nothing else moved

```
                 main        puppy       schnauzer     pitbull (new)
ref1        A- 5.79 =    B+ 4.63 =     B+ 4.63 =       B+ 4.63
ref2        A- 6.22 =    A  7.08 =     A- 6.28 =       A- 6.28
puppy3-live A  10.44 =   A  10.45 =    A  10.45 =      A  10.45
```

All nine pre-existing grades byte-identical before and after. Dropdown order preserved: General /
BBM VII / The Puppy 3 stay the top three.

---

## Best Ball Mania VII — structure verified Aug 6, 2026

The `bbm7` config was the thinnest on the board — inferred rather than sourced. Now read off the
in-app rules. $25 entry · 672,336 entries · $15M prizes · 10.8% rake · 18 rounds · 12-man drafts ·
half-PPR with 4pt passing TDs · 150 max entries · closes 9/9/26.

| Round | Weeks | Groups | Advance | Field |
|---|---|---|---|---|
| R1 Qualifier | W1-14 | 56,028 × 12 | 2 (16.7%) | 672,336 → 112,056 |
| R2 Quarterfinal | W15 | 8,004 × 14 | 1 (**7.1%**) | 112,056 → 8,004 |
| R3 Semifinal | W16 | 667 × 12 | 1 (**8.3%**) | 8,004 → 667 |
| R4 Championship | W17 | one 667-man group | 1 grand prize, all paid | 667 → 1 |

### Two corrections to `[2, 1, 1]`

1. **W16 was weighted at HALF of W15.** It is a **1-of-12 (8.3%)** gate against W15's **1-of-14
   (7.1%)** — near-identical, and **the two hardest weekly cuts anywhere on this board.** Both now
   carry maximum weight. Same class of error as the Puppy 3 fix, in the opposite direction.
2. **No `advanceWeight`, despite BBM being the ONLY format here with a SEPARATE REGULAR-SEASON
   PRIZE POOL.** The rules pay out on W1-14 *before Round 2 begins*. The playoff breakdown sums to
   **$13,480,910** of the advertised $15M, so roughly **$1.52M (10.1%)** is paid for the qualifying
   round alone. `advanceWeight: 1.75` = the 1.5 the other 2/12 qualifiers earn, plus that pool.

### Why W17 stays BELOW the other formats' 2

Reaching this final is a **0.099%** proposition from entry — **3.4x rarer than Puppy 3 and 5.6x
rarer than Pit Bull 2** — so W17 matchup quality is worth materially less in expectation, even
though the final holds **70.2% of the playoff pool** and pays **148x just to arrive** ($3,700 on a
$25 entry, against $2M for first).

**The binding constraint is surviving two ~8% gates back to back.** Weights `[2, 2, 1.5]`.

### The complete ladder across all four group-stage formats

```
                weights        gates W15/W16    P(reach final)   advanceWeight
BBM VII      [2,    2,    1.5]   7.1 / 8.3         0.099%           1.75
Puppy 3      [2,    1.5,  2]    10.0 / 20.0        0.333%           1.5
Pit Bull 2   [1.5,  1.25, 2]    16.7 / 20.0        0.556%           1.5
Schnauzer    [1.25, 1,    2]    20.0 / 25.0          —              1.5
```

**BBM is the only one whose two weekly gates are both brutal and roughly equal.** Everywhere else
the weeks are asymmetric, which is why every other format ends in a `2` on W17 and BBM does not.

### Scoring branch

The old branch rewarded W15 only. It now flags W15 and W16 separately, plus — the one that matters —
a **strength for stacks live in BOTH** and a **weakness when none are**, since BBM makes you win the
1-of-14 and then the 1-of-12 consecutively and a roster built for only one rarely sees the other.

### Calibration — no letter grade moved

```
ref1    bbm7  A- 5.79 -> A- 5.84   +0.05
ref2    bbm7  B+ 4.62 -> B+ 5.11   +0.49
puppy3  bbm7  A  7.74 -> A  8.95   +1.21
```

Rosters with real W16 coverage rise, which is the intended direction — W16 was previously
underweighted by half. `main`, `puppy`, `schnauzer`, `pitbull` and `fastpuppy` all verified
identical before and after.

---

## Player Metrics Carry the OLD Team (found Aug 8, 2026)

Updating Gainwell and Vidal surfaced a general trap. `player_metrics_2025.json`
rows carry a `team` field, and for anyone who moved in the 2026 offseason that
team is the team they PLAYED for, not the team they are on. Gainwell's row reads
`team: PIT, rec: 73` while `ADP_DATA` correctly reads TB.

That is not wrong — the framework asks for "prior full season" numbers — but two
consumers read those numbers with no awareness the driver changed:

- **Bring-back credit** (App.jsx, `farSideCredit`) reads `getMetrics(p.name).rec`
  and awards the elite-receiving-back tier at `rec >= 65`, the reduced tier at
  `rec >= 40`. A back who caught 73 passes for one staff earns full 0.35
  correlation credit on a roster where he plays for a different staff.
- **The Naked RB gate** reads `hvt_pg` the same way.

The Receiving Back Stack Qualifier already says to re-validate when the specific
QB or OC behind past volume changed. Nothing enforces it, and nothing can
cheaply — whether a new role reproduces an old one is a judgement, not a
threshold. **So the enforcement point is the prose layer.** When a player changed
teams, say so in his RECENT_NEWS entry and state explicitly whether the tier
should be treated as established or projected. Both Gainwell entries now do.

Worth knowing before quoting any metric about a 2026 mover: check the row's
`team` against the ADP table first. They disagree for every player who moved.

### The two entries written the same day

- **kenny gainwell / kenneth gainwell** — role is DEFINED and it is receiving,
  not committee-runner. Zac Robinson uses him as the safety valve out of 21
  personnel with Irving taking the carries. TARGET/rising held; added
  `role_dependent` beside the existing `creeping_committee`. Both key spellings
  updated in both tables — they are separate keys and `findPlayer` aliasing does
  not cover SITUATIONS or RECENT_NEWS lookups, which are direct.
- **kimani vidal** — first coverage in any prose layer. fade/falling. Third in a
  three-deep LAC room behind a healthy Hampton and Keaton Mitchell, under a new
  Mike McDaniel scheme, with active trade and final-cuts reporting. His 2025
  production came under Greg Roman, who was fired.

**Score impact: none, verified across all five tournaments** (main A- 6.52,
puppy A 7.67, bbm7 A 7.64, schnauzer A 7.67, pitbull A- 6.47 — byte-identical
before and after). Expected: `fade` is analyst opinion and carries no scored
penalty by design, and `role_dependent` has no consumer. The value is in the AI
prompt layer and the notes, which is where a role description belongs.

---

## The Boxer and The Frenchie 13 — added Aug 14, 2026

Two new Underdog formats, read off their in-app rules. Both are **low-portfolio**
(max 3 and max 4 entries) and both sit in **small fields**, so neither is in the
`bbm7 || puppy` uniqueness-leverage branch.

### The Frenchie 13 — the only W16-max config on the board

$6 · 9,432 entries · $50k · 11.6% rake · 18 rounds · 12-man · max 4 entries.

| Round | Week | Groups | Advance | Field |
|---|---|---|---|---|
| R1 | W1-14 | 786 x 12 | 3 (25.0%) | 9,432 → 2,358 |
| R2 | W15 | 393 x 6 | 2 (33.3%) | 2,358 → 786 |
| R3 | W16 | 131 x 6 | **1 (16.7%)** | 786 → 131 |
| R4 | W17 | one 131-seat group | 1 | 131 → 1 |

**W16 is exactly TWICE as hard as W15.** Every other format here makes W15 the
tighter gate; this is the only inversion, and it is why `weights: [1.25, 2, 2]`
is the only config where W15 < W16. W17 also carries 2 because the **131-seat
final is the smallest on the board** and **1st alone is 30% of the pool** — the
most concentrated first prize anywhere (Pit Bull and Boxer 20%, BBM 13.3%,
Puppy 10%). `advanceWeight: 1.25`, below the 1.5 that 2-of-12 qualifiers earn,
because R1 is 3-of-12 and surviving it pays back exactly the $6 entry.

### The Boxer — the softest gates anywhere

$18 · 6,240 entries · $100k · 11% rake · 18 rounds · 12-man · max 3 entries.

| Round | Week | Groups | Advance | Field |
|---|---|---|---|---|
| R1 | W1-14 | 520 x 12 | **4 (33.3%)** | 6,240 → 2,080 |
| R2 | W15 | 416 x 5 | 2 (40.0%) | 2,080 → 832 |
| R3 | W16 | 208 x 4 | 2 (50.0%) | 832 → 416 |
| R4 | W17 | one 416-seat group | 1 | 416 → 1 |

**P(reach final) is 6.67%, one in fifteen** — 12x easier than Pit Bull, 67x
easier than BBM. But **arriving is worth almost nothing**: the ladder on $18 is
$9 → $18 → $50, so clearing the 14-week qualifier LOSES money. Meanwhile the top
ten take 49.7%. Hence the most W17-tilted weights on the board (`[1, 0.75, 2.5]`)
and the **lowest advanceWeight anywhere (0.75)**. Its scoring branch deliberately
has NO wall-week check — unlike Pit Bull's three near-identical gates, here you
genuinely can punt a week and still advance.

### ⚠️ Underdog's rules text is wrong on both pages

- **Frenchie R2** reads *"393 entries in 2,358 6-person Groups."* The numbers are
  **REVERSED** — 2,358 entries in 393 groups (786x3=2,358; 2,358/6=393).
- **Both pages** render the final as *"a single1, 31-person Group."* Frenchie is a
  single **131**-person group; Boxer is **416**. This is a template bug on their
  side, not a one-off — the Pit Bull page had its own separate typo ("156
  6-person Groups" for 5-person). **Always recompute the ladder from the group
  counts rather than trusting the prose.**

### Calibration — no existing format moved

All six pre-existing tournaments byte-identical on three reference rosters after
the additions. Both new branches verified to fire in both directions except the
Frenchie's W16-weakness path, which is structurally identical to the Boxer's
(proven firing) but could not be triggered on a real roster — see below.

### FIXED Aug 14 2026: tier labels no longer understate the numeric score

`avgPerWeek` is built from `m.score`, and the two boost branches in the stack
loop had drifted: the competitive-balance boost updated `tier` alongside
`score`, the high-pace boost updated `score` ONLY. A stack could therefore
display `Even/Even/Even` for a week whose `avgPerWeek` was 4.00 — every week
string in the UI was a potential lie about the number driving the grade.

Both branches now route through a single `tierFromScore(score)` helper defined
directly under `getMatchupTier`, whose thresholds mirror that function's rank
bands. Change both or neither.

**Grades did NOT move — 35 scores byte-identical across 7 tournaments x 5
reference rosters.** An earlier note in this file predicted this fix would move
grades; that was wrong. `tier` is display-only in the scoring path (`weekScores`
sums `m.score`), and the only non-display consumer is a `tier !== "Unknown"`
filter that a boost never triggers. The bug was a lying label, not a bad number.

---

## ADP Refresh Tooling & Per-Table Vintage (added Aug 15, 2026)

Two related changes, from one measurement: an audit against a live market found
**median drift 9.2 picks, mean 14.5, max 81.1** in `ADP_DATA` — roughly TRIPLE
the 5.1 mean recorded in July. The roster-ADP override protects users who paste
a board that carries ADP; it does nothing for a plain list or a screenshot,
where the stale table is still the only number available.

### `scripts/refresh-adp.py`

Measures drift against Fantasy Football Calculator's free public JSON API
(no auth, tested working). Returns a `meta` block naming the exact draft-date
window, so the vintage is knowable instead of assumed.

```
python3 scripts/refresh-adp.py                        # report, ADP_DATA
python3 scripts/refresh-adp.py --table yahoo          # report, redraft table
python3 scripts/refresh-adp.py --table yahoo --apply  # write it
```

**REPORT BY DEFAULT, NEVER AUTO-APPLY.** ADP is a data decision with a source
behind it. `--apply` is opt-in and still refuses two classes of move:
`--max-move` (default 60 — a 60+ pick move is a story, not drift) and any row
where the source's position or team disagrees with the table.

**`--min-drafts` (default 20) exists because the thin samples are the trap.**
Ja'Kobi Lane surfaced on 12 drafts. Those are frequently exactly the players
whose price is moving, so the report shows them in their own section and
refuses to apply them — set that number by hand, with a source.

### THE SOURCE IS REDRAFT. TWO OF THE THREE TABLES ARE NOT.

FFC is redraft half-PPR; `ADP_DATA` is Underdog best ball. Some of the reported
gap is FORMAT, not staleness, and the script prints a warning banner saying so:

- **Quarterbacks are the standing false positive.** Best ball drafts 2-3 QBs
  with no streaming, so they go earlier by design. Love +41, Murray +36 and
  Caleb Williams +27 in the first audit were correct behavior, not decay.
- Best ball drafts upside earlier and floor later; redraft does the reverse for
  early-down volume backs.

`--table yahoo` is the only like-for-like comparison and the only one safe to
bulk-apply. Treat `--table data` as directional: apply news-driven moves, not
format artifacts.

**Useful null result from the first run:** all 26 names present in the source
and absent from `ADP_DATA` are K/DEF, which the app filters deliberately. There
are no missing skill players in the source's top 221.

### `ADP_VINTAGE` replaces the single `ADP_UPDATED` stamp

There are three tables, sourced separately and refreshed at different times.
One stamp claimed a single date produced all three. The footer was worse than
inaccurate — it printed the literal string `"Underdog half-PPR ${ADP_UPDATED}"`
**unconditionally**, so a REDRAFT grade named a best-ball market and a
best-ball date. Same class of error the data-vintage rule already forbids.

```js
const ADP_VINTAGE = { standard: {...}, superflex: {...}, yahoo: {...} };
const adpVintageFor = (result) => ...;   // mirrors findPlayer's table choice
const ADP_UPDATED = ADP_VINTAGE.standard.label;  // back-compat, ADP_DATA ONLY
```

- **Bump the entry for the table you touched, in the same edit.** The refresh
  script prints the exact source window to paste in.
- **`adpVintageFor(analyzed)` must stay in step with `findPlayer`** — both pick
  the table off `mode === "redraft"` and `format === "superflex"`. Change one,
  change the other.
- **Never print bare `ADP_UPDATED` at a render site that can show more than one
  format.** It describes `ADP_DATA` and nothing else.

Display-only: **7 tournament grades byte-identical before and after** on a
reference roster (main 8.87, puppy 7.31, bbm7 7.33, schnauzer 8.91, pitbull
8.91, boxer 10.35, frenchie 8.89).

## The Cross-Format ADP Experiment (Aug 15, 2026) — READ BEFORE REFRESHING ADP_DATA

`scripts/refresh-adp.py` compares against Fantasy Football Calculator, which is
**REDRAFT**. `ADP_DATA` is **UNDERDOG BEST BALL**. All eight players flagged by
that cross-format run were then checked against a real Underdog board:

```
player      pos  ADP_DATA  real UD  app err   redraft  reported  offset
Stafford    QB     104.0    108.3     +4.3      75.2    -28.8     33.1
Kyle Pitts  TE     108.0    103.2     -4.8      82.4    -25.6     20.8
Aaron Jones RB     120.0    126.9     +6.9      98.2    -21.8     28.7
Shakir      WR     127.0    131.0     +4.0     104.0    -23.0     27.0
Kamara      RB     181.2    162.1    -19.1     147.3    -33.9     14.8
Jeudy       WR     179.9    190.3    -10.4     133.7    -46.2     56.6  *
Tank Dell   WR     196.7    179.3    +17.4     152.6    -44.1     26.7
Ridley      WR     175.7    195.7    -20.0     133.8    -41.9     61.9  *
```

**1. Two of eight (*) would have moved the WRONG WAY.** The report said Jeudy
and Ridley go earlier than the table; on a real Underdog board they go **later**.
Bulk-applying would have shifted them 56.6 and 61.9 picks in the wrong
direction. A "negative delta" therefore carries NO directional information for
best ball. An earlier version of this file reasoned that a negative delta was
where real news lived, because best ball should be the earlier market. That
holds for rookies and upside profiles and INVERTS for veterans — **do not use
it.**

**2. The cross-format report overstates error by ~3x.** Mean reported gap 33.2
picks against a mean real error of 10.9. `ADP_DATA` was much closer to the
market than the run implied.

**3. The offset is NOT a constant** — 14.8 to 61.9 picks across these eight. You
cannot subtract a fixed correction to convert a redraft quote to a best-ball
one. Late-round players diverge most, which is where a wrong number does the
most damage because nothing else anchors the price.

### The rule this produces
- **`--table data` is a SCREEN FOR WHICH PLAYERS TO GO LOOK UP, nothing more.**
  Never bulk-apply it. A number enters `ADP_DATA` only with a real best-ball
  quote or a sourced news driver.
- **`--table yahoo` is like-for-like** (redraft source, redraft table) and is the
  only run safe to `--apply`. That refresh moved 67 values and fixed a real bug:
  the app had been calling Rashee Rice at pick 12 a 22-pick REACH off a stale
  33.7 when he goes at 14.4.
- A screenshot of the user's own draft board is the highest-quality source
  available for `ADP_DATA` and beats any scrape. Ask for it.

**Playwright cannot reach these sites from the cloud sandbox** (Chromium gets
`ERR_CONNECTION_RESET` through the agent proxy while curl gets 200s), and the
best-ball ADP pages are client-rendered with subscriber-gated data endpoints —
DraftSharks' `/adp/export` returns the app shell. Do not spend another session
on a scraper without first checking that Chromium can reach an external host.

---

## Cross-Table Coverage & Screenshot ADP (added Aug 16, 2026)

Two guards, both closing the SILENT-DROP class rather than the wrong-value class.
The existing ADP guards check that the three tables AGREE. Nothing checked that a
player was PRESENT, and nothing checked that the screenshot path carried ADP at all.

### `scripts/test-table-coverage.mjs` (guard 10)

For every key in any of the three tables, ask `findPlayer` to resolve it in each
format. A miss on a draftable player fails the run.

**Why absence beats disagreement as a bug.** A disagreement prints two numbers and
someone eventually notices one looks wrong. An absence prints NOTHING — the player
drops out of the grade, no error is raised, and the match counter reads clean. Two
shipped in one day (Aug 15) and BOTH were found by a real roster hitting them:
Ja'Kobi Lane (absent from `ADP_SUPERFLEX`) and Elic Ayomanor (in `ADP_YAHOO` only,
so invisible to best ball). The cause is structural and recurs: the three tables
are sourced separately, so adding a player to one never forces the others.

**`DRAFTABLE_MAX = 240` is the whole design.** `ADP_YAHOO` is a redraft table with
a much deeper tail (306 entries against 273) — names at 260-300 no best-ball
drafter reaches. Failing on those makes the guard noise, and a noisy guard gets
ignored, which is exactly how eleven duplicate keys accumulated behind eleven build
warnings. Deep tail names report as INFO and do not fail.

The first run found **27 real gaps**, now filled. Fill values are estimates carried
from the table the player WAS in, and that is safe *only* because `adpFlags`
excludes `adp >= 200` from reach/value logic — for these players the number drives
resolution and ordering, nothing else. Replace with a real quote when one appears.

### Screenshot extraction now captures ADP (guard 11)

The extractor was explicitly told to discard it: *"Only extract the Pick number —
do NOT use Bye or ADP."* So every screenshot upload fell back to the built-in
snapshot — the exact number the ADP Source of Truth rule says the user's own board
should override. **Screenshots are how rosters actually arrive, so the stale-table
problem landed hardest on the most-used path.**

`EXTRACTION_SYSTEM_PROMPT` now returns `[{name, pick?, adp?}]` and the client
renders each player as a five-line block.

**THE BLOCK SHAPE IS NOT COSMETIC — verify before changing it.** `parseRoster` is
built around Underdog's export, where the LABEL FOLLOWS THE VALUE. The obvious
alternatives are silently wrong:

```
"Joe Burrow 84 ADP 68.4"          -> adp 84, pick null      BOTH WRONG
"Joe Burrow 68.4 ADP 84 Pick"     -> not parsed at all
name / "QB CIN" / bye / "Bye" /…  -> parses, but "QB CIN" rows become junk
name / adp / "ADP" / pick / "Pick" -> CORRECT, zero junk rows
```

A swapped pick/ADP is **worse than no ADP**: it produces confident, precise, wrong
reach/value flags on every player. `test-extraction-blocks.mjs` pins the working
shape, asserts `adpSource === "roster"`, and asserts the known-bad single-line form
is *still* broken — so nobody "simplifies" the emitter back into it silently.

Strategies 2 and 3 in the client still emit bare strings and degrade to exactly the
pre-Aug-16 behaviour (name + pick, table ADP). Only strategy 1 carries ADP.

**Grades unchanged** — 7 tournaments byte-identical on the reference roster.

---

## ADP_DATA Fully Refreshed From a Real Best-Ball Source (Aug 16, 2026)

**`bestballteambuilder.com` publishes Underdog best-ball ADP in a SERVER-RENDERED
table.** A plain `curl` reaches it. This is the like-for-like source the Aug 15
experiment concluded was missing, and its absence is what forced every earlier
`--table data` decision to be a cross-format guess.

**Validated before use, against nine values read off a live Underdog board:
mean absolute error 0.00 picks, max 0.0.** Sharp Football's table parses too and
lands at 0.66 mean — good, but bestballteambuilder is exact.

`scripts/refresh-adp.py` gained `--source underdog` (now the DEFAULT) alongside
`--source ffc`. Comparability is computed from the SOURCE/TABLE PAIR rather than
the table alone: `underdog+data` and `ffc+yahoo` are like-for-like; anything else
prints the cross-format warning and should not be bulk-applied.

### The refresh corrected 107 values — INCLUDING SEVEN OF MY OWN BAD WRITES

Every Aug 15 `ADP_DATA` application that came from the redraft source was wrong,
all in the same direction (too early), because a redraft quote does not transfer:

```
player               written Aug 15   real Underdog   error
rashod bateman            133.2           201.1       +67.9
alec pierce                53.8            90.0       +36.2
deebo samuel               97.3           127.1       +29.8
wandale robinson           86.6           111.2       +24.6
malik washington          153.2           174.7       +21.5
michael pittman jr         80.8            99.4       +18.6
jakobi lane               162.7           178.3       +15.6
```

**Deebo is the one to learn from: his real ADP of 127.1 was printed on a user
roster screenshot that had already been graded in the same session.** The correct
number was on screen and a redraft number was written instead. "Verified news
driver" justified that the price MOVED; it never justified the MAGNITUDE, and the
two were conflated.

**The rule stands and is now enforceable rather than aspirational:** a number
enters `ADP_DATA` only from a best-ball source. Before, that rule had no source to
point at. Now it does — run the refresh.

### Result

```
                     median   mean    max
before (cross-format)   7.8    10.5   61.9   <- and directionally unreliable
after  (like-for-like)  0.3     1.0    8.3
```

`test-alias-adp-sync` caught three surname/nickname pairs the refresh left behind
(`tuten`, `kenny gainwell`, `stribling`) — the refresh writes the spelling its
SOURCE prints, so aliases lag every time. Expect this on every future run.

**Grades did not move** — 7 tournaments byte-identical, because the reference
roster carries its own ADP and the roster override outranks the table. That is
the override working, not the refresh failing to bite: it bites on plain-text
lists and on any screenshot whose ADP the extractor could not read.

---

## Prose Entries Are Model Input, Not a Changelog (fixed Aug 16, 2026)

**The Diggs "unsigned" bug came back, and the entry written to prevent it was the
cause.** That entry quoted the wrong claim to make the correction vivid:

> "...told a user Diggs was `'unsigned and effectively retired per current data'`
> in the same output where the app listed him as WR-WAS"

Production nutshell, weeks later:

> "Stefon Diggs being listed as **unsigned and effectively retired per recent
> news** is a genuine structural gap in that stack's WR corps."

**The model lifted the quoted phrase and inverted the attribution** — "per recent
news" — while the news block two lines above said the opposite. The data was in
the prompt and correct. The correction became the source of the error.

This is the same shape already recorded for Stribling (an out player named inside
a present-tense depth chart). It recurs because writing "here is what the old note
got wrong" feels like diligence. **`SITUATIONS.trendNote` and `RECENT_NEWS` are
pasted verbatim into the AI prompt. Anything in them is quotable.**

### The rule
- Write entries **affirmatively, present tense, about what is true now**.
- **Never quote a superseded claim.** Never narrate what a previous version of the
  entry said. Never phrase past unavailability so it can read as current.
- Correction history goes in **CLAUDE.md and the commit message** — humans read
  those, the model does not.

`scripts/test-no-quoted-negations.mjs` (guard 12) fails the build on either
pattern. It found **15 entries** on first run, all written in the same week.

### Also found and fixed
A dead `"ja'kobi lane"` VERDICTS row still read **HARD FADE** while `"jakobi lane"`
read TARGET. `normalize()` strips apostrophes, so the key was unreachable — but it
is the duplicate-key trap in a table no guard covers. Deleted.

### The stale-article trap (same session)
A search for preseason injuries returned "Buccaneers RB Rachaad White suffers
groin injury." **White is a Commander in 2026.** The result was undated content
from his Tampa era, and a Sean Tucker stat line came from the same game. Both were
discarded. **Search summaries do not carry dates — check any player-team claim
against `ADP_DATA` before writing it, exactly as the Aug 8 metrics-team rule
requires.**

---

## Underdog Superflex "ADP" Is a RANK, Not a Market (found Aug 20, 2026)

`ADP_SUPERFLEX` was refreshed from a screen recording of the user's own Underdog
superflex draft board — 174 players, ADP 2-239. It is the first like-for-like
superflex source this app has ever had. But the headline finding is about what
that column IS, not what it says.

**All 173 parsed values are whole integers, and each integer is used exactly
once.** A measured average across real drafts essentially never does that; it
produces 12.4, 178.3. `ADP_DATA` demonstrates the contrast — 186 of its first 400
rows carry decimals, because those came from a real market.

So the superflex column is a **projected ordering Underdog seeds the format with,
not a measurement.** Consistent with The Field General 2 sitting at 5.2% fill
(1,777 of 33,984 entrants ≈ 148 completed drafts) when the recording was made.

### What this means for the ADP delta rule
Reach/value flags in **superflex** compare the user's pick against a number nobody
is drafting to. They are directional only until the format fills. The delta logic
is not wrong; its input is a projection. Say so when reporting superflex
reach/value, and prefer RANGES over point estimates in superflex advice.

### The structural offset — decompose before calling anything a market signal
Measured across 173 players, live superflex minus the Aug 16 `ADP_DATA` board:

```
QB   n=29   median  -86.0        RB   n=50   median  +13.0
WR   n=63   median  +28.0        TE   n=30   median   +9.5
```

The WR push is **not flat** — it compresses late, once the QB run is over:

```
standard ADP band    median WR offset
    0- 50   +31.0        100-150   +26.5        200-300   +17.6
   50-100   +35.0        150-200   +16.3
```

An earlier header in this file quoted a flat "+16 non-QB / -61 QB" baseline. That
was directionally right and materially off. Use the banded table.

**Worked example:** Ja'Kobi Lane, standard 178.3, superflex 221 — a +42.7 offset
where his band expects +15.0, so **+27.7 excess**. His BAL teammates land exactly
on their norms (Bateman +5.9, Flowers 0.0), which is what makes it a real signal
rather than uniform staleness: the players whose standard price moved recently are
the ones the superflex projection has not absorbed.

### Reading video into data (scripts were throwaway — this is the method)
`get_file_metadata` confirms access; download via a plain `curl` to
`drive.usercontent.google.com/download?id=...&export=download&confirm=t` rather
than the MCP `download_file_content`, which returns base64 into the context window
(33MB would blow it). Then `ffmpeg -vf "fps=1/0.5,crop=..."` and `tesseract --psm 6`.

**TWO OCR ERROR CLASSES THAT NEED OPPOSITE FIXES — this is the part worth keeping:**

1. **Leading-digit truncation.** Braelon Allen read `211.0` / `21.0` / `2.0` across
   four frames. Naively he enters at ADP 21 as an RB5 — an apparent 165-pick market
   move that never happened. Truncation only ever makes a number smaller.
2. **Digit misreads.** CeeDee Lamb read `26` and `96`; Jeanty `23` and `93`. A
   max-rule "fix" for (1) moves both ~70 picks the WRONG way.

**The arbiter that resolves both is the list's own sort order.** Each frame shows
~11 contiguous rows of an ADP-sorted board, so every value in a frame must sit near
that frame's median; anything outside is dropped. That single rule produced **zero
monotonicity violations** across 174 rows, and resolved Lamb to 26 (independently
corroborated by FFC's 2QB board), Jeanty to 23, Braelon to 211.

### Alias sweep: surname matching is NOT sufficient here
`test-alias-adp-sync` pairs keys by SURNAME, so it cannot see short-code aliases.
The refresh moved `christian mccaffrey` 8 -> 14 and left `cmc` at 8, and the guard
stayed green. Found by enumerating every single-token key in the table against its
pos+team group. `cmc`, `jsn`, `arsb`, `btj`, `mhj`, `achane`, `stribling`,
`heidenreich` are the current set. **After any superflex refresh, check them by
hand.** (`mhj` and `btj` were already drifting before this refresh; both synced.)

### ⚠️ This table is now MIXED VINTAGE
178 values are Aug 20; **116 keys keep their Jun 24 values** because the recording
did not reach them, 109 of those inside the draftable range (<=240) — including
Josh Allen, Ja'Marr Chase, JSN, ARSB, Jonathan Taylor, Burrow and Jayden Daniels.
`ADP_VINTAGE.superflex` is stamped `"Aug 20 (partial)"` for exactly this reason.
**Do not print it as a clean date.** A second recording covering the gaps would
close this out.

### Calibration — standard formats did not move
```
STANDARD mode, table-driven, 7 tournaments: byte-identical before and after
SUPERFLEX mode: scores moved (intended), no letter grade changed
```

---

## The Field General 2 — added Aug 21, 2026

Ninth tournament in `TOURNAMENTS`, key `fieldgeneral`, and **the first SUPERFLEX config on the
board.** Read off the in-app rules. $10 · 33,984 entries · $300k · 11.7% rake · **20 rounds** ·
12-man drafts · QB1/RB2/WR2/TE1/FLEX1/**SFLEX1**/BENCH12 · max 150 entries · closes 9/9/26.

| Round | Weeks | Groups | Advance | Field |
|---|---|---|---|---|
| R1 | W1-14 | 2,832 x 12 | 3 (25.0%) | 33,984 → 8,496 |
| R2 | W15 | 708 x 12 | 2 (16.7%) | 8,496 → 1,416 |
| R3 | W16 | 118 x 12 | **1 (8.3%)** | 1,416 → 118 |
| R4 | W17 | one 118-seat group | 1 grand prize, all paid | 118 → 1 |

P(reach final) = **0.347%**, one in 288.

### W16 is the kill shot — the second W16-inverted format here

At **1-of-12 it ties BBM VII's W16** as the second-hardest weekly gate anywhere, and it is
**exactly twice as hard as its own W15**. Every format except the Frenchie 13 makes W15 the
tighter cut; this one does not. Weights `[1.5, 2, 1.75]` — W16 at max, W15 matching Pit Bull's
identically-sized 16.7% gate.

### W17 gets 1.75, not the 2 every other final carries

**This prize curve is the flattest on the board.** Only **45.4% of the pool reaches the 118
finalists** (Pit Bull 77.5%, Puppy 75.6%), 1st is 16.7%, and **$163,666 — 54.6% of the pool — is
paid to entries eliminated before the final.** Arriving is still worth 20x ($199 on $10), but the
curve above it is shallower than any other format's, so W17 placement is worth proportionally less.

### advanceWeight 1.5 nets two opposing facts

The R1 gate is **soft** — 3-of-12 is the most forgiving qualifier here besides the Boxer's — which
argues down. But **21.2% of the pool ($63,720) is paid to entries that clear R1 and then lose in
W15**, the largest share any format pays for surviving the qualifying round alone, and clearing it
returns **$15 on a $10 entry — the only profitable qualifier on this board** (the Boxer's loses
money, the Frenchie's breaks even). Those roughly cancel to the standard 1.5.

### Complete ladder across all five group-stage formats

```
                 weights        gates W15/W16   P(final)   advanceWeight   to finalists
BBM VII       [2,    2,    1.5]   7.1 / 8.3      0.099%        1.75           70.2%*
Field General [1.5,  2,    1.75] 16.7 / 8.3      0.347%        1.5            45.4%
Puppy 3       [2,    1.5,  2]    10.0 / 20.0     0.333%        1.5            75.6%
Pit Bull 2    [1.5,  1.25, 2]    16.7 / 20.0     0.556%        1.5            77.5%
Schnauzer     [1.25, 1,    2]    20.0 / 25.0       —           1.5              —
Frenchie 13   [1.25, 2,    2]    33.3 / 16.7       —           1.25             —
Boxer         [1,    0.75, 2.5]  40.0 / 50.0     6.67%         0.75             —
```
\* BBM's figure is share of the playoff pool; it also pays a separate regular-season pool.

**Field General and the Frenchie are the only two W16-inverted formats.** Field General's is the
harsher of the two by exactly 2x.

### Other notes
- **33,984 is MID-FIELD** by the Field Size Overlay (10k-100k), same bucket as Schnauzer and Pit
  Bull, so it is deliberately **NOT** in the `bbm7 || puppy` uniqueness-leverage branch.
- `format: "superflex"` — the only non-standard entry besides the generic `superflex` league.
  20 rounds and a mandatory second QB slot every week.
- The scoring branch flags W15 and W16 separately, plus a **strength for stacks live in BOTH**
  (you must clear 2-of-12 then 1-of-12 consecutively) and a softer W17 flag than the other finals.
- Dropdown order preserved: General / BBM VII / The Puppy 3 stay the top three; `fieldgeneral` is
  inserted immediately before the generic `superflex` entry.

### Calibration — nothing else moved
```
8 pre-existing tournaments, standard reference roster: BYTE-IDENTICAL before and after
```

---

## Competitive Balance Elevation Lived in Four Places (fixed Aug 23, 2026)

Section 4's Competitive Balance Elevation — two evenly-matched offenses in a tight game
elevate BOTH ceilings — was implemented **three times with three different thresholds**, and a
fourth consumer applied it **not at all**.

| Site | Feeds | Threshold | Tier strings |
|---|---|---|---|
| stack grading loop | `stackGrades` | `\|sp\|<=3` + `total>=46` + `score<=2` | via `tierFromScore` |
| orphan/partial loop | orphan matchups | same | **hand-rolled** `"Even"`/`"Hard"` |
| `matchupScoreFor` | Best Playoff Window panel, pivot rankings | **none** | — |
| redraft path | `analyzeRedraft` | `\|sp\|<=3` + **`total>=49`** | inline |

**The hand-rolled tier strings are the same divergence class fixed for the high-pace boost on
Aug 14** — a boost that updates `score` without routing through `tierFromScore` produces a label
that disagrees with the number driving the grade.

**`matchupScoreFor` skipping the rule was the live bug.** It drives the Best Playoff Window panel
and the pivot rankings, so the panel could rank a player *below* the stack grade of the same
player in the same week. Now unified in `competitiveBalanceBoost(m, opp, wkIdx)`, defined
directly under `tierFromScore`. **Change that function or none of them.**

### The redraft site is deliberately left alone
`analyzeRedraft` uses `total >= 49` and its comment block contradicts its own code in two places
(header says `>=46`, next line says `|spread| <= 2` and `>= 49`, code says `<= 3` and `>= 49`).
It is a different mode with its own calibration and moving it would shift redraft grades, so it
stays until someone re-calibrates redraft on purpose. **The comment is still wrong — fix the
comment before trusting it.**

### Do NOT loosen these thresholds to make a team grade better
```
|spread| <= 3   a genuine pick'em, not a projected blowout
total   >= 46   the framework says ELITE OFFENSES; total is the proxy. A tight game
                with a low total is competitive but not a shootout — PHI's W16 vs HOU
                sits at 41.5 precisely because the PHI defense suppresses scoring.
score   <= 2    only rescues Hard/Avoid. A neutral matchup is not a wall.
```
SF 2026 is the worked example and shows the rule behaving correctly in both directions:
W15 @LAC (2.5 / 47.5) and W16 @KC (2.5 / 46.5) both boost Hard -> Even; **W17 vs PHI misses by
half a point** (1.5 / 45.5) and correctly does not boost.

### ⚠️ When quoting tiers to a user, quote the BOOSTED number
`getMatchupTier` returns the RAW tier. The boost is applied by callers. Any ad-hoc probe that
calls `getMatchupTier` directly and prints the result is showing pre-boost values and will
understate every player in a pick'em game — which is exactly what happened when SF pieces were
repeatedly reported as `Hard/Hard/Avoid` when the engine was scoring them `Even/Even/Avoid`.

### Open question, deliberately not decided here
The boost caps at 3, so a wall can be lifted to neutral and never further. The framework text
says competitive balance "elevates BOTH ceilings," which arguably supports letting an elite
offense in a shootout reach Good. Raising the cap WOULD move grades and needs its own
calibration run — it is a data decision, not a cleanup.

### Calibration — nothing moved
```
STANDARD ref (7 tournaments) · pick-2 superflex (3 formats) · pick-11 hyper-fragile (3 formats)
ALL BYTE-IDENTICAL before and after. Expected: two sites already agreed, and the third
feeds display panels rather than the score.
```

---

## The Frenchie Sprint 2 — added Aug 24, 2026

Tenth tournament in `TOURNAMENTS`, key `frenchiesprint`. Read off the in-app rules. $10 ·
11,268 entries · $100k prizes · 11.3% rake · 18 rounds · **6-man drafts** (not 12) · half-PPR,
4pt passing TD · max 50 entries · closes 9/9/26.

| Round | Weeks | Groups | Advance | Field |
|---|---|---|---|---|
| R1 | W1-14 | 1,878 × 6 | 1 (16.7%) | 11,268 → 1,878 |
| R2 | **W15-17 COMBINED** | one 1,878-seat final, all paid | — | — |

### Only two rounds, and Round 2 is not gates — it is a summed score

Every other format on this board models W15/W16/W17 as **three separate elimination cuts**
with a weight vector expressing which gate is hardest. This format has **no gate between W15
and W17 at all** — 1,878 entries sit in one room for three weeks and final standings are
decided by **total combined points across all three weeks.** A great W15 can fully offset a
dead W16 here; in a gated format a dead W16 eliminates you regardless of how good W15 was.

**`weights: [1, 1, 1]` looks identical to `fastpuppy`'s vector for the opposite reason.**
fastpuppy is three *independent must-win single-week cuts* — equal weight because each is
its own coin flip. This format is one *combined sum* with no elimination between weeks —
equal weight because a point in W15 is worth exactly a point in W17. Do not read the matching
vectors as the same mechanic; they encode opposite structures that happen to average the same.

### R1 is the only hurdle in the entire tournament

1-of-6 (16.7%) is the same elimination severity as the 12-man 2-advance gates elsewhere
(83.3% eliminated either way), just run in 6-man pods. Clearing it guarantees a **$10 payout —
exact breakeven** — and access to the most top-heavy prize curve on this board:

```
1st alone         50.0% of the $100k pool
top 3             67.5%
top 10            73.4%
```

Nearly triple the Frenchie 13's 30% first prize, the next-most-concentrated format here.
`advanceWeight: 1.5` matches the other 83.3%-elimination qualifiers (Puppy 3, Pit Bull,
Schnauzer, Field General).

### The scoring branch checks the COMBINED average, not any one week

Every other branch asks "which week is the kill shot." That question doesn't apply to a
summed format, so this branch computes `(avgPerWeek[0]+avgPerWeek[1]+avgPerWeek[2])/3` per
stack and flags strength when a stack clears 4.0 on that combined average — a stack good
everywhere beats one elite in a single week and dead in another, because the dead week costs
real points here instead of costing nothing until a cut kills it.

### Calibration — nothing else moved

```
8 pre-existing tournaments, standard reference roster: BYTE-IDENTICAL before and after
```

---

## Snap Trajectory Layer (added Aug 25, 2026)

Fifth nflverse context layer. `scripts/build-snap-trajectory.py` reads the
nflverse `snap_counts` release into `grading/data/snap_trajectory_2025.json`.
**Context only — the numeric scoring engine is untouched. Verified: 27 grades
(3 reference rosters x 9 tournaments) byte-identical before and after.**

### The problem it fixes: a season average buries role CHANGE

`player_metrics_2025.json` stores `snap_sh` as a **season average**. Role change
is **rank 1** in the Source Hierarchy; a season-long volume average is **rank 2**.
Averaging the year collapses the higher-ranked signal into the lower-ranked one,
and it fails in the direction that matters most for projection — a player buried
in September and starting in December averages out to "committee," which is
exactly what he no longer is.

Two players were mis-graded off that average before this file existed, both in
the same direction:

```
RJ Harvey         season 0.421   W1-9 0.293 -> W10-18 0.565   last 4: 0.620
Chris Rodriguez   season 0.312   W1-9 0.216 -> W10-18 0.425   last 4: 0.443
```

Harvey was graded **fade/falling on four separate rosters** off the 0.421. The
role had already changed and the average is what hid it.

### Fields, and the two the season average cannot express

`season` (== `snap_sh`), `early` / `late` (W1-9 / W10-18), `early_gp` / `late_gp`,
`last4`, `delta` (late - early), `trend`, `changed_team`.

- **`last4` is games PLAYED, not the last four weeks.** An injured player's exit
  role still gets measured on real snaps rather than on zeros.
- **`delta` is null unless BOTH windows clear 3 games.** A one-game window is not
  a trajectory. Those players still emit a line, saying the season number covers
  one half of the year only — which is itself the correction (Nabers' 80% is four
  games; Purdy's 98% is W10-18 only).

### The threshold is DERIVED. Do not nudge it.

Across the 367 qualified 2025 players the delta distribution is centered at zero
(mean +0.010, **median -0.005**) with **stdev 0.157**. `TREND_THRESHOLD = 0.15` is
therefore ~1 SD, and it flags the tails: p10 -0.150, p90 +0.193, 57 rising and 37
falling out of 367.

**The centering is what makes the threshold mean anything.** If a future season's
median drifts off zero, the threshold starts measuring league-wide change instead
of player-specific change and must be re-derived before use. Guard 13 asserts
`|median| <= 0.03` for exactly this reason.

### Only players whose role MOVED are listed

`trajectoryContext` deliberately emits nothing for a `stable` player. A stable
line repeats what the season average already said. **The prompt header states this
explicitly**, so absence reads as "the average is a fair read" rather than as
missing data — the same silent-drop distinction the Jul 27 extraction rules turn
on. On an 18-man reference roster this produces 6 lines, not 18.

### `changed_team` spans two roles

A mid-season move splices two different jobs into one delta. The line still
prints the split (it is real information) but flags that the delta itself is not
a trajectory. Same trap as the Aug 8 rule about `player_metrics` rows carrying the
OLD team — check `team` against the ADP table before quoting any 2025 number
about a 2026 mover.

### Guard 13 — `scripts/test-snap-trajectory.mjs`

Three assertions, in descending order of what a regression would cost:

1. **CONTEXT-ONLY CONTAINMENT.** `getSnapTrend` may be referenced **exactly once**
   outside its definition, and that reference must sit inside `trajectoryContext`.
   `analyzeRoster` and `analyzeRedraft` are asserted clean. A second call site is
   a scoring leak even when it looks harmless, and it fails the build immediately
   rather than surfacing later as an unexplained grade movement.
2. **The trend LABEL matches the number.** `delta == late - early`, and `trend`
   follows `delta` against `_meta.trend_threshold`. Same class as the Aug 14
   tier/score divergence: a label that disagrees with its own value reads as
   confirmation and is worse than no label.
3. **The threshold stays earned** (centering + ~1 SD + flags 10-40% of the pool).

Both failure paths were negative-tested: corrupting a trend label and adding a
second call site each exit non-zero.

### Regenerate

```
curl -sSL -o snaps.csv.gz \
  https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2025.csv.gz
python3 scripts/build-snap-trajectory.py snaps.csv.gz grading/data/snap_trajectory_2025.json
```

### Still open (the other two from the same audit)

**Vacated target share** (built as a throwaway script, not yet a data file) and
**availability rate** (proposed, not built). Both are free from the same nflverse
source. The vacated-targets pass already needs the suffix normalization fix that
inflated WAS to 82.4% on its first run — normalize before differencing, or a
suffixed name reads as a departure.

---

## Measured Stability of Every Input (Aug 25, 2026)

The Source Hierarchy ranked inputs by **causal priority**, which was reasoned
rather than measured. This section measures the other axis: **how often last
year's number is still true this year.** Everything below is computed from
nflverse weekly player stats + snap counts, 2023-2025, same player, both
transitions (23>24, 24>25), 8+ games in both seasons.

### Verified: FPA is the least stable input in the app

Year-over-year correlation of half-PPR points allowed per game, by defense:

```
pos     r 23>24   r 24>25   mean r    r^2
QB       -0.150     0.247    0.049   0.00
RB        0.294     0.196    0.245   0.06
WR       -0.063    -0.083   -0.073   0.01
TE        0.152     0.232    0.192   0.04
```

**The best FPA figure on the board explains 6% of next-season variance, and it
is worse than the WORST player-level opportunity metric measured.** Rank 5 is
correct and is now empirical rather than asserted.

**WR FPA is negative in BOTH transitions.** A defense that was soft against
receivers last year is very slightly more likely than chance to be tough this
year. Do not build a WR matchup argument on a prior-season FPA number alone.

### Gemini's TE claim is directionally wrong, but it is detecting something real

TE is the **second-most** sticky position (0.192), behind RB. **WR is the least
sticky.** What TE does have is the widest relative spread across defenses:

```
pos      mean   stdev      CV       min > max
QB       16.3    2.68   0.164    11.1 > 23.3
RB       19.9    2.87   0.145    15.5 > 26.2
WR       25.3    3.57   0.141    19.3 > 33.3
TE       10.6    2.35   0.221     6.2 > 17.5
```

**TE CV 0.221 is the highest** — best TE defense allows 6.2/gm, worst allows
17.5, a 2.8x range against 1.7x at WR. TE matchups *look* like they swing hardest
because in percentage terms they do. That is the observation. "Therefore
unpredictable" is the part that does not follow.

A within-2025 split-half check (odd weeks vs even, Spearman-Brown corrected to
full season) says **roughly half of a season-long TE or QB FPA number is signal
(0.458 / 0.466), and an RB one is mostly noise (0.141)** — RB is stickiest across
years and least reliable within one, which fits: the run front is the most stable
unit in football while weekly RB output is dominated by game script.

⚠️ These are RAW points allowed, **not schedule-adjusted**. A defense that drew
Kelce, Bowers and LaPorta looks soft at TE for reasons unrelated to the defense.
`grading/data/fpa.md` is the same shape of number and inherits the same confound.

### The player-level table — opportunity is sticky, efficiency is not

```
PASS CATCHERS (WR/TE)              RUNNING BACKS
metric              mean r         metric              mean r
adot                 0.784         carries_pg           0.730
air_yards_share      0.780         snap_share           0.728
targets_pg           0.774         points_pg            0.715
wopr                 0.752         dud_rate             0.673
target_share         0.729         target_share         0.661
snap_share           0.709         wopr                 0.659
points_pg            0.699         usable_rate          0.658
dud_rate             0.667         targets_pg           0.654
usable_rate          0.652         spike_rate           0.620
catch_rate           0.496         adot                 0.324
spike_rate           0.475         yds_per_target       0.311
yds_per_target       0.308         rec_epa_per_tgt      0.260
rec_epa_per_tgt      0.278         td_per_touch         0.214
td_per_touch         0.198         catch_rate           0.103
                                   yds_per_carry        0.022

QUARTERBACKS
qb_rush_att_pg 0.815 · pass_att_pg 0.605 · pass_adot 0.486 · yds_per_att 0.444
sack_rate 0.398 · pass_td_rate 0.389 · points_pg 0.383 · comp_pct 0.338
usable_rate 0.322 · spike_rate 0.308 · pass_epa_per_att 0.260
```

### Six things this changes

1. **RB YARDS PER CARRY IS r = 0.022. It is a coin flip.** The most-quoted RB
   stat in public analysis carries essentially zero year-over-year information.
   Never let a YPC figure move a verdict. `ngs_rush_rank` measures the same
   underlying thing and inherits the same warning.
2. **QB RUSHING ATTEMPTS PER GAME (0.815) IS THE STICKIEST INPUT MEASURED**,
   ahead of every receiving metric. The konami-code premium is not a narrative —
   a QB's rushing volume is the single most repeatable thing in football, which
   is why it is the safest component of a QB projection.
3. **aDOT is the sticky exception among efficiency-shaped numbers (0.784)**
   because it is a ROLE property, not a performance one. This validates the
   air-yards layer's framing: aDOT describes where a player is deployed, and
   deployment persists while outcomes do not.
4. **DUD RATE IS MORE STABLE THAN SPIKE RATE at every position** (WR/TE 0.667 vs
   0.475). Floor is more predictable than ceiling. **In best ball the more
   stable metric is the less useful one** — a genuine tension, and the reason the
   Ceiling Shape Layer is capped at ±0.5 rather than trusted. Spike rate at 0.475
   is exactly what a rank-4 input should look like.
5. **QB fantasy points per game is barely sticky (0.383)** — QBs are far less
   predictable season to season than pass catchers (0.699). Combined with (2):
   project QBs from rushing volume and pass attempts, not from last year's
   points.
6. **RB air_yards_share (0.261) and catch_rate (0.103) are unusable for backs**
   despite working for receivers. The CLAUDE.md note that `ay_sh` "discriminates
   nothing" for RBs is confirmed, and now quantified.

### Stability is NECESSARY, not SUFFICIENT — do not collapse the two axes

A metric can be perfectly stable and still tell you nothing (jersey number would
score 1.00). This table answers "will last year's number still be true," and
nothing else. It does **not** rank metrics by predictive value, and it does not
replace the Source Hierarchy.

**The apparent contradiction is worth stating plainly.** Rank 1 in the hierarchy
is role/opportunity **CHANGE**, and change is by definition the part that is NOT
sticky. That is not a conflict, it is the whole point: a confirmed role change
outranks everything precisely because it **invalidates the sticky baseline**.
The two lists are complementary — this one tells you what to assume by default,
the hierarchy tells you what overrides the default.

### Limits — state these before quoting the numbers

- **Survivorship.** 8+ games in both seasons excludes injury years, so these are
  correlations among players who held a role two years running. True population
  stickiness is lower.
- **Range restriction** biases toward the stable middle for the same reason.
- **Two transitions only.** QB n=26 per transition is small; treat the QB column
  as directional. WR/TE n=149 and RB n=58 are solid.
- Reproduce with the nflverse weekly stats releases plus `snap_counts`; no
  script was committed because this is a one-off calibration, not a data layer.

---

## QB Volume Profile (added Aug 25, 2026)

`scripts/build-qb-profile.py` -> `grading/data/qb_profile_2025.json`. Three fields,
41 quarterbacks. **Context only — 27 grades byte-identical before and after.**

### Why a sixth data file for three numbers

The stability calibration measured the QB inputs and the result is lopsided:

```
qb_rush_att_pg   r = 0.815   <- stickiest input measured ANYWHERE
pass_att_pg      r = 0.605
pass_adot        r = 0.486
points_pg        r = 0.383   <- barely sticky
```

**None of the three sticky ones were in the prompt.** The QB metrics line carried
spike rate (0.308) and dud rate only — the least useful pair available for the
position. A QB is projected from volume and deployment; his prior-season points
are close to noise.

**It could not go in `player_metrics_2025.json`.** That builder tracks carries
internally but emits no count, and has no passing-attempt fields at all.
Regenerating it would re-derive `hvt_pg`, `usable_rate` and `spike_rate` — three
inputs that DO score — over a pbp release that may have been revised since. An
additive file cannot move a grade; a regeneration can.

### `qbContext` is deliberately NOT inside `metricsContext`

That block gates on `PLAYER_METRICS.gp >= 8`, which drops a QB who missed half a
season. **A seven-game starter is exactly the case where his rushing rate is the
most useful thing you can say about him** — Jayden Daniels, 8.29 rush att/gm on
7 games, would have been silent. This block carries its own gate (6 games, 100
attempts, matching the stability run's qualifying rule).

The prompt line flags both tails against the league median (3.43): at 1.5x it
says RUSHING QB, at 0.55x it says no rushing floor. 2025 range is 1.12 (Goff) to
8.29 (Daniels), so the spread is real and worth naming.

### Efficiency ranks now carry their measured instability inline

`rush_eff_rank` and `ngs_rush_rank` print "2025 only, does NOT carry to 2026",
and the `efficiencyContext` prompt header states the numbers: **RB yards per
carry r=0.02, yards per target 0.31, EPA per target 0.27.** The header now says
explicitly to use efficiency to explain what happened and never to argue what
will happen.

This closes a live risk rather than a hypothetical one. Nothing in the engine
scores efficiency — every call site is inside the prompt builder — so the only
way a coin-flip number could move a verdict was the AI layer quoting a rank as
though it meant something, which nothing prevented.

### Still open: three anchor-tier metrics the prompt omits

Measured anchors that are absent from `metricsContext`, listed with what they
would cost:

| Metric | Stability | Cost |
|---|---|---|
| Targets per game (WR/TE) | 0.774 | **free** — `tgt` and `gp` are already loaded |
| Air yards share (WR/TE) | 0.780 | **free** — `ay_sh` is already loaded, just unprinted |
| Carries per game (RB) | 0.730 | needs a count `build-player-metrics.py` does not emit |

The first two are one line each and cannot move a grade. Left undone on purpose:
they were outside the change that was approved, and prompt content is a data
decision like any other.

---

## Player Card (added Aug 25, 2026)

Click any name in the roster strip under the grade header and a modal opens with
that player's 2025 role data. **Informational only — 27 grades byte-identical
across 3 reference rosters x 9 tournaments.** Guarded by
`scripts/test-player-card.mjs` (guard 14).

### It answers a DIFFERENT question from the grade

The grade is portfolio-level: is this construction good. The card is
player-level: what is this player's role. Conflating them is the same error the
Source Hierarchy already warns about, so the card issues **no verdict** — it
shows data and lets the reader decide. `PLAYER_VERDICTS` is deliberately absent:
a stale verdict rendered as current is the Diggs bug in a new costume.

### A MODAL, not another panel

The results view already carries nine disclosure panels. A modal costs the page
**zero resting density**, which is the whole reason the card is not a tenth one.
The only resting cost is the roster strip itself: four lines, one per position.

That strip is also the canonical entry point — every rostered player appears
exactly once, so there is one place to click rather than hoping a name happens to
show up inside a stack block.

### TWO VISUAL CHANNELS. The second one is the point.

**Colour encodes WHERE a player ranks. Weight encodes HOW MUCH that rank should
move your opinion.** These are different facts and one channel cannot carry both.

A back at the 78th percentile in yards per carry, painted green, teaches the
reader to trust `r = 0.022`. That would look like a working feature while doing
active harm — the same shape as the position-normalisation bug in the Ceiling
Shape Layer, where grades moved for the wrong reason.

So anchor metrics render at full contrast. Anything below the reliable line
renders at 55% opacity with a `2025 ONLY` tag, and efficiency rows are dimmed
wholesale with the coin-flip figure stated in the section note.

### The headline is the TRAJECTORY, not the season average

Leading with a season average reproduces exactly the error that graded RJ Harvey
`fade/falling` on four rosters. The card opens with `W1-9 -> W10-18 -> last 4`.

**Where the two disagree, BOTH are shown and the conflict is labelled.** Harvey's
snap-share row reads 42% at the 30th percentile while the headline above it reads
29% -> 56%. That contradiction is the finding, so the row carries
`⚠ season average — his role grew, see trajectory` and its percentile is greyed
out. Never resolve this by hiding one of the two numbers.

### Metric sets are FIXED per position, never selected

A card that picks the most impressive-looking metrics is a highlight reel, and
**two players stop being comparable**, which is the card's actual job. Same
metrics, same order, every player at that position.

```
WR/TE   targets/gm · air yards share · target share · WOPR · snap share
RB      snap share · target share · targets/gm · WOPR · HVT/gm
QB      rush att/gm · pass att/gm · passing aDOT   (from QB_PROFILE)
```

All anchor or reliable tier, all from already-loaded fields. **WR/TE aDOT (0.784)
is the one anchor still missing** — `AIRYARDS` is RB-only, so it needs data the
app does not carry. RB carries/gm (0.730) is missing for the same reason.

### Percentile population is the decision that could bias the whole card

Mirrors `CEILING_RANKINGS` exactly: **draftable (present in `ADP_DATA`) and 8+
games.** Percentile against all players is meaningless — a three-game backup
lands in the 90th percentile of something. **The gate is printed on the card**, so
a number can never be read without it. Populations under 12 return null rather
than a flattering rank.

### No blank cards, ever

A player with no data returns a `reason` string, never an empty card. Of 291
draftable players, 234 render data and **57 render an explicit reason** (rookies,
sub-gate). An empty card is the silent-drop failure in a new costume: per the
Jul 27 extraction rules, a filter that removes something must never be silent.

Guard 14 asserts the no-data branch is actually exercised, so it cannot rot into
dead code.

### `movedFrom` reconciles the two team fields

`PLAYER_METRICS` carries the team a player PLAYED for; `ADP_DATA` carries his 2026
team. When they differ the card leads with a warning naming both. Same trap as the
Aug 8 rule — Gainwell's card reads TB with a banner saying every number below is
his PIT season.

### Guard 13 changed shape when this shipped

`getSnapTrend` previously had to be called **exactly once**. The card is a second
legitimate consumer, so the assertion became an **allowlist of reviewed
consumers** (`trajectoryContext`, `buildPlayerCard`), each verified to sit outside
the scoring engine.

**Do not relax this to "any number of call sites."** The point is that every
consumer is reviewed, not that there is one. A third, unlisted call site still
fails the run — negative-tested. `analyzeRoster` and `analyzeRedraft` are still
asserted clean, which is the assertion that actually protects the grades.
---
## The Puppy 4 — added Aug 25, 2026

Eleventh tournament in `TOURNAMENTS`, key `puppy4`. Read off the in-app rules.
**It runs ALONGSIDE Puppy 3 and does not replace it** — both sit on the 2026
slate and both close 9/9/26. $5 · 112,800 entries · $500k prizes · 11.3% rake ·
18 rounds · 12-man drafts · half-PPR, 4pt passing TD · QB1/RB2/WR3/TE1/FLEX1/
BENCH10 · max 150 entries.

| Round | Weeks | Groups | Advance | Field |
|---|---|---|---|---|
| R1 Qualifier | W1-14 | 9,400 × 12 | 2 (16.7%) | 112,800 → 18,800 |
| R2 Quarterfinal | W15 | 1,880 × 10 | 1 (**10.0%**) | 18,800 → 1,880 |
| R3 Semifinal | W16 | 188 × 10 | 1 (**10.0%**) | 1,880 → 188 |
| R4 Championship | W17 | one 188-seat group, all paid | 1 | 188 → 1 |

P(reach the final) = **0.167%**, one in 600.

**Every figure reconciles against the rules text.** Unlike the Pit Bull page
("156 6-person Groups"), the Frenchie R2 reversal and the shared "single1,
31-person Group" template bug, this one has no typo. The ladder was still
recomputed from the group counts rather than trusted — do that every time.

### The first format where W15 and W16 are exactly equal AND both brutal

Both are **1-of-10**. Puppy 3 pairs a 10% W15 with a 20% W16; BBM VII pairs 7.1%
with 8.3%. **This is structurally BBM's shape at a shallower depth** — two
near-identical consecutive kill shots — so both weeks carry maximum weight and
the scoring branch flags stacks live in BOTH, exactly as `bbm7` does.

Combined weekly survival is **1.00%**, harder than Field General's 1.39%.

### Why W17 gets 1.75 and not BBM's 1.5 or the others' 2

The final here is **both richer and more reachable than BBM's**: 74.8% of the
pool ($373,500) reaches the 188 finalists, **1st alone is 20.0%** against BBM's
13.3%, and arriving pays 150x on a $5 entry.

It stops short of 2 because **the binding constraint really is surviving two 10%
cuts back to back** — W17 quality cannot buy you past them. The $5 ladder is
breakeven → $10-125 → $750+ → $100k, and **the jump that matters is clearing
W16**, which takes you from roughly $25 to a $750 floor.

`advanceWeight: 1.5` matches every other 2-of-12 qualifier (puppy, schnauzer,
pitbull, fieldgeneral) — same structure, 83.3% eliminated.

### It IS in the uniqueness-leverage branch

**112,800 entries clears the 100k massive-field threshold** in the Field Size
Overlay, so the uniqueness premium applies and `puppy4` joins `bbm7` and `puppy`
in that branch. Schnauzer (37.2k), Pit Bull (28.1k) and Field General (34.0k)
are mid-field and stay out. This is the first addition since BBM to qualify.

### Updated ladder, ordered by weekly gate severity

```
                weights          gates W15/W16   P(final)   advanceWeight   massive field
BBM VII      [2,    2,    1.5]     7.1 / 8.3      0.099%       1.75             yes
Puppy 4      [2,    2,    1.75]   10.0 / 10.0     0.167%       1.5              yes
Puppy 3      [2,    1.5,  2]      10.0 / 20.0     0.333%       1.5              yes
Field Genl   [1.5,  2,    1.75]   16.7 / 8.3      0.347%       1.5              no
Pit Bull 2   [1.5,  1.25, 2]      16.7 / 20.0     0.556%       1.5              no
Schnauzer    [1.25, 1,    2]      20.0 / 25.0       —          1.5              no
Frenchie 13  [1.25, 2,    2]      33.3 / 16.7       —          1.25             no
Boxer        [1,    0.75, 2.5]    40.0 / 50.0     6.67%        0.75             no
```

### Calibration — nothing else moved

```
9 pre-existing tournaments x 3 fixtures = 27 grades BYTE-IDENTICAL

The Puppy 4 (new):   ref1 A 7.39 · ref2 C+ 0.73 · ref3 B+ 5.09
```

**Two of three fixtures grade identically on Puppy 3 and Puppy 4, and that is
correct rather than a wiring bug.** The weights bite through `normalizedScore`,
which does differ (ref1: LAR 10.4 → 10.0, JAX 11.2 → 11.3, ATL 12.0 → 12.1) —
the final grade only moves when a stack crosses an elite/qualified threshold.
ref2 does move, 1.13 → 0.73. **If you ever change a weight vector and see zero
movement anywhere, check `normalizedScore` before assuming the config is live.**

---

## Calibration Fixtures Are Now Committed (Aug 25, 2026)

`scripts/fixtures/ref1.txt`, `ref2.txt`, `ref3.txt` — three 18-man rosters
drafted from real `ADP_DATA` at seats 3, 11 and 7 of a 12-man snake.

**Every calibration recorded in this file compares grades against reference
rosters that lived in a scratch directory.** That directory does not survive a
container reset, and it did not: the Puppy 4 session found `node_modules` and the
entire scratchpad gone, including the rosters that a dozen recorded calibrations
depend on. **A calibration you cannot re-run is not a calibration** — it is a
number nobody can check.

The historical ref1/ref2 are unrecoverable, so the numbers recorded in earlier
sections stay as they are: they were valid against the rosters used at the time
and remain a true record of "nothing moved" for those runs. **Do not attempt to
reproduce a pre-Aug-25 calibration figure against the new fixtures** — different
rosters, different numbers, and a mismatch means nothing.

From here, every calibration run uses `scripts/fixtures/`. Add a fixture rather
than replacing one if a new shape needs covering, so past numbers stay checkable.

---

## The Split Refresh Cadence (decided Aug 27, 2026)

**Anything that SCORES is frozen. Anything that is CONTEXT may refresh weekly.**

That one line settles every future "should I regenerate this file mid-season"
question, and it is enforced by guard 15 rather than left as a convention.

| Cadence | Files | Why |
|---|---|---|
| **FROZEN** | `player_metrics_2025.json` | Feeds four scored inputs: `hvt_pg` (Naked RB gate), `usable_rate` (Advance Rate Layer), `spike_rate` + `nuclear_rate` (Ceiling Shape Layer) |
| **WEEKLY** | `snap_trajectory_2026.json`, `qb_profile_2026.json` | Context only. Role CHANGE is rank 1; QB rushing volume is the stickiest input measured (r=0.815) |
| **ANNUAL** | efficiency, motion, airyards, sos | Efficiency is the least predictive layer in the app (RB yds/carry r=0.02), FTN's motion source lags more than a week, sos is schedule-static |

### Why the scored file is frozen and not "just refreshed too"

Refreshing it weekly would move **every grade** for reasons unrelated to the
roster. A build graded 8.9 in September re-grades to 8.4 in October with no
change to the players. The grade-history panel and every share link stop being
comparable, and **every calibration recorded in this file silently becomes
untrue** — nothing errors, the numbers just quietly stop meaning what they meant.

The second reason is sample size. The gates are 8+ games and `spike_rate` on four
games is noise. Through Week 7 the rates are not merely weak, they are
**actively misleading**, and they would be rendered at full confidence.

### Both vintages are shown. Never swapped.

The card carries `trajectory` AND `trajectoryCur`, `qb` AND `qbCur`, current
season first with the prior season underneath. **The comparison is the insight** —
"38% in 2025, 61% through W7" says more than either number alone — and a layer
that silently swaps vintage underneath the reader is the stale-data trap in a new
costume. `vintageLabel()` is the single source of every printed vintage; guard 15
asserts nothing prints one without it.

The AI prompt does prefer the current season when live, but appends the 2025
figure so the model sees what changed rather than a number whose meaning moved.

### Partial seasons split differently, on purpose

A W1-9 / W10-18 split is meaningless in Week 8 — nobody has a late window, so
every player would report "partial season" and **the layer would say nothing all
autumn**, which is exactly the half of the year when role change is most worth
catching.

```
complete season (18+ wks)  ->  W1-9 vs W10-18                split_mode "calendar"
partial season             ->  first half vs second half     split_mode "halves"
                               of the weeks covered
```

A 4-vs-4 split is noisier than 9-vs-9, so **the threshold is DERIVED from that
run's own delta distribution** instead of inheriting the full-season 0.15
(a W8 dry run derived 0.14 from 278 deltas). `_meta.threshold_source` records
which was used. **Never compare a partial-season delta against a full-season
one** — they are different measurements.

The QB gate scales the same way: 6 games / 100 attempts on a complete season,
and half the weeks covered / 20 attempts per game on a partial one, recorded in
`_meta.gate`.

### The weekly job

```
bash scripts/refresh-inseason.sh          # season defaults to 2026
npm test && git add grading/data && git commit
```

Two downloads, seconds. **It no-ops safely before Week 1** — the releases 404,
the script says so and leaves the committed placeholders untouched.

### ⚠️ The release tag is `stats_player`, NOT `player_stats`

The obvious guess 404s. This was wrong in `build-qb-profile.py`'s own docstring
as committed on Aug 25 and cost a debugging cycle here. `snap_counts` is the
tag it looks like.

### The placeholders are generated by the real builders

`snap_trajectory_2026.json` and `qb_profile_2026.json` ship with zero rows,
produced by running the actual builders against header-only inputs so **their
shape cannot drift from what a live weekly run emits**. Every consumer gates on
`_meta.weeks_covered > 0`, so an empty file is not a special case anywhere — the
app behaves exactly as it did before 2026 existed.

### Calibration

```
10 tournaments x 3 fixtures = 30 grades BYTE-IDENTICAL
2025 player rows reproduce EXACTLY through the refactored builders (511 / 41)
Both guard-15 failure paths negative-tested:
  a current-season read inside analyzeRoster  -> exit 1
  the scored import moved to player_metrics_2026 -> exit 1
Live path dry-run against a real season (2025) reproduces both files exactly.
Dual-vintage dry run against a simulated "2026 through W8" renders both
  vintages with the footer naming both.
```

---

## UI Density Pass (Aug 27, 2026)

Presentation only — **30 grades byte-identical across 10 tournaments x 3
fixtures.** The governing rule: **nothing shows at rest unless the reader asked
for it, and colour encodes structure rather than decoration.**

### The roster strip folded into the counts row it duplicated

The results header already printed `QB 3 RB 5 WR 8 TE 2`, and the strip below
repeated the same grouping in longhand as eighteen pills. Two lines saying the
same thing, one of them very tall.

The counts row is now the toggle. It carries the position colours, and the pills
render only when clicked. **Eighteen pills of resting density became zero.**

### `posColor` had a second copy and now does not

The modal is a top-level component and cannot reach `posColor` inside
`RosterScorer`, so the first version of the card header declared its own map.
That is the exact divergence class already fixed twice here (Aug 14 tier/score,
Aug 23 competitive balance). `POS_ACCENT` is now the single module-level
definition and `posColor` reads it. **One definition or none.**

### Card sections carry an accent, and the dim one stays dim

```
ROLE TRAJECTORY   cyan          the headline
VOLUME PROFILE    cyan          the QB headline
OPPORTUNITY       purple-light  anchor metrics
WEEK OUTCOMES     info-blue     ceiling shape
EFFICIENCY        text-dim      deliberately NOT bright
```

**Efficiency keeping a grey header is the load-bearing part.** A cyan heading on
that block would say the opposite of the note underneath it and undo the whole
two-channel design — the section is muted because the numbers in it do not
predict anything.

### Efficiency is collapsed, and lost four redundant tags

It is the least predictive section on the card, so it is the one that earns a
click rather than a scroll. Its own note already says "a record of what
happened, never a forecast," which made a `2025 ONLY` chip on each of its four
rows four extra pieces of loud orange restating the sentence above them. The
chip survives on Spike weeks, where it is the only warning present.

**Card height: ~1500px -> 642px** on a 430px viewport.

### Grade history no longer opens by default

Every other panel on the results view is collapsed; `historyPanelOpen` was the
lone `useState(true)`. It was the outlier, not the convention.

### Auditing this is reproducible, and worth doing before claiming a fix

```
npx vite --port 5199 --host 127.0.0.1
# playwright installed OUTSIDE the repo (npm i playwright --prefix /tmp),
# chromium at /opt/pw-browsers/chromium
```

**Localhost works from the sandbox even though external hosts do not** — the
Aug 15 note about Chromium getting `ERR_CONNECTION_RESET` applies to the open
internet, not to a local dev server. Measuring the card at 1500px is what made
collapsing Efficiency an obvious call rather than a guess.

Expect `⚠ AI UNAVAILABLE · RETRY` in local screenshots. Vite does not serve
`/api/analyze`; that badge is correct behaviour, not a regression.

### Second pass: what the measurement found that the eye did not

The results view was **8,169px** with twelve sections and essentially no
disclosure. Three of them were read occasionally rather than every time, so they
now cost a click:

```
WHAT IF YOU HAD   991px   exploratory by definition
BYE WEEK MAP      501px   reference table, not a verdict
FULL ROSTER       550px   DUPLICATE of the roster strip
```

**`FULL ROSTER` was the find.** It lists all 18 players at the bottom of the
page, which is exactly the redundancy that was just removed at the top. Both
now exist deliberately: the strip is the quick entry point beside the grade, and
FULL ROSTER is the detailed view with pick, position and team. Neither is open
at rest.

**8,169px -> 6,275px, with the core read untouched.** Strengths, weaknesses, the
stack matrix, solo picks and standouts all stay open however tall they are.
**What collapses is a judgement about reading FREQUENCY, not about size** — the
stack matrix is the tallest block on the page at 1,340px and it stays open,
because it is why the page exists.

`SectionH2` is the one collapsible header, so a fourth ad-hoc implementation
cannot appear.

### The inline-link trap, caught by measuring twice

Making the 18 full-roster names into inline text links took the page from **1
sub-32px tap target to 19**. An inline 15px link inside a dense 12px table row
is the wrong affordance on a phone — easy to miss, easy to mis-tap.

**The ROW is the target instead.** One extra line of padding puts it at 33px,
the whole width is tappable, and it carries `role="button"`, Enter/Space
handling and an `aria-label`. Back to **zero** sub-32px targets, and the AI
retry button was raised to the same floor while there.

The general rule: **a name should be reachable everywhere it appears, but
"clickable" and "a good tap target" are different problems.** Solve the second
one at the container, not the text.

### Third pass: the input screen, and moving the advance-rate view (Aug 27)

**The Season Schedule · Advance-Rate View moved from the very bottom of the page
to directly above Playoff Window Preview** — y≈7500 to y=2316. It was the last
block in the best-ball tree, below FULL ROSTER, and it is a panel this user
opens constantly.

Moving it cost nothing at rest because **it was already collapsed** — only its
header row relocated. That is the general lesson: a collapsed panel can sit
anywhere the reading order wants it, because its resting cost is one line.

Its header was the last disclosure still using the old `▲/▼` idiom. It now
carries the same accent bar plus cyan `hide / W1-18 ⌄` affordance as the roster
strip, the card sections and `SectionH2`, so **every disclosure on the page reads
identically**. The purple label stays — it is schedule context, matching the W16
slot in `weekColor`.

### The paste instructions are first-run only

The how-to-paste callout is the #1 friction point for a first-time user and pure
noise for a returning one, so the default now follows who is looking:
`localStorage["rxr_has_analyzed"]`, set the moment a grade is requested.

```
INPUT, first visit   2370px   help expanded
INPUT, return visit  2231px   help collapsed, reopens on click
```

**Wrapped in try/catch on both read and write** — a private window throws on
access rather than returning null, and the fallback is the first-run experience,
which is the safe direction to fail.

### ⚠️ There are two functions that call `analyzeRoster`, and only one is the button

The first version of this hooked the wrong one and the flag never persisted:
`handleAnalyze` (the `onClick`) is the real path; the other site is a separate
restore path. **The build was clean and the guards passed the whole time** —
only rendering the page in a browser and reading `localStorage` back caught it.
Check which function the control actually calls before adding a side effect.

### Where the results view landed

```
8,169px  ->  6,102px at rest, core analysis untouched
0 tap targets under 32px (was 1, briefly 19)
no page errors in best ball or redraft
```

---

## The Playoff Boosts Lived in Five Places (fixed Aug 27, 2026)

**Reported by a user, not by a test:** the SF stack read `Good/Good/Good` in the
stack matrix while the same players' W15-17 cells in the Season Schedule ·
Advance-Rate View read `Hard`/`Avoid`. Both views were correct for their own code
path, which is the whole problem.

There were **four different boost levels across five consumers**:

| Consumer | competitive balance | high pace | tier label |
|---|---|---|---|
| stack loop (the scored path) | yes | yes | correct |
| orphan matchup loop | yes | yes | **`score` updated WITHOUT `tier`** |
| `matchupScoreFor` (panel, pivots) | yes | **missing** | n/a |
| `seasonSchedules` (the W1-18 grid) | **no** | **no** | raw ← what the user saw |
| Advance Rate Layer, W1-14 | no | no | **correct, leave alone** |

### Two separate bugs, one reported and one latent

1. **The season grid applied neither boost.** It calls
   `getMatchupScoreForOpponent`, which was never in the boost chain. Seven of
   nine SF playoff cells disagreed with the stack matrix.
2. **The orphan loop's high-pace branch skipped `tierFromScore`** — exactly the
   divergence the Aug 14 note says was fixed. That fix corrected the stack loop's
   two branches and **missed the orphan loop's**, so orphan tier labels have been
   understating boosted weeks ever since.

### `playoffBoosts` is now the only place either boost is applied

```js
const playoffBoosts = (m, team, opp, wkIdx) => { ... }   // wkIdx 0/1/2 = W15/16/17
```

Both boosts, label and number moving together, one definition. The stack loop,
the orphan loop, `matchupScoreFor` and `seasonSchedules` all route through it.

### ⚠️ The W1-14 scored path must NOT route through it

The Advance Rate Layer averages `getMatchupScoreForOpponent` over
`sched.slice(0, 14)`. **That is scored, and `PLAYOFF_GAME_TOTALS` /
`getGameSelectionNode` carry no W1-14 data** — boosting there would be inventing
numbers and would move every grade. The season grid passes `weekIdx - 14` so the
helper no-ops outside the playoff window, and guard 16 asserts both halves.

`analyzeRedraft` is also deliberately out of scope: it keeps its own thresholds
(`total >= 49`) and its own calibration.

### Guard 16 — `scripts/test-playoff-boosts.mjs`

This is the **third** time this class has bitten (Aug 14 tier/score, Aug 23
competitive balance, now this), so the guard asserts the SHAPE, not the symptom:

- `playoffBoosts` defined once; `competitiveBalanceBoost` has exactly one call
  site; the high-pace boost is applied exactly once. **Counted by
  `highPaceBoost: true`, not by the string `type === "highPace"`** — that also
  appears as a prompt label, and matching it made a correct file fail.
- **Each consumer is structurally wired to the helper.** The first version only
  compared the two tier functions with the test boosting both sides, which
  cannot see the app skipping a boost — the negative test passed when it should
  have failed. Fixed by asserting `seasonSchedules`, `matchupScoreFor` and the
  orphan loop each contain `playoffBoosts(`.
- The W1-14 pass exists, is bounded to `slice(0, 14)`, and does NOT call it.
- All 384 playoff cells agree across both tier functions, and the label follows
  the score in every one.
- The boosts still fire, and do not fire everywhere.

Negative-tested both ways: reverting the season grid to the unboosted call and
decoupling the label from the score each exit non-zero.

### Calibration

```
36 grades BYTE-IDENTICAL — 10 tournaments x 3 fixtures, plus redraft and
projected mode. Expected: tier is display-only in the scoring path, the orphan
score was already correct, and the season grid feeds no score at all.
```

---

## `button:not([data-compact])` Centres Its Content (found Aug 27, 2026)

Reported as *"it's literally all over the place, why isn't it organized"* — the
grade header had **seven different left edges** on a phone. Measured, not judged:

```
grade letter A       left  49
OVERALL CEILING…     left  49
counts row container left  49
  QB 2 RB 5 WR 9…    left 128   <- 79px indent, from nothing in its own style
  18/18 matched      left 152
  HIDE ROSTER chip   left 258
```

### The cause is a global rule, and an auto margin was hiding it

The accessibility pass that gave every button a 44px floor also set
`justify-content: center` so labels sit centred in the taller box:

```css
button:not([data-compact]) { min-height:44px; display:inline-flex;
                             align-items:center; justify-content:center; }
```

Any button used as a **row of left-aligned content** inherits that. The counts
row looked fine at desktop width because its right-hand group carries
`marginLeft: auto`, and an auto margin absorbs all free space, which makes
`justify-content` a no-op. **On a phone the row wraps**, line 1 holds only the
four counts, there is no auto-margin item on that line any more, and the rule
takes over and centres them.

**So the symptom only appears at narrow widths, and only after a wrap.** That is
why it survived a desktop review and why it needs measuring rather than looking.

### Two rules this produces

- **A button used as a layout row must state `justifyContent` explicitly.** Do
  not rely on an auto margin to suppress the global rule; the moment the row
  wraps, the suppression disappears.
- **Group the halves of a two-sided row.** With the four counts in one span and
  matched-plus-chip in another, a wrap moves a whole group to the next line
  instead of splitting the row into differently-aligned fragments.

Check `SectionH2` and the card-section headers if either is ever restyled —
both are buttons carrying left-aligned content and both currently rely on an
auto-margin child.

### Pills: grid, not wrapping flex

The same report covered staggered pills. A wrapping flex row sizes every pill to
its own text, so the second column landed at x=186/216/245/201/208 down the
list. A grid with `repeat(auto-fill, minmax(132px, 1fr))` puts every
second-column pill at 235.

**Names wrap rather than truncate.** Fixed columns clipped `Kenneth Walker Iii`
by 8px, and at 430px two columns cannot fit the longest names at 12px/600 —
widening enough forces one column and doubles the strip height. Truncating a
name in a list whose only job is identifying players is the wrong trade, so the
pill takes a second line and the grid equalises row heights.

Calibration: 33 grades byte-identical, 0 tap targets under 32px in either mode.

---

## One Colour, One Meaning (fixed Aug 28, 2026)

Reported as *"why are the colors so similar to each other, if everything is cyan
how can the user see the difference"*. The colours were not too similar. They were
**overloaded** — the same token carried different meanings in different places, so
similarity was the symptom and ambiguity was the disease.

### `--accent-cyan` meant four things at once

```
RB position chips           a category
every disclosure affordance chrome        ("hide ⌄", "VIEW ROSTER", step numbers)
22 emphasis spans in copy   emphasis      ("without any teammates", "both sides")
🔥 CEILING GAME + Hidden Gem a value flag
```

`--accent-purple` did the same for TE against seven chrome labels. So in the header
the user screenshotted, `RB 5` and the `VIEW ROSTER` chip beside it were **the same
colour**, and the "tap any name" banner was wearing `POS_ACCENT.RB.bg` and
`POS_ACCENT.RB.border` exactly.

### Chrome is now HUELESS, and that is the load-bearing decision

Every hue on the wheel is already spoken for by a data family — matchups own
green→lime→yellow→orange→red, weeks own blue/purple/teal, positions own
amber/cyan/pink/violet. **Seventeen meanings do not fit on 360 degrees**, so
adding a chrome hue can only be done by stealing one.

`--ui-accent: #cbd5e1` (27% saturation) cannot collide with anything, ever.
Affordances, step numbers, panel labels and the roster chip use it. Emphasis
inside explainer copy became `--text-primary` at weight 600 — **bold white on grey
body copy is stronger emphasis than a hue anyway**, and it can never be mistaken
for a position.

Two deliberate exceptions, both a different channel from coloured text: the filled
primary CTAs (Analyze, Upload) stay cyan-on-solid, and they live on the input
screen where no position chip exists.

### Five hand-rolled position palettes, two of them painting WR GREEN

Fourth time this repo has hit the duplicate-definition class (Aug 14 tier/score,
Aug 23 competitive balance, Aug 27 `posColor`, now this). All five now route
through `posColor()` / `POS_ACCENT`.

**Green WR was the worst of them.** Green means *good matchup* everywhere else on
the page, so a WR badge was rendering in the grading scale — a category painted as
a verdict. It appeared in the pivot chips, Roster Standouts and the whole
championship-window block.

Also fixed while in there: `★ QB GAME STACK` was **cyan text inside a green box**,
its own label disagreeing with its own border.

### Guard 17 — `scripts/test-color-roles.mjs`

Asserts SHAPE, not hex values, so a deliberate re-tune passes and a second
definition does not:

- `POS_ACCENT` declared once; no rival `QB:…WR:` colour literal; no inline
  `pos === "QB" ? colour` chain
- WR is not painted with a matchup-scale token
- `--ui-accent` exists and is under 45% saturation — a saturated "neutral" would
  quietly become a fifth data colour
- `--accent-cyan` capped at 3 uses and `--accent-purple` at 1, which is what
  forces chrome to keep using `--ui-accent` instead of drifting back

Negative-tested both ways: reintroducing a rival palette and moving one affordance
back onto cyan each exit non-zero.

### The tier ramp came off yellow (same session, after sign-off)

**QB amber (h43) sat 5° from the Even tier's yellow (h48)**, and unlike the
week/position pairs these two genuinely co-occur — a position chip beside a tier
word in the redraft matchup rows. Nudging QB was not available: the status ramp
owns 0-142 and the weeks own 174/217/275, leaving no slot ≥40° from both RB and
TE. **So the fix was on the other side.**

```
Good green -> Even GREY -> Hard orange -> Wall red
```

`--tier-even: #b4b4c0` (9% sat), with `--tier-even-bg` / `--tier-even-border`.
It reads better on its own merits — **a neutral matchup is not a mild warning**,
which is what yellow said — and it frees the yellow band for QB alone.

**REAL warnings keep `--caution`**: bye-week severity, the admin verify action.
That is the line to hold. Every *quality-ramp midpoint* moved (tierStyle,
wkChipStyle, the legend, Soft Spot, stack totals, depth, the /10 score rows, the
championship-window component bars, and `EXPORT_TIER_COLORS`); nothing that
means "careful" did. Letter grades were left alone — a C is a verdict on the
roster, a different scale from schedule quality.

**`EXPORT_TIER_COLORS` is the same palette resolved to hex** because canvas
cannot read `var()`. Its own comment already said to change both or the export
silently drifts; guard 17 now enforces it against the `:root` values.

Lower-risk pairs left alone because the panels never co-occur: TE violet vs W16
purple (15°), RB cyan vs W17 teal (16°). Week chips render only in the bring-back
panel, which carries its own legend and no position chips.

### Calibration

```
33 grades BYTE-IDENTICAL — 11 tournaments x 3 fixtures
17 guards pass · dual-file identical · 0 page errors
Rendered census at 430px: every saturated hue now maps to exactly one meaning
```

### The grade letter was never restyled — the FONT was not arriving

Reported as *"make the letter grade bold like it was previously, I'm not a fan of
skinny letters."* The block is byte-identical across every commit back through
`913a948`, so nothing had changed it.

**Bebas Neue ships ONE weight (400).** With no `fontWeight` declared, the letter
renders at 400 in whatever face resolves — and if the Google Fonts `@import` is
slow or blocked, the fallback chain was `'Impact', sans-serif`, where Impact is
absent on Linux and most Android, so it landed on a *thin generic sans* at 110px.
That is the skinny A.

Two changes, both needed:
- `fontWeight: 900` on the grade letter (both modes). Browsers synthesize weight
  for a single-weight family, so this thickens Bebas itself rather than doing
  nothing.
- `--font-display` fallback is now `'Bebas Neue', 'Anton', 'Impact', 'Arial
  Black', sans-serif`. **Arial Black is the load-bearing addition** — it is
  genuinely heavy and actually present on Windows, macOS and Android, so a font
  that fails to load degrades to something bold instead of something thin.

**Check the fallback chain before restyling a display element.** The sandbox
cannot reach Google Fonts, so local screenshots always show the fallback — which
is exactly why this was visible in a local render and invisible in the source.

---

## Player Card Glossary (added Aug 28, 2026)

A collapsed `Glossary` section under Efficiency, explaining every number the card
just rendered. **Informational only — 33 grades byte-identical across 11
tournaments x 3 fixtures.** Guarded by the glossary block in
`scripts/test-player-card.mjs` (guard 14).

### The two most cryptic tokens on the card were not metrics

`r 0.73` beside every label and `29%ile` on the right. A reader who does not know
what those mean **cannot use any row**, so they are explained first and
separately as `_r` and `_pct`, ahead of the metrics themselves.

### Every entry is `term` + `what` + `how`, and the third field is the point

A definition alone leaves the reader exactly where they started. "Share of team
targets" is not usable; "how central he is to the passing game, independent of
how often his team throws" is. **The `how` field is where this file's measured
stability work finally reaches the user** — the QB rushing entry names r=0.82,
the efficiency entries name r=0.02, and spike rate says out loud that it is the
least repeatable number on the card.

Guard 14 asserts all three fields are present on every entry, so a half-written
entry cannot ship.

### Coverage runs the OPPOSITE way from the render

The card emits glossary entries only for rows it actually drew — a QB card never
defines WOPR, an RB card with no air-yards row never defines aDOT. But the GUARD
asserts that **every key the card CAN render has an entry**, whether or not a
current player triggers it. A number on screen with no definition is the
silent-drop failure in a new costume: the reader sees `WOPR 0.08` and has no way
to act on it. Negative-tested by renaming one entry's key.

### It is muted, and that is deliberate

`CARD_ACCENTS.glossary` is `--text-dim`, the same header treatment as Efficiency.
The card's second channel means "brightness = this should move your opinion", and
reference material should not. Resting cost is one line; the card goes 705px ->
2624px when opened, which is exactly why it is not open by default.

### Still open: recent news on the card

Assessed and NOT built. `RECENT_NEWS` and `SITUATIONS.trendNote` are dated only
INSIDE their prose, so nothing can compute freshness against the 30-45 day rule,
and rendering "OUT FOR 2026" undated on a card stamped `2025 season · final` is
the Diggs failure again — which is the same reason `PLAYER_VERDICTS` was kept off
the card in the first place. Three conditions before it ships: a structured
`date` field (no date, no render), full text or nothing (these run 500-1500 chars
and truncating a `CAVEAT` out of the middle inverts the meaning), and an explicit
"no dated entry" line so sparse coverage is visible rather than silent. Verdicts
stay off; the dated factual note is the part that belongs.

---

## Two Disclosures on the Results Header (added Aug 28, 2026)

The complaint was scrolling past tall text blocks to reach the breakdown. Two
components, both **presentation only — 33 grades byte-identical across 11
tournaments x 3 fixtures.** Guard 18: `scripts/test-disclosure.mjs`.

### `ClampedText` — CLAMP FIRST, THEN MEASURE

The nutshell clamps to 6 lines with a fade and a `see full summary`. Two
runtime traps, both of which look correct in the source:

1. **Gating the clamp on the overflow measurement is CIRCULAR.** An unclamped
   element always reports `scrollHeight === clientHeight`, so the flag can never
   turn true, the clamp never applies, and the control never appears. This
   shipped that way for one build and was caught only by reading computed styles
   out of a real browser (`clamp: "none"` on a 443px block). **The clamp style
   must depend on `open` alone.**
2. **The measurement must STOP while expanded.** Once open the two heights match
   again, so an effect that keeps running flips the flag back to false and the
   button the reader just pressed disappears under their finger. The last
   collapsed measurement is retained, and reset only when the text changes.

It measures rather than counting characters, because the same string wraps to
four lines on a tablet and nine on a phone — a length threshold would clamp text
that fits and leave text that does not.

⚠️ **The `text` prop must be a STABLE value.** Passing
`highlightPlayerNames(...)` returns a fresh array every render, so the reset
effect would fire continuously and expansion would appear to do nothing. Raw
string only.

### `InsightPanel` — the header wears its content's colour

**This is not chrome borrowing a data hue.** The Aug 28 rule is that a hue means
one thing; lime already means "strength" on every row of that list, so the label
inheriting it makes the header and its rows read as one object. A neutral header
would have been the weaker choice, not the safer one.

**It defaults to OPEN.** These are the headline finding, and the reading-frequency
rule that decides what collapses puts them with the stack matrix, not with the
reference tables. **What saves the space is the row cap** — the list truncates to
4 with `+N more`, so the section costs a predictable height whether it holds
three items or nine. Collapsing the whole panel is available and is the reader's
call, never the default.

### Measured

```
nutshell clamped   6080px      expanded  6402px      collapse restores exactly
strengths capped at 4 of 6 · 0 tap targets under 32px · 0 page errors
```

### Considered and not built

- **Persisting panel state** in `localStorage` beside `rxr_has_analyzed`.
- **A sticky section index** (Stacks · Solo · Byes · Pivots). On a 6,000px page
  this would cut more scrolling than any amount of text trimming, and it is the
  right next move if the page keeps growing.

### The Season Schedule header, promoted (Aug 28, 2026)

Reported as *"this is an important section I don't want users to scroll past it"*.
It was a 10px uppercase micro-label in `--ui-accent`, which is the treatment
every minor disclosure on the page wears — so it read as a footnote on a panel
the user opens constantly.

**Purple was the right colour because it is already this section's own.** The
legend inside it reads "purple W15-W17 = the weeks that win the tournament", and
the grid paints those columns with `--accent-purple-light`. So the header
inherits the meaning its own rows carry — the same sanctioned exception the
Strengths and Weaknesses panels use, not chrome borrowing a hue.

Three changes, and **the size is the one that did the work**: 10px micro-label ->
22px `--font-display`, a taller accent bar, and a one-line hook that shows only
while collapsed ("W1-W14 is the round that eliminates most of the field"). A
section styled like a footnote gets read like one no matter what colour it is.

Guard 17 asserts the PAIRING rather than the colour — the header token must be
the same one the grid's `isPlayoff` columns use — so a re-tune of the week
palette stays legal and a "cleanup" back to `--ui-accent` does not.
Negative-tested.

### The generated grade card had no exit (fixed Aug 28, 2026)

`exportedDataUrl` rendered a full-height PNG mid-page with no way to put it away
for the rest of the session. Two controls now sit above it:

- **hide preview** gates the `<img>` ALONE. Share / Save / Post stay live,
  because "I have seen it, now let me file it" is the state a reader is actually
  in — collapsing the actions with the image would make the control useless.
- **✕** clears `exportedDataUrl` and restores the `export grade card` link, so it
  can be regenerated.

Analysis, mode switch and New Roster already reset it, so this closed the only
remaining path where a card could persist unwanted.

**Found while testing: the share row mixed a `<button>` with two `<a>`s.** The
global `button:not([data-compact])` floor covers the first and not the others, so
Share rendered at 44px beside Save Image and Post to X at **31px** — a ragged row
and two sub-32px tap targets, in both modes. Anchors have to state the floor
themselves. Guard 18 counts all four.

⚠️ **html2canvas comes from cdnjs, which the sandbox cannot reach**, so the
generated state is unreachable in a local render and the export silently no-ops.
Stub `window.html2canvas` via `addInitScript` to return an object with a
`toDataURL()` — that is the only way to exercise this UI locally.

---

## Sticky Section Index (added Aug 28, 2026)

A pinned pill row — `Schedule · Stacks · Bring-backs · Solo · Byes · Standouts`
in best ball, `Lineup · Depth · Byes · Playoffs · Weekly · Bench` in redraft.
**Presentation only — 33 grades byte-identical across 11 tournaments x 3
fixtures.** Guarded in `scripts/test-disclosure.mjs` (guard 18).

### It attacks a different quantity from every earlier pass

The density passes reduced HOW TALL the page is. This reduces TRAVEL DISTANCE,
which is what the complaint was actually about — scrolling past sections to
reach the one you want. **Trimming gets slightly worse every time a section is
added; an index gets better.**

### The active pill is a lightness step, never a hue

Every hue on this page is spoken for (matchups, weeks, positions), and a
navigation control must not look like data. Inactive is `--text-muted` on
transparent; active is `--text-primary` on `--bg-elevated` with a border. Guard
18 fails the build if any data-colour token appears inside `StickyIndex`.

### Three implementation choices worth keeping

1. **A scroll listener, not an IntersectionObserver.** The observer reads more
   cleanly but reports on threshold crossings, so a section taller than the
   viewport — the stack matrix is 1,340px — can stop reporting and the pill goes
   blank in the middle of the section being read. Nearest-heading-above-the-fold
   has no such hole.
2. **AT THE BOTTOM, THE LAST SECTION WINS.** The final sections sit inside the
   last viewport-height, so they can never cross the top edge. Without an
   end-of-page case the pill stays several sections back — including immediately
   after the reader taps that very pill, which is how it was caught.
3. **The auto-centre scrolls the BAR's own overflow box, never the document.**
   A nav that moves the page while you read it is worse than one that hides a
   pill.

### Anchors are ids on the section headings

`SECTION_INDEX` is the single list; `SectionH2` gained an `id` passthrough for
BYE WEEK MAP, and the Season Schedule anchor sits on its wrapper because that
header is a button rather than an `h2`.

**A nav entry pointing at an id that no longer renders is a dead link the reader
can tap: nothing happens and nothing errors.** Guard 18 resolves every entry
against the source and also fails on a duplicated id, since `getElementById`
would silently take the first. Both negative-tested.

### Placement matters for `position: sticky`

The bar must be a DIRECT SIBLING of the sections — a sticky element stops
sticking at the bottom of its own parent, so mounting it inside the grade-header
block would unpin it before the first section. It sits at the same indent level
as every section it indexes, in both modes.

### Measured

```
best ball  6,167px · 6 pills · all anchors resolve · bar pinned at y=0
redraft    6,355px · 6 pills · jump lands the heading at y=54, under the 44px bar
0 tap targets under 32px · no horizontal overflow · no page errors
```

---

## Recent News on the Player Card (added Aug 28, 2026)

Shipped under the three conditions the Aug 28 assessment set. **Informational
only — 33 grades byte-identical across 11 tournaments x 3 fixtures.** Guarded in
`scripts/test-player-card.mjs` (guard 14).

`PLAYER_VERDICTS` was kept off this card because a stale verdict rendered as
current is the Diggs failure in a new costume. A **dated fact** is a different
thing, but only if the date reaches the reader.

### 1. NO DATE, NO RENDER — and the date is PARSED, not stored

`RECENT_NEWS` and `SITUATIONS.trendNote` carry dates inside the prose, so
`parseNewsDate` extracts them and an entry with none is dropped. Backfilling a
structured `date` field onto 216 entries by hand would have been the other
option; parsing is reversible, guarded, and cannot silently disagree with the
text the reader is looking at — the guard re-parses every rendered note and
asserts it still yields the date shown.

- **The LATEST date in an entry is its currency.** Notes get appended to
  ("BLOCKING CONTEXT ADDED AUG 23 2026"), so the newest mention is how fresh the
  entry actually is, not the first.
- **Three forms parse**: `Aug 23 2026`, the range `Aug 4-5 2026` (the corpus uses
  it for multi-day events), and month-only `July 2026`, which renders stamped
  `(month only)` so the coarser precision is visible.
- **A year without a month is not a date.** "a Giant since 2024" must not become
  a currency stamp.

**Measured coverage: 63 of 84 `RECENT_NEWS` entries and 32 of 132 `trendNote`s
carry a parseable date.** The rest are evergreen role descriptions ("locked
bell-cow, zero backfield competition") with no currency to state. **Dropping
those is correct, not a gap** — an undated note on a card stamped `2025 season ·
final` is precisely what this rule exists to prevent.

### 2. FULL TEXT OR NOTHING

These run 500-1500 chars and are written as a single argument. Truncating a
`CAVEAT ONE, THE ANKLE:` out of the middle inverts the meaning, so **the SECTION
collapses; the note never clips.** The guard asserts the longest rendered note is
whole.

### 3. ABSENCE IS VISIBLE

`card.news` is always an array, so the section always renders. With nothing dated
it says so in words, including that undated notes exist and are being withheld —
silence would read as "no news", which is the silent-drop failure the Jul 27
extraction rules forbid. 

**It renders OUTSIDE the no-data branch.** A rookie with no 2025 role is exactly
the player whose only useful information is this month's news; Carnell Tate's
card is the worked example — no metrics at all, and the news section still
explains itself.

### Verdicts stay off, and that is asserted

`buildPlayerNews` reads `trendNote` only. The guard fails if `verdict` or `trend`
is ever referenced in it. Negative-tested, along with the no-date rule.

### Freshness uses --caution, which now means only one thing

`current` ≤30d, `ageing` 31-45d, `stale` >45d against the framework's own
re-validation rule. **The stale badge is the only thing on the card wearing
`--caution`** — after the Aug 28 palette change that token means an actual
warning and nothing else, so a note past its shelf life is exactly the right
consumer.

Clock is injectable (`buildPlayerCard(name, pos, team, nowTs)`) so the age
assertions are pinned instead of rotting.

### Placement

First section on the card, collapsed, with the bright `--ui-accent` header rather
than the dim reference treatment — role CHANGE is rank 1 in the Source Hierarchy
and this is the only place on the card that carries it. Resting cost is one line;
Bijan's card goes 769px -> 1007px opened.

---

## Aug 28 2026 News Sweep — and a parser bug it exposed

Six entries refreshed off dated late-August reporting. **36 grades byte-identical
across 12 tournaments x 3 fixtures** — expected, since prose carries no score.

| Player | What changed |
|---|---|
| **Alec Pierce** (WR IND, ADP 90) | **ACTIVATED off active/PUP Aug 27 2026.** hold/falling -> hold/rising |
| **Ashton Jeanty** (RB LV) | Diagnosis landed: ankle sprain, believed short-term, no timeline. TARGET/falling -> TARGET/stable |
| **Tucker Kraft** (TE GB) | Progressed from walkthroughs to full team periods incl. the ARI joint practice; tracking the Sept 13 opener |
| **Mike Washington** (RB LV, ADP 192) | The Jeanty contingency is LIVE, not theoretical, and he backed it up on the field |
| **TreVeyon Henderson** (RB NE, ADP 57) | Right ankle, slipped mid-cut Aug 24, precautionary tests, walking fine, no timeline |
| **Malik Nabers** (WR NYG) | Same facts, now DATED so the card can age it |

### Pierce is the case the freshness rule exists for

The entry read "no timetable, has not practiced at all this summer" as of Aug 10
and carried a `falling` trend. He was activated Aug 27 with two-plus weeks of
practice before Week 1. **A verdict written 17 days earlier had inverted**, and
nothing in the app would have caught it — this is why the 30-45 day
re-validation rule is a rule and not a preference.

Note the split the new entry keeps explicit: **availability is resolved, role is
not.** He has taken no team reps all summer, so Week 1 usage is projected rather
than established, and the ADP move from 53.8 to 90.0 during the absence means the
discount survives the good news.

### ⚠️ THE PARSER PREFERRED AN OLD PRECISE DATE OVER A NEW VAGUE ONE

`parseNewsDate` ran the day-precision pass first and `break`ed on any hit, so a
month-only date could never win even when it was NEWER. Nabers' note carries
**"Sep 28 2025"** (the ACL tear) and **"Aug 2026 camp"** — his card was stamping
the tear as his currency and rendering him **334 days stale**.

Both passes now always run and the **latest timestamp wins across them**.
Precision breaks a tie for free: a month-only date resolves to the 1st, so a
same-month day form is always the larger timestamp.

**The existing guard asserted "the LATEST date wins" and still passed**, because
it only tested two day-precision dates. The assertion was true within a pass and
false across them. Two cases added, both negative-tested — restoring the `break`
exits non-zero.

**This is the general shape to watch in that parser: a date in a note is not
necessarily ABOUT the note's currency.** An injury date, a contract date and a
draft date all parse identically to an update stamp. Taking the latest is the
defence, and it only works if every pass is considered.

### Method notes

- **The stale-article trap fired twice.** A depth-chart summary returned "Tucker
  Kraft removed from PUP, TE2 behind Luke Musgrave" and "Odell Beckham on the
  Giants bubble". Kraft was activated Jul 31 and is a starter; the summary was
  describing an older season. Every player-team and depth-chart claim was checked
  against `ADP_DATA` before anything was written, per the Aug 16 rule.
- **Undated items were dropped rather than written.** A tracker listed "Williams
  (concussion)", "Warren (groin)" and "Olave (undisclosed)" with no first names
  and no verifiable dates. Nothing went in for them — an unattributable name is
  the Rachaad White trap waiting to happen.
- Every new entry carries a date in a form `parseNewsDate` reads, so all six
  render on the player card as `current`.

---

## Redraft Audit (Aug 28, 2026)

Every density and correctness pass since Aug 27 went to best ball. This is the
redraft half. **44 grades byte-identical — 36 best ball (12 tournaments x 3
fixtures) and 8 redraft (4 rosters x 2 data modes).**

### 1. THE SAME BOOST DIVERGENCE WAS STILL LIVE HERE

The Aug 27 fix unified five best-ball consumers behind `playoffBoosts` and
explicitly left redraft alone. **Redraft had the identical defect internally:**

| Redraft path | Feeds | Boost |
|---|---|---|
| `playoffMatchups` | PLAYOFF SCHEDULE · STARTERS, **the grade** | applied inline |
| `buildScheduleEntry` -> `weeklyMatchups` | WEEKLY ROAD AHEAD, lineup confidence, bench swaps | **none** |

So a W15-17 cell could read `Hard` in one panel and be graded `Even` in the
next — the exact user-visible symptom reported on the best-ball side.
Reproduced on **Chase Brown's W16 and W17** (CIN, pick'em shootouts vs IND and
BAL): grid `Hard/2`, scored `Even/3`.

Now one `redraftPlayoffBoost(m, opp, week)` above `analyzeRedraft`, used by both.

**⚠️ THE THRESHOLDS ARE DELIBERATELY STILL THE REDRAFT ONES** — `total >= 49`
against best ball's 46, and it rescues `score === 2` only rather than `<= 2`.
Unifying the NUMBERS would move every redraft grade and needs its own
calibration; what is unified here is WHERE the boost applies, which moves
nothing. Guard 16 now asserts both thresholds are unchanged, so a future
"cleanup" toward the best-ball values fails loudly instead of silently
re-grading every redraft roster.

**The grid gates on `league.playoffWeeks`.** `PLAYOFF_GAME_TOTALS` carries no
W1-14 rows, so boosting the full W1-18 grid would invent numbers — the same
constraint that keeps the Advance Rate Layer's W1-14 pass raw.

### 2. The old comment block was wrong in two places, as recorded

It claimed `|spread| <= 2` and `total >= 46` while the code read `<= 3` and
`>= 49`. The code was always the truth. The new comment is written from the
code, and the note it replaces has been carrying a "fix the comment before
trusting it" warning since Aug 23.

### 3. NINE SECTIONS, ZERO DISCLOSURES

Best ball got `SectionH2` on three sections plus a collapsed Season Schedule
panel. Redraft had **none**, and was the taller page:

```
                          before          after
BENCH MOVES               1,021px    ->    60px   advisory
WEEKLY ROAD AHEAD           592px    ->    56px   reference grid
BENCH                       435px    ->   118px   reference list
page                      6,355px    -> 4,550px   (-28%)
```

Same reading-frequency rule as best ball: the lineup, positional depth, bye
conflicts, the playoff schedule, lineup confidence and handcuffs are read on
every grade and stay open. What collapsed is reference and advisory.

**The sticky index keeps working on collapsed sections** — `rxr-weekly` and
`rxr-bench` moved onto the `SectionH2` buttons, both still resolve, and a jump
to a collapsed section lands its heading at y=84, under the 44px bar. A
collapsed panel is a perfectly good nav target because its resting cost is one
line.

### 4. The Yahoo instructions were two UI versions stale

Both the upload tip and paste step 1 said "go to League tab -> press Draft
button for full names". Yahoo now exports a roster card from a **share icon at
the top right of the Team tab**. Both strings updated.

**The parser already handled the new card** — it is the same share-card shape
documented Jul 28 2026 (`QB D. PRESCOTT Sun 5:20PM @ NYG — 22.34`), so only the
instructions were wrong. Verified end to end: a real Aug 2026 card grades
**13/13 matched** in redraft with K and DEF filtered.

### 5. Found while auditing: `grade-cli` silently accepts a wrong flag

`--mode redraft` is not a flag; the CLI reads `--redraft`. It silently graded a
redraft roster through the BEST BALL engine and printed a plausible answer.
Same class as the silent-drop bugs — left as a note here rather than fixed,
since it is a dev tool, but **check the `mode` field in the output** before
trusting a CLI grade.

### Still open, deliberately

- **Unifying the redraft boost NUMBERS with best ball's.** A data decision that
  moves grades; needs its own calibration run.
- **The redraft high-pace boost does not exist.** Best ball lifts pace-driven
  shootouts; redraft never has. Adding it would move redraft grades.

### ATL QB competition re-sourced (Aug 28, 2026)

Reported by the user, verified, and it had inverted since the Jun 10 entries.
**36 grades byte-identical.**

Penix was **cleared for 11-on-11 and split first-team reps with Tua on Mon Aug
24 2026** — first full team work since the Week 11 2025 ACL tear. Tua's camp has
been inconsistent and his preseason opener vs DEN was **3-of-5 for 22 yards**;
Rapoport reports Penix has closed the gap and national reporting frames the job
as **Penix's to lose**. Both play the Fri Aug 28 finale vs MIA; no Week 1 starter
named.

```
tua tagovailoa   TARGET/—      -> hold/falling
michael penix    fade/—        -> DART/rising
michael penix jr fade/—        -> DART/rising
```

**The official depth chart still lists Tua QB1 and that is not evidence** — it
was set while Penix was carried as an injured player. Checked, and stated inside
the entry so the model cannot read the chart as a confirmation.

**The HC named in the source (Kevin Stefanski) was verified against
`grading/data/defense.md` before the source was trusted**, per the stale-article
rule. It matches. The entries still avoid naming him, because the coach is not
load-bearing for the read and an unverifiable detail is free risk.

### ⚠️ SITUATIONS HAS TWO SHAPES, AND ONE IS INVISIBLE TO THE PLAYER CARD

Census: **128 entries are `trendNote`-shaped, 4 are `reason`-shaped, 0 have
both.** `buildPlayerNews` reads `trendNote` only, so those 4 never render on the
card no matter how fresh they are — three of them were these ATL quarterbacks.

`reason` is not dead: the AI prompt reads it at the `verdictAlignments` line. So
the fix is additive rather than a migration — these three now carry BOTH, with
`reason` kept for the prompt and `trendNote` added for the card.

**The remaining `reason`-only entry is the one to watch.** A future sweep should
either finish the additive pass or teach `buildPlayerNews` to fall back to
`reason`; until then, a `reason`-shaped entry is a silent gap in card coverage
that no guard catches.

### Clearing the RE-VALIDATE badges (Aug 28, 2026)

The card's stale badge finally got used as a worklist. `scripts/report-stale-news.mjs`
answers WHICH players carry it, so nobody has to open 291 cards by hand.

**Only 5 players had every note past 45 days**, which is the useful finding — the
corpus is in better shape than it felt. All five re-sourced; the report now
returns zero.

| Player | Was | Now |
|---|---|---|
| **Josh Jacobs** (RB GB, ADP 41) | "arrest situation June 2026" | **Charged with two misdemeanors**, court date Nov 17, GB publicly preparing for a suspension |
| **James Cook** (RB BUF, ADP 12) | Carmichael "hints" at more receptions | Carmichael says it **on the record**; healthy, full first quarter in the opener |
| **Zach Charbonnet** (RB SEA) | 189 days old, "wide timeline split" | **Reserve/PUP — earliest is Week 5**, minimum four games missed |
| **Jacoby Brissett** (QB ARI) | holdout resolved | Job settled; Beck out with a rib injury from the HOF game |
| **Tyreek Hill** (WR FA) | unsigned, no timetable | Agent says **no signing before the season**; targeting a contender late |

**Jacobs is the one that mattered.** A June note reading "legal issues create
real availability risk" understated a player now facing an open league review
with his own front office saying publicly it is planning for a ban — at ADP 41,
paid before the question resolves.

### ⚠️ A DATE WITH NO YEAR DOES NOT PARSE

Brissett's note read **58 days stale while describing early-August reporting**,
because it said "as of Aug 6" with no year. `NEWS_DATE_DAY` requires a year, so
the entry aged from the older "late Jul 2026" mention instead.

**Always write the year.** This is not a parser bug — a bare "Aug 6" is genuinely
ambiguous across seasons, and guessing the year would be worse than not matching.
The report script's header carries this warning, since that is where someone will
next be confused by it.

### The report is the durable part

A stale badge nobody enumerates is a badge nobody acts on. Run
`node scripts/report-stale-news.mjs` before any draft; it takes a date argument
so a future session can ask "what will be stale on Sept 5" and pre-empt it.

### Aug 29: Jacobs sharpened, Lloyd created, and a FUTURE-DATE parser bug

**36 grades byte-identical.** Two prose changes and one real parser fix.

**Josh Jacobs** — the Brown County DA filed on **Aug 27 2026**: two misdemeanors
(battery, criminal damage to property), court Nov 17. **The detail that matters
is what the filing leaves out** — it is a reduction from five original counts and
carries **no domestic-violence designation**, which weakens the case for the
CBA's six-game domestic-abuse baseline. Against that: the personal conduct policy
runs independently of the criminal charge, and GM Brian Gutekunst has said on the
record that Green Bay is preparing for a suspension. **And separately, a groin
injury has kept Jacobs out of practice for most of two weeks.** Two independent
availability risks on one player at ADP 41.

**MarShawn Lloyd** — first coverage in any prose layer, and he was the only other
GB back in `ADP_DATA`, so the entire Jacobs contingency was uncovered. He took
the majority of first-team snaps while Jacobs was down, came through his most
productive camp healthy, and OC Adam Stenavich (verified against `defense.md`
before the source was trusted) describes growing confidence. **The counterweight
is the record, not the role: one career NFL game and a season lost on the first
day of padded practices.** A durability bet, not a role bet. ADP has run 215.5 ->
low 140s since mid-August, so the market is already moving.

### ⚠️ A FUTURE DATE IS NEVER THE NOTE'S CURRENCY

Jacobs' entry cites his **Nov 17 2026 court date**, and "latest date wins" handed
the badge to it — his card stamped itself **"-80d ago"**. A note cannot have been
written after today, so a forward-looking date in the prose is describing
something the note is ABOUT, not when it was written.

`parseNewsDate` now takes `nowTs` and discards any candidate later than it.

**This is the third instance of the same shape**, and the pattern is now
explicit: an injury date, a contract date, a draft date and a scheduled court
date all parse identically to an update stamp. Two defences are needed together —
take the LATEST date, and never take one in the FUTURE. Three cases added to
guard 14 including a sweep asserting no rendered note has a negative age;
negative-tested.

---

## Game Logs on the Player Card (added Aug 29, 2026)

`scripts/build-gamelogs.py` -> `gamelogs_2025.json` / `gamelogs_2026.json`.
**Context only — 44 grades byte-identical (36 best ball, 8 redraft).** Guarded in
`scripts/test-player-card.mjs`.

### The card ASSERTED what a game log SHOWS

Three claims the card already makes in prose, each of which the data can draw:

```
RJ Harvey          ▃▁▁▆▁▁▃█▆▁▃·██▆█▆▁     the back-half surge, visible
Tucker Kraft       ▃█▁▃·▆▆█▁·········     the ACL tear, visible as a gap
Justin Jefferson   ▆▃▆▆▆·▆▆▆▃▃▃▁▁▁▆▃▆     never bad, never great
```

Harvey is the case this file's own notes say was graded `fade/falling` on four
rosters off a season average. The chart makes that mistake impossible to repeat.

### THE BANDS ARE THE CARD'S OWN — that is the anti-clutter decision

18+ / 10+ / <5 are exactly the spike, usable and dud thresholds `WEEK OUTCOMES`
already prints as three rates. So the chart draws the distribution those rates
summarise: **no new vocabulary, no fifth colour scale, and the two sections
visibly agree.** They live in `_meta.bands` and `gameBand()` reads them from
there — a second hand-typed 18/10/5 would be the duplicate-definition class this
repo has now hit five times, and the guard forbids it.

### Cheap, because the download already happens

`refresh-inseason.sh` was already fetching `stats_player_week_<season>.csv` for
`build-qb-profile.py`. The game-log builder reads the same file, so the layer
costs **one extra parse and no extra network**. The job is now 3 steps with one
download feeding steps 2 and 3.

```
213 draftable players · 2,972 games
raw JSON   80 KB
gzipped    28 KB
```

**Rows are fixed-width ARRAYS, not objects**, with `_meta.cols` naming the
columns per position. Named keys on ~3,000 rows would roughly triple the file for
no added meaning. The guard asserts every row's length matches its position's
column count, so a mislabelled table is impossible.

### Three display rules

1. **EVERY WEEK GETS A SLOT, including ones he did not play**, rendered as a
   floor tick rather than a zero bar. Compressing twelve games into twelve bars
   hides "he missed five weeks" — and an absence and a zero-point game are
   different facts that must not look alike. This is what makes Kraft's tear
   visible as a gap instead of invisible as a shorter chart.
2. **NO OPPONENT-DIFFICULTY COLOURING.** That would mix matchup data — rank 5,
   the least stable input in the app — into a record of what actually happened.
   The table names the opponent; the bars stay about output. Guarded.
3. **Open by default, table collapsed.** The chart is the evidence for the ROLE
   TRAJECTORY claim directly above it, so it earns its place; the 17-row numeric
   table is reference and costs a click.

### Two bugs the guard caught before they shipped

- **`weeks_covered` was 1 on an empty build.** `sorted({...}) or [0]` gave a
  header-only input one "week", which would have made the 2026 placeholder read
  as LIVE and let an empty file outrank the real 2025 season on every card.
- **A finished season labelled itself "through W18".** `vintageLabel()` prints
  in-progress unless the meta declares completion, so the builder now sets
  `season_complete` at max_week >= 18. Labelling a closed book as in-progress is
  the vintage trap in miniature.

### Measured

```
card at rest   769px -> 974px   (+205px for 17 games of data)
game-by-game table open        1,341px
0 tap targets under 32px · no page errors
213 of 289 draftable covered; the other 76 are rookies and sub-gate players
  and fall through to the existing no-data reason, unchanged
```

### The season toggle (same day)

The first version stacked 2026 above 2025 — two charts, always, which honoured
the never-swap-vintage rule by paying height for it. `GameLogSection` now shows
**one season at a time behind a 2026/2025 toggle**, and keeps the rule a
different way: **the selected season's vintage is printed in the section title
from `log.vintage`**, so no chart is ever on screen without its year named.

- **Defaults to the current season whenever it is live** — this week's usage
  outranks last year's (role change is rank 1) — and falls back to 2025 before
  Week 1 or for players with no current-season games.
- **The toggle renders only when BOTH vintages exist.** Its absence means one
  season of data, never a silent swap.
- The pills are **chrome** — a lightness step, same rules as the sticky index.
  Guarded: a data hue inside the toggle fails the build.
- The game-by-game table follows the selected season.

Verified against a simulated live season (the 2025 file truncated to W1-8 and
swapped in as `gamelogs_2026.json`): defaults to `2026 through W8`, flips to
`2025 season · final` and back, no toggle pre-season. Both new assertions
negative-tested — burying the live season behind a "prior" default and painting
a pill cyan each exit non-zero. The committed 2026 placeholder is untouched;
the real file arrives via `refresh-inseason.sh` from Week 1.

### Card sections now separate by structure, not colour (Aug 29, 2026)

Reported as the headers and text feeling "too bunched together" — wanting each
section identifiable WITHOUT colouring everything. The headers are hueless on
purpose (the accent channel is reserved for meaning), which left only
whitespace marking where one section ends, and equal-ish gaps read as one
continuous column.

The fix is the proximity rule: **a 1px `--border-default` hairline above each
top-level `CardSection`, plus a between-sections gap (22px + 14px padding)
visibly larger than any gap inside a section.** Lines cost no hue and cannot be
mistaken for data. First attempt used `--bg-raised` (#1a1a1a) and was invisible
against the card background — a divider drawn in a background token is
decoration, not structure; `--border-default` is the token whose job this is.

**`nested` sections keep the tighter gap and NO rule.** The game-by-game table
lives inside Weekly Output, and giving it the same divider would flatten the
hierarchy — a sub-section impersonating a top-level one. Guard 14 asserts the
divider, the nested exemption, and that the game-by-game table is the nested
one. Negative-tested.

Card height 974px -> 1014px; 36 grades byte-identical.

### The full-game-log disclosure was misclassified as reference (Aug 29, 2026)

Reported as "Game by game" not popping — the user should know immediately that
it opens the entire log. The header was wearing `--text-dim`, and on this card
that token MEANS something: Efficiency and Glossary are dimmed because their
contents should not move your opinion. The drill-down into the chart's own data
is not that, so the fix was reclassification, not a new colour:

1. **Bright chrome** (`--ui-accent`) — the affordance token every disclosure
   control already wears. No hue, so one-colour-one-meaning holds.
2. **Named for what it opens** — `Full game log`, not the coy "Game by game".
3. **The affordance counts the games** — `8 games ⌄` instead of a generic
   `show`, via a new `hint` prop on `CardSection` (same idiom as `SectionH2`'s
   hint, `+N more`, and the roster chip). A control that says what you get is
   the difference between a header you notice and one you act on.

Guard 14 asserts all three and fails if it is ever demoted back to the dim
token. 36 grades byte-identical.

### The W1-18 chip pulses (Aug 29, 2026)

Requested as "strobe like the upload screenshot tab, doesn't have to be as
impactful." Same mechanic — the `tabGlow` box-shadow pulse — re-tuned three
ways so it draws the eye without becoming the page's loudest element:

1. **The section's own purple** (`rgba(192,132,252)`), not the tab's green —
   the glow inherits the meaning its header already carries.
2. **A third of the intensity, slower beat** — 8px/0.35 at 2.6s against the
   tab's 18px/0.5 at 1.8s.
3. **Collapsed-only.** `className={bbScheduleOpen ? undefined : ...}` — an
   attention-getter for a closed door, silenced the moment it opens, which is
   the tab's own "stops when clicked" rule.

The affordance became a bordered pill because a box-shadow glow needs a shape
to sit on; plain text just blooms. `prefers-reduced-motion` disables it.
Guard 18 asserts the collapsed gate, the reduced-motion opt-out and the hue;
the always-on variant exits non-zero. 36 grades byte-identical.

---

## Sanctioned Archetypes Are No Longer Charged As Flaws (added Aug 30, 2026)

**A roster cannot be simultaneously a recommended construction and a scored flaw.**
Section 5 names five valid positional layouts; the generic construction bands were
penalising three of them.

```
Hyper-Fragile      2-4-10-2   -1.0   10 WR, 2 over the band, MAJOR
Balanced           2-5-9-2    -0.3   9 WR, 1 over, minor and SILENT
Balanced           2-6-8-2     0.0   clean
Triple QB Mutation 3-5-8-2     0.0   clean
Triple TE Mutation 2-4-9-3    -0.3   9 WR, 1 over, minor and SILENT
```

The bands measure DEVIATION FROM THE MEAN. That is the right default and the wrong
answer for a build that deviates on purpose. **All three reference fixtures are
2-5-9-2, so every calibration recorded in this file before today carried a silent
-0.3 that never appeared as a weakness.**

### The precondition is what keeps this from being a free pass

An archetype is its counts AND the thing that makes those counts work. `ARCHETYPES`
stores both, and the waiver requires both:

- **2-4-10-2** needs *premium early RB capital* — an RB at **ADP <= 24** (rounds 1-2).
- **2-4-9-3** needs *elite, consolidated target shares in the TE room* — a TE at
  **ADP <= 60**.
- The three balanced/mutation layouts carry no stated precondition and waive on shape.

**Same shape without the anchor keeps the full deduction** and gets a weakness naming
what is missing: a 10-WR/4-RB roster whose best back went in the fourth round is not
Hyper-Fragile, it is thin at RB. Verified both directions.

### Three rules for anyone touching this

1. **`under` is NEVER waived.** Being short at a position is a real hole whatever
   shape the rest of the roster is in. Only over-count flags at the archetype's own
   position are removed.
2. **The waiver removes the DEDUCTION, never the DISCLOSURE.** A qualifying roster
   gains a strength line naming the layout and which count is the archetype. "Hyper-
   Fragile" is called that for a reason and a reader who cannot see the shape cannot
   judge the risk.
3. **Standard best ball only.** Superflex has its own bands and a 20-round roster
   shifts every count, so neither is described by these layouts. `analyzeRedraft` is
   untouched.

### ⚠️ Calibration — this MOVED SCORES, and the old numbers are superseded

```
                          before  ->  after
ref1/ref2/ref3, standard    +0.30 uniformly   (the 2-5-9-2 waiver)
fieldgeneral (superflex)    +0.00             (correctly out of scope)
redraft                     +0.00             (correctly out of scope)
NO LETTER GRADE MOVED on any of the 39
```

**Every pre-Aug-30 calibration figure in this file is now 0.30 low for the standard
best-ball tournaments** on these fixtures. Do not chase those numbers; they were
true against the code of their day. Re-baseline from here.

Guarded by `scripts/test-archetypes.mjs` (guard 20), which builds 2-4-10-2 both with
and without the RB anchor and asserts they diverge. Four failure paths negative-
tested: dropping the precondition, waiving `under` flags, waiving without disclosing,
and letting superflex in.

---

## The Floor Layer & Redraft Role Context (added Aug 30, 2026)

The redraft audit found the engine graded CONSTRUCTION AND SCHEDULE and never
asked whether the starters produce usable weeks: it read none of
`PLAYER_METRICS`, no trajectory, no absence, no SOS. Four additions close that,
and exactly ONE of them scores.

### The Floor Layer (SCORED, redraft only, ±0.5 cap)

The mirror of the Ceiling Shape Layer, on the metrics redraft actually wants.
The stability run measured **dud rate r=0.67 and usable rate r=0.65 against
spike's 0.475** — and this file already recorded the tension ("in best ball the
more stable metric is the less useful one"). Redraft is the format where floor
IS the product; the more stable pair now scores there.

**BLEND = `usable_rate - dud_rate`**, per gate-clearing STARTER (gp>=8,
snap>=0.35), centred on a positional baseline, averaged, `x1.5`, clamped ±0.5.

Three derivation decisions, each the answer to a bug hit on the way in:

1. **`FLOOR_BASE = { QB: 0.882, RB: 0.528, WR: 0.298, TE: 0.133 }`** — the
   median of the STARTER POOL (gate-clearing drafted players cut at 12-team
   league-wide starter slots: QB 15, RB 30, WR 36, TE 15). The first derivation
   centred on the full drafted pool exactly as the ceiling layer does, and
   ref1's ordinary lineup SATURATED THE CAP — a starting lineup is early-ADP by
   construction, so the median drafted player is the wrong zero. The median
   STARTER is the zero. Mid-pool starters land within ±0.06 of it.
2. **The population scored is `allStarters`, deliberately NOT `valid`.** Best
   ball has no lineup, so the ceiling layer reads the roster; redraft scores
   the lineup you submit, and a bench streamer's dud rate dilutes exactly the
   signal this layer reads.
3. **Multiplier 1.5, not the ceiling layer's 2.5.** A lineup averages ~5-9
   qualified starters against best ball's 12-18 rostered, so 2.5 amplified
   small-sample noise into the cap on a real fixture. At 1.5 the fixtures land
   +0.08..+0.35 and the floor-max/min synthetics still both saturate — the two
   properties a capped layer must hold at once.

### ⚠️ Calibration — REDRAFT grades moved; re-baseline from here

```
                 yahoo_std      yahoo_ppr      yahoo_std_10
ref1            6.5  -> 6.61   7.2 -> 7.31    7.1 -> 7.21    (+0.11)
ref2            6.5  -> 6.58   7.2 -> 7.28    7.1 -> 7.18    (+0.08)
ref3            8    -> 8.35   8.7 -> 9.05    8   -> 8.35    (+0.35)
NO LETTER GRADE MOVED · BEST BALL: 36 grades BYTE-IDENTICAL
```

Guard 21 (`scripts/test-floor-layer.mjs`) asserts normalisation, the
starter-pool baseline shape, saturate-and-sit-still, and best-ball containment
(`analyzeRoster` clean, no `floorLayer` key on a best-ball result). Four
failure paths negative-tested: a flat baseline, scoring `valid` instead of
starters, a best-ball leak, and a multiplier that saturates the fixtures.

### The three context additions (grades untouched)

- **`buildRoleContext(starters)`** renders a collapsed `2025 CONTEXT · ROLE &
  SCHEDULE` section on the redraft page: starters whose role MOVED
  (trajectory), starters with a qualifying TEAMMATE ABSENCE (with the ppg
  split both ways), and per-starter season SOS with delta. One line at rest,
  ~450px opened. Empty groups say so in words — silence must not look like
  missing data. It is the third reviewed consumer on guard 13's `getSnapTrend`
  allowlist.
- **`absenceContext` now reaches BOTH AI prompts**, beside `trajectoryContext`.
  The header tells the model that silence means the shares read at face value,
  and that an absence explains volume without proving it hollow — several
  players produced their best games with the teammate active (Gibbs graded
  BETTER without LaPorta; Pierce better without Jones. The split is evidence,
  not a verdict).
- The SOS block prints its own instability warning inline (WR matchup data is
  NEGATIVE year over year). Context only, and it says so where it renders.

---

## The Husky — added Aug 31, 2026

Fourteenth tournament in `TOURNAMENTS`, key `husky`. Read off the in-app rules.
$40 · 11,232 entries · $400k prizes · 11% rake · 18 rounds · 12-man drafts ·
half-PPR, 4pt passing TD · **max 10 entries** · closes 9/9/26.

| Round | Weeks | Groups | Advance | Field |
|---|---|---|---|---|
| R1 Qualifier | W1-14 | 936 × 12 | 3 (25.0%) | 11,232 → 2,808 |
| R2 Quarterfinal | W15 | 351 × 8 | 2 (25.0%) | 2,808 → 702 |
| R3 Semifinal | W16 | 117 × 6 | **1 (16.7%)** | 702 → 117 |
| R4 Championship | W17 | one 117-seat group | 1 | 117 → 1 |

P(reach the final) = **1.042%, one in 96.**

**Every figure reconciles against the rules text.** Unlike the Pit Bull page
("156 6-person Groups" for 5), the Frenchie R2 reversal and the shared
"single1, 31-person Group" template bug, this page has no typo. The ladder was
still recomputed from the group counts rather than trusted — do that every time.

### W16 is the only gate that TIGHTENS

R1 and W15 are both **25.0%**; W16 is **1-of-6**. That makes this the third
W16-inverted format here, alongside the Frenchie 13/14 and Field General, and
`weights: [1.25, 2, 2]` is deliberately **identical to the Frenchie 13's**
because the binding gates are the same shape. The 25% W15 sits on the same
plateau the Schnauzer (20%) and Frenchie 13 (33.3%) both occupy at 1.25.

### W17 earns a full 2 because the final is actually REACHABLE

**65.7% of the pool sits inside the 117 seats and 45.0% is in the top ten.**
BBM VII holds its W17 at 1.5 precisely because arriving there is a 0.099%
proposition; here you arrive one time in 96. **Reachable money is worth more in
expectation than unreachable money**, and that is the whole reason the two
differ.

### advanceWeight 1.25 — the largest breakeven band on the board

R1 is 3-of-12 (soft), which argues down. Against that, **21.1% of the entire
pool ($84,240) is paid to the 2,106 entries that clear R1 and then lose in
W15 — at EXACTLY the $40 entry fee.** A big share of pool that carries zero
profit buys no EV, so this matches the Frenchie 13's 1.25 rather than the
standard 1.5, for the identical reason.

```
the ladder on $40:  clear R1 -> $40 (breakeven)  ·  clear W15 -> $75-150
                    clear W16 -> $400 (10x)      ·  win W17   -> $50k (1,250x)
```

### Other notes

- **11,232 is MID-FIELD** by the Field Size Overlay (10k-100k), so it is
  deliberately NOT in the `bbm7 || puppy || puppy4` uniqueness-leverage branch.
- **Max 10 entries** matches the Pit Bull as the lowest portfolio here, which
  argues against spray-and-pray construction.
- The scoring branch flags the W16 kill shot in both directions, adds a
  **stacks-live-in-BOTH-W16-and-the-final** strength (the shape that actually
  wins this), and carries the same W15-only trap warning the other W16-inverted
  branches use.

### Calibration — nothing else moved

```
13 pre-existing tournaments x 3 fixtures = 36 grades BYTE-IDENTICAL
The Husky (new):  ref1 A 10.73 · ref2 C+ 0.96 · ref3 B+ 4.21
All four branch paths verified firing in both directions.
```

---

## Three Context Layers: Deployment, Career Arc, Vacated Targets (added Aug 31, 2026)

The app graded structure well and knew almost nothing about the players in it.
Of everything the AI saw, the receiving block was opportunity handed down by a
coach, and the matchup tier is the LEAST stable input measured here. These three
files close the gap. **CONTEXT ONLY — 39 grades byte-identical (36 best ball
across 12 tournaments x 3 fixtures, plus 3 redraft).** Guard 22:
`scripts/test-context-layers.mjs`.

| File | Script | Rank | What it answers |
|---|---|---|---|
| `ngs_receiving_2025.json` | `build-ngs-receiving.py` | 2 and 3 | Where is he used, and does he get open |
| `career_arc_2026.json` | `build-career-arc.py` | — | Is the calendar with him or against him |
| `vacated_2026.json` | `build-vacated.py` | **1** | Who left, and how big is the opening |

### Separation is the FIRST talent-in-isolation input this app has carried

Every other receiving number here — target share, WOPR, snap share, targets per
game — measures what a coach GAVE a player. `sep` (yards of space at the catch
point, from the tracking chip) measures whether he is EARNING it. That is rank 3
in the Source Hierarchy, a rank the app had no data for at all.

**Measured r = 0.663** (23>24 0.595, 24>25 0.732, n=85 at 40+ targets) — above
`spike_rate` at 0.475, which the Ceiling Shape Layer already trusts enough to
score. AJ Brown at 2.24 against a WR median of 2.78 is an 8th-percentile
separation profile carrying a top-decile target share; that tension is exactly
what the card could not previously show.

### Intended air yards is the stickiest player input in the project

**r = 0.826** (0.832 / 0.820), ahead of QB rushing attempts at 0.815. It is
sticky for the reason aDOT already is: **deployment is a role property, not a
performance one.** Where a coach lines a receiver up and what routes he calls
persist; whether the ball arrives does not. Two receivers with identical target
counts are different assets when one is at 6.3 and the other at 14.1.

**Four NGS fields were measured and deliberately LEFT OUT**, recorded in
`_meta.not_emitted` with their r: `catch_percentage` 0.492, `avg_yac` 0.458,
`avg_cushion` 0.415, `avg_yac_above_expectation` 0.358. The reason a field was
rejected is worth as much as the ones kept, and guard 22 asserts they stay
recorded — otherwise a future session re-adds one on intuition.

### ⚠️ NGS HAS ITS OWN POPULATION AND MUST NEVER SHARE THE CARD'S

`CARD_PERCENTILES` ranks against draftable players with 8+ games. NGS ranks
against **40+ targets in 2025** — a different, smaller pool. Merging the two
tables would print a percentile under a population label that does not describe
it, which is the vintage trap in a new costume. Hence `NGS_PERCENTILES`,
`ngsPercentile` and `NGS_POP_GATE` as separate definitions, a separate
`Deployment` card section, and a note saying the two ranks are not
interchangeable. Guarded, and negative-tested by swapping in `cardPercentile`.

### The aging bands are PRIORS. Say so every time they render.

`CAREER_ARC._meta.bands` (RB decline 27, WR 30, TE 31, QB 35) are **published
career-arc priors, NOT measured in this repo.** One season of data cannot
produce an aging curve and a cross-sectional read is confounded by survivorship.
The age itself is measured; the band around it is borrowed. The file says so,
the card says so, and the AI prompt says so — an inherited curve rendered as a
finding is the same failure as a stale verdict rendered as current.

**The prompt emits only the TAILS.** A player inside his peak band tells the
model nothing his other numbers did not, so silence there means the calendar is
neutral rather than that data is missing — stated in the header, the same rule
`trajectoryContext` follows.

### Vacated targets is rank 1, and the app had no view of it

Lens 1 says to project who absorbs a vacated share before ADP reflects it. There
was no file that could see the vacancy. Now there is, per team:

```
PIT 57.1%   MIA 56.6%   WAS 46.6%   NYG 42.0%   NE 37.8%   ATL 36.4%
```

**It locates the opening. It does not name who fills it** — that stays a
judgement, and the file, the card and the prompt all say so rather than letting
a team number read as a player projection.

**⚠️ TWO SCALES IN ONE FILE.** `vacated_pct` is stored in PERCENT units (46.6)
while `gone[].tgt_sh` is a FRACTION (0.247). Anything reading them must not
assume — a `* 100` on the wrong one rendered **4660%** on the card for one build.
Guard 22 asserts the units directly.

The denominator is the team's **own measured 2025 share**, not 1.00: the metrics
cover drafted players only, so a team's shares do not sum to 100% and the honest
comparable figure is "share of the measured pool that left". That qualifier is
printed on the card beneath the number, because a percentage without its
denominator is a number nobody can act on.

`norm()` strips SUFFIXES before differencing. The known bug read
`brian robinson jr` as a departure and inflated WAS to 82.4%; it now reads 46.6%
and the guard pins that.

### CAREER ARC AND TURNOVER RENDER ABOVE THE no-data BRANCH

The first version put all three sections inside the card's `card.reason ? … : …`
else-branch, and **a rookie got none of them** — Carnell Tate's card showed only
"No 2025 NFL data" while age 21, drafted 4th overall and a 29% TEN vacancy were
sitting right there. A rookie is precisely the player for whom those two facts
are the ONLY useful information on the card.

Both now mount above the branch, collapsed. Tate 289px -> 451px; a full card
pays two lines. **Deployment stays inside the branch** because it needs 2025
receiving volume, so a no-data player never has it either way.

Also fixed on the way in: the position median was riding in a row's `caution`
slot, which on this card MEANS "this number disagrees with another one above it"
and renders with a warning mark. A reference value is not a conflict, and
dressing one as a warning devalues the mark everywhere it appears. It moved to
the section note.

### Guard 22 — containment is the assertion that matters

The three accessors are enumerated, **every call site is checked against an
allowlist of reviewed consumers** (`buildPlayerCard`, `deploymentContext`,
`arcContext`, `vacatedContext`), and `analyzeRoster` / `analyzeRedraft` are
asserted clean of both the accessors and the raw tables.

Structural rather than behavioural on purpose: a leak can move one roster by 0.01
and pass a spot check, and a layer that starts scoring **silently invalidates
every calibration figure in this file** — nothing errors, the numbers just stop
meaning what they meant. Three failure paths negative-tested: a read inside
`analyzeRoster`, an unreviewed call site outside the engines, and the merged
percentile population. All exit non-zero.

### Regenerate

```
pip install nflreadpy
python3 scripts/build-ngs-receiving.py   # nextgen_stats/ngs_receiving
python3 scripts/build-career-arc.py      # rosters/roster_2026
python3 scripts/build-vacated.py         # player_metrics_2025 x roster_2026
```

All three are ANNUAL under the split refresh cadence. None feeds a scored input,
so a mid-season regeneration would be safe — it is simply not worth the network:
NGS is a closed 2025 season, ages move once a year, and a vacancy is settled by
Week 1.

### Still open, and why each was left

| Item | Stability | Why not built |
|---|---|---|
| Targets per game in the prompt | 0.774 | **free — `tgt` and `gp` already loaded.** One line. |
| Air yards share in the prompt | 0.780 | **free — `ay_sh` already loaded, unprinted.** One line. |
| Availability rate | — | Every metric here is per-game; nothing expresses "he plays" |
| Red-zone target share | — | Lens 1 calls it standalone scoring equity and the app cannot see it |
| Carries per game (RB) | 0.730 | `build-player-metrics.py` emits no carry count |
| Targets per route run | 0.674 | **SHIPPED Sep 1 2026** — `routes_2025.json`. Never substitute target share for it. |
| Offensive line ranks | — | No free per-player data. Team pressure rate is confounded by the QB. |

### SHIPPED Aug 31 2026: the two free anchors now reach the model

`metricsContext` printed target share, WOPR and snap share and never printed the
two numbers those three depend on. **Targets/gm (0.774) and air yards share
(0.780) are the most repeatable figures in the receiving block**, both were
already loaded, and both were invisible to the AI.

- **They LEAD the receiving line**, ahead of target share and WOPR. Targets/gm is
  the raw volume nothing else survives being low; air yards share is where on the
  field that volume is aimed, which separates an alpha from a high-volume slot
  player at the same target count.
- **Backs get targets/gm and NOT air yards share.** `ay_sh` is r=0.26 for RBs and
  discriminates nothing, so printing it would invite the model to read a number
  carrying no information. Targets/gm belongs there because the receiving tier is
  both a stack qualifier and the garbage-time exemption.
- **The header now names the stability of everything in the block** — anchors
  0.77/0.78, then 0.73/0.75/0.71, then spike rate at 0.48 flagged as descriptive
  of 2025. The model previously had no way to know which of six numbers to lean
  on.
- Computed over GAMES PLAYED, never a 17-game denominator.

**39 grades byte-identical** — prompt content cannot reach the scoring engine.

The remaining rows in the table above are unchanged.

---

## Red Zone & On-Field Rate (added Sep 1, 2026)

Two more context layers, both free from nflverse, both closing a gap the
framework itself had already named. **CONTEXT ONLY — 39 grades byte-identical.**
Guarded by the additions to `scripts/test-context-layers.mjs` (guard 22).

### Red zone: `hvt_pg` was a COUNT and Lens 1 asks for a SHARE

Lens 1 calls red zone and goal line touches standalone scoring equity and says
to track them separately from snap share. `hvt_pg` was the nearest thing the app
carried, and being a per-game count it cannot distinguish **a back on a team
that never reaches the red zone from one on a team that lives there.** The share
isolates the player's claim on the scoring chances, which is the part that
survives a change in team scoring rate.

Three zones, because they answer different questions: inside 20 (opportunity),
inside 10 (where scores are decided, noisier), inside 5 (goal line, almost
entirely a personnel decision).

**⚠️ THE COUNT TRAVELS WITH THE SHARE, EVERYWHERE.** Red-zone volume is a
fraction of total volume, so every share here is a ratio of two small numbers.
The card prints `31% of 22`, the prompt prints `31% of team red-zone targets
(22)`, and the prompt header forbids quoting a share without its count. A share
is emitted only when the player AND his team clear a gate, so **a count with no
share means the sample is too thin to express as a rate** — that absence is
information. Goal line is a count only; a share there would be two or three
plays wearing a percentage sign.

**⚠️ pbp NEVER carries a usable name.** It prints `A.St. Brown` and `H.Henry`,
which normalise to `ast brown` and `hhenry` and match nothing in any ADP table.
The first build shipped exactly that. The player id is the only real join key,
so display names come from the weekly stats release and a player absent from it
is DROPPED rather than published under an abbreviation nobody can look up.

### On-field rate: the DENOMINATOR is the whole measurement

Every metric in the app is a per-game rate, which is right for comparability and
means nothing expressed whether a player plays.

Two ways to get this wrong, both of which were built and measured before being
rejected:

1. **Counting games played against 17** skips a fully lost season entirely — an
   August Achilles produces no rows, the year is silently omitted, and the
   player reports as durable. So the denominator is **team games in every season
   he appears on a ROSTER**, played or not.
2. **Counting STAT LINES as the numerator** put the league median at **63%**,
   because a blocking TE, a receiver who ran routes and drew no targets, and a
   QB who handed off twice all record zero stats while playing. The numerator is
   **offensive snaps** from `snap_counts`.

A third correction was needed on the population: the roster file carries ~3,100
rows a season including the practice squad and everyone cut in camp, and
counting those seasons put the median at **25%** — a number describing roster
churn, not durability. Fixed by gating status to `ACT`/`RES`/`INA` and requiring
the player to have held a real role (8+ games) in some covered season. Final
medians: all 0.70, QB 0.53, TE 0.74, WR 0.70, RB 0.68.

**⚠️ IT IS NAMED FOR WHAT IT MEASURES.** The gameday inactive list would
separate hurt from healthy-and-not-playing and nflverse does not ship it, so
this **blends availability with role**. A backup who dresses weekly and never
plays scores low — correct for fantasy, and not a medical finding. It also
cannot separate injury from a coaching decision, a suspension or a holdout.

**Career and recent are both shown and never averaged.** Nick Chubb is the
worked example: **71.8% career against 49.0% over the last three.** One number
cannot say both, and the split is the finding.

### Three percentile populations now, three tables, three printed gates

```
CARD_PERCENTILES   draftable, 8+ games          Opportunity, Week outcomes
NGS_PERCENTILES    40+ targets in 2025          Deployment
RZ_PERCENTILES     5+ red-zone opportunities    Red zone
```

Merging any two prints a rank under a population label that does not describe
it. Guard 22 asserts all three stay separate and that each section prints its
own gate.

### `grade-cli` now validates its flags

`--mode redraft` is not a flag and was **silently ignored**, so a redraft roster
graded through the BEST BALL engine and printed a plausible answer. Same
silent-wrong-answer class the app itself has fixed five times. Unknown flags,
unknown tournament keys and value-less flags now exit 2 with a hint naming the
correct flag. Verified both valid paths still run.

---

## The Read, and One Accent Per GROUP (added Sep 1, 2026)

Reported as wanting the card to work for beginners through experts. Measured
first: **the card had reached 14 sections and 1,732px**, and the accents had
stopped differentiating — **six sections shared `--ui-accent` and five shared
`--accent-purple-light`**, so the colour channel was carrying two values across
fourteen slots. **Presentation only — 39 grades byte-identical.**

### The real problem was an ENTRY POINT, not density

Every one of the fourteen sections is individually justified. Collectively they
present a reader with fourteen equally-weighted peers **in the order they were
added**, which is neither importance order nor reading order. A beginner has no
idea where to start; an expert scrolls past six things to reach one number.

`card.read` answers that with plain-English sentences derived from numbers the
card is already showing, ordered by the **Source Hierarchy** — role change,
volume, talent, scoring equity, durability, calendar. A reader who stops after
two lines has read the two that matter most.

```
He wins little separation — 2.24 yds, more than only 8% of WRs.
  A contested-catch profile rather than a get-open one.
He owns the scoring work — 22% of his team's throws inside the 20.
```

**⚠️ IT ISSUES NO VERDICT, and that constraint is load-bearing.** A verdict
rendered as current is the Diggs failure, and it is exactly why
`PLAYER_VERDICTS` was kept off this card in the first place. Every line
**describes** a number visible further down, in the reader's own language —
"wins little separation for the position" is a restatement of 8th percentile,
never a judgement about whether to draft him. Guard 14 asserts the block never
reaches for a verdict table.

### Three defects the first version shipped, all caught by measuring

1. **THE SUMMARY CONTRADICTED ITSELF.** RJ Harvey read *"his role grew — 29% of
   snaps early, 56% late"* and then, two lines down, *"he is off the field a
   lot — 42% of snaps."* `snap_sh` is a SEASON AVERAGE and the card already
   flags it as stale when the role moved; the summary was restating the stale
   number as current. **A summary that disagrees with itself is worse than one
   that omits a line.** The snap line is now suppressed whenever the trajectory
   says the role moved, and the guard sweeps every draftable card for the pair.
2. **A line with no number is a verdict wearing a sentence.** The goal-line line
   asserted something the reader could not check. Every line now carries the
   figure behind it — the team-change line is the one exception, because it
   names a TEAM and inventing a number for it would be worse.
3. **"below 92% of WRs" inverts on the reader.** Percentiles now run one
   direction only: "more than only 8% of WRs".

### One accent per GROUP, not per section

A colour that appears six times has stopped being a signal. `CARD_GROUP_ACCENT`
now names **which of four questions** a section answers, and every section in a
group wears the same one:

```
WHO HE IS    grey    news · on-field rate · career arc · team turnover
HIS ROLE     purple  trajectory · volume · opportunity · deployment · red zone · absence
WHAT HE DID  blue    week outcomes · game log
REFERENCE    dim     efficiency · glossary
```

Four meanings, four colours, learned once instead of fourteen times.

**The dim group stays dim.** Brightness on this card means "this should move
your opinion", so efficiency and the glossary are grey on purpose — painting
either brighter undoes the second channel entirely. Guard 14 asserts the
reference group resolves to `--text-dim`.

**The guard now asserts the MAPPING rather than a literal token**, so a
deliberate palette re-tune stays legal and a hand-written colour beside grouped
ones fails. That replaces an assertion which string-matched one section's exact
hex token and broke on a refactor that preserved its intent exactly.

### Deployment and Red zone are collapsed now

Both are summarised in The Read, so they cost a tap instead of a scroll. Same
reading-frequency rule the results page uses: **what stays open is what is read
on every visit, not what is small.**

### Measured

```
                 before          after
AJ Brown         1656px  13 s    1721px  13 s
Bijan Robinson   1732px  14 s    1738px  16 s
Carnell Tate      451px   3 s     547px   5 s
0 sub-32px tap targets · no page errors
```

The card is roughly the same height and now opens with a paragraph anyone can
read. That is the trade that was wanted: **the height was never the complaint,
the lack of a starting point was.**

---

## Personas First, Then the Card (Sep 1, 2026)

Reported as: establish who the user is *before* making UI updates. That
reordering changed the answer, so it is worth recording why.
**Presentation only — 39 grades byte-identical.** `USER-PERSONAS.md` is the new
product document; guard 14 now asserts the card matches it.

### The first regrouping was wrong, and personas are what showed it

The card had been regrouped into **who he is / his role / what he did /
reference**. That is a description of the SECTIONS. It is not a question anyone
asks. Written down against a real reader, it falls apart immediately:
**availability and career arc are not identity — they are the things that could
change the role.**

Regrouped against the reader's own questions instead:

```
HIS JOB                purple  trajectory · opportunity · deployment · red zone · absence
WHAT HE PRODUCED       blue    game log · week outcomes
WHAT COULD CHANGE IT   grey    news · on-field rate · career arc · team turnover
REFERENCE              dim     efficiency · glossary
```

### The two axes, and why designing against one produced a bad card

**INTENT** (what they are doing now) controls what they need to SEE.
**EXPERTISE** (how much vocabulary they have) controls how it needs to be SAID.
They are independent — a portfolio drafter on his 40th entry may not know what
WOPR is, and a first-time user may be an analyst.

The card had been designed against expertise alone, which is why it was right
for one quadrant and wrong for three. **The hardest and most common quadrant is
someone mid-draft, on a phone, with 30 seconds, who does not know which of
fourteen sections to look at.**

### The persona that decides the hard calls is P2, the on-the-clock drafter

Under 30 seconds, timer running, no taps to spend. He is why:

- **The Read is first and needs no interaction.** It was rendering fourth,
  behind three sections, which made it useless to the only reader who needs it
  most.
- **The groups are DIVIDERS, not collapsible wrappers.** Nesting his role data
  one level deeper would cost him the thing he came for.
- **There is no skill-level toggle.** A toggle is a tap. One design that works
  at a glance beats two behind a switch — and it is also one design to maintain.

### Two ordering bugs the render caught

1. **The game log sat under HIS JOB.** It is output, not role.
2. **REFERENCE rendered before WHAT COULD CHANGE IT**, because reference lived
   inside the `card.reason` data branch and outlook lived outside it. Both of
   its sections already guard on their own content, so it moved out of the
   branch and to the end where every persona actually consults it.

A third was caught by the browser rather than the source: the reference block
was pasted **inside** the Team target turnover `CardSection`, so it rendered
only when that collapsed section was open. **The source read correctly and the
page did not** — the same reason the localStorage flag bug needed a real render
to find.

### What guard 14 now pins

- Four groups, named `job` / `production` / `outlook` / `reference`
- Each section's group membership, individually — so a future session cannot
  quietly file availability under the job it qualifies
- **Group headers render in reader order**, asserted as an exact sequence
- Every header is guarded on having content, so an empty group never shows a
  bare label pointing at nothing
- The game log sits between the production and outlook headers
- Reference resolves to `--text-dim`

Both failure paths negative-tested: moving reference out of reader order, and
regrouping availability under `job`, each exit non-zero.

### Rookie cards prove the grouping degrades correctly

Carnell Tate has no 2025 role, so he renders `RECENT NEWS · THE READ · WHAT
COULD CHANGE IT` and nothing else — 615px. The groups that have no content
simply do not appear, which is the behaviour the guard's content-gating
assertion exists to protect.

---

## Persona Sweep of Both Sides (Sep 1, 2026)

Full audit of best ball and redraft against `USER-PERSONAS.md`, at three
viewports. **One real defect found, and it was the worst pain point either page
had. 39 grades byte-identical.**

### THE PAGE DID NOT MOVE WHEN A GRADE ARRIVED

Measured: after Analyze, `scrollY` stayed at **0** while the grade letter sat at
**y=1243** (best ball) and **y=1232** (redraft). **Every user scrolled roughly
1,200px past the form they had just filled in to reach their own result** — and
P1, the portfolio drafter, does that on every one of forty entries.

Now lands the results root at the top of the viewport in both modes and at every
width tested.

### ⚠️ THREE ATTEMPTS LANDED IN THE WRONG PLACE, ALL SILENTLY

This is the part worth keeping. `scrollTo` was called every time and nothing
ever errored:

1. **No scroll at all.** The original state.
2. **Scrolling from inside the layout effect** — measured y=686 while the
   results tree was still EXPANDING. The page then grew to put the grade at
   1243, and Chromium **cancelled the in-flight smooth scroll**. `scrollTo` was
   called with a sane number and `scrollY` stayed 0.
3. **Scrolling after two animation frames** — measured y=2031 while the page was
   still SHRINKING (the paste help collapses on analyze), **overshooting the
   real target of 1218 by 814px** and putting the grade above the viewport.

The fix polls `document.body.scrollHeight` until it is unchanged across two
consecutive frames, then measures once and scrolls. Capped at 40 frames so a
page that never settles still scrolls rather than hanging.

**A scroll that goes to the wrong place is the same class as a filter that drops
a player: the code ran, nothing complained, and only a real render shows it.**

Keyed on a COUNTER rather than on `analyzed`, so restoring a saved grade on page
load does not yank a reader who did not ask for it.

### ⚠️ `test-disclosure.mjs` USES A DIFFERENT ASSERTION IDIOM

Its `ok()` takes **one argument and always prints a pass**; the file's idiom is
`cond ? ok(msg) : bad(msg)`. The first version of this guard was written in the
`ok(label, condition)` form the other guards use, so **every assertion in it was
a no-op and both negative tests passed.** Same one-argument `ok()` trap already
recorded for guards 19 and 20 — it has now bitten three times, so check the
assertion signature of the file you are editing before adding to it.

A fourth assertion was also too loose: it checked that the string
`prefers-reduced-motion` appeared, and passed when the behavior was hard-coded
to `"smooth"` with the media query sitting unused above it. **Assert the flag is
USED, not merely present.** All four failure paths now exit non-zero.

### What the sweep confirmed was already right

Both modes, phone / tablet / desktop: **0 sub-32px tap targets, no horizontal
overflow, no page errors.** First screen after analyze now reads grade → counts
→ match counter → roster → lookup → nutshell → strengths → weaknesses, in both
modes, without a scroll.

Sticky index, data-vintage footer, "how is this grade calculated" and the match
counter are all present in both modes.

### Three findings that were MEASUREMENT ARTEFACTS, not defects

Recorded because each cost a cycle and the same traps will recur:

- **`innerText` returns text-transformed output.** Searching page text for
  `nutshell` found nothing because CSS renders it uppercase. The nutshell was
  there the whole time.
- **A crude "is this jargon defined nearby" regex produced false positives.**
  `bring-back` has a full plain-English intro paragraph, `Smash` has a
  five-tier `MatchupLegend` used in four places, and the grade explainer defines
  stacks and construction. The vocabulary support is in place.
- **`scrollY` capping at exactly 1024 on desktop looked like clamping.** It is
  not: `rootTop` is 1036 and the target is `rootTop - 12`. The grade sits lower
  in the viewport there only because the banner is a taller grid at width.

**Verify a suspicious measurement before reporting it as a finding.**

---

## The `reason`-Shaped Gap, and a Structured Date Nobody Read (fixed Sep 1, 2026)

**39 grades byte-identical.** Guarded in `scripts/test-player-card.mjs`.

### Two silent gaps, same shape

`SITUATIONS` has **two prose shapes** and `buildPlayerNews` read one of them.
138 entries are `trendNote`-shaped, 1 is `reason`-shaped, 3 carry both. **`reason`
is live data** — the AI prompt reads it at the `verdictAlignments` line — so a
fresh reason-only entry could never reach a card reader, and no guard caught it.

Separately and worse: **a `SITUATIONS` row can carry a structured `date` field,
and nothing read it.** Dates were parsed out of the prose only. `malik davis`
carries `date: "2026-06-07"` with no date anywhere in its prose, so the card
rendered nothing for him while a perfectly good date sat in the object two keys
away. He now renders, correctly stamped `86D AGO · RE-VALIDATE`.

Coverage: 4 of 142 entries carry the structured field, 3 of those also have a
prose date. The value is less the one entry recovered than that the field is now
authoritative, so future entries can use it instead of hiding a date in a
sentence.

### The structured date does NOT simply win

The file's existing rule is that **the LATEST date in an entry is its currency**,
because notes get appended to. An entry stamped `2026-06-07` whose prose was
updated in August is an August note. So `newsDateFor` reads both and takes the
later, and discards a future date on **both** paths for the reason
`parseNewsDate` already documents — a court date, a return window and a contract
deadline all parse identically to an update stamp.

`trendNote` still wins over `reason` where both exist: it is written for this
surface.

### A WHOLE GUARD SECTION HAD BEEN SILENTLY LOST

Found while adding this one. The Sep 1 guard for **The Read** was written, it
passed, and a later edit replacing a neighbouring section spanned to the same
end marker and **swallowed it whole**. The suite kept passing, because a guard
that no longer exists cannot fail. It was caught only by grepping the committed
file for a symbol it should have contained.

**A deleted assertion is invisible in exactly the way a failing one is not.**
When replacing a block in a guard file by index range, check the section count
afterwards — or anchor on a marker that belongs to the block being replaced
rather than to the one after it.

The read guard is restored, with that history recorded in its own header.

### Also corrected here

An existing assertion re-derived every rendered note's date with
`parseNewsDate(n.text)`. That was valid when prose was the only source; a
structured date legitimately produces a label the prose does not contain. It now
re-derives through `newsDateFor` from the **source row**, which is a stronger
check of the same intent — the date is derived, never invented.

Four failure paths negative-tested: removing the `reason` fallback, ignoring the
structured date, allowing a future structured date, and letting the structured
date always win. All exit non-zero.

---

## Cutdown-Day News Sweep — Sep 1, 2026

Final 53-man cuts landed Aug 30 2026 and the roster picture moved more in that
weekend than in the six weeks before it. Seven entries refreshed, two team
corrections, one player added to the best-ball tables. **39 grades
byte-identical** — prose carries no score.

### The one that inverts a top-50 pick

**Josh Jacobs (RB GB, ADP 41) is on the Commissioner's Exempt List** as of Aug
30 2026. He is off the 53-man roster, cannot practise and cannot attend games.
**The exempt list is not a suspension and has no fixed length** — it holds until
the league resolves its review, so there is no date to plan around. Green Bay
traded a 2028 sixth to Pittsburgh for Kaleb Johnson the same day, which is a club
telling you how it reads its own odds.

The entry written Aug 29 described an open review a GM said the club was
preparing for. That was accurate on Aug 29 and describes a world that ended a
day later. **This is the freshness rule paying for itself twice in four days** —
Alec Pierce on Aug 28, Jacobs now.

### Everything else that moved

| Player | ADP | Change |
|---|---|---|
| **Josh Jacobs** RB GB | 41 | Commissioner's Exempt List, no timeline. fade -> **HARD FADE** |
| **Javonte Williams** RB DAL | 36 | Blue and Mafah waived; the RB2 competition named in his entry is over. stable -> rising |
| **Jordyn Tyson** WR NO | 63 | IR **confirmed** with a return designation, minimum four games, ~mid-Oct |
| **MarShawn Lloyd** RB GB | 162.5 | The Jacobs contingency landed, and gained a competitor the same day |
| **Malik Davis** RB DAL | 215.1 | RB2 **confirmed** by attrition |
| **Kaleb Johnson** RB GB | — | Traded PIT -> GB. New entry, added to the best-ball tables |
| **Emari Demercado** RB DAL | 215.9 | Claimed off waivers from KC Aug 31. **His whole thesis was a KC role** |
| **Ashton Jeanty** RB LV | 11 | Questionable for Week 1, full strength expected by W2-3 |

### ⚠️ THE STALE-ARTICLE TRAP FIRED AGAIN, ON THE SAME DAY'S NEWS

A search for running-back depth charts returned a well-written summary
describing **Jaydon Blue as a Cowboys sleeper who gives Dallas a change-of-pace
threat opposite Javonte Williams.** Blue had been waived hours earlier. The
article was pre-cutdown and the summary carried no date.

Same shape as the Rachaad White trap recorded Aug 16. **The defence that worked
was checking every player-team and depth-chart claim against `ADP_DATA` before
writing it**, and verifying the load-bearing ones against a primary source
individually rather than trusting an aggregated summary.

Two claims from that same result were verified separately and kept (Kamara's
MCL, dated Aug 19 2026). Two were dropped for lack of a dated source.

### Kaleb Johnson's ADP is a RESOLUTION PLACEHOLDER, and says so

He exists only in `ADP_YAHOO` at 278 and **no best-ball quote exists** — his
price is moving hourly on the Jacobs news. Per the ADP source-of-truth rule a
number enters `ADP_DATA` only from a best-ball source, so the 278 is carried
across explicitly flagged as an estimate. **It is safe only because `adpFlags`
excludes `adp >= 200` from reach/value logic**, so the number drives resolution
and ordering and nothing else. Replace it with a real quote.

### A guard failed because a prose improvement made it stop applying

`malik davis` was the corpus's last `reason`-only entry, and this sweep gave him
a `trendNote`. The guard added Sep 1 asserted that a reason-only entry EXISTS,
on the reasoning that a fallback nothing exercises is untested — so **an
improvement to the prose made the guard fail.**

The corpus can legitimately hold zero reason-only rows at any time; the fallback
still has to work for the next one. It is now tested **directly**, by injecting a
synthetic row into `SITUATIONS` and asserting the behaviour — including that an
undated reason-only row is still withheld, since the no-date rule outranks the
fallback.

**Assert the behaviour, not that the corpus happens to exercise it.**

### Method

- Every player-team claim checked against `ADP_DATA` before it was written.
- Every date pinned to a primary source; where only a month was confirmable, the
  month-only form is used rather than an invented day.
- `report-stale-news.mjs` returns **zero** players past the 45-day rule.


---

## The Participation Feed Is Alive, and Two "Impossible" Layers Are Not (Sep 1, 2026)

Prompted by a user asking whether man/zone coverage data exists anywhere outside
PFF. Checking instead of repeating this file's own claim found that **two of the
Tier C rejections in `ANALYST-REFERENCE.md` were wrong**, and had been shaping
decisions for weeks.

### What this file said, and what is actually true

| Claim here | Reality, verified Sep 1 2026 |
|---|---|
| "the NFL participation feed died after 2023" | `load_participation(2025)` returns **45,184 rows** |
| "no public routes data exists" | `offense_players` is populated on **100%** of them |
| "TPRR — paywalled, no free routes source" | **Computed it.** Nacua 35.3%, JSN 33.3%, Chase 29.2% |
| "man/zone splits — paywalled" | `defense_man_zone_type` on **22,055 classified 2025 pass plays** |

The participation release also carries `defense_coverage_type` (COVER_0/1/2/3/4/6,
2_MAN), `route`, `time_to_throw`, `was_pressure`, `ngs_air_yards`,
`offense_formation` and `offense_personnel`.

**FTN charting is a separate release and has no coverage field**, but it does
carry `is_contested_ball`, `is_created_reception`, `is_catchable_ball`,
`is_drop`, `n_blitzers` and `n_pass_rushers` — none of which are used yet.

### How the wrong claim survived

It was written once, was plausible (the feed genuinely had a gap), and was then
**cited rather than re-tested** — including by me, in the sentence rejecting the
man/zone split as impossible. **A "this is impossible" note ages exactly like a
player verdict and has no freshness rule on it.** The 30-45 day re-validation
rule covers `RECENT_NEWS`; nothing covered a data-availability claim.

**Rule this produces: a Tier C rejection must carry the date it was last
verified, and re-checking a feed costs one command.**

### What the coverage data says about the question that prompted it

Tee Higgins' reputation is as a man-coverage beater. Measured on 2025 targets
with a classified coverage:

```
Tee Higgins    man 7.79 y/t on 43 targets  |  zone 9.57 on 56  |  edge −1.78
```

**The reputation is not supported by this measure.** Nor is it a Cincinnati
artefact — Chase runs −2.22 on the same offence.

⚠️ **But read the leaderboard before trusting the metric.** The top of it is
James Cook +11.41, D'Andre Swift +9.97, Jaylen Warren +7.24, Saquon Barkley
+6.40 — **running backs**, because man coverage puts a linebacker on a back and
that is a mismatch rather than a route-winning skill. So yards per target against
man measures MISMATCH EXPLOITATION at least as much as it measures beating man,
and it inherits the same aDOT confound separation has. Treat it as a screen.

### Nothing was built here

This is a correction to the record and a verified availability note, not a layer.
Building TPRR or coverage splits properly means a builder script, a stability
measurement, percentile populations, prompt wiring and a containment guard — the
same bar every other layer cleared. The point of this entry is that the door is
open, and this file said it was locked.


---

## TPRR and Man/Zone Coverage Built (Sep 1, 2026)

Both items the previous section corrected out of Tier C are now layers.
**CONTEXT ONLY — 51 grades byte-identical** (14 tournaments x 3 fixtures, plus
9 redraft). Guarded by the additions to `scripts/test-context-layers.mjs`.

| File | Script | Answers |
|---|---|---|
| `routes_2025.json` | `build-routes.py` | how often is he thrown at per route he runs |
| `coverage_2025.json` | `build-coverage.py` | what did he do against man versus zone |

One `participation` release feeds both, the same economy the game-log layer got
from the weekly stats file.

### THE MEASUREMENT DECIDED WHAT SHIPPED, AND IT SPLIT THE TWO APART

Both were built, then measured across 23>24 and 24>25 before either was wired to
anything:

```
route_sh   0.756   anchor-adjacent
tprr       0.674   reliable — above dud rate (0.667) and separation (0.663)
man_rate   0.335   weak
ypt_zone   0.294   weak
ypt_man    0.235   weak
edge       0.161   COIN FLIP
```

So **TPRR ships as a real rank-2 input, in the prompt and on the card. The
man/zone edge ships as REFERENCE the model never sees.** At 0.161 it sits beside
RB yards per carry and below every number already in the prompt — including
per-touch efficiency, which is carried only with explicit warnings. **Warning a
model about a coin flip is less reliable than not handing it the number**, so
`getCoverage` has exactly one consumer and it is the player card. The guard
asserts that, and a `coverageContext` builder fails the run.

Neither outcome was knowable in advance. Building both and then deciding is what
kept the coin flip out of the prompt.

### `route_sh` is a DENOMINATOR, not a second signal

It correlates with `snap_sh` at **r=0.957 (WR 0.966)** — the same input. Per the
reference file's own rule, a second entry saying the same thing does not get
added; it is emitted because a rate without its sample is unreadable, and the
card row carries a neutral `≈ restates snap share` mark so nobody counts two
findings where there is one.

**A new `echo` prop was needed rather than reusing `caution`.** On this card
`caution` is gold and means THIS NUMBER DISAGREES with another one — a real
conflict. `echo` is neutral and means THIS NUMBER RESTATES one. Spending the
gold mark on a non-conflict devalues it everywhere it appears.

TPRR itself is **not** a restatement of volume: r=0.871 against targets per game,
0.817 against target share. Correlated, as it must be, and the divergences are
the point — high rate on ordinary volume is the contingency profile, the reverse
is a fed role a depth-chart change removes.

### ⚠️ THE DENOMINATOR IS PASS SNAPS, NOT CHARTED ROUTES

Participation records who was ON THE FIELD, never who released into a pattern.
For a WR they are nearly the same; for a blocking TE or a protecting back they
are not, so protection snaps deflate the rate. RB/TE cards carry the caveat and
only they do, and the stability is weaker there too (RB 0.515 vs WR/TE 0.687).

### ⚠️ A SEASON-LEVEL PRIMARY TEAM BREAKS EVERY MID-SEASON MOVER

The first denominator assigned each player one team for the year and produced
route shares **above 1.0** — Rashid Shaheed at 1.368. Team dropbacks are now
counted per (player, game). **Any denominator built from a season-level team
assignment is wrong for exactly the players whose role changed**, which is the
population that matters most. The guard asserts no route share exceeds 1.0.

### ⚠️ THE MAN/ZONE EDGE IS NOT CENTRED ON ZERO

Man coverage suppresses yards per target league-wide, so almost everyone is
negative: **WR median -1.48, TE median -1.10.** A receiver at -1.2 is ABOVE his
position median.

**This corrects what was reported to the user earlier the same day.** Tee
Higgins' -1.78 was read as "the man-beater reputation is not supported"; it is
the **44th percentile of qualified WRs**, which is ORDINARY, not poor. Reading
the bare sign mis-reads most of the league. The card now refuses to print an edge
without a percentile and the position median.

**A second claim from that reading also did not survive.** An ungated pass
produced a leaderboard topped by running backs at +6 to +11 (Cook +11.41, Swift
+9.97, Barkley +6.40) and the RB mismatch was reported at that magnitude. At the
15-target-per-bucket gate those were single-digit samples and vanish: the real
qualified RB pool is 7, top edge +2.48. **The direction is real, the magnitude
was noise. Gate first, then look at the leaderboard.**

### The note must not point at a number that is not on screen

Only **7 RBs** clear the split gate, below the 12-player ranking minimum, so RB
cards show no percentile — while the note still said "read the percentile, never
the sign." A note instructing the reader to use something absent is the same
defect class as a label disagreeing with its own value. The note now branches and
names the pool size. Guard asserts both branches, and that at least one position
really is below the minimum so the branch is not dead code.

### FIVE percentile populations now, five printed gates

```
CARD_PERCENTILES     draftable, 8+ games       Opportunity, Week outcomes
NGS_PERCENTILES      40+ targets 2025          Deployment
RZ_PERCENTILES       5+ red-zone opportunities Red zone
ROUTES_PERCENTILES   100+ routes 2025          Route workload
COV_PERCENTILES      15+ tgts vs each coverage Man vs zone
```

Merging any two prints a rank under a population label that does not describe it.

### ⚠️ A `## ` HEADER WAS SWALLOWED BY A `### ` CUT — AGAIN

Moving the two entries out of Tier B used a cut that ran to the next `### `
heading. The last entry in a section has no following `### `, so the cut ran
through `## §7 · Tier C` and deleted the section header and its intro. **This is
the third instance of the swallowed-block failure recorded in this file**, and
the first that a guard caught rather than a human noticing weeks later — guard 23
failed on "sections exist and are in order" immediately. **When cutting a block
by heading, anchor the end on `^(### |## )`, not on the child level alone.**

### Regenerate

```
pip install nflreadpy      # participation ships parquet-only; there is no csv.gz asset
python3 scripts/build-routes.py   --season 2025 --out grading/data/routes_2025.json
python3 scripts/build-coverage.py --season 2025 --out grading/data/coverage_2025.json
```

Both are ANNUAL under the split refresh cadence. Neither feeds a scored input.

### Also verified in a real browser

Rendered at 430px: Route workload and Man vs zone both present, the blocking
caveat fires on RB and TE cards and not on WR, The Read picks up TPRR at the
tails only, **0 tap targets under 32px, 0 page errors.** Five failure paths
negative-tested — a scoring leak, coverage promoted to a bright group, a
coverage prompt builder, route share losing its restatement mark, and TPRR
ranked against the card's population — all exit non-zero.


---

## The In-Season Transition (Sep 1, 2026)

Two builds that turn a draft-season tool into one that says something useful in
October. **CONTEXT AND PRESENTATION ONLY — 51 grades byte-identical.** Guards 15
(extended) and 24 (new).

### 1. The app knew the date and almost nothing acted on it

⚠️ **An audit earlier the same day reported "no current-week state exists
anywhere in App.jsx." That was FALSE**, and the grep that produced it was
case-sensitive and missed `getNflWeek`. Corrected in `ANALYST-REFERENCE.md` §14
rather than quietly. What was actually true:

- `lineupConfidence` computed start/sit intel for **all 17 weeks**.
- `getNflWeek()` existed with **exactly one consumer**, the redraft week strip.
- **The AI prompt ignored it** and filtered to `wk.week >= 15` unconditionally,
  so from September to December the model was handed December's start/sit calls
  and nothing about the week being played.
- It is calendar-derived, so it said Week 8 whether or not the weekly refresh
  had been run since Week 3.

**`seasonNow()` is now the single definition** and carries the calendar week AND
the data vintage together, because they answer different questions and only one
of them is on a clock.

```
const seasonNow = (now) => { week, inSeason, dataWeeks, lag, stale }
```

**⚠️ A LAG OF EXACTLY 1 IS THE HEALTHY STEADY STATE, NOT A WARNING.** After week
N is played the refresh covers N and the decision in front of the user is N+1.
A guard or a banner that fired on the steady state would train everyone to
ignore it. Only a larger gap warns, and the warning names both numbers.

Both prompts now open with `whenContext`: the week, what the in-season data
covers, and an explicit line when that data is behind. Out of season the string
says the season has not started and every number is 2025, which is what the
model needed to stop writing about an October roster as though the draft had
just finished.

### 2. The frozen scored file made the anchors describe last season all year

`player_metrics_2025.json` feeds four scored inputs and is frozen on purpose.
The consequence is easy to miss: **targets/gm (r=0.77), air yards share (0.78)
and target share (0.73) — the anchors everything else leans on — described 2025
for the whole of 2026.**

**The fix is never to thaw the frozen file.** `build-volume-current.py` emits
`volume_<season>.json`, a CONTEXT twin of the same measurements on the current
season. Both vintages render, never swapped, exactly as trajectory, QB profile
and game logs already do.

**It costs no extra network.** `refresh-inseason.sh` already downloads
`stats_player_week_<season>.csv` for two builders; this is a third parse of a
file on disk. Red-zone share and TPRR are deliberately NOT twinned — they need
the pbp and participation releases, which are large weekly downloads.

### ⚠️ THE DRY RUN FOUND A REAL BUG IN THE FROZEN FILE

Validating the twin against 2025 (mean abs diff on `tgt_sh`: **0.0056**)
surfaced nine players who disagree by more than five points, **all mid-season
movers, all inflated in the scored file**:

```
brandin cooks     scored 0.293   correct 0.089
rashid shaheed    scored 0.341   correct 0.167
adonai mitchell   scored 0.312   correct 0.150
jakobi meyers     scored 0.372   correct 0.228
adam thielen      scored 0.179   correct 0.078
+ 4 more
```

Cooks had 36 targets across 13 games in which his teams threw 403 times. That is
**8.9%**, and 29.3% would require his offence to have thrown 9.5 times a game.
`build-player-metrics.py` divides a traded player's full-season targets by a
single team's totals.

**It has never moved a grade** — verified: neither `analyzeRoster` nor
`analyzeRedraft` reads `tgt_sh`, which is context. It reached the AI prompt and
the card, and shipping the twin corrects those nine players this season.

**The frozen file stays frozen anyway.** Its scored fields are unaffected and
regenerating it mid-season is the thing the whole cadence exists to prevent. Fix
it in the next legitimate regeneration, not now.

### Two rendering rules the guard pins

1. **The current figure NEVER carries a percentile.** `CARD_PERCENTILES` is
   built from the 2025 population; ranking a partial season against it prints a
   rank under a population that does not describe it. The number shows, the rank
   does not, and the section note says why.
2. **Both values render on ONE row, current second, with an arrow.** One value
   slot means one vintage and the reader cannot tell which season they are
   looking at. `11.6 → 12.4` with the note naming both seasons is the finding.

### Verified

```
51 grades byte-identical · 25 guards pass · dual-file identical
Live-season dry run: 2025 rows relabelled as "2026 through W8" render
  Targets / game  11.6→12.4   Air yards share 35%→42%
  Target share    32%→36%     WOPR 0.72→0.84
  Snap share      94% (no twin — needs snap counts, correctly absent)
Placeholder restored afterwards; refresh-inseason.sh no-ops before Week 1.
Six failure paths negative-tested across guards 15 and 24.
```


---

## The Waiver-Target Pool (added Sep 1, 2026)

The first feature in this app that ranks players **not** on your roster.
**CONTEXT ONLY — 51 grades byte-identical.** Guard 25.

Every layer built before this describes a player you already hold. The most
common in-season decision in redraft — *who do I add this week* — had no support
at all, because nothing looked at the player universe minus your roster.

### ⚠️ BEST BALL IS OUT OF SCOPE, AND THAT IS THE FIRST DESIGN DECISION

Underdog rosters lock after the draft. There are no waivers, so a pool there
would be a feature that cannot be acted on. `analyzed.mode !== "redraft"` returns
null, and the guard asserts it.

### ⚠️⚠️ THE APP CANNOT SEE YOUR LEAGUE'S WAIVER WIRE, AND SAYS SO ON SCREEN

It knows your roster and it knows every player. It does **not** know the other
eleven rosters. So this ranks players not on YOUR roster that a league of this
depth (`teams x (starters + bench)`, 156 for a standard 12-team) plausibly leaves
unrostered — and an **exclusion box** lets the reader close the gap by hand.

Calling it "your best available add" would assert something unknowable. The panel
leads with the limit rather than burying it.

### IT IS BUILT IN THE COMPONENT, NOT THE ENGINE

The pool reads **six context layers** (trajectory, vacated, volume, routes,
availability, NGS). Putting it inside `analyzeRedraft` would have made the engine
unprovable, so it sits at module level and is invoked from a `useMemo`, exactly
as `buildPlayerCard` is. Guard 25 asserts both engines never reference it.

**Guard 13 caught the new consumer immediately** — `getSnapTrend` had exactly
three reviewed call sites and this made four. That is the allowlist working as
designed: `scoreFreeAgent` was added deliberately, with the reason recorded, not
by relaxing the assertion.

### MATCHUP DATA IS DELIBERATELY ABSENT FROM THE SCORE

```
roleChange   3.0    rank 1 — the most causal thing you can know
volume       2.0    rank 2 — targets or carries per game
tprr         1.5    rank 2 — the per-opportunity rate
vacancy      1.0    rank 1, team level — locates an opening only
availability 1.0    rank 2 — a per-game rate assumes he plays
separation   0.75   rank 3 — talent in isolation
```

Rank 5 is the least stable input measured in this project and **WR FPA is
negative year over year.** A schedule may SORT a shortlist; it must never
GENERATE one. The opponent renders as an annotation and contributes zero. Same
rule that keeps man/zone coverage out of the AI prompt.

The score is normalised by the weight actually available, so a thin profile
cannot outrank a full one by having less to be measured on.

### Two defects the first browser render exposed

Both were invisible in the source and obvious on screen, which is why the render
is not optional.

1. **A REASON MUST BE EVIDENCE *FOR*, NOT EVERY NUMBER MEASURED.** The list
   showed *"thrown at on 11.1% of his routes — above 21% of RBs"* as a bullet
   under a recommendation. A 21st-percentile figure argues AGAINST. Weak signals
   still drag the score, which is what normalising is for; they are no longer
   displayed as a case. Reasons now sort by CONTRIBUTION (`unit x weight`) rather
   than by raw weight, and the two-signal gate counts SUPPORTING signals only.
2. **NO TEAM MEANS NO ROLE.** Unsigned free agents carry `"-"` in the ADP tables.
   Tyreek Hill ranked sixth while his own dated news entry says he will not sign
   before the season. A player with no team has no snaps, no opponent and no way
   to help this week.

### The evidence is the point

Every candidate renders the two or three facts that ranked him, in plain
language, and the row opens his player card. **A ranked list a reader cannot
audit is a black box**, and checkable numbers are the entire argument of this
app.

Sample output on a real roster: Travis Hunter (79th percentile targets, 81st
separation), Colby Parkinson (41% -> 73% snaps), Adonai Mitchell (25% -> 76%
snaps, 82nd percentile TPRR). Role change surfacing at the top is the layer
working as designed.

### Still open from the in-season audit

News is hand-maintained, there is no opponent awareness in redraft, and
`sos_2026.json` is a static full-season figure with no rest-of-season view.


---

## An Absent Availability Rate Now States Its Reason (Sep 1, 2026)

Raised by the user from domain knowledge, not by a test: *"Lloyd has never been
healthy his entire career."* Checking that against the app found the metric
built to measure it had **no row for him**, and the card rendered nothing.
**CONTEXT ONLY — 51 grades byte-identical.** Guarded in
`scripts/test-player-card.mjs`.

### ⚠️ THIS IS THE ONE LAYER WHERE ABSENCE INVERTS

`build-availability.py` gates the population two ways: **2+ covered seasons**,
and **an 8+ game role in at least one of them**. Both gates are correct —
without the second the league-wide median came out at 25% and was measuring
roster churn rather than durability.

**The consequence is that the durability metric silently omitted the players
whose durability is most in question.** A back too fragile to ever hold a role
never qualifies for the number that would say so, his card skipped the section
entirely, and a reader could not tell "no data" from "no concern". That is the
silent-drop failure the Jul 27 2026 extraction rules forbid, in a new costume.

### THE TWO EXCLUSIONS MEAN OPPOSITE THINGS AND MUST NOT SHARE A SENTENCE

```
2+ seasons, still no row   -> he never held the role.  THE FINDING.
under 2 seasons on file    -> sample size.  NOT a durability signal.
```

Conflating them would libel every rookie, so the branch reads `CAREER_ARC.exp`
and the guard asserts a player with no NFL seasons is never described as failing
a durability gate.

Measured across the draftable pool: **200 carry a rate, 4 never held a role, 83
are sample-size, 0 fall through with no reason at all.** The four are Jonathon
Brooks (RB CAR, ADP 80.1), Chig Okonkwo (TE WAS, 143.8), MarShawn Lloyd (RB GB,
162.5) and George Holani (RB SEA, 212.5) — a small bucket, and every one of them
a player whose price assumes availability the app could not previously speak to.

### Rules this produced

- **Thresholds are read from `AVAILABILITY._meta.gates`, never hand-typed.** A
  second literal `8` is the duplicate-definition class this repo has now hit six
  times.
- **The section renders on the excluded branch**, with the population gate
  printed beside the reason. A missing section reads as "no concern"; the point
  is to make the exclusion visible.
- The guard asserts BOTH branches are exercised by real players, so neither can
  rot into dead code. Three failure paths negative-tested: removing the branch,
  describing a rookie as a durability failure, and rendering nothing.

**The general lesson is about gates, not about this metric.** Any population
gate that exists to keep a median honest will exclude somebody, and the excluded
set is not random — it is systematically the players at the tail the metric was
built to describe. **When a gate drops a player, say so where the number would
have been.**
---

## The Status Layer: Availability & Depth Chart (added Sep 1, 2026)

GAP 1 from `ANALYST-REFERENCE.md` §14a, half-closed on purpose. `scripts/build-status.py`
-> `grading/data/status_2026.json`, from Sleeper. **CONTEXT ONLY, AND NOT WIRED TO ANYTHING
YET — 51 grades byte-identical** (14 tournaments x 3 fixtures, plus 9 redraft). Guard 26:
`scripts/test-status-layer.mjs`.

### THE DECISION WAS NEVER "REPLACE THE PROSE WITH A FEED", AND THE SPLIT IS MEASURED

Fifteen `RECENT_NEWS` entries sampled at random and classified:

```
0 of 15   could be supplied by a feed on its own
7 of 15   are pure analytical judgement with no feed component at all
8 of 15   carry a feed-supplyable FACT wrapped in a judgement
```

**Nothing in the sample could be replaced.** Tyler Allgeier's entry opens *"Listed RB1 on
ARI's first depth chart"* — that is `depth_chart_order` — and then says *"2yr/$12.25M; 19 GZ
carries in 2025"*, which no feed produces. George Kittle's PUP tag is `injury_status`;
*"Achilles at his age is the real risk, not the PUP tag itself"* is why the entry exists.

**So a feed can CONFIRM or CONTRADICT a fact inside an entry. It can never write one.**

⚠️ Also measured while sampling: `RECENT_NEWS` is **87 prose strings and 53 objects**;
`SITUATIONS` is **461 objects, zero strings**. Anything writing into either has two shapes
to respect, not one.

### ⛔ nflverse WAS THE OBVIOUS SOURCE AND IT PUBLISHES NOTHING FOR THIS SEASON

Both re-probed Sep 1 2026, per **R19**:

```
injuries_2026.csv.gz   HTTP 404 — the newest file in the whole release is 2025,
                       last updated 2026-03-18. It publishes once games are played.
injuries_2025.csv.gz   HTTP 200, 6,068 rows, W1-22, shape unchanged from §14a.
                       report_status is BLANK on 3,285 of them (54%).
Sleeper players/nfl    HTTP 200, 14.6MB, 12,225 players, ~1s. 812 skill players
                       with a team, 544 with a depth-chart slot.
```

**Coverage decided it, not stability.** nflverse is the safer dependency and carries only
the official injury report — no trades, no suspensions, no depth-chart moves. Of the eight
mixed entries above, the feed-supplyable fact was a **depth-chart slot** more often than an
injury status, and nflverse cannot see that field at all. Role change is rank 1; the app
infers it from snap trajectory, which lags a week. A depth-chart slot is same-day.

**The cost is real and does not go away: Sleeper is third-party and unversioned.**
`_meta.source_probed` records when it was last known good.

### ⚠️⚠️ §14a's JOIN CLAIM IS WRONG IN BOTH HALVES

It says the injury feed *"joins on `gsis_id`, the same key every other layer uses."*

1. **Sleeper carries `gsis_id` on 147 of 812 skill players — 18%.**
2. **No layer in `grading/data/` keys on `gsis_id`.** All 19 files key on a lowercased full
   name. Checked, not assumed.

So this is a **name-resolution problem**, the class that produced `findPlayer`, the alias
table and three guards. `normalize()` in the builder is a character-for-character mirror of
`App.jsx:2469` and guard 26 asserts App.jsx's version still has that shape — if App.jsx
changes, the guard fails and points at the builder. **Suffixes and `METRIC_NAME_ALIASES` are
deliberately NOT reimplemented**; the app's resolver handles them at read time, and a second
resolver is a second thing to drift.

### THE CONFLICT RULE: THE FEED NEVER WINS. IT FLAGS.

**A fetched status may not overwrite, outrank or out-date a hand-written note.**

This is the part §14a called most likely to go wrong, and it is right. Under
freshest-dated-wins a same-day feed would **out-date all 140 `RECENT_NEWS` entries
permanently**, and the 7-of-15 that are pure judgement — the ones that are the reason the
corpus is worth reading — would be demoted to decoration on day one.

`report-stale-news.mjs` gained a second section instead. Its first section is unchanged and
still ages prose against the framework's 30-45 day rule.

```
STRUCTURED STATUS   out / IR / PUP / depth slot     ~7 days, IN SEASON ONLY
ANALYTICAL PROSE    the argument around the fact    30-45 days, unchanged
```

⚠️ **What it can detect is narrow, and the report says so on screen.** It cannot read a note
and decide it is wrong; no tool can. It detects one mechanical thing: **the feed reports a
HARD unavailability (IR/PUP/Out/Sus/NFI/DNR) and the freshest note predates that report.**
A note written *after* the feed already knew is not flagged. A depth-chart CHANGE is not
detectable at all — the file is a snapshot with no history — so a note made stale by a role
move will not surface. Output is headed **QUESTIONS, NOT CORRECTIONS**.

First live run flagged **11 players**, and the two ends of the range show why the framing
matters: `adam randall` carries a `trendNote` updated Aug 30 describing a rising rookie
while the feed has him **IR as of Aug 31** — a real contradiction. `zach charbonnet`'s note
already says Reserve/PUP and is simply older than the feed — a false positive a human closes
in two seconds.

### ⛔ NOTHING REACHES THE AI PROMPT, AND THE CASE IS STRONGER THAN §14a STATES

`newsContext` is assembled at `App.jsx:9777` and reaches the model at `:10246` under:

> *Recent news (breaking updates — **override everything above for these players**)*

**`RECENT_NEWS` is the highest-authority block in the prompt**, explicitly outranking the
situations block labelled *ground truth*. Putting an unattended third-party feed there hands
it veto power over every measured input in the app. `_meta.reaches_ai_prompt` is `false` and
guard 26 asserts it.

### ⛔ IT DOES NOT RENDER YET, AND THAT IS ENFORCED RATHER THAN INTENDED

Approved Sep 1 2026: **build it, ship it reading, do not render until the feed has been
watched for a week.** So **App.jsx has no consumer of any kind** — guard 26 asserts the
absence of `status_2026`, `STATUS_LAYER`, `getStatus(`, `statusContext` and
`getPlayerStatus`, so wiring one fails the build until this file and that guard are updated
on purpose. Verified independently in a browser: `status_2026.json` does not appear in the
network log while every other layer does.

`report-stale-news.mjs` reads the JSON **directly** rather than through App.jsx, which is
what makes containment true by construction instead of by promise.

### The committed file is a zero-row placeholder, generated by the real builder

Same convention as `snap_trajectory_2026` and `volume_2026`: run the actual builder against
an empty input so **the shape cannot drift from what a live run emits**. Verified — `_meta`
keys are identical between the empty build and the 812-player build.

⚠️ **One consequence worth knowing: the row-shape assertion is vacuous while the file is
empty.** It was exercised against all 812 real rows during the build and negative-tested by
adding a `gsis_id` field, but in CI it will not bite until a real refresh is committed.

### `refresh-inseason.sh` is now 5 steps, and step 5 is the odd one out

It **cannot reuse a download** — steps 1-4 are nflverse season releases, this is a
third-party live snapshot on a different host. It is also **the only step that returns data
before Week 1**, which is the point: the hand-written notes are at their most wrong in the
weeks the nflverse releases do not publish.

⚠️ **The script used to lie about a partial run.** With Sleeper succeeding and the season
releases 404ing — the NORMAL pre-season outcome — it printed *"Nothing refreshed."* A script
that misreports its own result is how a stale layer survives a refresh nobody doubted. There
is now a `got_any` flag and a **"Partly refreshed"** branch. Guard 26 asserts it.

⚠️ **The 14.6MB raw payload lives in `$TMP` and dies with the trap.** Only the ~200KB extract
reaches `grading/data/`. Guard 26 fails if the raw dump is ever pointed at the repo.

### ⚠️ A LITERAL `\n` REACHED A LINE CONTINUATION AND `bash -n` PASSED IT

While wiring step 5, an editing slip put the two characters `\` `n` where a line
continuation belonged. **Shell syntax checking accepted it** — outside quotes `\n` is just an
escaped `n`, so it became an extra ARGUMENT and shifted `argv`, making the builder read the
output path as its season. Caught only by actually running the script.

**`bash -n` proves a script parses, never that its arguments are the ones you meant.** Run
the thing.

### Calibration

```
51 grades BYTE-IDENTICAL — 14 tournaments x 3 fixtures, plus 3 leagues x 3 fixtures
  Compared against a pristine git worktree at HEAD, not against numbers recorded here.
26 guards pass (1,142 assertions) · cmp App.jsx App.jsx.jsx byte-identical
Rendered at 430px: 0 tap targets under 32px, no horizontal overflow, and the only
  console error is the documented POST /api/analyze 404 that Vite always produces.
21 failure paths negative-tested, ALL exit non-zero — including three separate ways
  of leaking into analyzeRoster, each caught by two independent assertions.
```

⚠️ **One negative test initially reported a MISS and the test was the bug** — it replaced a
string with itself, so it mutated nothing. Rewritten to inject a real `STATUS_LAYER` read
inside `analyzeRoster`'s body. **Same lesson this file already records twice: assert the
behaviour, and check that the negative test actually changes something.**

### Still open from §14a

**GAP 1 is half closed.** The status half is built; **the prose half is unchanged and still
hand-maintained**, which is correct — nothing can automate it. What remains: the layer is
unwired pending the watch period, and a depth-chart CHANGE is undetectable without history.
**GAP 2** (no opponent awareness in redraft) and **GAP 3** (`sos_2026.json` has no
rest-of-season view) are untouched.


---

## Three Name Bugs Were Hiding 18 Game Logs (fixed Sep 1, 2026)

Reported as a question, not a bug: *"Why can't I access Burden's game log?"*
That phrasing is the finding. **The section rendered NOTHING when a log was
missing, so an absence read as a broken app rather than as missing data.**
**CONTEXT ONLY — 51 grades byte-identical.** Guarded in
`scripts/test-player-card.mjs`.

`gamelogs_2025.json` went from **213 players to 231**, with nothing lost.

### Four distinct causes, three of them name resolution

**1. The builder did not strip suffixes.** The weekly stats release prints
"Luther Burden III"; `ADP_DATA` keys `luther burden`. The membership test
`n not in draft` failed and the player was dropped silently. Ten lost this way,
including **Brian Thomas Jr, Chris Godwin Jr, Deebo Samuel Sr, Harold Fannin Jr,
Michael Penix Jr and Tyrone Tracy Jr.**

**The tell is who SURVIVED:** Kenneth Walker III and Marvin Harrison Jr, purely
because `ADP_DATA` happens to spell them WITH the suffix. The filter was testing
whether two hand-maintained tables agreed on spelling, not whether a player was
draftable.

**2. The builder replaced `.` with a space; the app deletes it.**
`"A.J. Brown"` became `a j brown` instead of `aj brown`. Five more lost:
**A.J. Brown, C.J. Stroud, J.K. Dobbins, T.J. Hockenson, J.J. McCarthy.**

⚠️ **Any divergence from `App.jsx`'s `normalize()` is a silent drop.** The
builder now mirrors it exactly and says so in the docstring.

**3. `gameLogFor` was a SECOND hand-rolled lookup.** It tried the key and its
suffix-stripped form and nothing else, so it missed the alias table and the
base index `lookupPlayer` uses. `kenneth gainwell` resolved his metrics and not
his game log, which is filed under `kenny gainwell`. **Seventh instance of the
duplicate-definition class in this repo.** Now `lookupPlayer(src, name)`.

**The alias also had to work BOTH ways.** `METRIC_NAME_ALIASES` mapped
`kenny -> kenneth`; `player_metrics` keys one side and `gamelogs` the other, so
a one-directional alias resolves one file and not the other.
`METRIC_NAME_ALIASES_REV` closes it.

**4. Travis Hunter is filed as `CB`.** He plays both ways and nflverse records
him on defense, so a position filter read off the STATS FILE dropped a top-160
fantasy WR. **Position now comes from `ADP_DATA`, which is the app's own answer
to what a player plays.**

### The rule this produces

**A builder that filters against a hand-maintained table must normalise both
sides with the SAME function the app uses, and must take a player's position
from that table rather than from the data source.** Every one of these four was
invisible: no error, no warning, just a player with no chart.

And the section now says why it is empty. **"No week-by-week chart: he recorded
no 2025 regular-season stat line"** is data; a blank space is a bug report
waiting to be filed.

### Guard

The strongest available assertion, and it is cheap: **if a player's SEASON
TOTALS resolved, his WEEK-BY-WEEK rows must resolve too.** They come from
different files, so a name bug in either shows up there and nowhere else. Plus
one named regression per bug class, and three failure paths negative-tested.


---

## The Card Audit: No Section Vanishes Silently (Sep 1, 2026)

Reported as *"having the same issue with Brian Thomas — can you audit my player
cards"*. Thomas was already fixed on the branch; **he was still broken because
the fix had not reached `main`, and rosterxray.com serves `main`.** The audit is
what the request actually earned.

**CONTEXT ONLY — 51 grades byte-identical.** Guarded in
`scripts/test-player-card.mjs`.

### The measurement

Across **287 draftable cards**, counting sections that were absent AND said
nothing about it:

```
deployment      182 silent      efficiency        76
man vs zone     177             opportunity       51   <- the core block
route workload  101             week outcomes     18
red zone         78             turnover           8
game log          0             availability       0   <- already fixed
```

Two sections had been fixed one at a time. **Seven more had the same defect**,
and Opportunity — the block the whole card is built around — was silent on 51
players.

### ⚠️ ONE LINE PER GROUP, NOT ONE PANEL PER SECTION

The obvious fix is the wrong one. A "no data" panel per gated section puts a
dozen empty blocks on a rookie card, which is noise rather than information.
**The absence has to be visible; it does not have to be loud.**

`card.omitted` collects `{group, label, why}` and `OmittedNote` renders one
muted line per group:

> *Not shown: Red zone (needs 5+ red-zone opportunities) · Man vs zone (needs
> 15+ targets against each coverage in 2025). Population gates, not missing
> data.*

### Two false explanations the first pass shipped

Both are worse than saying nothing, and both were caught by reading real output
rather than the source.

1. **`card.reason` is assigned FURTHER DOWN than the omissions block**, so
   reading the flag there always saw `undefined` and a rookie card listed seven
   gates directly beneath its own "no 2025 NFL data" line. The block now tests
   the same CONDITION the branch uses rather than the flag it sets.
2. **A SECTION THAT DOES NOT APPLY IS NOT A GATE HE FAILED.**
   `CARD_METRICS.QB` is empty **by design** — a quarterback's volume lives in
   Volume profile — so telling a Burrow reader that Opportunity "needs 8+
   games" is a false explanation. QBs now read *"receiving tracking does not
   apply to him"* and skip the sections that are structurally absent.

**Result: 0 silent absences and 0 false explanations across all 287 cards.**

### The rule

**Any population gate that keeps a median honest will exclude somebody, and a
reader cannot tell an exclusion from a bug.** Name the section, name its gate,
and distinguish *did not qualify* from *does not apply*. Three failure paths
negative-tested.

---

## The Rottweiler — added Sep 1, 2026

Fifteenth tournament in `TOURNAMENTS`, key `rottweiler`. Read off the in-app rules.
$25 · 4,500 entries · $100k prizes · 11.1% rake · 18 rounds · 12-man drafts ·
half-PPR, 4pt passing TD · QB1/RB2/WR3/TE1/FLEX1/BENCH10 · **max 4 entries** ·
closes 9/9/26.

| Round | Weeks | Groups | Advance | Field |
|---|---|---|---|---|
| R1 Qualifier | W1-14 | 375 × 12 | 2 (16.7%) | 4,500 → 750 |
| R2 Quarterfinal | W15 | 150 × 5 | **1 (20.0%)** | 750 → 150 |
| R3 Semifinal | W16 | 30 × 5 | **1 (20.0%)** | 150 → 30 |
| R4 Championship | W17 | one 30-seat group, all paid | 1 | 30 → 1 |

P(reach the final) = **0.667%, one in 150.** Every figure reconciles against the
rules text; the ladder was still recomputed from the group counts rather than
trusted, per the Pit Bull / Frenchie / shared-template typos already recorded.

### THE FIRST FORMAT WHOSE TWO WEEKLY GATES ARE EXACTLY EQUAL

**W15 is 1-of-5 and W16 is 1-of-5.** Every other config on this board is
asymmetric, and every existing scoring branch is built around the question
"which week is the kill shot." **Here the honest answer is "neither, and that is
the point."**

That single fact drives the whole config:

- `weights: [1.5, 1.5, 2]` — **the first symmetric weekly pair here.** Two 20%
  gates sit on the same plateau the Schnauzer (20%) and Pit Bull (20% W16)
  already occupy at 1.25-1.5.
- **The scoring branch carries NO W15-only trap warning**, unlike every
  W16-inverted branch (Frenchie, Field General, Husky). Those warn that a
  W15 ceiling buys a gate you were already likely to clear. **Not true here** —
  a W15 ceiling buys exactly half of what you need. The branch instead flags
  *covering only one of the two*, whichever one it is.
- Combined weekly survival is **4.0%**.

### W17 earns a full 2 because the final is small AND reachable

The **30-seat final is the smallest on the board** (Husky 117, Field General
118, Frenchie 13 131). **1st alone is 25% of the pool** — second only to the
Frenchie Sprint's 50% — and **the top six take 68.4%.** Arriving is 1-in-150,
more reachable than Pit Bull, Field General, both Puppies and BBM.

**Reachable money is worth more in expectation than unreachable money**, which
is exactly why BBM VII holds its W17 at 1.5 and this one does not.

`advanceWeight: 1.5` — the R1 qualifier is the standard 2-of-12 that Puppy 3,
Puppy 4, Pit Bull, Schnauzer and Field General all carry at 1.5.

### ⚠️ 4,500 IS THE FIRST CONFIG UNDER THE FIELD SIZE OVERLAY'S 5,000 LINE

Section 6 says that in a **small expert field (under 5k)** individual upside
beats correlation, floor matters slightly more, and **best player available beats
stack fit.** This is the only format here in that bucket — everything else is
mid-field (10k-100k) or massive (100k+).

**The engine is stack-centric by design**, so a Rottweiler grade rewards
correlation slightly more than the overlay thinks it should. That is recorded
rather than corrected: re-weighting the stack engine per field size would move
every grade in every format and is a separate calibration, not a config
addition. It is deliberately **NOT** in the `bbm7 || puppy || puppy4`
uniqueness-leverage branch — at this size the overlay points the opposite way.

**Max 4 entries** is the second-lowest portfolio here (Boxer 3), which argues
against spray-and-pray construction for the same reason the Husky and Pit Bull
do at 10.

### Updated ladder, ordered by weekly gate severity

```
                weights          gates W15/W16   P(final)   advanceWeight   field
BBM VII      [2,    2,    1.5]     7.1 / 8.3      0.099%       1.75      massive
Puppy 4      [2,    2,    1.75]   10.0 / 10.0     0.167%       1.5       massive
Puppy 3      [2,    1.5,  2]      10.0 / 20.0     0.333%       1.5       massive
Field Genl   [1.5,  2,    1.75]   16.7 / 8.3      0.347%       1.5       mid
Pit Bull 2   [1.5,  1.25, 2]      16.7 / 20.0     0.556%       1.5       mid
Rottweiler   [1.5,  1.5,  2]      20.0 / 20.0     0.667%       1.5       SMALL
Husky        [1.25, 2,    2]      25.0 / 16.7     1.042%       1.25      mid
Schnauzer    [1.25, 1,    2]      20.0 / 25.0       —          1.5       mid
Frenchie 13  [1.25, 2,    2]      33.3 / 16.7       —          1.25      mid
Boxer        [1,    0.75, 2.5]    40.0 / 50.0     6.67%        0.75      mid
```

**Puppy 4 and the Rottweiler are the only two symmetric formats**, at very
different depths (10.0/10.0 against 20.0/20.0) — and Puppy 4 is massive-field
while this is the only small-field config on the board.

### Calibration — nothing else moved

```
14 pre-existing tournaments x 3 fixtures + 9 redraft = 51 grades BYTE-IDENTICAL
The Rottweiler (new):  ref1 A 9.29 · ref2 C+ 1.43 · ref3 B+ 5.39
All five branch paths verified firing — four on real fixtures, the
  survive-the-gates-but-dark-in-W17 path against a synthetic stack grade.
```

---

## A Negated Affiliation Is Still an Affiliation (fixed Sep 2, 2026)

**Reported by the user from a production nutshell, not by a test.** The roster card
rendered `Deebo Samuel — WR SF`, and the AI summary on the same screen said:

> *"Deebo Samuel's situation note places them on different teams — Samuel is now
> WAS WR2, not an SF piece — so the SF stack is effectively Purdy and Stribling"*

**It then RE-PLANNED THE ROSTER around the invented team**, recommending the user
replace "the now-mismatched SF stack framing". Every other layer had him right:
all three ADP tables key him `SF`, the roster strip printed SF, and the stack
engine grouped him with SF correctly. There is no `SITUATIONS` entry for him at
all — the "situation note" the nutshell cites does not exist.

### The source was the entry written to prevent exactly this

```
"HE IS A 49ER. Deebo Samuel plays for SAN FRANCISCO — signed 1yr/up to $7M on
 Aug 1 2026 ... Do not describe him as a Commander, a Washington player, or a
 free agent; any such reference is wrong for 2026."
```

The model lifted **"Washington"** out of the prohibition and dropped the
prohibition. **Third instance of this class** — Stribling (an out player named
inside a present-tense depth chart), Diggs (a quoted "unsigned and effectively
retired"), now this.

**The generalisation the first two did not reach: it is not about QUOTES.** The
Deebo entry was written affirmatively and led with the truth in capitals. It
still failed, because it enumerated the false teams in order to rule them out.
**A negated affiliation is still an affiliation; naming the wrong team is what
makes it available, and the negation is the part that gets dropped.**

Say only what is true. Never list what is false in order to forbid it.

### Guard 12 gained rule 3

`test-no-quoted-negations.mjs` now fails any entry naming a team the subject does
NOT play for inside a negation, resolved against that player's `ADP_DATA.team`.

Three scoping decisions, each the answer to a false positive:

1. **NICKNAMES AND CITIES ONLY, never abbreviations.** `NO`, `LV` and `WAS`
   collide with "no", "LV" mid-line and "was". An abbreviation match fires on
   half the corpus, and a noisy guard is one nobody reads — which is precisely
   how eleven duplicate keys accumulated behind eleven build warnings.
2. **THE TEAM WORD MUST BE IN THE SAME CLAUSE AS THE NEGATION.** A window-based
   first draft failed a CORRECT entry: David Njoku's reads *"THIS IS NOT THE
   DEPTH CHART, IT IS THE PLAY CALLER. Mike McDaniel's Miami offenses ranked
   THIRD..."* — an ordinary analytical negation, followed one **sentence** later
   by a true affirmative mention of another team. `is not the` is no longer a
   trigger, and no sentence break may sit between the negation and the team.
3. **His OWN team is always legal to name in a negation.** "He is not a
   full-time San Francisco slot receiver" is analysis, not a false affiliation.

Analytical prohibitions that assert no false fact still pass — three exist
(`jj mccarthy`, `jaylin noel`, `david njoku`: "do not treat him as a stackable
QB"). The rule targets false FACTS, not the imperative mood.

`SITUATIONS.reason` was added to the swept set while in there; guard 12 had only
ever read `trendNote`, so a `reason`-shaped entry was unchecked.

### Verified

```
234 prose entries pass · 54 grades BYTE-IDENTICAL (15 tournaments x 3 fixtures + 9 redraft)
27 guards pass · dual-file identical
Three paths tested: a restored prohibition and a bare negated affiliation both
  exit non-zero; the own-team negation still passes.
```

---

## A One-Character Misread, and a Guard That Could Not Fail (fixed Sep 2, 2026)

**Reported from a screenshot upload: `UNMATCHED · Greg Dulchich`, 17/18.** The
roster card said `Greg Dulcich` and all three ADP tables key him correctly. The
extractor read one inserted `h` off the image, and **no step in `findPlayer`
tolerated it** — the surname index is keyed on the exact last name, so steps 3,
4 and 4b all looked up a bucket that does not exist.

**This is fixable where the Cam Skattebo case was not.** That was a row the
extractor never read at all. Here the query arrives and is almost right.

### findPlayer step 5 — and the gates ARE the design

The standing rule is that a wrong match grades the wrong player and is
**strictly worse than a miss**, so every gate was set from a census of the
actual corpus rather than by feel:

```
union of all three tables      338 keys
edit-distance-1 surname pairs   20   (two DIFFERENT players)
...sharing a compatible first    0
transposition-only pairs          1   (hurts/hurst, both 5 chars)
```

**The short names are the entire trap.** `hall/hill`, `bell/dell`, `rice/price`,
`maye/mayer`, `bech/beck`, `lane/lance` are all real, distinct players and
several flip position. **`SURNAME_REPAIR_MIN_LEN = 6` removes every one of
them.** What survives (`walker/waller`, `collins/hollins`, `johnston/johnson`)
is then killed by the first-name gate, because zero of the 20 pairs share a
prefix-compatible first name.

```
two words       a lone misspelled surname has no first name to confirm against
length >= 6     on BOTH sides; see the census
one edit        insert / delete / substitute / adjacent swap
prefix-compatible first name — the SAME rule step 4b uses, never an initial
exactly one candidate — ambiguity returns null rather than guessing
```

**Transposition was included because it was MEASURED, not assumed.** Exactly one
pair in the corpus has transposed surnames — Jalen Hurts against Ted Hurst — and
at 5 characters it sits below the length floor anyway. **Ted Hurst was on the
user's roster in the same session**, which is a fair illustration of why the
floor is not decoration.

### ⚠️⚠️ `test-findplayer.mjs` COULD NOT FAIL, AND ITS OWN HEADER SAID IT COULD

It printed `FAILURES: n` and **exited 0**. It runs second in `npm test`, so the
chain moved straight past it. It was the **only** guard in `scripts/` with no
exit call at all — every other one carries `process.exit(fail ? 1 : 0)`.

CLAUDE.md has claimed since Jul 26 2026 that it "exits non-zero on failure."
That was false the whole time.

**It was found by negative-testing, not by reading.** Four separate sabotages of
step 5 all reported "caught"— then all four reported MISS once the pass/fail
logic was examined, which is impossible for four independent breakages and
pointed at the guard rather than the code.

### The other half: a gate with no case is not tested

With the exit fixed, three of four sabotages failed correctly and **the
first-name gate did not.** None of the existing assertions could distinguish
prefix-matching from initial-matching, so that gate — the one the whole
`mike washington` / `malik washington` precedent exists to protect — was
decorative.

Fixed by carrying that precedent into step 5 directly. The table holds Mike
(RB LV), Malik (WR MIA) and Darnell (TE PIT) Washington, so a one-edit surname
query has three candidates and only the first name separates them. Under prefix
matching each resolves to its own player; under a shared initial `mike` and
`malik` collide and all three become misses.

**The rule, now recorded for the fifth time in a different costume: assert the
BEHAVIOUR, and confirm the negative test actually changes something.** Adding
assertions to a guard file is not finished until you have sabotaged the code and
watched the run exit non-zero.

### Verified

```
54 grades BYTE-IDENTICAL — 15 tournaments x 3 fixtures + 9 redraft
27 guards pass · dual-file identical · cross-table sweep 0 unresolved · 0 position flips
Four failure paths negative-tested, ALL exit non-zero: step 5 disabled, the
  length floor lowered to 4, the first-name gate loosened to an initial, and
  ambiguity guessing instead of declining.
```
