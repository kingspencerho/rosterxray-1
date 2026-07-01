# RosterXRay — Design System (MASTER)

> Generated from a UI/UX design-intelligence audit (ui-ux-pro-max database) tailored to
> RosterXRay's product category: **dark, data-dense sports-analytics dashboard**.
> This is a reference spec. The live token layer lives in the `:root` block inside the
> `<style>` tag in `App.jsx` (mirrored in `App.jsx.jsx`).

## 1. Aesthetic direction (validated, not replaced)

The audit matched RosterXRay to three established styles — and the app already embodies them:

- **Data-Dense Dashboard** — KPI cards, compact 12–14px type, 8–12px grid gaps, row highlighting, hover tooltips, maximum information per screen.
- **Swiss / Minimalism** — grid-based, geometric sans, strict hierarchy, neutral palette so color carries *meaning* (good/bad matchup), not decoration.
- **Selective Brutalism** — sharp corners, visible borders, bold display type (Bebas Neue), high contrast.

**Conclusion:** keep the analyst/terminal identity. This redesign systematizes it; it does not restyle it.

## 2. The two real problems the audit flagged

1. **Color sprawl.** 989 hardcoded hex usages, 190 unique values — most are near-duplicate grays and near-blacks. Fix: collapse to ~28 semantic tokens (Section 3).
2. **Audit anti-patterns present in the app:**
   - *Color-only status.* W15/W16/W17 chips encode matchup quality by color alone — fails colorblind users. Fix: chips already show opponent text; ensure a non-color cue (we display the opponent abbrev, which helps; consider a shape/weight cue for elite vs wall).
   - *Gradients on dark backgrounds.* A few CTA buttons use gradients that lower contrast. Fix: prefer flat token fills.

## 3. Color tokens (semantic)

Mapped from the app's actual most-used values. Full rollout complete — each token is an
**exact rename** of its existing hex value (zero visual change), covering the ~27
highest-frequency colors that accounted for the large majority of the original ~989 raw
hex usages. Alpha-suffixed compound values (e.g. `#22d3ee44`, `#c084fc22`) remain literal
by design — they're derived values (base color + baked-in opacity), not simple duplicates.

### Surfaces (near-black, low → high elevation)
| Token | Hex |
|---|---|
| `--bg-base` | `#0a0a0a` |
| `--bg-surface` | `#0f0f0f` |
| `--bg-surface-alt` | `#0d0d0d` |
| `--bg-raised` | `#1a1a1a` |
| `--bg-elevated` | `#1e1e1e` |
| `--bg-inset` | `#111111` |

### Borders
| Token | Hex |
|---|---|
| `--border-subtle` | `#222222` |
| `--border-default` | `#333333` |
| `--border-strong` | `#2a2a2a` |

### Text (primary → dim)
| Token | Hex |
|---|---|
| `--text-primary` | `#fafafa` |
| `--text-secondary` | `#888888` |
| `--text-muted` | `#666666` |
| `--text-dim` | `#555555` |
| `--text-faint` | `#444444` |
| `--text-soft` | `#e5e5e5` |
| `--text-soft-alt` | `#e0e0e0` |

### Brand accents
| Token | Hex | Use |
|---|---|---|
| `--accent-purple` | `#a78bfa` | primary brand accent, links, focus |
| `--accent-purple-strong` | `#7c3aed` | purple borders/fills, structural accents |
| `--accent-purple-light` | `#c084fc` | secondary purple accent (trade analyzer, AI notes) |
| `--accent-purple-mid` | `#a855f7` | secondary purple accent (chips, badges) |
| `--accent-cyan` | `#22d3ee` | secondary accent / "optimal" highlights |
| `--info-blue` | `#60a5fa` | informational accent |

### Status (matchup + grade semantics) — the meaning palette
| Token | Hex | Meaning |
|---|---|---|
| `--pos` | `#4ade80` | positive: VALUE, good matchup, strength |
| `--pos-solid` | `#22c55e` | positive (solid/filled variant) |
| `--pos-bright` | `#a3e635` | elite/solid matchup tier |
| `--caution` | `#facc15` | neutral matchup |
| `--caution-alt` | `#fbbf24` | neutral (alt variant) |
| `--warn` | `#fb923c` | watch / tough matchup |
| `--neg` | `#f87171` | negative: REACH, wall matchup, weakness |
| `--gold` | `#f59e0b` | admin / accent gold |
| `--pink` | `#f472b6` | miscellaneous accent |

### Chip tier pairs (bg / fg) — `wkChipStyle` map
| Tier | bg token | fg token |
|---|---|---|
| elite | `#0d2a18` | `--pos` |
| solid | `#1a2a0a` | `--pos-bright` |
| neutral | `#2a2000` | `--caution` |
| tough | `#2a1400` | `--warn` |
| wall | `#2a0a0a` | `--neg` |

## 4. Typography

Standardize to **3 canonical stacks** (currently 11 inconsistent variants):

| Token | Stack | Use |
|---|---|---|
| `--font-display` | `'Bebas Neue', 'Impact', sans-serif` | section headers, grade letters |
| `--font-body` | `'Inter', system-ui, sans-serif` | all body/UI text |
| `--font-mono` | `'IBM Plex Mono', 'JetBrains Mono', monospace` | chips, ADP/pick numbers, data |

Type scale (data-dense): 8 / 9 / 10 / 11 / 12 / 14 / 20 / 24 / 52 / 76px (already roughly in use — keep).

## 5. Spacing & shape
- Base unit 4px; grid gaps 8–12px (data-dense standard).
- Corners: 3–6px (sharp/utilitarian). Avoid 24px+ rounding.
- Borders over shadows on dark surfaces.

## 6. Pre-delivery checklist (from audit)
- [ ] Every status cue has a non-color signal (text/shape), not color alone.
- [ ] Text contrast ≥ 4.5:1 — re-check `--text-dim` (#555) on `--bg-base`.
- [ ] No gradients reducing contrast on dark surfaces.
- [ ] Hover affordances also work for touch/keyboard.
- [ ] Light/dark parity not required — app is dark-only by design.

## 7. Rollout — COMPLETE
1. ✅ `:root` token block added to `App.jsx` `<style>` (27 color tokens + 3 font tokens).
2. ✅ Pilot: Playoff Window Preview converted to `var(--token)`.
3. ✅ Full rollout across the rest of `App.jsx`, done in 5 batches by category (surfaces/borders,
   text, brand accents, status colors, fonts) — ~1300 literal replacements total. Alpha-suffixed
   values intentionally left as literals (out of scope — see Section 3 note).
   Dual-file rule maintained: every change mirrored to `App.jsx.jsx`, brace-balance verified
   after each batch.
