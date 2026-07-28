#!/usr/bin/env node
// test-no-duplicate-keys.mjs — fails if any top-level data table in App.jsx
// declares the same key twice.
//
// Why this exists (Jul 27 2026): App.jsx carried 11 duplicate keys across
// ADP_DATA and SITUATIONS. In a JS object literal the LAST declaration wins
// silently, so the file read one way and behaved another — xavier worthy was
// written as adp 96 on line 142 and as 110.0 on line 162, and 110.0 was what
// actually graded. Two SITUATIONS pairs outright contradicted each other
// (jk dobbins: "Harvey clearly ahead in depth chart" vs "Coleman is the
// primary upside play").
//
// esbuild and vite both warn about this already. Nobody reads warnings in a
// 500KB file that emits eleven of them every build, which is exactly how they
// accumulated. A failing test is the version that gets noticed.
//
// If this fails: the LAST occurrence is what currently runs. Keep that one and
// delete the earlier line, unless you have a source saying otherwise — deleting
// the dead copy is behavior-preserving, changing which one wins is not.
//
// Run: node scripts/test-no-duplicate-keys.mjs   (exits non-zero on failure)
import { readFileSync } from "fs";

const lines = readFileSync("App.jsx", "utf8").split("\n");
const DECL = /^const ([A-Z][A-Z0-9_]*)\s*=\s*\{/;

let table = null, depth = 0, seen = new Map();
const dups = [];

for (let i = 0; i < lines.length; i++) {
  const L = lines[i];
  const d = DECL.exec(L);
  if (d && depth === 0) { table = d[1]; depth = 1; seen = new Map(); continue; }
  if (!table) continue;
  depth += (L.match(/\{/g) || []).length - (L.match(/\}/g) || []).length;
  if (depth <= 0) { table = null; continue; }
  const k = /^\s*"([^"]+)"\s*:/.exec(L);
  if (!k) continue;
  const key = k[1];
  // Only flag keys at the table's own nesting level; nested config objects
  // legitimately reuse names like "W15" across different parents.
  if (depth !== 1) continue;
  if (seen.has(key)) dups.push({ table, key, first: seen.get(key), dup: i + 1 });
  else seen.set(key, i + 1);
}

if (dups.length === 0) {
  console.log("PASS  no duplicate keys in any top-level data table");
  process.exit(0);
}

console.log(`FAIL  ${dups.length} duplicate key(s) — the LATER line silently wins:\n`);
for (const d of dups) {
  console.log(`  ${d.table}  "${d.key}"`);
  console.log(`      L${d.first}  dead — never read`);
  console.log(`      L${d.dup}  this is what actually runs`);
}
process.exit(1);
