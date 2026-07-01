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

Mapped from the app's actual most-used values, aligned to the audit's "Financial Dashboard /
Developer Tool" dark palettes.

### Surfaces (near-black, low → high elevation)
| Token | Hex | Replaces (count) |
|---|---|---|
| `--bg-base` | `#0a0a0a` | app background (#0a0a0a ×28) |
| `--bg-surface` | `#0f0f0f` | cards (#0f0f0f ×25, #0d0d0d) |
| `--bg-raised` | `#1a1a1a` | raised panels (#1a1a1a ×33, #1e1e1e, #161616) |
| `--bg-inset` | `#111111` | inset wells (#111 ×15) |

### Borders
| Token | Hex | Replaces |
|---|---|---|
| `--border-subtle` | `#222222` | hairlines (#222 ×19, #1a1a1a borders) |
| `--border-default` | `#333333` | standard (#333 ×18, #2a2a2a ×14) |

### Text (primary → dim)
| Token | Hex | Replaces (count) |
|---|---|---|
| `--text-primary` | `#fafafa` | headings/values (#fafafa ×56, #e5e5e5, #e0e0e0) |
| `--text-secondary` | `#888888` | labels (#888 ×48, #aaa) |
| `--text-muted` | `#666666` | captions (#666 ×71) |
| `--text-dim` | `#555555` | de-emphasized (#555 ×56, #444 ×26) |

### Brand accents
| Token | Hex | Use |
|---|---|---|
| `--accent-purple` | `#a78bfa` | primary brand accent, links, focus |
| `--accent-purple-strong` | `#7c3aed` | purple borders/fills (#7c3aed, #a855f7, #c084fc) |
| `--accent-cyan` | `#22d3ee` | secondary accent / "optimal" highlights (×49) |

### Status (matchup + grade semantics) — the meaning palette
| Token | Hex | Meaning |
|---|---|---|
| `--pos` | `#4ade80` | positive: VALUE, good matchup, strength (×71) |
| `--pos-bright` | `#a3e635` | elite/solid matchup tier |
| `--caution` | `#facc15` | neutral matchup (×19) |
| `--warn` | `#fb923c` | watch / tough matchup (×21) |
| `--neg` | `#f87171` | negative: REACH, wall matchup, weakness (×35) |
| `--gold` | `#f59e0b` | admin / accent gold (×10) |

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

## 7. Rollout
1. ✅ `:root` token block added to `App.jsx` `<style>`.
2. ✅ Pilot: Playoff Window Preview converted to `var(--token)`.
3. ⏳ Incremental section-by-section conversion of remaining inline hex (separately approved).
   Dual-file rule: every change mirrored to `App.jsx.jsx`.
