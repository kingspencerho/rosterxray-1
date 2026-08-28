// GUARD 17 — one colour, one meaning.
//
// Reported by a user as "why are the colors so similar to each other, if
// everything is cyan how can the user see the difference". The cause was not
// similarity, it was OVERLOADING: --accent-cyan was simultaneously the RB
// position colour AND the generic chrome accent (disclosure affordances,
// numbered steps, emphasis inside explainer copy). --accent-purple was doing
// the same thing for TE. So a chevron, a bolded phrase and a position chip
// were the same colour meaning three different things.
//
// Underneath that sat the older class this repo has now hit four times
// (Aug 14 tier/score, Aug 23 competitive balance, Aug 27 posColor, this):
// a mapping declared in more than one place drifts. FIVE hand-rolled copies of
// the position palette existed, and two of them painted WR green — the matchup
// palette's "good".
//
// Both assertions below are about SHAPE, not about specific hex values, so a
// deliberate re-tune of the palette passes and a second definition does not.

import fs from "fs";

const src = fs.readFileSync(new URL("../App.jsx", import.meta.url), "utf8");
let failed = 0;
const ok = (m) => console.log(`  ok   ${m}`);
const bad = (m) => { console.log(`  FAIL ${m}`); failed++; };

console.log("\npositions have exactly one palette");

// POS_ACCENT is the single declaration.
const decls = src.match(/^const POS_ACCENT = \{/gm) || [];
decls.length === 1
  ? ok("POS_ACCENT is declared once")
  : bad(`POS_ACCENT declared ${decls.length} times`);

// No other object literal maps all four positions to colours. Matches the
// shape `QB: ... RB: ... WR: ...` inside one literal, which is what every
// hand-rolled copy looked like.
const body = src.slice(src.indexOf("const POS_ACCENT")).replace(/^const POS_ACCENT = \{[\s\S]*?\n\};/, "");
const rival = [...body.matchAll(/QB:\s*[^,\n]*(?:#[0-9a-f]{3,8}|var\(--)[\s\S]{0,220}?WR:\s*[^,\n]*(?:#[0-9a-f]{3,8}|var\(--)/gi)];
rival.length === 0
  ? ok("no second position->colour map anywhere else")
  : bad(`${rival.length} rival position palette(s): ${rival[0][0].slice(0, 70).replace(/\s+/g, " ")}`);

// No ternary chain doing the same job inline.
const chain = [...src.matchAll(/pos === "QB" \? "(?:var\(--|#)[\s\S]{0,200}?pos === "WR"/g)];
chain.length === 0
  ? ok("no inline pos-ternary colour chains")
  : bad(`${chain.length} inline pos-ternary colour chain(s)`);

// WR must never be painted with a matchup colour. Green means "good matchup"
// everywhere else on the page, so a green WR badge reads as a grade.
const wr = (src.match(/^\s*WR: \{ text: "([^"]+)"/m) || [])[1];
/--(pos|caution|warn|neg)\b/.test(wr || "")
  ? bad(`WR uses a matchup-scale colour (${wr})`)
  : ok(`WR is outside the matchup scale (${wr})`);

console.log("\nchrome carries no data meaning");

// The chrome token exists and is desaturated. A hueless chrome accent cannot
// collide with any data family, which is the whole point — every hue on the
// wheel is already spoken for (matchups, weeks, positions).
const m = src.match(/--ui-accent:\s*#([0-9a-f]{6})/i);
if (!m) bad("--ui-accent is not defined");
else {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const sat = Math.max(r, g, b) === Math.min(r, g, b) ? 0
    : (Math.max(r, g, b) - Math.min(r, g, b)) / (1 - Math.abs(Math.max(r, g, b) + Math.min(r, g, b) - 1));
  sat <= 0.45
    ? ok(`--ui-accent is desaturated (${Math.round(sat * 100)}% sat)`)
    : bad(`--ui-accent is too saturated (${Math.round(sat * 100)}%) — it will read as a data colour`);
}

// The two tokens that ARE position colours must not be reachable from chrome.
// Cyan is allowed on POS_ACCENT.RB and on filled primary CTAs (a solid button
// is a different channel from coloured text); purple only on POS_ACCENT.TE.
for (const [tok, allowed] of [["--accent-cyan", 3], ["--accent-purple", 1]]) {
  const uses = (src.match(new RegExp(`var\\(${tok}\\)`, "g")) || []).length;
  uses <= allowed
    ? ok(`${tok} is used ${uses}x (cap ${allowed}) — position + CTA only`)
    : bad(`${tok} is used ${uses}x, over the cap of ${allowed}. Chrome must use --ui-accent.`);
}

console.log(failed ? `\n${failed} colour-role check(s) failed` : "\nall colour-role guards passed");
process.exit(failed ? 1 : 0);
