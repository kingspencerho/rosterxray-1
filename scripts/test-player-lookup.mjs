#!/usr/bin/env node
// test-player-lookup.mjs — guard 19, the player search field.
//
// The lookup exists so a user can open ANY player's card, not just the 18 on
// a graded roster. It sits beside findPlayer and does the OPPOSITE job:
//
//   findPlayer   RESOLVES a known name. It must never guess — a wrong match
//                grades the wrong player, which is strictly worse than a miss.
//   searchPlayers OFFERS candidates for a name still being typed. Guessing is
//                the whole point; a human picks from the list.
//
// What this asserts, in descending order of what a regression would cost:
//
//   1. TABLE PARITY. The lookup must search the same table findPlayer will
//      resolve against, or it offers a player the grade cannot open. This is
//      the same coupling adpVintageFor has, and it has broken before.
//   2. NO SILENT DROPS. Every row the search returns must carry pos and team,
//      because buildPlayerCard is called with them. A row missing either opens
//      a card for the wrong player or a blank one.
//   3. RANKING. "jeff" must reach Justin Jefferson. A search that returns the
//      right player at position 40 is a search nobody uses.
//   4. CONTAINMENT. searchPlayers must never be called from the scoring path.
//
// Run: node scripts/test-player-lookup.mjs   (exits non-zero on failure)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const repoRoot = process.cwd();
const tmpDir = path.join(os.tmpdir(), "rxr-lookup"); mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const raw = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");
const src = raw + "\nexport { searchPlayers, getSearchIndex, findPlayer, lookupTableFor, buildPlayerCard, ADP_VINTAGE, ADP_DATA, ADP_SUPERFLEX, ADP_YAHOO };\n";
const outfile = path.join(tmpDir, "lk.mjs");
await build({ stdin:{contents:src,loader:"jsx",resolveDir:repoRoot,sourcefile:"App.jsx.jsx"},
  bundle:true, platform:"node", format:"esm", outfile, logLevel:"silent",
  alias:{"@vercel/analytics/react":path.join(tmpDir,"stub.js"),"@vercel/analytics":path.join(tmpDir,"stub.js")}});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

let fail = 0;
const ok = (label, cond, extra = "") => {
  console.log((cond ? "  ok   " : "  FAIL ") + label + (cond ? "" : `  <${extra}>`));
  if (!cond) fail++;
};

// ---------------------------------------------------------------- 1. parity
console.log("=== table parity with findPlayer ===");
const TABLES = { standard: e.ADP_DATA, superflex: e.ADP_SUPERFLEX, yahoo: e.ADP_YAHOO };
for (const fmt of Object.keys(TABLES)) {
  ok(`${fmt}: lookupTableFor picks the same table findPlayer does`,
     e.lookupTableFor(fmt) === TABLES[fmt]);
}
// Every searchable name must be resolvable by findPlayer in that same format.
for (const fmt of Object.keys(TABLES)) {
  const idx = e.getSearchIndex(fmt);
  const unresolvable = idx.filter(r => !e.findPlayer(r.name, fmt));
  ok(`${fmt}: all ${idx.length} searchable names resolve via findPlayer`,
     unresolvable.length === 0, unresolvable.slice(0, 3).map(r => r.name).join(", "));
}

// ------------------------------------------------------------ 2. no silent drops
console.log("\n=== every row is card-openable ===");
for (const fmt of Object.keys(TABLES)) {
  const idx = e.getSearchIndex(fmt);
  ok(`${fmt}: index is populated`, idx.length > 200, `got ${idx.length}`);
  ok(`${fmt}: every row carries pos and team`, idx.every(r => r.pos && r.team),
     idx.filter(r => !r.pos || !r.team).slice(0, 3).map(r => r.name).join(", "));
  ok(`${fmt}: no duplicate players (aliases collapsed)`,
     new Set(idx.map(r => r.name)).size === idx.length);
  ok(`${fmt}: kickers and defenses excluded`,
     !idx.some(r => ["K", "DEF", "DST"].includes(r.pos)));
}

// ----------------------------------------------------------------- 3. ranking
console.log("\n=== ranking ===");
const first = (q, fmt) => e.searchPlayers(q, fmt)[0]?.name ?? "NONE";
ok('"jeff" reaches Justin Jefferson first', first("jeff") === "Justin Jefferson", first("jeff"));
ok('"justin jeff" (multi-token prefix) works', first("justin jeff") === "Justin Jefferson", first("justin jeff"));
ok('an exact full name wins', first("joe burrow") === "Joe Burrow", first("joe burrow"));
ok('a surname alone resolves', first("stribling").includes("Stribling"), first("stribling"));

// A prefix match must outrank a mere substring — otherwise the obvious answer
// buries itself behind incidental letter collisions.
const allen = e.searchPlayers("allen");
ok('surname-prefix beats substring', allen.length > 0 && allen[0].name.toLowerCase().includes("allen"),
   allen[0]?.name);

console.log("\n=== bounds ===");
ok("a single character returns nothing", e.searchPlayers("j").length === 0);
ok("an empty query returns nothing", e.searchPlayers("").length === 0);
ok("a null query returns nothing", e.searchPlayers(null).length === 0);
ok("an unmatched query returns nothing", e.searchPlayers("zzzqqq").length === 0);
ok("the result limit is honoured", e.searchPlayers("a").length <= 8);
ok("a custom limit is honoured", e.searchPlayers("a", "standard", 3).length <= 3);

// The two players whose absence from ADP_DATA was the reported bug. They must
// be reachable by search in EVERY format, which is what the coverage guard
// checks for resolution and this checks for discovery.
console.log("\n=== the players that motivated this ===");
for (const [q, team] of [["keenan allen", "IND"], ["najee harris", "NYG"]]) {
  for (const fmt of Object.keys(TABLES)) {
    const r = e.searchPlayers(q, fmt)[0];
    ok(`${q} is searchable in ${fmt} and reads ${team}`, r && r.team === team,
       r ? `${r.name} ${r.team}` : "NONE");
  }
}

// ------------------------------------------------------------- 4. containment
console.log("\n=== containment: the lookup must not touch the score ===");
const scoringFns = ["const analyzeRoster", "const analyzeRedraft"];
for (const fn of scoringFns) {
  const i = raw.indexOf(fn);
  ok(`${fn.replace("const ", "")} exists`, i >= 0);
  if (i < 0) continue;
  // Walk to the end of the function by brace depth.
  let depth = 0, j = raw.indexOf("{", i), end = j;
  for (let k = j; k < raw.length; k++) {
    if (raw[k] === "{") depth++;
    else if (raw[k] === "}") { depth--; if (depth === 0) { end = k; break; } }
  }
  const body = raw.slice(i, end);
  ok(`${fn.replace("const ", "")} does not call searchPlayers`, !body.includes("searchPlayers("));
  ok(`${fn.replace("const ", "")} does not call getSearchIndex`, !body.includes("getSearchIndex("));
}

// The lookup renders its own position chips. It must reuse POS_ACCENT rather
// than declaring a rival palette — the divergence class this repo has hit five
// times. Guard 17 owns the general rule; this pins the new call site.
console.log("\n=== the lookup reuses the shared palette ===");
const lk = raw.slice(raw.indexOf("const PlayerLookup"), raw.indexOf("const PlayerCardModal"));
ok("PlayerLookup reads POS_ACCENT", lk.includes("POS_ACCENT"));
ok("PlayerLookup declares no rival QB/RB/WR/TE colour map",
   !/QB:\s*\{\s*text:/.test(lk));
ok("the affordance is hueless (--ui-accent)", lk.includes("var(--ui-accent)"));
ok("the affordance uses no data hue", !lk.includes("--accent-cyan") && !lk.includes("--accent-purple"));

// A button used as a layout row must state justifyContent explicitly: the
// global button:not([data-compact]) rule centres its content, and the
// miscentring only appears once the row wraps on a phone.
ok("the toggle states justifyContent", lk.includes("justifyContent: \"flex-start\""));

// A search that finds nothing must SAY so.
ok("an empty result set renders an explanation", lk.includes("No player matching"));

// ------------------------------------------------- 5. the card follows the format
// buildPlayerCard hardcoded ADP_DATA, so a REDRAFT session rendered an Underdog
// best-ball number in the card header with no label, and rendered nothing at
// all for the names that live only in ADP_YAHOO. Same class as the footer bug
// ADP_VINTAGE was created to fix: a number printed beside the wrong market.
console.log("\n=== the card's ADP follows the active format ===");

const yahooOnly = Object.keys(e.ADP_YAHOO).filter(k => !e.ADP_DATA[k]);
ok("there ARE yahoo-only names (the case that regressed)", yahooOnly.length > 0, yahooOnly.length);

const probe = yahooOnly.find(k => e.ADP_YAHOO[k]?.pos && typeof e.ADP_YAHOO[k]?.adp === "number");
if (probe) {
  const v = e.ADP_YAHOO[probe];
  const asRedraft = e.buildPlayerCard(probe, v.pos, v.team, Date.now(), "yahoo");
  const asStandard = e.buildPlayerCard(probe, v.pos, v.team, Date.now(), "standard");
  ok(`a yahoo-only player has an ADP in redraft (${probe})`, asRedraft.adp != null, String(asRedraft.adp));
  ok("...and it is the Yahoo number", asRedraft.adp === v.adp, `${asRedraft.adp} vs ${v.adp}`);
  ok("...while standard does not invent one from the wrong table",
     asStandard.adp == null || asStandard.adp !== v.adp || e.ADP_DATA[probe]);
}

// A player in BOTH tables must read differently per format, or the plumbing is
// inert and the label is decorative.
const inBoth = Object.keys(e.ADP_DATA).find(k =>
  e.ADP_YAHOO[k] && typeof e.ADP_DATA[k].adp === "number" &&
  typeof e.ADP_YAHOO[k].adp === "number" && e.ADP_DATA[k].adp !== e.ADP_YAHOO[k].adp);
if (inBoth) {
  const v = e.ADP_DATA[inBoth];
  const bb = e.buildPlayerCard(inBoth, v.pos, v.team, Date.now(), "standard");
  const rd = e.buildPlayerCard(inBoth, v.pos, v.team, Date.now(), "yahoo");
  ok(`the same player reads differently per format (${inBoth})`, bb.adp !== rd.adp, `${bb.adp} / ${rd.adp}`);
  ok("best ball reads ADP_DATA", bb.adp === e.ADP_DATA[inBoth].adp);
  ok("redraft reads ADP_YAHOO", rd.adp === e.ADP_YAHOO[inBoth].adp);
  ok("each card names its own market", bb.adpMarket !== rd.adpMarket, `${bb.adpMarket} / ${rd.adpMarket}`);
  ok("the redraft market says redraft", /redraft/i.test(rd.adpMarket), rd.adpMarket);
  ok("the best-ball market says best ball", /best ball/i.test(bb.adpMarket), bb.adpMarket);
}

// The market label must be carried on every card that prints a number, and the
// header must render it — an unlabelled ADP is the bug, not the value itself.
const sample = e.buildPlayerCard("Joe Burrow", "QB", "CIN");
ok("a card carries adpMarket", typeof sample.adpMarket === "string" && sample.adpMarket.length > 0);
ok("a card carries adpVintage", typeof sample.adpVintage === "string" && sample.adpVintage.length > 0);
ok("the default format is best ball", /best ball/i.test(sample.adpMarket), sample.adpMarket);

const header = raw.slice(raw.indexOf("const PlayerCardModal"), raw.indexOf("const PlayerCardModal") + 6000);
ok("the card header renders the market beside the ADP", header.includes("card.adpMarket"));
ok("the card header no longer prints a bare ADP",
   !header.includes("` · ADP ${card.adp}`"));

// Redraft must reach the lookup at all.
console.log("\n=== both modes mount the lookup ===");
ok("the lookup is mounted 3 times (input, best ball, redraft)",
   (raw.match(/<PlayerLookup /g) || []).length === 3,
   String((raw.match(/<PlayerLookup /g) || []).length));

// PLACEMENT IS THE ASSERTION, not merely presence. Mounted below the sticky
// bar the lookup rendered 1,664px under the grade letter — past every roster
// pill and the whole nutshell — so it was on the page and unfindable. Each
// results-screen mount must sit ABOVE its own mode's roster pills, which is
// the card's other entry point and the thing it belongs beside.
const PILLS = "Canonical entry point to the player card";
const pillIdx = [];
for (let i = raw.indexOf(PILLS); i !== -1; i = raw.indexOf(PILLS, i + 1)) pillIdx.push(i);
ok("both modes render the roster pills", pillIdx.length === 2, String(pillIdx.length));

const mountIdx = [];
for (let i = raw.indexOf("<PlayerLookup "); i !== -1; i = raw.indexOf("<PlayerLookup ", i + 1)) mountIdx.push(i);
for (const [n, pi] of pillIdx.entries()) {
  // The nearest mount before these pills must be closer to them than the
  // previous pills block, i.e. it lives inside this mode's grade header.
  const before = mountIdx.filter(m => m < pi);
  const nearest = before.length ? before[before.length - 1] : -1;
  const floor = n === 0 ? 0 : pillIdx[n - 1];
  ok(`results mount ${n + 1} sits above its roster pills, inside the grade header`,
     nearest > floor, `mount@${nearest} pills@${pi} floor@${floor}`);
  ok(`results mount ${n + 1} is close to the header (not screens away)`,
     nearest > 0 && pi - nearest < 3000, `gap ${pi - nearest} chars`);
}
ok("no results mount is left stranded above the sticky bar",
   !/<PlayerLookup[^>]*\/>\s*\n\s*\n\s*<StickyIndex/.test(raw));
ok("lookupFormat maps redraft to the yahoo table", raw.includes('analysisMode === "redraft"') && raw.includes('? "yahoo"'));
ok("openCard threads the format into buildPlayerCard",
   /buildPlayerCard\(pl\.name, pl\.pos, pl\.team, Date\.now\(\), lookupFormat\)/.test(raw));

console.log(fail ? `\nFAIL  ${fail} assertion(s)` : "\nPASS  player lookup: table parity, card-openable rows, ranking, containment, format-correct ADP in both modes");
process.exit(fail ? 1 : 0);
