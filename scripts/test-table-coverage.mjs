#!/usr/bin/env node
// test-table-coverage.mjs — a player known to the app must be REACHABLE in every
// format where he is draftable.
//
// WHY THIS EXISTS
//   The other ADP guards check that the three tables AGREE. test-alias-adp-sync
//   catches the same person listed twice with different numbers;
//   test-no-duplicate-keys catches the same key twice. Both compare players who
//   are PRESENT in more than one place.
//
//   Nothing checked whether a player was present at all — and absence is the
//   worse failure, because it is SILENT. A disagreement prints two numbers and a
//   human eventually notices one looks wrong. An absence prints nothing: the
//   player is dropped from the grade, no error is raised, and the match counter
//   still reads clean. That is the exact class CLAUDE.md calls out under
//   "Silent-Drop Bugs": a filtered name must never be silent.
//
//   Two shipped in one day (Aug 15 2026) and BOTH were found by a real roster
//   hitting them rather than by a test:
//     - Ja'Kobi Lane      present in ADP_DATA + ADP_YAHOO, absent from SUPERFLEX
//     - Elic Ayomanor     present in ADP_YAHOO ONLY, invisible to best ball
//
//   The cause is structural and will recur: the three tables are sourced
//   separately (Underdog / 4for4 / a redraft board), so adding a player from one
//   source never forces the other two to keep up.
//
// WHAT IT CHECKS
//   For every key in any of the three tables, ask findPlayer — the real lookup,
//   aliases and all — to resolve it in each format. A miss is a failure.
//
// THE DRAFTABILITY THRESHOLD IS THE WHOLE DESIGN
//   ADP_YAHOO is a redraft table and carries a much deeper tail (306 entries
//   against 273) — names at ADP 260-300 that no best-ball drafter will ever
//   reach. Failing on those would make the test noise, and a noisy guard gets
//   ignored, which is how eleven duplicate keys accumulated behind eleven build
//   warnings.
//
//   So the bar is draftability, not mere presence: an 18-round, 12-team best
//   ball draft is 216 picks, and a miss only fails when the player's known ADP
//   is at or under DRAFTABLE_MAX. Deep redraft-only tail names are reported as
//   INFO and do not fail the run.
//
// IF THIS FAILS
//   Add the player to the table he is missing from. If no real quote for that
//   format exists, carry the value over from the table he WAS found in and
//   comment it as an estimate — for anyone at ADP 200+ that is harmless, because
//   adpFlags excludes adp >= 200 from reach/value logic entirely, so the number
//   only drives resolution and ordering. A player who is present with an
//   approximate price is strictly better than a player who vanishes.

import { build } from "esbuild";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DRAFTABLE_MAX = 240;   // 18 rounds x 12 teams = 216, plus margin

// Players legitimately absent from a format. Keep this SHORT and give every
// entry a reason — an allowlist that grows without justification is how a guard
// stops guarding.
const ALLOW = new Map([
  ["keenan allen", "no team in the data (FA) — nothing to grade a matchup against"],
  ["najee harris", 'team reads "-" — unresolved roster status, not a coverage gap'],
]);

const tmpDir = path.join(repoRoot, "node_modules", ".cache", "rosterxray-coverage");
mkdirSync(tmpDir, { recursive: true });

const res = await build({
  entryPoints: [path.join(repoRoot, "App.jsx.jsx")],
  bundle: true, write: false, format: "esm", platform: "node",
  jsx: "transform", loader: { ".jsx": "jsx" },
  external: ["react", "react-dom", "react/jsx-runtime", "lucide-react", "recharts", "html2canvas"],
  footer: { js: "export { ADP_DATA, ADP_SUPERFLEX, ADP_YAHOO, findPlayer };" },
});
const bundlePath = path.join(tmpDir, "app.mjs");
writeFileSync(bundlePath, res.outputFiles[0].text);
const app = await import(pathToFileURL(bundlePath).href);

const TABLES = {
  ADP_DATA: { table: app.ADP_DATA, format: "standard", label: "best ball" },
  ADP_SUPERFLEX: { table: app.ADP_SUPERFLEX, format: "superflex", label: "superflex" },
  ADP_YAHOO: { table: app.ADP_YAHOO, format: "yahoo", label: "redraft" },
};

const keys = new Set();
for (const { table } of Object.values(TABLES)) for (const k of Object.keys(table)) keys.add(k);

const failures = [];
const info = [];

for (const key of [...keys].sort()) {
  const source = TABLES.ADP_DATA.table[key] || TABLES.ADP_SUPERFLEX.table[key] || TABLES.ADP_YAHOO.table[key];
  const adp = source?.adp;
  const presentIn = Object.entries(TABLES).filter(([, v]) => v.table[key]).map(([n]) => n);

  for (const [name, { format, label }] of Object.entries(TABLES)) {
    if (app.findPlayer(key, format)) continue;
    const row = { key, adp, pos: source?.pos, team: source?.team, name, label, presentIn };
    if (ALLOW.has(key)) continue;
    if (adp != null && adp <= DRAFTABLE_MAX) failures.push(row);
    else info.push(row);
  }
}

if (info.length) {
  console.log(`INFO  ${info.length} key(s) unresolvable in some format but past the draftable range (ADP > ${DRAFTABLE_MAX}) — not a failure:`);
  const byKey = new Map();
  for (const r of info) byKey.set(r.key, r);
  for (const r of [...byKey.values()].slice(0, 8)) {
    console.log(`        ${r.key} (${r.pos} ${r.team}, adp ${r.adp}) — only in ${r.presentIn.join(", ")}`);
  }
  if (byKey.size > 8) console.log(`        ...and ${byKey.size - 8} more`);
  console.log("");
}

if (failures.length) {
  console.error(`FAIL  ${failures.length} draftable player(s) unreachable in a format they should resolve in:\n`);
  for (const f of failures) {
    console.error(`  "${f.key}"  ${f.pos} ${f.team}  adp ${f.adp}`);
    console.error(`      present in: ${f.presentIn.join(", ")}`);
    console.error(`      MISSING from ${f.name} — findPlayer returns null in ${f.label}, so a`);
    console.error(`      ${f.label} roster containing him loses him with no error shown.\n`);
  }
  console.error("Fix: add him to the missing table. If no real quote exists for that format,");
  console.error("carry the value across and comment it as an estimate — at ADP 200+ the number");
  console.error("drives resolution only, since adpFlags excludes adp >= 200 from delta logic.");
  process.exit(1);
}

console.log(`PASS  ${keys.size} keys checked across 3 tables — every draftable player resolves in every format`);
