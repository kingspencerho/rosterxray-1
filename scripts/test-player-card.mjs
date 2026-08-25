#!/usr/bin/env node
// test-player-card.mjs — guard 14. The player card.
//
// The card is a drill-down on data the grading engine also reads, so it has the
// same two failure modes as every layer added since Jul 26, and one of its own:
//
// 1. CONTEXT-ONLY CONTAINMENT. buildPlayerCard must never be reachable from
//    analyzeRoster or analyzeRedraft. It reads scored inputs (hvt_pg,
//    spike_rate, usable_rate) and a stray call inside the engine would be a
//    scoring leak that no calibration run would obviously catch.
//
// 2. NO BLANK CARDS. A player with no data must come back with a `reason`
//    explaining why. An empty card is the silent-drop failure in a new costume:
//    indistinguishable from a bug, and per the Jul 27 extraction rules a filter
//    that removes something must never be silent.
//
// 3. PERCENTILES MUST BE HONEST. They are ranked within position over a gated
//    population (draftable, 8+ games), which is the same baseline-population
//    decision that biased the Ceiling Shape Layer on its first attempt. Asserted
//    in range, and asserted that the gate is thick enough to rank against.
//
// Run: node scripts/test-player-card.mjs   (exits non-zero on failure)

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";
import os from "os";

const repoRoot = process.cwd();
const tmpDir = path.join(os.tmpdir(), "rxr-card");
mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");

const src = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { buildPlayerCard, CARD_PERCENTILES, cardPercentile, ADP_DATA, PLAYER_METRICS };\n";
const outfile = path.join(tmpDir, "c.mjs");
await build({
  stdin: { contents: src, loader: "jsx", resolveDir: repoRoot, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: {
    "@vercel/analytics/react": path.join(tmpDir, "stub.js"),
    "@vercel/analytics": path.join(tmpDir, "stub.js"),
  },
});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
const app = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${cond || !detail ? "" : `  (${detail})`}`);
  if (!cond) fail++;
};

// ---- 1. containment ----
console.log("context-only containment");
for (const fn of ["analyzeRoster", "analyzeRedraft"]) {
  const i = app.indexOf(`const ${fn} = `);
  const j = app.indexOf("\nconst ", i + 10);
  const body = i === -1 ? "" : app.slice(i, j === -1 ? app.length : j);
  ok(`${fn} does not build player cards`, i > -1 && !body.includes("buildPlayerCard") && !body.includes("CARD_PERCENTILES"));
}
const calls = [...app.matchAll(/buildPlayerCard\(/g)].length;
ok("buildPlayerCard called exactly once (the opener)", calls === 1, `found ${calls}`);
ok("the card renders as a modal, not another results panel",
   app.includes("<PlayerCardModal card={cardPlayer}") && app.includes('position: "fixed", inset: 0'));

// ---- 2. no blank cards ----
console.log("\nno blank cards, ever");
const draftable = Object.entries(e.ADP_DATA).filter(([, v]) => v && v.adp != null && v.adp <= 240);
let blank = [], withData = 0, withReason = 0;
for (const [name, v] of draftable) {
  const c = e.buildPlayerCard(name, v.pos, v.team);
  const has = c.metrics.length || c.descriptive.length || c.efficiency.length || c.qb || c.trajectory;
  if (has) withData++;
  else if (c.reason && c.reason.length > 10) withReason++;
  else blank.push(name);
}
ok(`every draftable player resolves to data or a stated reason (${draftable.length} checked)`,
   blank.length === 0, blank.slice(0, 5).join(", "));
console.log(`       ${withData} with data · ${withReason} with an explicit no-data reason`);
ok("the no-data path is actually exercised", withReason > 0,
   "if this is 0 the reason branch is untested, not unnecessary");

// ---- 3. percentiles ----
console.log("\npercentile honesty");
let outOfRange = [], thin = [];
for (const [pos, byKey] of Object.entries(e.CARD_PERCENTILES)) {
  for (const [key, arr] of Object.entries(byKey)) {
    if (arr.length && arr.length < 12) thin.push(`${pos}.${key} n=${arr.length}`);
    for (const v of arr) {
      const p = e.cardPercentile(pos, key, v);
      if (p != null && (p < 0 || p > 100)) outOfRange.push(`${pos}.${key} -> ${p}`);
    }
  }
}
ok("every percentile lands in 0-100", outOfRange.length === 0, outOfRange.slice(0, 3).join("; "));
ok("thin populations return null rather than a flattering rank", thin.length === 0 || thin.every(t => {
  const [pk, k] = t.split(" ")[0].split(".");
  return e.cardPercentile(pk, k, 1) === null;
}), thin.join(", "));
// A metric where more is better must rank the max at the top.
const wrPop = e.CARD_PERCENTILES.WR.tgt_sh;
ok("the highest target share ranks at the top of its position",
   e.cardPercentile("WR", "tgt_sh", Math.max(...wrPop)) >= 95);

// ---- 4. the specific traps this card exists to avoid ----
console.log("\nknown traps");
const harvey = e.buildPlayerCard("RJ Harvey", "RB", e.ADP_DATA["rj harvey"]?.team);
ok("RJ Harvey leads with a rising trajectory, not his season average",
   harvey.trajectory?.trend === "rising", `trend ${harvey.trajectory?.trend}`);
ok("...and his late window beats the season average he was mis-graded on",
   harvey.trajectory && harvey.trajectory.late > harvey.trajectory.season,
   `season ${harvey.trajectory?.season} late ${harvey.trajectory?.late}`);

// A 2026 mover must be flagged: the metrics row carries the team he PLAYED for.
const movers = draftable
  .map(([n, v]) => [n, v, e.buildPlayerCard(n, v.pos, v.team)])
  .filter(([, , c]) => c.movedFrom);
ok("players who changed teams are flagged on the card", movers.length > 0,
   "the 2025 metrics team vs the 2026 ADP team must be reconciled somewhere");
const badMover = movers.find(([, v, c]) => c.movedFrom === v.team);
ok("...and the flag never fires on a player who did not move", !badMover, badMover?.[0] || "");

// The dimming channel must actually be reachable, or the card teaches the wrong
// lesson by rendering a coin-flip metric at the same weight as an anchor.
const anyEff = draftable.map(([n, v]) => e.buildPlayerCard(n, v.pos, v.team)).find(c => c.efficiency.length);
ok("efficiency rows exist and are routed to the dimmed channel",
   !!anyEff && app.includes("card.efficiency.map") && /card\.efficiency\.map[\s\S]{0,220}dim\s*\/>/.test(app));

console.log(fail ? `\n${fail} failure(s)` : "\nall player-card guards passed");
process.exit(fail ? 1 : 0);
