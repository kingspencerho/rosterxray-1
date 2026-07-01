# RosterXRay — Claude Code Handoff Document
*Generated July 1, 2026 — paste at start of every Claude Code session*

---

## 1. Project Identity

**App:** RosterXRay (rosterxray.com)
**Owner:** Spencer Ho — solo founder and developer
**GitHub:** kingspencerho / rosterxray-1
**Deploy:** Vercel (free tier) — auto-deploys on push to main
**Domain:** Porkbun

**What it does:** React/JSX web app. User uploads a fantasy football draft screenshot. App OCRs it via Claude, matches players to internal ADP/situation data, and generates an analyst-quality Best Ball roster grade with stack analysis, bring-back mapping, and playoff schedule matrix.

---

## 2. Tech Stack

- **Frontend:** React/JSX single-page app (`App.jsx.jsx` — yes, double extension, that's correct and intentional)
- **Backend:** Serverless function at `api/analyze.js` — handles all Claude API calls
- **AI model:** `claude-sonnet-4-6` — do not change this string
- **Build:** Vite
- **Deploy:** GitHub drag-and-drop upload (web editor is broken for Spencer's account — always generate a downloadable file, never edit in browser)

---

## 3. Hard Rules — Never Violate

- **DO NOT TOUCH:** `/api/analyze` endpoint, `claude-sonnet-4-6` model string, `FileReader`, `fileToBase64`, `handleFiles`, `extractFromImages`
- **Brace delta must equal 0** after every edit. Always verify:
  ```bash
  python3 -c "content=open('App.jsx').read(); print(f'Brace delta: {content.count(chr(123)) - content.count(chr(125))}')"
  ```
- **One str_replace at a time.** Minimal targeted edits. No bulk rewrites.
- **Read the file before editing.** Never assume current state from memory — always grep or view first.
- **All AI prompts live server-side** in `api/analyze.js`. Client sends only `task: "extract"` or `task: "grade"` flags. Never move prompts to client.
- **max_tokens** for grading call = 1800. Do not lower this.
- **Deploy method:** Rename file to exact target filename including extension, then upload via GitHub "Add file → Upload files". Never use the web editor.

---

## 4. App Data Architecture

All player name lookups are **lowercase string keys**. Every player must exist in ALL relevant data blocks or the app won't recognize them from OCR output.

### Data Blocks (in order of appearance in App.jsx)

| Block | Approx Line | Purpose |
|---|---|---|
| `ADP_DATA` | ~6 | Main Underdog ADP table — primary lookup used by grading logic |
| `ADP_SUPERFLEX` | ~277 | Superflex format ADP — used when format = superflex |
| `SITUATIONS` | ~735 | Curated text blurbs surfaced in app output |
| `PLAYER_VERDICTS` | ~790 | TARGET / FADE / DART / HOLD + trendNote + flags |
| `ADP_4FOR4` | ~1000+ | 4for4 superflex ADP proxy — secondary reference |

### Adding a New Player — All 5 Steps Required
```
ADP_DATA:       "player name": { adp: X.X, pos: "WR", team: "TB" },
ADP_SUPERFLEX:  "player name": { adp: X.X, pos: "WR", team: "TB" },
ADP_4FOR4:      "player name": { adp: X.X, pos: "WR", team: "TB" },
SITUATIONS:     "player name": "Situation description text.",
PLAYER_VERDICTS:"player name": { verdict: "TARGET", trend: "rising", trendNote: "...", situationFlags: [], riskFlags: [] },
```

### Adding a Name Alias
Duplicate the entry with the alternate name pointing to identical data. Example: both `"kenneth gainwell"` and `"kenny gainwell"` exist as separate keys with identical values.

### ADP Delta Rule — Never Invert
- **Delta = Pick number minus ADP**
- **Positive = value** (drafted after ADP)
- **Negative = reach** (drafted before ADP)

### 160+ Pick Flattening Protocol
Picks at 160+ ADP: no reach penalties. Evaluate on stack fit and bring-back utility only.

---

## 5. Tournament Structures

| Tournament | Entries | W15 Weight | W16 Weight | W17 Weight | Key Note |
|---|---|---|---|---|---|
| BBM VII | 672k | 2 | 1 | 1 | W15 = 1-of-14. Build for W15 ceiling explosion. |
| The Puppy | 225k | 2 | 2 | 1.5 | W16 = 1-of-5. Both W15 and W16 are steep cuts. |
| The Poodle | 55,800 | 1.5 | 2 | 1.5 | W16 = kill shot. W15 easier cut than Puppy. |
| General | — | 1 | 1 | 1 | No entry count. No specific format rules. |

Always confirm tournament before grading. Never assume.

---

## 6. Grading Framework — Critical Rules

### Bring-Back Rule (most commonly missed — always check first)
A bring-back = any player on the **opposing side** of a game one of the roster's QBs is playing in.

**Mandatory workflow before any naked RB check:**
1. Map every QB's W15, W16, W17 opponent
2. Check every player on the roster against those opponents
3. Any player on the opposing side = bring-back for that week
4. Also check partial stacks — players on the opposing side of a partial stack's game earn bring-back credit against that stack

**Example:** Dak (DAL) plays @LAR in W15. Any LAR player on the roster = W15 bring-back for Dak. Not a naked RB. Not an orphan.

**Example:** TB partial stack (McMillan + Hurst) plays vs LAR in W17. Any LAR player on the roster = W17 bring-back for the TB partial stack.

Bring-back mapping resolves naked RB flags. Always run it first.

### Naked RB Insulation Protocol
Only applies to RBs with zero correlation to any QB game or partial stack game after bring-back mapping.
- **Gate 1:** 4.5+ HVT per game (red zone targets + green zone carries)
- **Gate 2:** 0.65+ zone/PROE composite score
- Fail both gates = UNINSULATED_NAKED_RB — scored deduction
- **Elite Receiving Back (65+ receptions prior full season):** Clears Gate 1 automatically
- **160+ picks:** Flattening protocol applies — informational flag only, no scored deduction

### Stack Classification
- **Full loop:** QB + confirmed pass catcher(s) on same team
- **Partial stack:** 2+ same-team players without a QB — not penalized, graded on window quality + correlation strength
- **Game lock:** Both sides of the same game covered on the roster — intentional, not penalized
- **Orphan:** Solo player with no stack partner — penalize only if no functional window + no ADP edge + no stack value

### FPA Direction Rule
Never apply a team's defensive FPA to that same team's offensive players. FPA only affects players **facing** that defense.

**Example:** DAL's defense being soft (FPA 33.14) is a green signal for NYG, LAR, JAX offensive players facing DAL — not for DAL offensive players. DAL's offense faces LAR's defense, JAX's defense, and NYG's defense — grade those separately.

### Competitive Balance Elevation
|Spread| ≤ 3 AND total ≥ 49 = both stacks ceiling elevated regardless of raw FPA/EPA.

### Blowout Risk
Spread 7+ AND total below 44 = trailing team ceiling capped. Perimeter WRs capped hardest. Slot/checkdown backs with 40+ rec exempt via Garbage-Time Receiving Exemption.

### Single-Week Ceiling Teams — Flag W17 Gap
| Team | Peak Week | W17 Environment |
|---|---|---|
| BAL | W17 | Peak @CIN |
| LAR | W15 + W17 | Gap at W16 @SEA |
| IND | W15-16 | Wall @CLE |
| GB | W16 | Wall vs HOU |
| MIN | W16 | Soft but low total @NYJ |
| SEA | W16 | Wall @CAR |
| PIT | W15 | Wall @TEN |

### Game Totals
Directional reference only. Never use as hard logic gates.

---

## 7. 2026 Playoff Schedule (W15–W17)

```
DAL: @LAR, JAX, NYG
NYG: CLE, @DET, @DAL
DET: @MIN, NYG, @CHI
LAR: DAL, @SEA, @TB
CIN: @CAR, @IND, BAL
BAL: @PIT, CLE, @CIN
JAX: @HOU, @DAL, WAS
CLE: @NYG, @BAL, IND
CHI: @BUF, GB, DET
BUF: CHI, @DEN, @MIA
PIT: BAL, CAR, @TEN
TB: NO, @ATL, LAR
WAS: ATL, @MIN, @JAX
ATL: @WAS, TB, NO
NO: @TB, ARI, @ATL
MIN: DET, WAS, @NYJ
GB: MIA, @CHI, HOU
IND: @TEN, CIN, @CLE
TEN: IND, @LV, PIT
SEA: @PHI, LAR, @CAR
PHI: SEA, HOU, @SF
SF: @LAC, @KC, PHI
KC: NE, SF, @LAC
LAC: SF, @MIA, KC
MIA: @GB, LAC, BUF
LV: DEN, TEN, @ARI
DEN: @LV, BUF, @NE
NE: @KC, @NYJ, DEN
NYJ: @ARI, NE, MIN
ARI: NYJ, @NO, LV
HOU: JAX, @PHI, @GB
CAR: CIN, @PIT, SEA
```

---

## 8. FPA Reference Tables (Rotowire 2025 — apply OFFSEASON_ADJ_2026 deltas before grading)

### WR FPA (raw 2025)
DAL 33.14 | CHI 30.03 | DET 29.94 | TEN 29.44 | IND 29.42 | BAL 29.11 | WAS 28.85 | PIT 28.74 | ATL 27.95 | NYG 27.89 | LV 27.33 | LAR 27.18 | SF 26.46 | GB 25.64 | TB 25.38 | NYJ 24.96 | JAX 24.95 | ARI 24.58 | MIA 24.49 | NE 24.14 | NO 22.89 | KC 22.34 | CLE 22.21 | LAC 22.07 | CAR 22.01 | BUF 21.58 | SEA 21.38 | PHI 21.29 | HOU 21.26 | CIN 21.19 | DEN 21.06 | MIN 19.22

### RB FPA (raw 2025)
NYJ 26.18 | CIN 26.18 | ARI 25.03 | WAS 23.77 | NYG 23.62 | DAL 23.17 | MIA 22.98 | BUF 22.41 | CAR 21.94 | LV 21.10 | PHI 21.04 | BAL 20.90 | SF 20.70 | CLE 20.68 | TEN 20.34 | TB 19.85 | CHI 19.69 | GB 19.62 | ATL 19.53 | NO 19.13 | LAR 18.18 | IND 18.05 | MIN 17.97 | HOU 17.95 | DET 17.61 | KC 17.38 | LAC 16.99 | PIT 16.93 | NE 16.56 | JAX 16.31 | SEA 16.09 | DEN 15.60

### TE FPA (raw 2025)
CIN 17.45 | ARI 13.79 | PIT 13.49 | WAS 13.36 | MIA 13.04 | TB 12.86 | NYJ 12.44 | IND 12.24 | SF 11.91 | JAX 11.72 | SEA 11.62 | TEN 11.45 | CAR 11.15 | DET 11.08 | NE 10.95 | DEN 10.86 | LAR 10.42 | CHI 10.18 | NO 9.86 | HOU 9.72 | DAL 9.70 | CLE 9.61 | GB 9.35 | NYG 8.94 | KC 8.59 | BAL 8.51 | MIN 8.45 | LAC 8.39 | ATL 8.08 | LV 8.03 | PHI 6.37 | BUF 6.34

### OFFSEASON_ADJ_2026 (add delta to raw FPA — positive = softer matchup, negative = tougher)

| Team (as defense) | WR Δ | RB Δ | TE Δ | Reason |
|---|---|---|---|---|
| DAL | +2.0 | +1.5 | +1.5 | Parsons + Diggs gone, bottom-3 projection |
| NYG | +1.5 | +1.0 | +1.0 | Rebuilding defense, bottom-5 projection |
| WAS | +1.0 | +0.5 | +0.5 | Full rebuild, Payne age concern |
| CAR | +1.5 | +1.0 | +1.0 | Lost Brian Burns, thin secondary |
| CIN | -1.5 | -1.0 | -1.0 | Anarumo back, secondary upgraded |
| BAL | -1.0 | -0.5 | -0.5 | Minter DC, Humphrey healthy |
| LAR | -1.0 | -0.5 | -0.5 | Myles Garrett arrived |
| CLE | -1.5 | -1.0 | -1.0 | Jared Verse arrived from LAR trade |
| KC | -0.5 | -0.5 | -0.5 | Spagnuolo continuity |
| JAX | -1.0 | -0.5 | -0.5 | New DC, cap space on defense |
| GB | -1.5 | -1.0 | -1.0 | Micah Parsons arrived |

*Teams not listed: no significant adjustment from 2025 baseline.*

---

## 9. Game Totals (Yahoo, May 24 2026 — directional only)

**W15:** DAL@LAR 52.5 | CHI@BUF 51.5 | SF@LAC/IND@TEN/CIN@CAR 47.5 | ATL@WAS/DET@MIN 46.5 | BAL@PIT/MIA@GB/NO@TB/NE@KC 45.5 | JAX@HOU 43.5 | NYJ@ARI/DEN@LV 41.5 | CLE@NYG 40.5

**W16:** CIN@IND 52.5 | JAX@DAL 51.5 | NYG@DET 48.5 | LAR@SEA/GB@CHI 47.5 | BUF@DEN/WAS@MIN/SF@KC 46.5 | TB@ATL 45.5 | LAC@MIA/ARI@NO 44.5 | CLE@BAL 43.5 | TEN@LV 42.5 | HOU@PHI/NE@NYJ/CAR@PIT 41.5

**W17:** BAL@CIN 51.5 | NYG@DAL/DET@CHI 49.5 | WAS@JAX/LAR@TB 48.5 | BUF@MIA 47.5 | KC@LAC/PHI@SF 45.5 | NO@ATL 44.5 | IND@CLE 43.5 | DEN@NE/PIT@TEN/LV@ARI/HOU@GB/SEA@CAR/MIN@NYJ 40.5–42.5

---

## 10. Key Players Updated July 1, 2026

### ADP Updates (all blocks updated)
| Player | Old ADP | New ADP |
|---|---|---|
| Ladd McConkey (LAC WR) | 40.5 | 36.9 |
| Tre Harris (LAC WR) | 185.4 | 167.5 |
| Greg Dulcich (MIA TE) | 209.9 | 184.6 |
| Jahan Dotson (ATL WR) | 271.0 | 215.9 |
| Emari Demercado (KC RB) | 298.0 | 215.9 |

### New Players Added (all 5 blocks)
- **Kenny Gainwell / Kenneth Gainwell (TB RB):** Both name variants at ADP 117.6. 2yr/$14M committee back alongside Bucky Irving.
- **Emari Demercado (KC RB):** ADP 215.9. 1yr deal, passing-down specialist behind Walker. Mahomes checkdown volume = real target share. DART verdict.
- **Jahan Dotson (ATL WR):** ADP 215.9. Competing with Zachariah Branch for WR2 behind London. Role not confirmed. DART verdict (contingent).
- **Jaylin Noel (HOU WR):** ADP entries existed, SITUATIONS + VERDICT added. Leading WR3 competition at HOU. Connected with Stroud at June minicamp. HOU = 3-week avoid. FADE verdict.

### Verdicts Updated
- **Blake Corum (LAR RB):** Confirmed complementary runner behind Kyren Williams. 2025: 145 car/746 yds/6 TD/8 catches. Pure rushing role — fails both naked RB gates as a standalone. Functions as bring-back in roster context (see below). HOLD verdict, riskFlags: creeping_committee, naked_rb_risk.
- **Kyren Williams (LAR RB):** Confirmed three-down lead back. SITUATIONS added.
- **Jahan Dotson (ATL WR):** Flipped from FADE → DART. Competing with Branch for WR2, not confirmed.
- **Zachariah Branch (ATL WR):** SITUATIONS updated to reflect Dotson competition.

---

## 11. Roster Grades Issued — July 1, 2026

### Roster A — Poodle — Grade: B+
**QB:** Dak/Dart/Cam Ward
**RB:** Henry/J.Williams/Tracy/Singleton/K.Allen
**WR:** Lamb/Flowers/Tate/Pierce/Concepcion/Flournoy/A.Williams/Fields
**TE:** Fannin/Strange

Key notes: DAL 3-of-3 stack strong. NYG back-loaded W16-17. WAS cluster (A.Williams + K.Allen) = dead capital, no playoff window, both reaches. No LAR bring-back from W15 primary game.

---

### Roster B — Poodle — Grade: A+
**QB:** Dak (Pk 75) / Dart (Pk 99) / Shough (Pk 123)
**RB:** Bijan (Pk 3) / Skattebo (Pk 46) / Corum (Pk 94) / Sampson (Pk 171) / B.Allen (Pk 214)
**WR:** Pickens (Pk 22) / Tyson (Pk 51) / Harrison (Pk 70) / Concepcion (Pk 118) / McMillan (Pk 142) / TeSlaa (Pk 166) / Hurst (Pk 190) / Mooney (Pk 195)
**TE:** McBride (Pk 27) / Strange (Pk 147)

**Verified bring-back map (complete):**

| Player | Team | Bring-Back For | Week | Credit |
|---|---|---|---|---|
| Corum | LAR | Dak's DAL @LAR game | W15 | Full |
| Strange | JAX | Dak's DAL vs JAX game | W16 | Reduced |
| TeSlaa | DET | Dart's NYG @DET game | W16 | Full |
| Mooney/Skattebo | NYG | DAL/NYG game lock | W17 | Full |
| McMillan + Hurst | TB | Shough's NO @TB game | W15 | Full |
| Harrison + McBride | ARI | Shough's NO vs ARI game | W16 | Full |
| Bijan | ATL | Shough's NO @ATL game | W17 | Full |
| Corum | LAR | TB partial stack LAR @TB | W17 | Full |

**Shough's stack = fully built three-week bring-back loop. Fires if Shough wins the NO starting job.**
**DAL/NYG W17 = full game lock. Championship ceiling confirmed.**
**ARI cluster (Harrison + McBride) = bring-backs for Shough W16, not stranded picks in a capped schedule.**

Key remaining risks: Dart must be confirmed NYG starter. Shough must win NO starting job. Sampson Gate 1 fails (UNINSULATED at Pk 171 — soft deduction via flattening). Corum Gate 1 fails as standalone but resolved via bring-back mapping in W15 and W17.

---

## 12. Common Errors to Avoid

1. **Run bring-back mapping before naked RB checks.** An RB on the opposing side of any QB's game is a bring-back — not naked, not an orphan.
2. **Check partial stacks for bring-backs too.** Opposing-side players earn bring-back credit even when the anchor is a partial stack (no QB).
3. **FPA direction.** Never apply a defense's FPA to that same team's offensive players.
4. **ADP delta sign.** Pick minus ADP. Positive = value. Negative = reach.
5. **Competitive balance overrides FPA suppression.** |Spread| ≤ 3 AND total ≥ 49 = both ceilings elevated.
6. **Game totals are not gates.** They inform, they don't determine grades.
7. **General tournament has no entry count.** Do not add one to the UI or config.
8. **Verify brace delta = 0 after every edit.** Non-zero = broken file.

---

## 13. HC/OC Changes 2026 (relevant to scheme continuity flags)

BAL: HC Jesse Minter / OC Declan Doyle | NYG: HC John Harbaugh / OC Matt Nagy | BUF: HC Joe Brady / OC Pete Carmichael | DAL: HC Brian Schottenheimer | LV: HC Klint Kubiak | NO: HC Kellen Moore / OC Doug Nussmeier | PIT: HC Mike McCarthy | CLE: HC Todd Monken / OC Travis Switzer | ATL: HC Kevin Stefanski / OC Tommy Rees | ARI: HC Mike LaFleur / OC Nathaniel Hackett | LAC: HC Mike McDaniel | MIA: HC Jeff Hafley / OC Bobby Slowik

---

## 14. Spencer's Preferences

- Direct and correction-oriented. Expect immediate pushback when wrong — fix without preamble.
- Concise. No filler, no pleasantries, no excessive caveats.
- One targeted edit at a time. Verify before continuing.
- Always generate a downloadable file for GitHub upload — never instruct to use the web editor.
- Flag high-token tasks before executing.
- Social/Reddit copy voice: casual, conversational, no bullet structure, sounds like a real fantasy player not an analyst.

