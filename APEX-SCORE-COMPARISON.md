# Apex Score vs RosterXRay metrics — the Aug 25, 2026 comparison

> ## THE HEADLINE, AND IT IS NOT THE CORRELATION
> **The two systems agree strongly (r = +0.75 on usable_rate, -0.70 on dud_rate), and that
> agreement proves almost nothing** — Apex Score is a two-year weighted computation with 2025
> as its heaviest input, and `player_metrics_2025.json` IS 2025. **They share a source.**
> ⭐ **The informative part is the eight players they disagree about**, and the obvious
> explanation for those — missed games — was tested and **falsified**.

**What this is.** Mat Irby publishes an Apex Score for players he singles out in his write-ups.
49 of those are recoverable as text from `_corpus/legendary-upside/` (the tables are images; the
per-player call-outs are in the prose). 48 joined to `grading/data/player_metrics_2025.json` by
name. One did not: Jacory Croskey-Merritt.

**Provenance: MEASURED.** Every number below is from that join. Commands are in section 5.

---

## 1. The correlations, and why they are close to meaningless on their own

Restricted to the 42 players with 8+ games (six tiny samples dropped):

| Your metric | Pearson r vs Apex Score | Reads as |
|---|---|---|
| `usable_rate` | **+0.749** | strong agreement |
| `dud_rate` | **−0.704** | strong agreement, correct sign |
| `spike_rate` | **+0.651** | solid agreement |
| `wopr` | +0.108 | ~nothing |

⛔ **Do not cite these as validation of either system.** Apex Score's canonical version is the
two-year computation weighted 60/40 toward the most recent season, so the 2026 edition is built
substantially **out of 2025 production**. Correlating it against 2025 production measures
**shared inputs**, not predictive skill. A high number here is what you would expect even if
both systems were useless at forecasting.

⚠️ The one genuinely surprising row is `wopr` at +0.108 — near zero, while `usable_rate` is
+0.749. Apex Score and WOPR are both trying to measure opportunity quality and they are barely
related in this sample. Worth understanding before either is trusted as an opportunity proxy.
**n = 42, so treat as a lead, not a result.**

## 2. It is NOT a position artifact — checked

Pooling positions can manufacture a correlation when each group clusters in a different corner.
It did not happen here. The relationship holds **within** each position, and is stronger for RB
than the pooled number:

| | n | `spike_rate` | `dud_rate` | `usable_rate` |
|---|---|---|---|---|
| **RB** | 23 | +0.802 | −0.707 | **+0.827** |
| **WR** | 19 | +0.462 | −0.748 | +0.712 |

Baselines do differ by position (RB mean `usable_rate` .500 vs WR .354), which is why every
ranking below is computed **within position**, never across.

## 3. The eight disagreements — the actual output

Ranked within position on Apex Score, versus ranked on `spike_rate + usable_rate − dud_rate`.

**Running backs**

| Player | Apex rank | Your rank | Gap | 2025 spike / dud / usable |
|---|---|---|---|---|
| Kenneth Gainwell | 4 | 12 | **+8 Apex** | 0.18 / 0.23 / 0.41 |
| Quinshon Judkins | 18 | 11 | −7 yours | 0.14 / 0.21 / 0.43 |
| Javonte Williams | 10 | 4 | −6 yours | 0.25 / **0.00** / 0.69 |
| Alvin Kamara | 13 | 18 | +5 Apex | **0.00** / 0.27 / 0.36 |

**Wide receivers**

| Player | Apex rank | Your rank | Gap | 2025 spike / dud / usable |
|---|---|---|---|---|
| Chris Godwin | 1 | 14 | **+13 Apex** | 0.11 / **0.44** / 0.22 |
| Parker Washington | 14 | 7 | −7 yours | 0.07 / 0.27 / 0.47 |
| Jauan Jennings | 9 | 5 | −4 yours | 0.00 / 0.20 / 0.53 |
| Davante Adams | 4 | 1 | −3 yours | **0.36** / 0.07 / 0.64 |

⭐ **Gainwell is a genuine catch, and the corpus confirms it independently.** Irby's own article
says: *"Gainwell's computation is not a complete two-year weighted Apex Score, because he had
only 97 opportunities in 2024 and needed 100 to qualify."* **This comparison surfaced him as the
single largest RB disagreement without knowing that.** The method found a known-degraded number
by itself, which is the best evidence so far that the comparison is doing real work.
⛔ **Never cite Gainwell's Apex Score.** It is not a complete one.

## 4. ⛔ THE HYPOTHESIS THAT FAILED — recorded because it looked obviously right

**The guess:** the disagreements are players who missed time, so one system is reading a partial
season. Godwin (9 games, .44 dud) and Gainwell both fit it perfectly.

**Tested across the whole sample, and it is false:**

| | n | median games played | partial season (<15 g) |
|---|---|---|---|
| **Disagree** (gap ≥ 4 ranks) | 8 | 15 | 3 of 8 — 38% |
| **Agree** (gap < 4 ranks) | 34 | 16 | 12 of 34 — 35% |

**Three points apart. There is no availability effect.** Godwin and Gainwell were a persuasive
sample of two and did not generalize.

⭐ **What that means, and it is the useful half:** the disagreements are **not** artifacts of
who got hurt. Two systems built largely from the same season are ranking these eight players
differently for substantive reasons. **Each one is worth opening individually** — that is where
Apex Score is either seeing something `spike_rate` and `dud_rate` miss, or is wrong.

⚠️ **n = 8.** This is a list to investigate, not a finding to act on.

## 5. Rerunning it

```bash
# 1. refresh the corpus (needs Chrome logged in to legendaryupside.com)
python _rails/legup-fetch.py --urls | bash _rails/legup-browser.sh

# 2. the Apex Scores, as text, out of the prose
grep -ohE "[A-Z][A-Za-z'.-]+( [A-Z][A-Za-z'.-]+)+ \(Apex Score: [0-9.]+, [0-9]+(st|nd|rd|th)\)" \
  _corpus/legendary-upside/*.md | sort -u
```

The join and the correlations are plain arithmetic over
`grading/data/player_metrics_2025.json`; name matching must strip Jr/Sr/II/III/IV and
punctuation or four players drop out.

## 6. What NOT to conclude

- ⛔ **Not** that Apex Score validates RosterXRay, or vice versa. Shared inputs.
- ⛔ **Not** that Apex Score is a better or worse predictor. **Nothing here tests prediction.**
  The honest test needs Apex Scores from one season checked against outcomes in the next, and
  the corpus only carries one published season of them.
- ⛔ **Not** that any of the 49 scores describes a full player pool. They are the players Irby
  chose to write about — a **selected** sample, not a ranking.
- ⚠️ The full ranking tables are **images** (981 across the corpus against 95 markdown table
  rows), so a complete Apex Score list is not obtainable by any text route.
