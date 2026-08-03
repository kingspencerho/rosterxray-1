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

## Key 2026 Moves (re-validate if 30+ days old — offense current as of June 25, 2026)

**Defensive movement above was re-validated Aug 3 2026. The OFFENSIVE items in
this list were not** — they still carry the June 25 stamp and are past the
30-45 day freshness rule. Treat them as needing a check before use.

- **AJ Brown:** PHI to NE
- **Myles Garrett:** CLE to LAR (Jared Verse + picks to CLE)
- **Malik Nabers:** ~~knee cleanup, Week 1 uncertain~~ **SUPERSEDED** — avoided
  the PUP list, full practice reps. Verdict updated to TARGET (Aug 2026).
- **Mahomes:** targeting Week 1 return from knee
- **Rashee Rice:** 30-day jail, misses OTAs
- **Luther Burden:** trending toward CHI WR1 starter role
- **Eli Stowers (PHI TE):** Goedert bridge + AJ Brown gone + Hurts play-action scheme = TE1 path
- **Jahan Dotson (ATL):** competing with Zachariah Branch for WR2 behind London. Role not confirmed.
- **Jaylin Noel (HOU):** leading WR3 competition over Tank Dell (knee) and Hutchinson per June minicamp. HOU is a 3-week schedule avoid (JAX W15, @PHI W16, @GB W17). Verdict: FADE.
- **Blake Corum (LAR):** complementary runner behind Kyren Williams (three-down lead back). Frequently functions as a bring-back piece in roster context.
- **Kyren Williams (LAR):** confirmed three-down lead back.
- **Emari Demercado (KC):** 1yr deal, passing-down specialist behind Kenneth Walker. Mahomes checkdown volume makes target share real. KC W15 vs NE (soft), W17 vs LAC (soft). Verdict: DART.
- **Kenny Gainwell / Kenneth Gainwell (TB, RB):** 2yr/$14M deal, committee back alongside Bucky Irving.
