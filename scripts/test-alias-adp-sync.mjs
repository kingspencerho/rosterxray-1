#!/usr/bin/env node
// test-alias-adp-sync.mjs — fails when ONE player is listed twice in the same
// ADP table under two spellings that carry DIFFERENT numbers.
//
// Why this exists (Aug 3 2026): three of these were live at once, and two were
// introduced by the Aug 2 ADP_SUPERFLEX refresh itself:
//
//   ADP_SUPERFLEX  "kenneth gainwell" 117    vs "kenny gainwell" 111.0
//   ADP_SUPERFLEX  "chig okonkwo"     138.0  vs "chigoziem okonkwo" 127
//   ADP_YAHOO      "kenneth gainwell" 113.1  vs "kenny gainwell" 104.0
//
// The mechanism is the same every time. A refresh source prints ONE spelling —
// 4for4 uses the legal name, the platforms print the nickname — so the update
// lands on one key and the other keeps whatever it had. Nothing errors. The
// grade is simply computed against a stale ADP whenever the user happens to
// paste the other spelling, which for Gainwell is the spelling Yahoo and
// Underdog actually print. A 9-pick delta error silently flips a value into a
// reach.
//
// This is the ADP-table sibling of test-no-duplicate-keys.mjs. That one catches
// the SAME key twice (JS keeps the last). This one catches the same PERSON
// twice (both survive, and findPlayer returns whichever the query matched).
//
// THE ALLOWLIST IS THE WHOLE DESIGN PROBLEM. Same surname, same position and
// same team is a strong signal of one player double-listed — but it is not
// proof. Bijan Robinson and Brian Robinson are both ATL RBs and their ADPs
// SHOULD differ by 160 picks. So genuinely distinct players are listed below
// and skipped. Add to it only when you have confirmed two real humans; never
// add a pair just to silence the check, because the thing being silenced is a
// wrong ADP feeding a real grade.
//
// If this fails: find which value came from the newer source (git blame the two
// lines — the refresh commit is usually right there) and copy the fresher
// number onto the other key. Keep BOTH keys. Deleting one saves nothing and
// costs a lookup for anyone who types that spelling.
//
// Run: node scripts/test-alias-adp-sync.mjs   (exits non-zero on failure)
import { readFileSync } from "fs";

const src = readFileSync("App.jsx", "utf8");

// Confirmed DIFFERENT people who collide on surname + pos + team.
// Format: sorted pair of normalized keys.
const DISTINCT_PLAYERS = new Set([
  "bijan robinson|brian robinson", // ATL RBs, both real, ADPs correctly ~160 apart
]);

const TABLES = ["ADP_DATA", "ADP_SUPERFLEX", "ADP_YAHOO"];
const SUFFIX_RE = /\s+(jr|sr|ii|iii|iv|v)$/;
const strip = (k) => k.replace(SUFFIX_RE, "").replace(/[.']/g, "").trim();

function parseTable(name) {
  const m = new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`).exec(src);
  if (!m) throw new Error(`${name} not found in App.jsx`);
  const body = m[1];
  const startLine = src.slice(0, src.indexOf(body)).split("\n").length;
  const out = [];
  body.split("\n").forEach((L, i) => {
    const e = /^\s*"([^"]+)":\s*\{\s*adp:\s*([\d.]+),\s*pos:\s*"([A-Z]+)",\s*team:\s*"([A-Z]+)"/.exec(L);
    if (e) out.push({ key: e[1], adp: parseFloat(e[2]), pos: e[3], team: e[4], line: startLine + i });
  });
  return out;
}

const fails = [];
let pairsChecked = 0;

for (const tableName of TABLES) {
  const entries = parseTable(tableName);
  const byLast = new Map();
  for (const e of entries) {
    const parts = strip(e.key).split(" ");
    const last = parts[parts.length - 1];
    if (!byLast.has(last)) byLast.set(last, []);
    byLast.get(last).push(e);
  }

  for (const group of byLast.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        // Only a candidate if the app itself treats them as interchangeable:
        // same position AND same team. Different team or position means the
        // tables already disagree about something bigger than ADP.
        if (a.pos !== b.pos || a.team !== b.team) continue;
        const pair = [strip(a.key), strip(b.key)].sort().join("|");
        if (DISTINCT_PLAYERS.has(pair)) continue;
        pairsChecked++;
        if (a.adp !== b.adp) {
          fails.push({ table: tableName, a, b });
        }
      }
    }
  }
}

if (fails.length === 0) {
  console.log(`PASS  ${pairsChecked} same-player key pairs checked across ${TABLES.length} ADP tables — all ADPs agree`);
  process.exit(0);
}

console.log(`FAIL  ${fails.length} player(s) listed twice with DIFFERENT ADP:\n`);
for (const f of fails) {
  console.log(`  ${f.table}`);
  console.log(`      "${f.a.key}"  adp ${f.a.adp}   L${f.a.line}`);
  console.log(`      "${f.b.key}"  adp ${f.b.adp}   L${f.b.line}`);
  console.log(`      ${f.a.pos} ${f.a.team} — delta ${Math.abs(f.a.adp - f.b.adp).toFixed(1)} picks`);
  console.log();
}
console.log("Copy the value from the NEWER source onto both keys (git blame the two");
console.log("lines to see which refresh wrote which). Keep both keys.");
console.log("If these are genuinely two different people, add the pair to");
console.log("DISTINCT_PLAYERS at the top of this file — with a comment saying why.");
process.exit(1);
