#!/usr/bin/env node
// test-extraction-filters.mjs — guards the SCREENSHOT path, which has no other test.
//
// Context (Jul 27 2026): Cam Skattebo vanished from an 18-man best-ball upload
// while the UI reported "17/17 matched". findPlayer resolved him in all three
// formats and every text paste format kept him, so the parser was never the
// problem. The loss happened upstream, between the model reading the image and
// the text reaching parseRoster — a stretch of code with two blunt filters and
// zero test coverage.
//
// These filters exist for a real reason (models leak "Here is the roster from
// image.png" into the array), but they match by SUBSTRING and by PREFIX, and a
// filter that drops a real player is worse than one that lets junk through:
// junk lands in the notFound list where a human sees it, whereas a filtered
// name is gone with no trace and the match counter still reads N/N because it
// counts what survived.
//
// Run: node scripts/test-extraction-filters.mjs   (exits non-zero on failure)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const repoRoot = process.cwd();
const tmpDir = path.join(os.tmpdir(), "rxr-probe"); mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const src = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { findPlayer, parseRoster, ADP_DATA, ADP_YAHOO, ADP_SUPERFLEX };\n";
const outfile = path.join(tmpDir, "extract.mjs");
await build({ stdin:{contents:src,loader:"jsx",resolveDir:repoRoot,sourcefile:"App.jsx.jsx"},
  bundle:true, platform:"node", format:"esm", outfile, logLevel:"silent",
  alias:{"@vercel/analytics/react":path.join(tmpDir,"stub.js"),"@vercel/analytics":path.join(tmpDir,"stub.js")}});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

let fail = 0;
const report = (label, offenders, note) => {
  const ok = offenders.length === 0;
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    console.log(`        ${note}`);
    console.log(`        ${offenders.length} affected: ${offenders.slice(0, 20).join(", ")}${offenders.length > 20 ? " …" : ""}`);
  }
};

// Every name the app can possibly grade, in the Title Case a model returns.
const titleCase = (k) => k.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
const allNames = [...new Set([
  ...Object.keys(e.ADP_DATA), ...Object.keys(e.ADP_YAHOO), ...Object.keys(e.ADP_SUPERFLEX),
])].map(titleCase);
console.log(`Auditing ${allNames.length} distinct player names.\n`);

// ---- Filter 1: JUNK_TOKENS (App.jsx handleExtract, runs on EVERY path) ----
// Mirrors the live list. Substring matching is the hazard being tested.
const JUNK_TOKENS = [
  "here is", "here are", "extracted", "image", "requested", "information",
  "following", "roster", "screenshot", ".png", ".jpg", ".jpeg", "json",
  "sure", "i've", "i have", "below", "these are", "the player", "list of",
  "based on", "no player", "unable", "cannot", "could not",
];
console.log("=== 1. JUNK_TOKENS substring filter ===");
report(
  "no real player name contains a junk token",
  allNames.filter(n => JUNK_TOKENS.some(t => n.toLowerCase().includes(t))),
  "these are dropped silently before parsing — substring match, not word match"
);

// ---- Filter 2: trailing-period rule ----
console.log("\n=== 2. trailing-period rule ===");
report(
  "no real name is dropped for ending in a period",
  allNames.filter(n => /\.$/.test(n) && !/\bjr\.$|\bsr\.$|\bii\.$|\biii\.$/i.test(n.toLowerCase())),
  "names ending in a period are treated as prose"
);

// ---- Filter 3: length cap, WITH a pick number appended ----
// The model returns "Name 194", so the cap applies to the combined string.
console.log("\n=== 3. length cap (30) with pick number appended ===");
report(
  "no name exceeds the cap once a 3-digit pick is appended",
  allNames.filter(n => `${n} 194`.length > 30),
  "the extractor emits 'Name Pick', so the cap must clear the longest name + 4"
);

// ---- Filter 4: Strategy-3 position-header regex ----
// MIRROR of the regex in App.jsx handleExtract Strategy 3. It lives inside a
// closure and is not exported, so this copy must be kept in step by hand — if
// you change it there, change it here.
//
// The original was unanchored: /^(QB|RB|WR|TE|Round|Pick|ADP|Bye)/i, which
// matched any name merely STARTING with those letters and silently ate six real
// players via the TE branch. Anchoring to the whole line keeps the filter's job
// (killing bare column headers) without touching names.
const POS_HEADER_LINE = /^(QB|RB|WR|TE|Round|Pick|ADP|Bye)\s*\d*$/i;
console.log("\n=== 4. Strategy-3 position-header regex ===");
report(
  "no real name is dropped by the position-header test",
  allNames.filter(n => POS_HEADER_LINE.test(n)),
  "regex is matching names, not just headers"
);
// The filter must still do the thing it exists for.
report(
  "bare column headers are still filtered",
  ["QB","RB","WR","TE","Pick","ADP","Bye","Bye 12","Round 3"].filter(h => !POS_HEADER_LINE.test(h)),
  "these header lines would now leak into the player list"
);
// The six names the old regex ate.
report(
  "the six previously-eaten names now pass",
  ["Tee Higgins","Tetairoa McMillan","Terry McLaurin","Ted Hurst","Terrance Ferguson","Tez Johnson"]
    .filter(n => POS_HEADER_LINE.test(n)),
  "still being dropped by the header test"
);

// ---- Filter 5: end to end through the real parser ----
// Batched in 18s so each probe is shaped like an actual roster paste.
console.log("\n=== 5. end-to-end: does every name survive parseRoster? ===");
const norm = (s) => s.toLowerCase().replace(/[.,']/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
for (const [tbl, fmt] of [["ADP_DATA","standard"],["ADP_YAHOO","yahoo"],["ADP_SUPERFLEX","superflex"]]) {
  const keys = Object.keys(e[tbl]).map(titleCase);
  const dropped = [];
  for (let i = 0; i < keys.length; i += 18) {
    const batch = keys.slice(i, i + 18);
    const out = e.parseRoster(batch.join("\n"), fmt);
    const got = new Set(out.map(p => norm(p.name || "")));
    // A resolved alias counts as survival — we care about vanishing, not renaming.
    const gotLast = new Set([...got].map(g => g.split(" ").pop()));
    batch.forEach(k => {
      const nk = norm(k);
      if (!got.has(nk) && !gotLast.has(nk.split(" ").pop())) dropped.push(k);
    });
  }
  report(`${tbl} (${keys.length} names) all survive`, dropped, "silently dropped by parseRoster");
}

// ---- The specific regression ----
console.log("\n=== 6. the reported case ===");
const skat = ["standard","yahoo","superflex"].map(f => e.findPlayer("Cam Skattebo", f));
report("Cam Skattebo resolves in all three formats", skat.map((r,i) => r ? null : ["standard","yahoo","superflex"][i]).filter(Boolean),
  "findPlayer returned null");
report("Cam Skattebo survives the junk filter",
  JUNK_TOKENS.some(t => "cam skattebo".includes(t)) ? ["Cam Skattebo"] : [],
  "dropped by JUNK_TOKENS");

console.log(fail === 0 ? "\nAll extraction-filter checks passed." : `\n${fail} check(s) FAILED.`);
process.exit(fail === 0 ? 0 : 1);
