#!/usr/bin/env node
// test-extraction-blocks.mjs — the screenshot path must hand parseRoster a shape
// it actually reads, and must never let pick and ADP swap places.
//
// WHY THIS EXISTS
//   Until Aug 16 2026 the screenshot extractor was told, in as many words, to
//   throw the ADP away: "Only extract the Pick number — do NOT use Bye or ADP."
//   Every screenshot upload therefore fell back to the built-in ADP snapshot,
//   which is the exact number the "ADP Source of Truth" rule says the user's own
//   board should override. Screenshots are how rosters actually arrive, so the
//   stale-table problem landed hardest on the most-used path.
//
//   The extractor now returns {name, pick?, adp?} and the client renders each
//   player as a five-line block. THE SHAPE IS NOT COSMETIC. parseRoster is built
//   around Underdog's export, where the LABEL FOLLOWS THE VALUE, and the obvious
//   single-line alternatives are silently wrong:
//
//     "Joe Burrow 84 ADP 68.4"   -> adp 84, pick null    (both wrong)
//     "Joe Burrow 68.4 ADP 84 Pick" -> not parsed at all
//     name / "QB CIN" / bye / "Bye" / ... -> parses, but the "QB CIN" lines
//                                            surface as junk notFound rows
//
//   A swapped pick/ADP is worse than no ADP at all: it produces confident,
//   precise, wrong reach/value flags on every player. That is the failure this
//   file exists to prevent.
//
// WHAT IT CHECKS
//   1. The five-line block round-trips: name, pick and ADP all land correctly,
//      with no junk rows.
//   2. adpSource is "roster" — proof the parsed value beat the built-in table.
//   3. Players with no ADP still work (the pre-Aug-16 fallback shape).
//   4. The known-bad single-line form is still known-bad, so nobody "simplifies"
//      the emitter back into it without this failing.
//   5. The server prompt still asks for objects and still warns against swapping.

import { build } from "esbuild";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = path.join(repoRoot, "node_modules", ".cache", "rosterxray-blocks");
mkdirSync(tmpDir, { recursive: true });

const res = await build({
  entryPoints: [path.join(repoRoot, "App.jsx.jsx")],
  bundle: true, write: false, format: "esm", platform: "node",
  jsx: "transform", loader: { ".jsx": "jsx" },
  external: ["react", "react-dom", "react/jsx-runtime", "lucide-react", "recharts", "html2canvas"],
  footer: { js: "export { parseRoster };" },
});
const bundlePath = path.join(tmpDir, "app.mjs");
writeFileSync(bundlePath, res.outputFiles[0].text);
const { parseRoster } = await import(pathToFileURL(bundlePath).href);

// Mirrors the emitter in App.jsx. Keep the two in step — if the emitter changes
// shape, change it here and watch this test tell you whether the new shape works.
const emit = (rows) => rows.map(p => {
  if (p.adp != null && p.pick != null) return `${p.name}\n${p.adp}\nADP\n${p.pick}\nPick`;
  if (p.adp != null) return `${p.name}\n${p.adp}\nADP`;
  if (p.pick != null) return `${p.name} ${p.pick}`;
  return p.name;
}).join("\n");

let failed = 0;
const check = (label, cond, detail = "") => {
  if (cond) { console.log(`  ok   ${label}`); return; }
  console.error(`  FAIL ${label}${detail ? " — " + detail : ""}`);
  failed++;
};

// ---------------------------------------------------------------------------
// 1-3. round-trip through the real parser
// Names chosen deliberately: an apostrophe, a hyphen and a suffix are the three
// things that have broken name resolution in this repo before.
const rows = [
  { name: "Joe Burrow", pick: 84, adp: 68.4 },
  { name: "De'Zhaun Stribling", pick: 109, adp: 130.7 },
  { name: "Jaxon Smith-Njigba", pick: 5, adp: 5.2 },
  { name: "Marvin Harrison Jr", pick: 67, adp: 67.0 },
  { name: "Chris Rodriguez", pick: 117, adp: 127.0 },
  { name: "Caleb Williams" },                    // nothing visible
  { name: "Tucker Kraft", pick: 76 },            // pick only, the old shape
];

const parsed = parseRoster(emit(rows), "standard");

// Match the way the app does. Apostrophes are stripped and hyphens become
// spaces, so "De'Zhaun Stribling" comes back as "Dezhaun Stribling" and
// "Jaxon Smith-Njigba" as "Jaxon Smith Njigba". Comparing raw input names
// against parser output without this is a TEST bug, not an app bug — it cost
// two false failures the first time this file ran.
const norm = (v) => String(v).toLowerCase().replace(/[.,'‘’]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
const byName = new Map([...parsed].filter(p => p && p.name).map(p => [norm(p.name), p]));

console.log("=== five-line block round-trip ===");
for (const r of rows.filter(r => r.adp != null)) {
  const hit = byName.get(norm(r.name)) || [...parsed].find(p => p && p.matchedKey === norm(r.name));
  check(`${r.name} resolves`, !!hit);
  if (!hit) continue;
  check(`${r.name} pick = ${r.pick}`, hit.actualPick === r.pick, `got ${hit.actualPick}`);
  check(`${r.name} adp = ${r.adp}`, Math.abs(hit.adp - r.adp) < 0.01, `got ${hit.adp}`);
  check(`${r.name} adpSource = roster`, hit.adpSource === "roster", `got ${hit.adpSource}`);
}

console.log("\n=== no-ADP players still work ===");
const noAdp = [...parsed].filter(p => p && p.name && /caleb williams|tucker kraft/i.test(p.name));
check("both no-ADP players resolved", noAdp.length === 2, `got ${noAdp.length}`);
const kraft = noAdp.find(p => /kraft/i.test(p.name));
check("pick-only player keeps its pick", kraft && kraft.actualPick === 76, `got ${kraft && kraft.actualPick}`);

console.log("\n=== no junk rows ===");
const expected = new Set(rows.map(r => norm(r.name)));
const junk = [...parsed].filter(p => p && p.name && !expected.has(norm(p.name)));
check("emitter produces no unresolved filler rows", junk.length === 0,
  junk.length ? `got ${junk.length}: ${junk.map(j => j.name).join(", ")}` : "");

// ---------------------------------------------------------------------------
// 4. the known-bad shape must stay known-bad
console.log("\n=== the swap trap is still a trap ===");
const bad = parseRoster("Joe Burrow 84 ADP 68.4", "standard");
const badHit = [...bad].find(p => p && p.name && /burrow/i.test(p.name));
check("single-line 'Name Pick ADP x' does NOT parse correctly",
  !badHit || badHit.actualPick !== 84 || Math.abs((badHit.adp ?? 0) - 68.4) > 0.01,
  "it parsed correctly — if the parser was fixed, simplify the emitter and update this test");

// ---------------------------------------------------------------------------
// 5. the server prompt still asks for what the client expects
console.log("\n=== server prompt contract ===");
const api = readFileSync(path.join(repoRoot, "api", "analyze.js"), "utf8");
const prompt = api.slice(api.indexOf("EXTRACTION_SYSTEM_PROMPT"), api.indexOf("function buildGradingSystemPrompt"));
check("asks for a JSON array of objects", /JSON array of objects/i.test(prompt));
check('declares the "adp" key', /"adp"/.test(prompt));
check("warns against swapping ADP and Pick", /NEVER swap ADP and Pick/i.test(prompt));
check("still tells it to discard Bye", /Bye is never a pick/i.test(prompt));


// ---------------------------------------------------------------------------
// THE LEAGUE SHAPE, READ OFF THE CARD (Sep 12 2026)
//
// A Yahoo share card prints the slot the LEAGUE starts beside every row, so the
// screenshot already describes the league and the reader was re-entering it by
// hand. This is the FIRST screenshot-derived input that can move a grade —
// league.lineup is read 19 times inside analyzeRedraft — so the checks below are
// behavioural, not string matches.
//
// The helper is EXTRACTED AND RUN. Sep 11 cost a day to the opposite: a guard
// asserted that getVacated MENTIONED teamKey, passed, and the fix underneath it
// did not work. A regex over source proves text exists, never that code behaves.
console.log("");
console.log("league shape from slots");

const appSrc = readFileSync(path.join(repoRoot, "App.jsx"), "utf8");
const cut = (startMarker, endMarker) => {
  const i = appSrc.indexOf(startMarker);
  const j = appSrc.indexOf(endMarker, i);
  return i < 0 || j < 0 ? "" : appSrc.slice(i, j + endMarker.length);
};

// One slice: every SLOT_ constant plus the function itself. Cutting to the first
// "};" stopped inside the function, because its own first line ends in one.
const slotSrc = cut("const SLOT_FLEX = ", "const describeSlotConfig")
  .replace(/const describeSlotConfig[\s\S]*$/, "");

let fromSlots = null;
try { fromSlots = new Function(`${slotSrc}; return configFromSlots;`)(); } catch (e) { fromSlots = null; }
check("configFromSlots extracts and runs", typeof fromSlots === "function");

if (typeof fromSlots === "function") {
  // His own card, Sep 12 2026: 1QB 2RB 3WR 1TE 1FLEX, 5 bench, 1 IR.
  const yahoo = [
    { name: "J. Burrow", slot: "QB" },
    { name: "O. Hampton", slot: "RB" }, { name: "C. Skattebo", slot: "RB" },
    { name: "A. St. Brown", slot: "WR" }, { name: "L. Burden III", slot: "WR" },
    { name: "J. Addison", slot: "WR" },
    { name: "T. Warren", slot: "TE" },
    { name: "J. Warren", slot: "WRT" },
    { name: "E. Pineiro", slot: "K" }, { name: "Vikings", slot: "DEF" },
    { name: "D. Boston", slot: "BN" }, { name: "D. Stribling", slot: "BN" },
    { name: "C. Rodriguez Jr.", slot: "BN" }, { name: "M. Andrews", slot: "BN" },
    { name: "T. Shough", slot: "BN" },
    { name: "J. Tyson", slot: "IR" },
  ];
  const d = fromSlots(yahoo);
  check("reads his card exactly", !!d &&
    d.lineup.QB === 1 && d.lineup.RB === 2 && d.lineup.WR === 3 && d.lineup.TE === 1 &&
    d.lineup.FLEX === 1 && d.lineup.SFLEX === 0 && d.benchSize === 5 && d.irSlots === 1,
    d ? JSON.stringify(d.lineup) + ` bench ${d.benchSize} ir ${d.irSlots}` : "null");

  // K and DEF occupy slots the app models nowhere. They must not become lineup slots.
  check("K and DEF are ignored, not counted", !!d && d.ignored === 2 &&
    Object.values(d.lineup).reduce((a, b) => a + b, 0) === 8);

  // WRT is a flex, QWRT is a superflex, and confusing them changes whether the app
  // treats the league as superflex at all.
  const sflex = fromSlots([...yahoo, { name: "X", slot: "QWRT" }]);
  check("QWRT becomes SFLEX, never FLEX", !!sflex && sflex.lineup.SFLEX === 1 && sflex.lineup.FLEX === 1);

  // ⛔ SILENT-FAIL TO TODAY'S BEHAVIOUR. A card with no tags, or a partial read, must
  // leave the reader's own settings alone. A half-applied lineup is worse than none
  // because it looks deliberate.
  check("no tags at all returns null", fromSlots([{ name: "A" }, { name: "B" }]) === null);
  check("an empty list returns null", fromSlots([]) === null);
  check("a too-thin read returns null",
    fromSlots([{ name: "A", slot: "QB" }, { name: "B", slot: "RB" }]) === null);
  check("a read with no QB returns null",
    fromSlots(yahoo.filter(r => r.slot !== "QB")) === null);
}

// A <select> handed a value with no matching option renders blank or snaps to the
// first entry — silently. The panel would then show a number the engine is not using.
let withVal = null;
try {
  withVal = new Function(`${cut("const withValue = ", "};")}; return withValue;`)();
} catch (e) { withVal = null; }
check("withValue extracts and runs", typeof withVal === "function");
if (typeof withVal === "function") {
  check("an off-list value is injected", JSON.stringify(withVal([5, 6, 7], 4)) === "[4,5,6,7]");
  check("an in-list value changes nothing", JSON.stringify(withVal([5, 6, 7], 6)) === "[5,6,7]");
  check("it stays sorted", JSON.stringify(withVal([2, 3, 4, 5], 6)) === "[2,3,4,5,6]");
}

// THE DERIVED OBJECT GRADES, NOT THE STATE. setCustomConfig is async and the grade
// runs in the same tick, so reading it back would grade the PREVIOUS settings while
// the panel showed the new ones — the trap handleAnalyze already carries for setInput.
const extractBody = cut("const extractFromImages = ", "const removeImage");
check("the extractor derives the config", extractBody.includes("configFromSlots(players)"));
check("and grades off the derived object, not the state",
  extractBody.includes("cfg ? buildLeagueFromConfig(cfg)"),
  "reading customConfig back here grades the previous settings");

// APPLIED AND DISCLOSED. A silent rewrite of somebody's league settings is the same
// failure class as a filter that drops a player without saying so.
check("the reader is told what was read", /Read from your screenshot/.test(appSrc));
check("and told which three it could not read",
  /Teams, scoring and playoff weeks are not printed/.test(appSrc));
// ⛔ ONLY A CARD-DECIDED FIELD RETIRES THE BANNER. The banner claims the lineup,
// bench and IR came off the screenshot, and says in its own words that teams,
// scoring and playoff weeks did not. So changing scoring leaves the claim TRUE,
// and dropping the banner there erases a true statement — it also deleted the
// answer to "what did it read" the instant the reader answered the one question
// the panel asks. The predicate is EXTRACTED AND RUN, because asserting that the
// source mentions setSlotConfig proves only that the words are present.
let ownsField = null;
try {
  ownsField = new Function(`${cut("const slotOwnsField = ", "irSlots\");")}; return slotOwnsField;`)();
} catch (e) { ownsField = null; }
check("slotOwnsField extracts and runs", typeof ownsField === "function");
if (typeof ownsField === "function") {
  for (const f of ["lineup.QB", "lineup.WR", "lineup.FLEX", "lineup.SFLEX", "benchSize", "irSlots"])
    check(`${f} retires the banner`, ownsField(f) === true);
  for (const f of ["scoring", "teams", "playoffWeeks"])
    check(`${f} does NOT retire it`, ownsField(f) === false,
      "the banner never claimed this field, so changing it cannot falsify the banner");
  check("a junk path is not card-owned", ownsField(undefined) === false && ownsField("") === false);
}
check("and the retire is gated on it",
  /if \(slotOwnsField\(path\)\) setSlotConfig\(null\)/.test(appSrc),
  "an ungated setSlotConfig(null) is the old behaviour back");

// The panel asks exactly ONE question. Three questions between a screenshot and
// a grade contradicts the landing page's only promise.
check("the panel asks about scoring", /How does your league score receptions\?/.test(appSrc));
check("and STATES the other two rather than asking",
  /Assuming/.test(appSrc) && /playoffs \{customConfig\.playoffWeeks/.test(appSrc));
check("the scoring control is a real 32px target",
  /aria-pressed=\{customConfig\.scoring === val\}/.test(appSrc)
  && /minHeight: "32px", padding: "6px 13px"/.test(appSrc));
check("answering it re-grades off the derived object",
  /applyCustomConfig\("scoring", val, \{ \.\.\.customConfig, scoring: val \}\)/.test(appSrc),
  "passing the path alone would re-grade the PREVIOUS scoring value");

// A NEGATED INSTRUCTION CONTAINS THE SAME WORDS AS AN AFFIRMATIVE ONE. The first
// version of this passed while the prompt said "Do NOT capture the LINEUP SLOT",
// because both spellings contain "LINEUP SLOT". So the affirmative phrasing is
// pinned, and the EXAMPLE the model is shown is parsed and checked.
check("the prompt asks for the slot, affirmatively",
  /ALSO capture the LINEUP SLOT/.test(prompt));
const slotExample = (prompt.match(/\[\{"name":"J\. Burrow"[^\]]*\]/) || [""])[0];
let ex = [];
try { ex = JSON.parse(slotExample); } catch (e) { ex = []; }
check("the worked example carries slots", ex.length >= 4 && ex.every(r => r.slot));
check("...including a flex and a bench row",
  ex.some(r => r.slot === "WRT") && ex.some(r => r.slot === "BN"),
  "the two rows a model is most likely to mislabel");
check("and tells it to omit rather than guess", /OMIT the slot key/i.test(prompt));
check("bench rows are BN regardless of their own tag", /return "BN" regardless/i.test(prompt));

console.log("");
if (failed) {
  console.error(`FAIL  ${failed} check(s) failed — the screenshot path is not carrying ADP correctly.`);
  process.exit(1);
}
console.log("PASS  screenshot extraction carries pick + ADP through to the parser, unswapped");
