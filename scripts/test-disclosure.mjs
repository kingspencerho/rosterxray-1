// GUARD 18 — the results view's two space-saving disclosures.
//
// Both encode a bug that is easy to reintroduce because the broken version
// looks correct in the source and fails only at runtime.
//
// 1. CLAMP-THEN-MEASURE. An unclamped element always reports
//    scrollHeight === clientHeight, so gating the clamp style on an overflow
//    measurement is circular: the measurement can never turn true, the clamp
//    never applies, and the "see more" control never appears. This shipped
//    that way for one build. The clamp must depend on the OPEN state alone.
//
// 2. MEASURE ONLY WHILE COLLAPSED. Once expanded the two heights match again,
//    so a measurement that keeps running flips the flag back to false and the
//    control that got the reader there vanishes under their finger.
//
// Plus the wiring: both modes must actually use the components, or one of best
// ball / redraft silently keeps the old unbounded layout.

import fs from "fs";

const src = fs.readFileSync(new URL("../App.jsx", import.meta.url), "utf8");
let failed = 0;
const ok = (m) => console.log(`  ok   ${m}`);
const bad = (m) => { console.log(`  FAIL ${m}`); failed++; };

const slice = (name) => {
  const i = src.indexOf(`const ${name} = (`);
  if (i === -1) return "";
  const j = src.indexOf("\n};", i);
  return src.slice(i, j === -1 ? src.length : j);
};

console.log("\nClampedText: clamp first, then measure");
const clamp = slice("ClampedText");
clamp ? ok("ClampedText is defined") : bad("ClampedText is missing");

// The clamp style must key off `open`, never off the overflow flag.
/style=\{open \? undefined : \{/.test(clamp)
  ? ok("the clamp is applied whenever collapsed, not gated on the measurement")
  : bad("the clamp style must be `open ? undefined : {...}` — gating it on overflow is circular");
/WebkitLineClamp/.test(clamp)
  ? ok("it clamps by line count, not by character count")
  : bad("no WebkitLineClamp — a character threshold clamps text that fits");

// The measuring effect must bail while expanded.
/if \(!el \|\| open\) return;/.test(clamp)
  ? ok("the measuring effect bails while expanded")
  : bad("the effect must skip measuring while open, or the control disappears on expand");
/setOpen\(false\); setOverflows\(false\);/.test(clamp)
  ? ok("state resets when the text itself changes")
  : bad("a new summary must reset the clamp state");

console.log("\nInsightPanel: open by default, capped list");
const panel = slice("InsightPanel");
panel ? ok("InsightPanel is defined") : bad("InsightPanel is missing");
/useState\(true\)/.test(panel)
  ? ok("the panel opens by default — strengths and weaknesses are the headline read")
  : bad("InsightPanel must default to open");
/slice\(0, preview\)/.test(panel)
  ? ok("a long list truncates to `preview` with the rest one tap away")
  : bad("no row cap — the section height is unbounded");

console.log("\nboth modes are wired");
for (const [what, needle, want] of [
  ["the nutshell clamps", "<ClampedText", 2],
  ["strengths and weaknesses are panels", "<InsightPanel", 4],
]) {
  const n = (src.match(new RegExp(needle, "g")) || []).length;
  n === want ? ok(`${what} in best ball AND redraft (${n} sites)`)
             : bad(`${what}: found ${n} sites, expected ${want} — one mode is unconverted`);
}

// The header must carry its content's colour. That is the point of the panel:
// the label inherits the meaning its own rows already carry.
/title="Strengths"[\s\S]{0,120}color="var\(--pos-bright\)"/.test(src)
  ? ok("the Strengths header wears the same lime as its rows")
  : bad("the Strengths header must use --pos-bright, matching its rows");
/title="Weaknesses"[\s\S]{0,120}color="var\(--warn\)"/.test(src)
  ? ok("the Weaknesses header wears the same orange as its rows")
  : bad("the Weaknesses header must use --warn, matching its rows");

console.log("\nthe generated grade card can be put away");

// It is a full-height PNG that appears mid-page. Without an exit it sits
// between the reader and everything below it for the rest of the session.
const collapse = (src.match(/setCardPreviewOpen\(o => !o\)/g) || []).length;
collapse === 2 ? ok(`the preview collapses in best ball AND redraft (${collapse} sites)`)
               : bad(`preview toggle found at ${collapse} sites, expected 2`);
const dismiss = (src.match(/setExportedDataUrl\(null\); setCardPreviewOpen\(true\);/g) || []).length;
dismiss === 2 ? ok(`dismiss clears the card and restores the export link (${dismiss} sites)`)
              : bad(`dismiss found at ${dismiss} sites, expected 2`);

// COLLAPSING MUST NOT TAKE THE ACTIONS WITH IT. "I have seen it, now let me
// file it" is the state a reader is actually in, so only the <img> is gated.
/\{cardPreviewOpen && \(\s*<img/.test(src)
  ? ok("only the image is gated — Share / Save / Post stay live while collapsed")
  : bad("the collapse must gate the <img> alone, not the action row");

// The share row mixes a <button> (which the global 44px floor covers) with two
// <a> elements (which it does not). They sat at 31px until they said so.
const anchors = (src.match(/minWidth: "120px", minHeight: "44px"/g) || []).length;
anchors === 4 ? ok("both share anchors state their own 44px floor, in both modes")
              : bad(`${anchors} of 4 share anchors carry a min-height; <a> is not covered by the button floor`);

console.log("\nthe sticky section index");

// A nav entry pointing at an id that no longer renders is a dead link the user
// can tap: nothing happens, no error. That is the failure this guard exists for.
const idxBlock = src.slice(src.indexOf("const SECTION_INDEX = {"), src.indexOf("const STICKY_INDEX_H"));
const navIds = [...idxBlock.matchAll(/id: "(rxr-[a-z]+)"/g)].map(m => m[1]);
navIds.length >= 10
  ? ok(`the index covers both modes (${navIds.length} entries)`)
  : bad(`only ${navIds.length} index entries — both modes need a list`);
const dead = navIds.filter(id => !new RegExp(`id="${id}"`).test(src));
dead.length === 0
  ? ok("every index entry points at an anchor that exists")
  : bad(`dead nav targets: ${dead.join(", ")}`);
const dupes = navIds.filter(id => (src.match(new RegExp(`id="${id}"`, "g")) || []).length > 1);
dupes.length === 0
  ? ok("no anchor id is rendered twice")
  : bad(`duplicate anchors: ${dupes.join(", ")} — getElementById would pick the first`);

const mounts = (src.match(/<StickyIndex items=/g) || []).length;
mounts === 2 ? ok("mounted in best ball AND redraft (2 sites)")
             : bad(`StickyIndex mounted at ${mounts} sites, expected 2`);

const sticky = slice("StickyIndex");
/position: "sticky", top: 0/.test(sticky)
  ? ok("it pins to the top of the scroll container")
  : bad("StickyIndex is not sticky");

// It is CHROME. Every hue on this page already means something, so a navigation
// control must distinguish its active pill by lightness, never by colour.
/var\(--(accent|pos|warn|neg|caution|pink|gold|info)/.test(sticky)
  ? bad("the index uses a data hue — an active pill must be a lightness step, not a colour")
  : ok("the active pill is a lightness step, carrying no data hue");

// The last sections live inside the final viewport-height and can never cross
// the top edge, so without this the pill sticks several sections back — right
// after the reader tapped the one they wanted.
/scrollHeight - 4/.test(sticky)
  ? ok("the last section becomes active at the bottom of the page")
  : bad("no end-of-page case — the final pills can never highlight");

console.log("\nthe attention pulses");

// The upload tab's glow mechanic at a fraction of the intensity, on two
// controls: the W1-18 schedule chip and the VIEW ROSTER chip. Three properties
// keep them from becoming noise.
//
// 1. ONE MECHANISM. Timing and shape are defined once and shared, so the two
//    cues cannot drift into different rhythms — a divergence class this repo
//    has hit repeatedly with duplicated definitions. Each caller supplies only
//    its own hue, via --cta-glow, because the hue is the part that means
//    something.
// 2. COLLAPSED-ONLY. An attention-getter for a closed door, silent the moment
//    it opens (the upload tab's own "stops when clicked" rule).
// 3. prefers-reduced-motion silences both.

/\.schedule-cta-pulse,\s*\n\s*\.roster-cta-pulse \{\s*animation-duration: ([\d.]+)s;\s*animation-timing-function: [^;]+;\s*animation-iteration-count: infinite;/.test(src)
  ? ok("both pulses share one timing definition — the rhythm cannot drift")
  : bad("the two pulses must share the duration/easing/count longhands, not clone them");

// ⚠ THE WEBKIT TRAP. A single shared @keyframes reading rgba(var(--cta-glow))
// is tidier and animates correctly in Chromium — and silently does NOT animate
// in WebKit, so the pulse dies on iPhone while every desktop check passes.
// This shipped once and had to be reverted. Keep the colours literal.
/@keyframes (scheduleCta|rosterCta)[\s\S]{0,300}var\(/.test(src)
  ? bad("a pulse @keyframes contains var() — WebKit will not animate it; inline the rgba literal")
  : ok("no pulse keyframes contains var() — safe to animate in WebKit");

/@keyframes scheduleCta[\s\S]{0,240}rgba\(192, 132, 252, 0\.35\)/.test(src)
  ? ok("the schedule pulse peaks at its literal purple")
  : bad("the schedule pulse must peak at a literal rgba(192, 132, 252, 0.35)");

/@keyframes rosterCta[\s\S]{0,240}rgba\(203, 213, 225, 0\.35\)/.test(src)
  ? ok("the roster pulse peaks at its literal --ui-accent grey")
  : bad("the roster pulse must peak at a literal rgba(203, 213, 225, 0.35)");

// Each control is gated on ITS OWN collapsed state.
/className=\{bbScheduleOpen \? undefined : "schedule-cta-pulse"\}/.test(src)
  ? ok("the schedule pulse runs only while its panel is collapsed")
  : bad("the schedule pulse must be gated on the collapsed state");

const rosterGated = (src.match(/className=\{rosterStripOpen \? undefined : "roster-cta-pulse"\}/g) || []).length;
rosterGated === 2
  ? ok("the roster pulse is gated on collapsed, at both render sites")
  : bad(`the roster pulse must be gated on rosterStripOpen at both sites (found ${rosterGated})`);

/@media \(prefers-reduced-motion: reduce\) \{\s*\.schedule-cta-pulse,\s*\n\s*\.roster-cta-pulse \{\s*animation: none;/.test(src)
  ? ok("reduced-motion silences both")
  : bad("both pulses must be disabled under prefers-reduced-motion");

// The hues are the assertion, not the timing. Purple is the schedule section's
// own; the roster chip is CHROME and must stay hueless, or a navigation
// affordance starts reading as data.
/\.schedule-cta-pulse \{ animation-name: scheduleCta; \}/.test(src)
  ? ok("the schedule chip is wired to its own keyframes")
  : bad("the schedule chip must select animation-name: scheduleCta");

/\.roster-cta-pulse\s+\{ animation-name: rosterCta; \}/.test(src)
  ? ok("the roster chip is wired to its own keyframes")
  : bad("the roster chip must select animation-name: rosterCta");

console.log(failed ? `\n${failed} disclosure check(s) failed` : "\nall disclosure guards passed");
process.exit(failed ? 1 : 0);
