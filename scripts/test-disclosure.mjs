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

console.log(failed ? `\n${failed} disclosure check(s) failed` : "\nall disclosure guards passed");
process.exit(failed ? 1 : 0);
