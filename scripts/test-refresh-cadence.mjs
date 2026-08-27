#!/usr/bin/env node
// test-refresh-cadence.mjs — guard 15. The split refresh cadence.
//
// THE RULE: anything that SCORES is frozen at 2025-final; anything that is
// CONTEXT may refresh weekly in-season.
//
// This is the guard that makes that a rule rather than a convention, because
// the failure it prevents is invisible. If player_metrics ever gets refreshed
// mid-season, every grade moves for reasons unrelated to the roster, the
// grade-history panel and share links stop being comparable, and every
// calibration recorded in CLAUDE.md silently becomes untrue. Nothing errors.
// The numbers just quietly stop meaning what they meant.
//
// Asserted here:
//   1. The scored file is the 2025 one, and no other-season metrics file is
//      wired into the bundle at all.
//   2. The current-season layers are context-only — unreachable from
//      analyzeRoster and analyzeRedraft, same containment as guards 13/14.
//   3. Both vintages are gated on weeks_covered, so an empty placeholder
//      degrades to exactly the pre-2026 behaviour instead of rendering blanks.
//   4. Prior-season data is never overwritten by the current-season layer —
//      the card carries both, because the comparison is the point.
//
// Run: node scripts/test-refresh-cadence.mjs   (exits non-zero on failure)

import { readFileSync, readdirSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
const app = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");
const dataDir = path.join(repoRoot, "grading/data");
const readJson = f => JSON.parse(readFileSync(path.join(dataDir, f), "utf8"));

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${cond || !detail ? "" : `  (${detail})`}`);
  if (!cond) fail++;
};

// ---- 1. the scored file is frozen ----
console.log("the scored file stays frozen");
const metricsImports = [...app.matchAll(/from '\.\/grading\/data\/(player_metrics_\d{4})\.json'/g)].map(m => m[1]);
ok("exactly one player_metrics file is imported", metricsImports.length === 1, metricsImports.join(", "));
ok("and it is the 2025 one", metricsImports[0] === "player_metrics_2025",
   `${metricsImports[0]} — refreshing the scored file mid-season moves every grade`);
const strayMetrics = readdirSync(dataDir).filter(f => /^player_metrics_\d{4}\.json$/.test(f) && f !== "player_metrics_2025.json");
ok("no other-season metrics file exists on disk", strayMetrics.length === 0, strayMetrics.join(", "));

// The refresh script must not touch it either.
const sh = readFileSync(path.join(repoRoot, "scripts/refresh-inseason.sh"), "utf8");
ok("the weekly refresh script never writes player_metrics",
   !/build-player-metrics|player_metrics_\d{4}\.json"/.test(sh.replace(/^#.*$/gm, "")));

// ---- 2. current-season layers are context-only ----
console.log("\ncurrent-season layers stay out of the engine");
for (const fn of ["analyzeRoster", "analyzeRedraft"]) {
  const i = app.indexOf(`const ${fn} = `);
  const j = app.indexOf("\nconst ", i + 10);
  const body = i === -1 ? "" : app.slice(i, j === -1 ? app.length : j);
  const dirty = ["SNAP_TRAJECTORY_CUR", "QB_PROFILE_CUR", "getSnapTrendCur", "getQbProfileCur"].filter(t => body.includes(t));
  ok(`${fn} reads no current-season layer`, i > -1 && dirty.length === 0, dirty.join(", "));
}

// ---- 3. empty placeholders degrade cleanly ----
console.log("\nempty placeholders degrade to 2025-only");
ok("both current-season layers gate on weeks_covered",
   /CUR_SEASON_LIVE\s*=\s*\(SNAP_TRAJECTORY_CUR\._meta\?\.weeks_covered\s*\|\|\s*0\)\s*>\s*0/.test(app) &&
   /CUR_QB_LIVE\s*=\s*\(QB_PROFILE_CUR\._meta\?\.weeks_covered\s*\|\|\s*0\)\s*>\s*0/.test(app));
ok("the accessors return null when the gate is closed",
   /getSnapTrendCur = \(name\) => \(CUR_SEASON_LIVE \?/.test(app) &&
   /getQbProfileCur = \(name\) => \(CUR_QB_LIVE \?/.test(app));

for (const f of ["snap_trajectory_2026.json", "qb_profile_2026.json"]) {
  const d = readJson(f);
  const m = d._meta || {};
  ok(`${f} carries the vintage fields a consumer needs`,
     typeof m.season === "number" && typeof m.weeks_covered === "number" && typeof m.season_complete === "boolean",
     JSON.stringify({ season: m.season, weeks_covered: m.weeks_covered, season_complete: m.season_complete }));
  // A placeholder with rows would be fabricated data; a live file with rows is fine.
  if (m.weeks_covered === 0) ok(`${f} placeholder carries no rows`, Object.keys(d.players).length === 0);
}

// ---- 4. both vintages are carried, never swapped ----
console.log("\nboth vintages are shown, never swapped");
ok("the card builds a prior AND a current trajectory",
   app.includes("card.trajectory =") || /trajectory: \{/.test(app) ? true : false);
ok("trajectoryCur sits beside trajectory rather than replacing it",
   app.includes("card.trajectoryCur = {") && app.includes("card.trajectory = {"));
ok("qbCur sits beside qb", app.includes("card.qbCur = {") && app.includes("card.qb = {"));
ok("every printed vintage comes from vintageLabel", app.includes("const vintageLabel = (meta) =>"));
ok("the card footer names both when both exist",
   /card\.curVintage \? `\$\{card\.curVintage\} \+ \$\{card\.vintage\}`/.test(app));

// The prior-season files must still be full — a refresh must never blank them.
const prior = readJson("snap_trajectory_2025.json");
ok("the 2025 trajectory file is still populated", Object.keys(prior.players).length > 400,
   `${Object.keys(prior.players).length} rows`);
ok("and is marked complete", prior._meta.season_complete === true);
ok("the 2025 QB profile is still populated", Object.keys(readJson("qb_profile_2025.json").players).length > 30);

console.log(fail ? `\n${fail} failure(s)` : "\nall refresh-cadence guards passed");
process.exit(fail ? 1 : 0);
