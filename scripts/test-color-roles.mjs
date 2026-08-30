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

console.log("\nthe matchup ramp's neutral rung is not a warning colour");

// Even is grey, not yellow. Yellow read as a mild warning (an even matchup is
// not one) and sat 5 degrees from the QB chip's amber — the last place on the
// page where a category and a verdict wore the same colour.
const even = (src.match(/--tier-even:\s*#([0-9a-f]{6})/i) || [])[1];
if (!even) bad("--tier-even is not defined");
else {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(even.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const sat = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(mx + mn - 1));
  sat <= 0.15
    ? ok(`--tier-even is neutral (${Math.round(sat * 100)}% sat)`)
    : bad(`--tier-even is ${Math.round(sat * 100)}% saturated — the neutral rung must not carry a hue`);
}
const neutralRung = (src.match(/neutral: \{ bg: "[^"]+", border: "[^"]+", text: "([^"]+)" \}/) || [])[1];
neutralRung === "var(--tier-even)"
  ? ok("tierStyle.neutral uses --tier-even")
  : bad(`tierStyle.neutral uses ${neutralRung}, not --tier-even`);

// EXPORT_TIER_COLORS is the same palette resolved to hex, because canvas cannot
// read var(). Its own comment says to change both or the export drifts from the
// app; nothing enforced it until now.
const vars = Object.fromEntries([...src.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{3,8});/gi)].map((m) => [m[1], m[2].toLowerCase()]));
const exportNeutral = (src.match(/neutral: \{ bg: "([^"]+)", border: "([^"]+)", text: "([^"]+)", label: "Even" \}/) || []).slice(1);
exportNeutral[2] === vars["tier-even"] && exportNeutral[0] === vars["tier-even-bg"] && exportNeutral[1] === vars["tier-even-border"]
  ? ok("EXPORT_TIER_COLORS.neutral matches the on-screen neutral")
  : bad(`EXPORT_TIER_COLORS.neutral is ${exportNeutral.join("/")}, the app renders ${vars["tier-even-bg"]}/${vars["tier-even-border"]}/${vars["tier-even"]}`);

console.log("\na section header may wear its own content's colour");

// The Strengths / Weaknesses panels and the Season Schedule header are the
// sanctioned exceptions to "chrome is hueless": each wears the colour its own
// rows already carry, so the label and its content read as one object. That is
// a label inheriting meaning, not chrome borrowing a hue — but it only holds
// while the two actually match, so assert the pairing rather than the colour.
const seasonHdr = src.match(/Season Schedule · Advance-Rate View/) ? src.slice(
  Math.max(0, src.indexOf("Season Schedule · Advance-Rate View") - 1400),
  src.indexOf("Season Schedule · Advance-Rate View")) : "";
/color: "var\(--accent-purple-light\)"/.test(seasonHdr)
  ? ok("the Season Schedule header uses the week/playoff purple")
  : bad("the Season Schedule header must use --accent-purple-light — its own grid paints W15-17 with it");
/isPlayoff \? "var\(--accent-purple-light\)"/.test(src)
  ? ok("...the same token the grid paints its playoff weeks with")
  : bad("the grid no longer marks playoff weeks in --accent-purple-light; the header pairing is broken");
/fontFamily: "var\(--font-display\)", fontSize: "22px"/.test(seasonHdr)
  ? ok("...and reads at top-level section size, not as a micro-label")
  : bad("the Season Schedule header dropped back to a micro-label size");

// Ceiling Rankings is the third sanctioned pairing: the words SPIKE and
// NUCLEAR wear the colours of the cells directly beneath them. Assert the
// PAIRING, not the hex — a deliberate re-tune of either token stays legal,
// while colouring the label independently of its data does not.
const ceilHdr = src.slice(
  src.indexOf("Ceiling Rankings · "),
  src.indexOf("Ceiling Rankings · ") + 400);
/<span style=\{\{ color: "var\(--pos\)" \}\}>Spike<\/span>/.test(ceilHdr)
  ? ok("the Ceiling Rankings header paints Spike in --pos")
  : bad("Spike in the Ceiling Rankings header must use --pos, the colour of its own spike cells");
/<span style=\{\{ color: "var\(--accent-purple-light\)" \}\}>Nuclear<\/span>/.test(ceilHdr)
  ? ok("...and Nuclear in --accent-purple-light")
  : bad("Nuclear in the Ceiling Rankings header must use --accent-purple-light, the colour of its own nuclear cells");
/color: "var\(--pos\)", fontWeight: 700, fontSize: "10px", width: "34px"/.test(src)
  ? ok("...matching the spike cell the header labels")
  : bad("the spike cell no longer renders in --pos; the header pairing is broken");
/p\.nuclear > 0 \? "var\(--accent-purple-light\)"/.test(src)
  ? ok("...and matching the nuclear cell")
  : bad("the nuclear cell no longer renders in --accent-purple-light; the header pairing is broken");
/<span style=\{\{ color: "var\(--pos\)" \}\}>SPIKE<\/span> · <span style=\{\{ color: "var\(--accent-purple-light\)" \}\}>NUKE<\/span>/.test(src)
  ? ok("...and the column label above those cells agrees")
  : bad("the SPIKE · NUKE column label must carry the same two colours as its cells");

console.log(failed ? `\n${failed} colour-role check(s) failed` : "\nall colour-role guards passed");
process.exit(failed ? 1 : 0);
