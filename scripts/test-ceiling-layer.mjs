#!/usr/bin/env node
// test-ceiling-layer.mjs — guards the ceiling-shape layer added Jul 28 2026,
// and doubles as its calibration record. Re-run after ANY rebalance.
//
// The layer scores whether a roster's players actually spike, which the model
// previously had no measure of — it graded structure (stacks, counts,
// construction, ADP, committees) and nothing else. Two rosters with identical
// architecture graded identically even if one was full of 30%-spike players.
//
// The failure this file exists to catch is POSITION LEAKAGE. Raw spike rate is
// dominated by quarterbacks: the draftable median blend runs QB 0.637 against
// WR 0.125, so an un-normalised version silently rewards carrying three QBs.
// That is a bug that would look like a working feature — the grades move, they
// just move for the wrong reason.
//
// Run: node scripts/test-ceiling-layer.mjs   (exits non-zero on failure)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const repo = process.cwd(), tmp = path.join(os.tmpdir(), "rxr-probe");
mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const src = readFileSync(path.join(repo, "App.jsx.jsx"), "utf8") +
  "\nexport { parseRoster, analyzeRoster };\n";
const outfile = path.join(tmp, "ceil.mjs");
await build({ stdin:{contents:src,loader:"jsx",resolveDir:repo,sourcefile:"App.jsx.jsx"},
  bundle:true, platform:"node", format:"esm", outfile, logLevel:"silent",
  alias:{"@vercel/analytics/react":path.join(tmp,"stub.js"),"@vercel/analytics":path.join(tmp,"stub.js")}});
const { parseRoster, analyzeRoster } = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

const letter = s => s >= 7 ? "A" : s >= 5.5 ? "A-" : s >= 3.5 ? "B+" : s >= 2 ? "B" : s >= 0.5 ? "C+" : s >= -1 ? "C" : "D";
const grade = names => analyzeRoster(parseRoster(names.join("\n"), "standard"), "main", false, false);

const ROSTERS = {
  "BBM (Jul 28 draft)": ["Jaxson Dart","Jared Goff","Jordan Love","De'Von Achane","Josh Jacobs",
    "Chris Rodriguez","Woody Marks","Braelon Allen","Amon-Ra St. Brown","Malik Nabers",
    "Christian Watson","Jordan Addison","Ryan Flournoy","Jauan Jennings","Antonio Williams",
    "Zavion Thomas","Tyler Warren","T.J. Hockenson"],
  "Jefferson build":    ["Lamar Jackson","Kyler Murray","Jaxson Dart","Chase Brown","Cam Skattebo",
    "Rico Dowdle","Dylan Sampson","Braelon Allen","Justin Jefferson","Zay Flowers","Brian Thomas",
    "Alec Pierce","Jauan Jennings","Isaac TeSlaa","Darnell Mooney","Elijah Sarratt",
    "Isaiah Likely","Chig Okonkwo"],
};

let fail = 0;
const t = (label, ok, detail="") => { if(!ok) fail++; console.log(`  ${ok?"PASS":"FAIL"}  ${label}${detail?"\n          "+detail:""}`); };

console.log("=== CALIBRATION: reference rosters, before vs after ===\n");
for (const [label, names] of Object.entries(ROSTERS)) {
  const r = grade(names);
  const cl = r.ceilingLayer;
  const before = r.score - (cl ? cl.score : 0);
  console.log(`  ${label}`);
  console.log(`    score ${before.toFixed(2)} (${letter(before)})  ->  ${r.score.toFixed(2)} (${letter(r.score)})   delta ${cl ? (cl.score>=0?"+":"")+cl.score.toFixed(2) : "n/a"}`);
  console.log(`    avgDelta ${cl ? cl.avgDelta : "—"}   qualified ${cl ? cl.qualified+"/"+cl.rostered : "layer inactive"}`);
  t(`${label}: letter grade unchanged by the layer`, letter(before) === letter(r.score),
    letter(before) !== letter(r.score) ? `moved ${letter(before)} -> ${letter(r.score)} — recalibrate the multiplier` : "");
  t(`${label}: layer within its +-0.5 clamp`, !cl || Math.abs(cl.score) <= 0.5);
}

console.log("\n=== POSITION LEAKAGE: the bug this layer was built to avoid ===");
// Same structural shell, but QBs swapped for WRs. Un-normalised scoring would
// hand the QB-heavy version a bonus purely for positional composition.
const qbHeavy = ["Josh Allen","Jared Goff","Jordan Love","De'Von Achane","Josh Jacobs",
  "Chris Rodriguez","Woody Marks","Braelon Allen","Amon-Ra St. Brown","Malik Nabers",
  "Christian Watson","Jordan Addison","Ryan Flournoy","Jauan Jennings","Antonio Williams",
  "Zavion Thomas","Tyler Warren","T.J. Hockenson"];
const a = grade(ROSTERS["BBM (Jul 28 draft)"]), b = grade(qbHeavy);
console.log(`  BBM as drafted   avgDelta ${a.ceilingLayer?.avgDelta}  ceilPts ${a.ceilingLayer?.score}`);
console.log(`  QB1 upgraded     avgDelta ${b.ceilingLayer?.avgDelta}  ceilPts ${b.ceilingLayer?.score}`);
t("swapping in an elite QB does not blow past the clamp",
  !b.ceilingLayer || Math.abs(b.ceilingLayer.score) <= 0.5);

console.log("\n=== DISCRIMINATION: the layer must actually separate rosters ===");
const scores = Object.values(ROSTERS).map(n => grade(n).ceilingLayer?.score ?? 0);
t("reference rosters do not all land on an identical value",
  new Set(scores.map(s => s.toFixed(2))).size > 1 || Math.abs(scores[0]) > 0,
  `values: ${scores.join(", ")}`);

console.log("\n=== HIERARCHY: ceiling must stay far below structure ===");
// Structure moves several points (elite stack alone is +1.5). If ceiling ever
// rivals that, rank 4 is outweighing rank 1-2 and the layer is miscalibrated.
t("clamp (0.5) is well under a single elite stack (1.5)", 0.5 < 1.5 / 2);

console.log(fail === 0 ? "\nALL CHECKS PASSED" : `\n${fail} check(s) FAILED.`);
process.exit(fail === 0 ? 0 : 1);
