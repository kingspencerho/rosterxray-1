# Defense, Coaching & News Reference — 2026 Season

---

## 2025 Defense EPA/Play (SumerSports — apply coaching adjustments over raw numbers)

**Re-validated in full Aug 3 2026.** The previous version of these lists was
stamped Jun 25 2026 and carried five factual errors that survived because the
markdown was never re-checked when `App.jsx` was. Do not treat the two as
independent confirmations of each other — they are one source, kept in sync by
hand. Full per-team detail lives in `App.jsx` (`COACHING_ADJ`,
`OFFSEASON_ADJ_2026`); this file is the summary view.

### Tough (coaching-adjusted)
- SEA: top-3 — No. 1 overall defense 2025, exactly one defensive starter not back
- HOU: top-3 — every key piece back, Burke DC since 2023
- DEN: top-5 — Joseph DC since 2023, secondary fully intact
- PHI: top-5 (Fangio year 3, highest continuity in the league)
- LAR: top-5 — Garrett acquired AND coverage rebuilt (McDuffie, Watson, Curl)
- BAL: top-8 — but HIGH CHURN, Minter is HC and Weaver the new DC
- MIN: top-8 — Flores continuity, but lost Greenard and released Hargrave
- PIT: top-10 — HIGH CHURN, new HC and new DC, three starting DBs on PUP
- NO: top-10 — 9th total defense 2025, 4th vs the pass, Staley year 2
- NE: top-10 — 4th in points allowed 2025, Kuhr continuity
- GB: top-10 **when Parsons is active** — he is on PUP until roughly Week 6

### Easy (coaching-adjusted)
- ARI: bottom-5 — franchise-record 488 points allowed, nothing added
- MIA: bottom-5 — HC calls plays, DC does not, lost Minkah and two other DBs
- DAL: bottom-8 — rebuild in progress, ~7 new starters
- IND: bottom-8 — 5,000+ defensive snaps to replace in the back seven
- CHI: degraded — 18 new defensive players, gutted secondary, bottom-3 pass rush
- NYG: **run funnel, not uniformly soft** — elite edge over a bottom DT room
- BUF: HIGH CHURN — new HC, new DC, 4-3 to 3-4, rebuilt secondary
- WAS: improving off a last-place 2025, no longer a static bottom-5
- TEN: improving on heavy spend, no longer a static bottom-5

### Corrections made Aug 3 2026 (each was wrong in the prior version)
- **CIN** — "Lou Anarumo back" was false. **Al Golden** is the DC, year 2.
  Anarumo has been the **Colts** DC since 2025. CIN was listed nowhere useful;
  they lost Hendrickson to BAL but rebuilt the interior with Dexter Lawrence.
- **JAX** — "new DC" was false and the top-5 listing is **unverified**.
  Campanile is in year 2, so JAX is a continuity team. No 2026 source was found
  projecting them top-5. Removed from the Tough list pending evidence.
- **CAR** — "Lost Brian Burns" was two years stale; he has been a Giant since
  2024. Carolina is B/R's **No. 1 most-improved** defense for 2026.
- **CHI** — "lost Allen/Greenard/Hargrave" was wrong on all three. Dennis Allen
  is the **sitting DC**; Greenard and Hargrave were **Vikings** who went to PHI
  and GB. The conclusion (degraded) survived; the reasoning did not.
- **DAL** — "Parsons + Diggs gone" described the 2025 team. The 2026 story is a
  rebuild that ADDED Gary, Thompson and Caleb Downs under a new DC.
- **KC** — previously implied intact. Four DBs left: McDuffie, Watson, Cook,
  Joshua Williams. Scheme continuity is high, secondary continuity is not.

### Raw 2025 EPA Baseline (positive = favorable for opposing offense)
- DAL: +0.16
- WAS/NYJ: +0.13
- CIN: +0.12
- MIA/ARI/TEN: +0.08
- SF: +0.06
- CAR: +0.05
- HOU: -0.13
- SEA: -0.12
- JAX/MIN: -0.11
- CLE: -0.10

**Note:** FPA and EPA sometimes conflict. Use both signals together. A team can have a tough EPA grade but soft FPA because of scheme tendencies (BAL allows high WR FPA despite top-8 EPA — they funnel to WRs). FPA captures scheme-specific historical tendencies. EPA captures overall defensive efficiency. Neither alone is sufficient.

---

## 2026 HC/OC Reference

| Team | HC | OC |
|---|---|---|
| BAL | Jesse Minter | Declan Doyle |
| NYG | John Harbaugh | Matt Nagy |
| BUF | Joe Brady | Pete Carmichael |
| DAL | Brian Schottenheimer | — |
| LV | Klint Kubiak | — |
| NO | Kellen Moore | Doug Nussmeier |
| PIT | Mike McCarthy | — |
| CLE | Todd Monken | Travis Switzer |
| ATL | Kevin Stefanski | Tommy Rees |
| ARI | Mike LaFleur | Nathaniel Hackett |
| LAC | Mike McDaniel | — |
| WAS | Dan Quinn | David Blough |
| DEN | — | Davis Webb |
| CHI | — | Press Taylor |
| DET | — | Drew Petzing |
| PHI | — | Sean Mannion (DC: Vic Fangio) |
| LAR | — | Nate Scheelhaase |
| SF | — | Klay Kubiak |
| GB | — | Adam Stenavich |
| MIN | — | Wes Phillips |
| CIN | Zac Taylor (retains playcalling) | Dan Pitcher |
| MIA | Jeff Hafley | Bobby Slowik |

**Corrected Aug 3 2026 — LAC:** this table listed **Mike McDaniel as HC**. He is
the **offensive play-caller**; **Jim Harbaugh** has been the head coach since
2024. The HC and play-caller columns were being conflated, which is also how
`PLAYCALLER_PROFILES` in `App.jsx` stores him (as `pc`, not HC).

**Flag any team with a new HC or OC in 2026 when citing 2025 pace/PROE — scheme change can shift both independent of personnel.**

---

## 2026 Defensive Coordinators — who actually calls it

Added Aug 3 2026. **Four of the seven factual errors found in the grading data
were wrong DC attributions**, so the DC is now recorded explicitly rather than
inferred from a note. Where the HC calls the defense, that is stated — it
matters more than the DC title.

| Team | DC | Note |
|---|---|---|
| CIN | Al Golden | Year 2. **NOT Anarumo** — he is Indianapolis's DC |
| IND | Lou Anarumo | Year 2 |
| BAL | Anthony Weaver | New (from MIA). Minter is the **HC** |
| PIT | Patrick Graham | New (from LV). McCarthy replaced Tomlin |
| CLE | Mike Rutenberg | New, first-time DC, keeping the scheme |
| GB | Jonathan Gannon | New (ex-ARI HC). 3-4 switch |
| CHI | Dennis Allen | **Returning**, not lost |
| DAL | Christian Parker | New. 4th DC in 4 years, 3-4 switch |
| WAS | Daronte Jones | New (Flores lineage) |
| NYJ | Brian Duker | New title, but **HC Aaron Glenn calls the defense** |
| TEN | Gus Bradley | New. **HC Saleh runs the defense himself** |
| JAX | Anthony Campanile | **Year 2** — continuity, not a new hire |
| CAR | Ejiro Evero | Year 3+, base 3-4 |
| LAR | Chris Shula | Year 3. The "Chris O'Leary to LAR" report was wrong |
| LAC | Chris O'Leary | New, first-time NFL DC, ex-LAC safeties coach |
| NYG | Dennard Wilson | New (from the TEN DC job) |
| KC | Steve Spagnuolo | Year 8 |
| MIA | Sean Duggan | New, and **explicitly does not call plays — HC Hafley does** |
| BUF | Jim Leonhard | New. 4-3 to 3-4 |
| SF | Raheem Morris | New. **5th DC in 5 years**, five-down front |
| LV | Rob Leonard | New, first-time DC, internal promotion |
| DEN | Vance Joseph | Since 2023 |
| PHI | Vic Fangio | Year 3 |
| SEA | Aden Durde | Since 2024 |
| HOU | Matt Burke | Since 2023 |
| MIN | Brian Flores | Since 2023 |
| NO | Brandon Staley | Year 2 |
| DET | Kelvin Sheppard | Year 2 |
| ATL | Jeff Ulbrich | Retained on a new 3-year deal |
| ARI | Nick Rallis | Year 4, only coordinator retained |
| NE | Zak Kuhr | Title new, but took over play-calling mid-2025 |
| TB | Todd Bowles (HC) | Has run the defense since 2019 |

---

## Defensive availability worth tracking (as of Aug 3 2026)

From the SI PUP/NFI/IR tracker (upd. Jul 29 2026) plus camp reporting. Listed
because a defense missing its best player is a matchup signal the FPA tables
cannot see. Re-check all of these before any draft — camp status moves weekly.

- **Micah Parsons (GB):** PUP. Torn ACL Dec 14, surgery Dec 30, reporting points
  to a **~Week 6 return**. Should be back for W15-17; GB is materially softer early.
- **Brian Branch (DET):** Achilles tear Dec 4. Campbell has said a return before
  **December** is unlikely. **This runs straight into the W15-17 window** — the
  single most consequential availability question for playoff-window grading.
- **Kerby Joseph (DET):** All-Pro safety, also opened camp on PUP.
- **Jonathan Greenard (PHI):** PUP, pectoral. Fangio says "a good bit of camp"
  and Week 1 "remains to be seen"; the GM has downplayed it. **Genuine internal
  disagreement — do not treat either statement as settled.**
- **Joey Porter Jr., Jalen Ramsey, Donte Kent (PIT):** all three DBs on PUP.
- **Mansoor Delane (KC):** No. 6 overall pick, non-contact jersey all camp.
- **E.J. Speed (HOU):** torn quad in May, expected to miss a substantial chunk.
- **CJ Allen (IND):** rookie, projected starting MIKE, on PUP.
- **Maxx Crosby (LV):** **cleared** — full first-team reps after January meniscus
  surgery. Listed because it is a positive that cuts against the 2025 tape.

**Unresolved / unverified — do not state as fact:**
- **Vita Vea (TB):** trade request reported, status unknown.
- **Harrison Smith (MIN):** possible retirement, unresolved.
- **Daron Payne (WAS):** the old "age concern" note could not be verified in any
  2026 reporting. Dropped from `App.jsx` rather than carried forward unsourced.

---

## Key 2026 Offensive Moves — re-validated Aug 3 2026

Both halves of this file are now current as of Aug 3 2026. Re-validated against
training-camp reporting from late July / early August. **Full per-player detail
lives in `RECENT_NEWS` and `SITUATIONS` in `App.jsx`** — those are what the
grader actually reads; this is the summary view. Update both or neither.

### Verified unchanged
- **AJ Brown:** PHI to NE confirmed (2028 1st + 2027 5th). Healthy, WR1 for Maye.
- **Myles Garrett:** CLE to LAR (Jared Verse + picks to CLE)
- **Kenneth Walker III (KC):** confirmed — 3yr/$43.05M, unambiguous RB1, SB LX MVP
- **Kenny/Kenneth Gainwell (TB):** 2yr/$14M confirmed. Bowles states it plainly —
  Irving is the 1A starter, Gainwell the 1B, used mainly as a RECEIVER in camp
- **Blake Corum (LAR):** still complementary, but the most improved back in camp
  ("a lot leaner, a lot more explosive" — Kyren). McVay praised him Aug 2

### Corrected — these were wrong or incomplete
- **Eli Stowers (PHI TE):** ~~TE1 path~~ **NOW WRONG — he is TE3.** Behind Goedert
  AND Johnny Mundt, who takes first-team 12-personnel reps because new OC Mannion
  pairs a blocking TE with a receiving TE. Stowers is not yet an NFL-caliber
  blocker and lost spring reps to a leg injury. The premise was false: **Goedert
  did not leave, A.J. Brown did.** 2027 thesis, not 2026.
- **Kyren Williams (LAR):** ~~confirmed three-down lead back~~ **overstated.**
  Starter yes; he took only **54%** of LAR RB carries in 2025 and McVay's framing
  is explicitly committee. Pending 2027 FA with no extension.
- **Rashee Rice (KC):** ~~jail, misses OTAs~~ — out Jun 16 and in camp, but the
  legal item is no longer the main one. **May 2026 right-knee debridement**; running
  routes well short of full speed, leaving practice early daily. No 2026 suspension
  has been announced — treat further discipline as an unresolved RISK, not a ruling.
- **Jaylin Noel (HOU):** role resolved **upward** — SI's camp depth chart lists him
  a **STARTER** with Collins and Higgins. Outlets conflict; not settled. **The FADE
  still stands and is purely schedule** (JAX W15, @PHI W16, @GB W17). Better player,
  same dead window.
- **Mahomes (KC):** ~~targeting Week 1~~ — understated. **Fully cleared** for camp,
  practicing on consecutive days, no setbacks. Reid: doing "everything he normally does."
- **Malik Nabers (NYG):** ~~knee cleanup, Week 1 uncertain~~ — **kept OFF PUP**,
  which would have cost him four games. Verdict updated to TARGET.
- **Jahan Dotson (ATL):** trending resolved — looked "clearly like the WR2" on camp
  Day 4 over Branch and Zaccheaus. Not formally named. Compounded by an unresolved
  ATL QB job.
- **Luther Burden (CHI):** D.J. Moore was **traded to BUF**, so the vacancy is real,
  but "WR1" remains an analyst projection, not a depth chart. Moore's targets split
  three ways with Odunze and TE Loveland.
- **Emari Demercado (KC):** hierarchy behind Walker confirmed. **The "1yr deal" term
  could NOT be verified** — do not state it.

---

## Fantasy-playoff (W15-17) availability — the only December-risk cases found

A dedicated search for return timelines landing inside Weeks 15-17 produced
exactly one confirmed zero and two structural maybes. **No team has published a
December return date for any offensive player.**

- **Ricky Pearsall (SF): OUT FOR 2026.** Season-ending PCL surgery, placed on IR
  Aug 1. The only confirmed W15-17 zero. Directly caused the Deebo re-signing.
- **Zach Charbonnet (SEA):** PUP. ACL in the January playoff game, surgery Feb.
  Macdonald said a Week 1 return looked unlikely; midseason is the reported
  possibility with **no ETA**. Note the framing cuts BOTH ways for best ball —
  Seattle is being deliberately patient "in the hopes that they get his best when
  it matters most," which is the W15-17 window. Live variable, not a write-off.
- **George Kittle (SF):** PUP, Achilles from the Jan 11 playoff win. Lynch calls
  rehab "tremendous" and has not ruled out Week 1. Standard 8-12 month rehab puts
  the outer edge around September. Re-check.

Also inside the window from the defensive sweep: **Brian Branch (DET)**, Achilles,
return unlikely before December.

---

## Contract hold-ins — availability risk with no injury

The defining offseason story. Both reported to camp and are NOT practicing:
- **Bijan Robinson (ATL)** — led the NFL in 2025 scrimmage yards; seeking to be the
  highest-paid RB. Stefanski expects an amicable resolution.
- **Jahmyr Gibbs (DET)** — same posture. Separately dealing with a minor back issue
  from the conditioning test.
- Benchmarks already set: **James Cook 4yr/$46M**, **Saquon Barkley 2yr/$41M**.

---

## Unresolved as of Aug 3 2026 — do NOT state a winner

- **MIN QB:** Kyler Murray (released by ARI, signed MIN) vs J.J. McCarthy. Reporting
  points in **opposite directions on the same days**. O'Connell has named no starter.
- **CLE QB:** Deshaun Watson vs Shedeur Sanders, alternating first-team reps. Monken
  says no decision needed until the opener.
- **ATL QB:** Tua (back flare-up) vs Penix (ACL, not cleared for 11-on-11, ~4 weeks
  from full clearance). Affects every ATL pass-catcher's stack value.
- **LV QB:** Cousins named starter with No. 1 overall pick Mendoza behind him —
  a structurally unstable "resolved."
- **Chris Brazzell II (CAR):** SI says LCL tear, up to 8 weeks; CBS says season-ending
  surgery. **Genuine outlet conflict, unresolved.** Verify before use.
- **Xavier Worthy (KC):** left practice Aug 1 with a shoulder injury, possibly the
  same one repaired in January. "Believed to be OK" is not a medical finding.
