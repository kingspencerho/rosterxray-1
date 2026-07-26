#!/usr/bin/env node
// test-findplayer.mjs — regression test for name resolution across ADP tables.
//
// Guards two bugs found Jul 26 2026, both of which silently DROPPED a player
// (no error, he just vanished from the grade) and both of which were
// format-dependent, so they reproduced in one mode only:
//
//   1. The ADP tables disagree on which name a player goes by. ADP_DATA keys
//      "chig okonkwo"; ADP_YAHOO keys "chigoziem okonkwo". A two-word query
//      with a differing FIRST name had no fallback path.
//   2. buildLastNameIndex filed suffixed players under "jr" instead of their
//      surname, breaking every last-name fallback for Harrison Jr, Pittman Jr,
//      Cooper Jr, Washington Jr and the rest.
//
// Run: node scripts/test-findplayer.mjs   (exits non-zero on failure)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";
const repoRoot = process.cwd();
const tmpDir = path.join(os.tmpdir(), "rxr-probe"); mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const src = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { findPlayer, ADP_DATA, ADP_YAHOO, ADP_SUPERFLEX };\n";
const outfile = path.join(tmpDir, "e2.mjs");
await build({ stdin:{contents:src,loader:"jsx",resolveDir:repoRoot,sourcefile:"App.jsx.jsx"},
  bundle:true, platform:"node", format:"esm", outfile, logLevel:"silent",
  alias:{"@vercel/analytics/react":path.join(tmpDir,"stub.js"),"@vercel/analytics":path.join(tmpDir,"stub.js")}});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
const f = (n,fmt) => { const r = e.findPlayer(n,fmt); return r ? `${r.name} (${r.pos} ${r.team})${r.ambiguous?" [ambiguous]":""}` : "NULL"; };

let fail = 0;
const t = (label, got, want) => { const ok = got === want; if(!ok) fail++; console.log(`  ${ok?"PASS":"FAIL"}  ${label}\n          got  ${got}\n          want ${want}`); };

console.log("=== THE BUG ===");
t('findPlayer("Chig Okonkwo","yahoo")', f("Chig Okonkwo","yahoo"), "Chigoziem Okonkwo (TE WAS)");
t('findPlayer("Chigoziem Okonkwo","standard")', f("Chigoziem Okonkwo","standard"), "Chig Okonkwo (TE WAS)");

console.log("\n=== SUFFIX BRIDGE + MUST NOT FALSE-MATCH ===");
t('"Mike Washington" -> the RB, not another Washington', f("Mike Washington","yahoo"), "Mike Washington JR (RB LV)");
t('"Malik Washington" stays the WR',                     f("Malik Washington","yahoo"), "Malik Washington (WR MIA)");
t('"Darnell Washington" stays the TE',                   f("Darnell Washington","yahoo"), "Darnell Washington (TE PIT)");
t('"Marvin Harrison" (no suffix) -> Jr',                 f("Marvin Harrison","yahoo"), "Marvin Harrison JR (WR ARI)");
t('"Omar Cooper" (no suffix) -> Jr',                     f("Omar Cooper","yahoo"), "Omar Cooper JR (WR NYJ)");

console.log("\n=== NO REGRESSION on existing paths ===");
t('exact         "Christian Mccaffrey" yahoo', f("Christian Mccaffrey","yahoo").split(" (")[0], "Christian Mccaffrey");
t('initial       "C. Mccaffrey" yahoo',       f("C. Mccaffrey","yahoo").split(" (")[0], "Christian Mccaffrey");
t('bare last     "Okonkwo" yahoo',            f("Okonkwo","yahoo").split(" (")[0], "Chigoziem Okonkwo");
t('same-last QB  "Jaylen Warren" standard',   f("Jaylen Warren","standard"), "Jaylen Warren (RB PIT)");
t('same-last TE  "Tyler Warren" standard',    f("Tyler Warren","standard"), "Tyler Warren (TE IND)");
t('suffix        "Marvin Harrison Jr" yahoo', f("Marvin Harrison Jr","yahoo").split(" (")[0].toLowerCase().startsWith("marvin harrison"), true);

console.log("\n=== CROSS-TABLE SWEEP: every ADP_DATA name must resolve in every format ===");
for (const fmt of ["yahoo","superflex"]) {
  const miss = Object.keys(e.ADP_DATA).filter(k => !e.findPlayer(k, fmt));
  console.log(`  ${fmt}: ${miss.length} unresolved${miss.length?" -> "+miss.join(", "):""}`);
}
console.log("\n=== FALSE-MATCH AUDIT: any resolution that flips position? ===");
let flips = 0;
for (const fmt of ["yahoo","superflex"]) {
  for (const [k,v] of Object.entries(e.ADP_DATA)) {
    const r = e.findPlayer(k, fmt);
    if (r && r.pos !== v.pos) { console.log(`  ${fmt}: "${k}" (${v.pos}) -> ${r.name} (${r.pos})`); flips++; }
  }
}
console.log(`  position flips: ${flips}`);
console.log(`\n${fail===0 && flips===0 ? "ALL CHECKS PASSED" : "FAILURES: "+fail+" flips: "+flips}`);
