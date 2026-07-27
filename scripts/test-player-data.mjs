#!/usr/bin/env node
// test-player-data.mjs — every ADP player who HAS 2025 data must resolve to it.
//
// Guards a bug found Jul 27 2026. getMetrics only stripped a suffix from the
// QUERY, so "Michael Pittman Jr" -> "michael pittman" worked but the reverse
// did not. The metrics files are keyed off nflverse, which carries suffixes the
// ADP tables drop, and the reverse is the COMMON direction. Eleven players --
// including Chris Rodriguez Jr, Kenneth Walker III, Brian Thomas Jr and Marvin
// Harrison Jr -- returned null and were reported as having no 2025 data at all.
// A roster analysis called four of five backs "unprofiled" when two of them had
// full profiles sitting in the file.
//
// The failure mode is silent by construction: null is indistinguishable from a
// genuine rookie, so nothing errors and the gap looks like real missing data.
// That is exactly why this test exists.
//
// Run: node scripts/test-player-data.mjs   (exits non-zero on failure)

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";
import os from "os";

const repoRoot = process.cwd();
const tmpDir = path.join(os.tmpdir(), "rxr-pdata");
mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");

const src = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { getMetrics, getEfficiency, getMotion, ADP_DATA, PLAYER_METRICS, normalize };\n";
const outfile = path.join(tmpDir, "e.mjs");
await build({
  stdin: { contents: src, loader: "jsx", resolveDir: repoRoot, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: {
    "@vercel/analytics/react": path.join(tmpDir, "stub.js"),
    "@vercel/analytics": path.join(tmpDir, "stub.js"),
  },
});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

let fail = 0;
const t = (label, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n          got ${got}, want ${want}`}`);
};

console.log("=== THE BUG: bare query, suffixed key ===");
for (const n of ["Chris Rodriguez", "Kenneth Walker", "Brian Thomas", "Marvin Harrison",
                 "Chris Godwin", "Luther Burden", "Harold Fannin", "Tyrone Tracy",
                 "Oronde Gadsden", "Deebo Samuel", "Michael Penix"]) {
  t(`getMetrics("${n}")`, e.getMetrics(n) !== null, true);
}

console.log("\n=== Legal-name alias ===");
t('getMetrics("Kenny Gainwell") resolves to Kenneth', e.getMetrics("Kenny Gainwell") !== null, true);

console.log("\n=== No regression on the other direction ===");
for (const n of ["Michael Pittman Jr", "Marvin Harrison Jr", "Justin Jefferson", "Tee Higgins"]) {
  t(`getMetrics("${n}")`, e.getMetrics(n) !== null, true);
}

console.log("\n=== All three tables agree on who exists ===");
for (const n of ["Chris Rodriguez", "Kenny Gainwell", "James Cook"]) {
  const m = e.getMetrics(n), eff = e.getEfficiency(n);
  t(`"${n}" present in metrics AND efficiency`, m !== null && eff !== null, true);
}

// The sweep: any ADP player whose surname appears in the metrics file but who
// does not resolve is a lookup failure, not a genuine absence.
console.log("\n=== SWEEP: unresolved despite a same-surname entry existing ===");
const SUF = /\s+(jr|sr|ii|iii|iv|v)$/;
const metricSurnames = new Set(
  Object.keys(e.PLAYER_METRICS).map(k => k.replace(SUF, "").split(" ").slice(1).join(" ")).filter(Boolean)
);
const suspects = [];
for (const raw of Object.keys(e.ADP_DATA)) {
  if (e.getMetrics(raw) !== null) continue;
  const parts = e.normalize(raw).replace(SUF, "").split(" ");
  if (parts.length < 2) continue;                 // shorthand ADP keys like "cmc", "jsn"
  const surname = parts.slice(1).join(" ");
  const full = Object.keys(e.PLAYER_METRICS).filter(k => k.replace(SUF, "").endsWith(" " + surname));
  // Only a real suspect when the FIRST names also match after suffix stripping.
  const same = full.filter(k => k.replace(SUF, "").split(" ")[0] === parts[0]);
  if (same.length) suspects.push(`${raw} -> ${same.join(", ")}`);
}
t(`zero unresolved-but-present players (found ${suspects.length})`, suspects.length, 0);
if (suspects.length) suspects.forEach(s => console.log("        " + s));

console.log(`\n${fail === 0 ? "ALL CHECKS PASSED" : `FAILURES: ${fail}`}`);
process.exit(fail === 0 ? 0 : 1);
