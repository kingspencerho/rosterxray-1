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

console.log("");
if (failed) {
  console.error(`FAIL  ${failed} check(s) failed — the screenshot path is not carrying ADP correctly.`);
  process.exit(1);
}
console.log("PASS  screenshot extraction carries pick + ADP through to the parser, unswapped");
