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
// Run: node scripts/test-findplayer.mjs   (exits non-zero on failure -- see the
//      note at the foot of this file: that was NOT true until Sep 2 2026)
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

console.log("\n=== STEP 5: SINGLE-CHARACTER SURNAME REPAIR (added Sep 2 2026) ===");
// Greg Dulcich came off a roster SCREENSHOT as "Greg Dulchich" -- one inserted
// 'h' -- and showed as UNMATCHED while the correct key sat in all three tables.
// Step 5 repairs a one-edit surname, and the gates below are what keep it from
// being worse than the miss it replaces.
t('the reported bug  "Greg Dulchich"',      f("Greg Dulchich"), "Greg Dulcich (TE MIA)");
t('  ...in superflex',                      f("Greg Dulchich","superflex"), "Greg Dulcich (TE MIA)");
t('  ...in yahoo',                          f("Greg Dulchich","yahoo"), "Greg Dulcich (TE MIA)");
t('substitution     "Malik Nabors"',        f("Malik Nabors"), "Malik Nabers (WR NYG)");
t('deletion         "Brenton Strang"',      f("Brenton Strang"), "Brenton Strange (TE JAX)");
t('transposition    "Nicholas Singelton"',  f("Nicholas Singelton"), "Nicholas Singleton (RB TEN)");

// ⚠️ THESE ARE THE POINT OF THE RULE. Each pair below is two DIFFERENT real
// players whose surnames sit one edit apart. A wrong match grades the wrong
// player and is STRICTLY WORSE THAN A MISS, so every one must stay null.
// hurts/hurst is the transposition case and both were on a real user roster.
for (const q of ["Breece Hill","Breece All","Chris Dell","Tank Bell","Rashee Price",
                 "Jack Beck","Jakobi Lance","Jalen Hurst","Ted Hurts"]) {
  t(`must NOT cross players "${q}"`, f(q), "NULL");
}
// ⚠️ THE FIRST-NAME GATE MUST BE PREFIX-COMPATIBLE, NEVER A SHARED INITIAL.
// This is the documented Washington precedent carried into step 5: the table
// holds Mike (RB LV), Malik (WR MIA) and Darnell (TE PIT) Washington, so a
// one-edit surname query has three candidates and only the first name separates
// them. Under prefix matching each resolves to its own player; loosen the gate
// to a shared initial and mike/malik collide, the query goes ambiguous, and all
// three of these become misses. Without these three cases that gate is
// untested -- verified by sabotage, which is how the omission was found.
t('prefix gate       "Mike Washingtan"',    f("Mike Washingtan","yahoo"), "Mike Washington JR (RB LV)");
t('prefix gate       "Malik Washingtan"',   f("Malik Washingtan","yahoo"), "Malik Washington (WR MIA)");
t('prefix gate       "Darnell Washingtan"', f("Darnell Washingtan","yahoo"), "Darnell Washington (TE PIT)");
// Ambiguity is a miss, never a guess: "kenneth walker" and "kenneth walker iii"
// are both in the table, so two candidates survive and step 5 declines.
t('ambiguous -> null "Kenneth Waller"', f("Kenneth Waller"), "NULL");
// Below the length floor, so never attempted at all. Every measured collision
// between two different players involves a surname shorter than 6.
t('short surname     "Puka Nacau"',     f("Puka Nacau"), "NULL");
// One token has no first name to confirm against -- guessing from a lone
// misspelled surname is exactly how "mike washington" would become "malik".
t('single token      "Dulchich"',       f("Dulchich"), "NULL");

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
const failed = fail !== 0 || flips !== 0;
console.log(`\n${failed ? "FAILURES: "+fail+" flips: "+flips : "ALL CHECKS PASSED"}`);
// ⚠️ THIS GUARD COULD NOT FAIL UNTIL Sep 2 2026, AND ITS OWN HEADER SAID IT COULD.
//
// It printed "FAILURES: n" and exited 0, so `npm test` ran it second in the
// chain and moved straight on. It is the ONLY guard in scripts/ that was
// missing an exit call -- every other one carries `process.exit(fail ? 1 : 0)`.
// Found by negative-testing four separate gates of findPlayer step 5: all four
// sabotages "passed", which is impossible, and the guard was the thing at fault
// rather than the code under test.
//
// The lesson is the one this repo has now recorded four times in different
// costumes: a guard that cannot fail is worse than no guard, because it also
// buys false confidence. WHENEVER YOU ADD ASSERTIONS TO A GUARD FILE, SABOTAGE
// THE CODE AND CONFIRM THE RUN ACTUALLY EXITS NON-ZERO before trusting it.
process.exit(failed ? 1 : 0);
