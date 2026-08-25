#!/usr/bin/env node
// test-snap-trajectory.mjs — guard 13. The snap TRAJECTORY layer.
//
// Guards three separate things, in descending order of how badly a regression
// would hurt:
//
// 1. THE LAYER IS CONTEXT ONLY. It must never reach the numeric scoring engine.
//    Every other data layer added since Jul 26 2026 carries the same promise and
//    the promise is what keeps grades comparable across releases. Asserted
//    structurally: getSnapTrend may be referenced exactly once outside its own
//    definition, and that reference must live inside trajectoryContext (the AI
//    prompt builder). A second call site is a scoring leak even if it looks
//    harmless, so this fails loudly rather than waiting for a calibration run.
//
// 2. THE TREND LABEL MATCHES THE NUMBER. Same class of bug as the Aug 14
//    tier/score divergence: a label that disagrees with the value driving it is
//    worse than no label, because it reads as confirmation. delta must equal
//    late - early, and trend must follow delta against _meta.trend_threshold.
//
// 3. THE THRESHOLD STAYS EARNED. 0.15 is ~1 stdev of the observed delta
//    distribution, which only means something while that distribution stays
//    centered at zero. If a future season drifts, the threshold is measuring
//    league-wide change rather than player-specific change and must be
//    re-derived. Asserted as |median| <= 0.03.
//
// Plus the two regression cases the layer was built for: RJ Harvey and Chris
// Rodriguez were both mis-graded off the season average, in the same direction.
//
// Run: node scripts/test-snap-trajectory.mjs   (exits non-zero on failure)

import { readFileSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
const TRAJ = JSON.parse(readFileSync(path.join(repoRoot, "grading/data/snap_trajectory_2025.json"), "utf8"));
const app = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${cond || !detail ? "" : `  (${detail})`}`);
  if (!cond) fail++;
};

// ---- 1. context-only ----
console.log("context-only containment");
const defs = [...app.matchAll(/const getSnapTrend\s*=/g)].length;
ok("getSnapTrend defined exactly once", defs === 1, `found ${defs}`);
const uses = [...app.matchAll(/getSnapTrend\(/g)].length;
ok("getSnapTrend called exactly once", uses === 1, `found ${uses} call sites — a second one is a scoring leak`);

// The single call site must sit inside trajectoryContext, which is inside the
// AI prompt builder. Bound the search to that const's body.
const tcStart = app.indexOf("const trajectoryContext");
ok("trajectoryContext exists", tcStart > -1);
const tcEnd = app.indexOf('.join("\\n");', tcStart);
const tcBody = tcStart > -1 && tcEnd > -1 ? app.slice(tcStart, tcEnd) : "";
ok("the call site is inside trajectoryContext", tcBody.includes("getSnapTrend("));

// The raw import must not be read anywhere except the accessor and _meta.
const rawReads = [...app.matchAll(/SNAP_TRAJECTORY\b/g)].length;
ok("SNAP_TRAJECTORY referenced only by import + accessor + _meta reads", rawReads <= 5, `found ${rawReads}`);

// Scoring functions must be clean.
for (const fn of ["analyzeRoster", "analyzeRedraft"]) {
  const i = app.indexOf(`const ${fn} = `);
  if (i === -1) { ok(`${fn} located`, false); continue; }
  // Scan forward to the next top-level const declaration.
  const j = app.indexOf("\nconst ", i + 10);
  const body = app.slice(i, j === -1 ? app.length : j);
  ok(`${fn} does not read the trajectory layer`, !body.includes("getSnapTrend") && !body.includes("SNAP_TRAJECTORY"));
}

// ---- 2. label matches number ----
console.log("\ninternal consistency");
const TH = TRAJ._meta.trend_threshold;
ok("_meta.trend_threshold present", typeof TH === "number", String(TH));
let badDelta = [], badTrend = [], badWindow = [];
for (const [name, p] of Object.entries(TRAJ.players)) {
  if (p.delta == null) {
    if (p.trend !== null) badTrend.push(`${name}: null delta but trend ${p.trend}`);
    continue;
  }
  if (Math.abs(p.delta - (p.late - p.early)) > 0.0011) badDelta.push(`${name}: ${p.delta} != ${p.late} - ${p.early}`);
  const want = p.delta >= TH ? "rising" : p.delta <= -TH ? "falling" : "stable";
  if (p.trend !== want) badTrend.push(`${name}: delta ${p.delta} should be ${want}, is ${p.trend}`);
  // A delta is only meaningful with real samples on both sides.
  if (p.early_gp < TRAJ._meta.min_window_gp || p.late_gp < TRAJ._meta.min_window_gp)
    badWindow.push(`${name}: delta reported on ${p.early_gp}/${p.late_gp} games`);
}
ok("delta == late - early for every player", badDelta.length === 0, badDelta.slice(0, 3).join("; "));
ok("trend label follows delta for every player", badTrend.length === 0, badTrend.slice(0, 3).join("; "));
ok("no delta reported on an under-sampled window", badWindow.length === 0, badWindow.slice(0, 3).join("; "));

// ---- 3. threshold still earned ----
console.log("\nthreshold calibration");
const deltas = Object.values(TRAJ.players).map(p => p.delta).filter(d => d != null).sort((a, b) => a - b);
const median = deltas[Math.floor(deltas.length / 2)];
ok("delta distribution centered at zero", Math.abs(median) <= 0.03,
   `median ${median.toFixed(3)} — if this drifts, the threshold measures league-wide change, not player change`);
ok("threshold sits near 1 stdev of the distribution", (() => {
  const m = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const sd = Math.sqrt(deltas.reduce((a, b) => a + (b - m) ** 2, 0) / (deltas.length - 1));
  return Math.abs(TH - sd) <= 0.05;
})(), `threshold ${TH}`);
ok("flags the tails, not the middle", (() => {
  const flagged = deltas.filter(d => Math.abs(d) >= TH).length / deltas.length;
  return flagged > 0.10 && flagged < 0.40;
})());

// ---- 4. the two regressions this was built for ----
console.log("\nregression cases (both mis-graded off the season average)");
const harvey = TRAJ.players["rj harvey"];
ok("RJ Harvey present", !!harvey);
if (harvey) {
  ok("RJ Harvey reads as rising", harvey.trend === "rising", `trend ${harvey.trend}`);
  ok("RJ Harvey late window well above his season average", harvey.late - harvey.season > 0.10,
     `season ${harvey.season} vs late ${harvey.late} — the average is what made him read as a timeshare`);
}
const crod = TRAJ.players["chris rodriguez"];
ok("Chris Rodriguez present", !!crod);
if (crod) ok("Chris Rodriguez reads as rising", crod.trend === "rising", `trend ${crod.trend}`);

// Suffix handling: the ADP tables carry suffixes nflverse drops, and vice versa.
// lookupPlayer strips them, but the file must not contain BOTH spellings or one
// of them becomes unreachable dead data.
const dupes = Object.keys(TRAJ.players).filter(k => /\s(jr|sr|ii|iii|iv|v)$/.test(k))
  .filter(k => TRAJ.players[k.replace(/\s(jr|sr|ii|iii|iv|v)$/, "")]);
ok("no player filed under both suffixed and bare spellings", dupes.length === 0, dupes.join(", "));

console.log(fail ? `\n${fail} failure(s)` : "\nall snap-trajectory guards passed");
process.exit(fail ? 1 : 0);
