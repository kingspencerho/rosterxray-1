#!/usr/bin/env node
// test-loose-json.mjs — guards the truncation-tolerant parse of the grading
// response.
//
// The bug (diagnosed Jul 27 2026 against the LIVE site, not in theory): an
// 18-player best-ball roster came back HTTP 200 with stop_reason "max_tokens",
// output_tokens exactly at the 2200 cap, and JSON severed mid-sentence inside
// bringBackNotes. A strict JSON.parse threw, the catch discarded everything,
// and the UI fell back to the template summary — even though a complete,
// high-quality nutshell was sitting at the very front of the payload.
//
// That is the "sometimes full, sometimes basic" summary. Not random, not a
// network fault: it tracked roster size, because more players means more
// standoutDetails and bringBackNotes.
//
// The cap was raised, but a model can always run long, so the parse must stay
// tolerant. These cases pin that behavior.
//
// Run: node scripts/test-loose-json.mjs   (exits non-zero on failure)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const repoRoot = process.cwd();
const tmpDir = path.join(os.tmpdir(), "rxr-probe"); mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const src = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { parseLooseJson };\n";
const outfile = path.join(tmpDir, "loose.mjs");
await build({ stdin:{contents:src,loader:"jsx",resolveDir:repoRoot,sourcefile:"App.jsx.jsx"},
  bundle:true, platform:"node", format:"esm", outfile, logLevel:"silent",
  alias:{"@vercel/analytics/react":path.join(tmpDir,"stub.js"),"@vercel/analytics":path.join(tmpDir,"stub.js")}});
const { parseLooseJson } = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

let fail = 0;
const t = (label, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`          got  ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`);
};

console.log("=== intact response still parses normally ===");
const whole = JSON.stringify({
  nutshell: "Three fully-looped QB stacks.",
  gradeModifier: 0,
  modifierReason: null,
  pivotNotes: { "Jordan Addison": "a note" },
  standoutDetails: { "Justin Jefferson": "elite target share" },
});
t("nutshell survives", parseLooseJson(whole)?.nutshell, "Three fully-looped QB stacks.");
t("nested map survives", parseLooseJson(whole)?.standoutDetails?.["Justin Jefferson"], "elite target share");

console.log("\n=== the real failure: severed mid-string in a later field ===");
// Shaped exactly like the captured production payload: complete nutshell and
// pivotNotes/standoutDetails, then bringBackNotes cut off mid-sentence.
const truncated = `{
  "nutshell": "Three fully-looped QB stacks with bring-back coverage.",
  "gradeModifier": 0,
  "modifierReason": null,
  "pivotNotes": { "Jordan Addison": "a complete note" },
  "standoutDetails": { "Cam Skattebo": "100% of inside-10 carries" },
  "bringBackNotes": { "BALvsPIT_W15": "BAL vs PIT in W15 is tagged High-Pace Target and carr`;
const salv = parseLooseJson(truncated);
t("recovers the nutshell", salv?.nutshell, "Three fully-looped QB stacks with bring-back coverage.");
t("recovers pivotNotes", salv?.pivotNotes?.["Jordan Addison"], "a complete note");
t("recovers standoutDetails", salv?.standoutDetails?.["Cam Skattebo"], "100% of inside-10 carries");
t("drops the severed field entirely", salv?.bringBackNotes, undefined);

console.log("\n=== severed right after a nested map closes (no trailing comma) ===");
const atBoundary = `{
  "nutshell": "A complete summary.",
  "pivotNotes": { "X": "y" }`;
t("still recovers", parseLooseJson(atBoundary)?.nutshell, "A complete summary.");

console.log("\n=== escaped quotes inside a string must not confuse the walker ===");
const escaped = `{
  "nutshell": "He said \\"start Jefferson\\" and meant it.",
  "pivotNotes": { "X": "y" },
  "standoutDetails": { "Z": "cut here`;
t("handles escapes", parseLooseJson(escaped)?.nutshell, 'He said "start Jefferson" and meant it.');

console.log("\n=== nothing salvageable -> null, so the UI shows the failure ===");
t("truncated inside the FIRST field", parseLooseJson('{ "nutshell": "cut immediat'), null);
t("not JSON at all", parseLooseJson("I'm sorry, I can't help with that."), null);

console.log(fail === 0 ? "\nALL CHECKS PASSED" : `\n${fail} check(s) FAILED.`);
process.exit(fail === 0 ? 0 : 1);
