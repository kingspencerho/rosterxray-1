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

import { readFileSync, readdirSync, existsSync } from "fs";
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
  const dirty = ["SNAP_TRAJECTORY_CUR", "QB_PROFILE_CUR", "VOLUME_CUR",
                 "getSnapTrendCur", "getQbProfileCur", "getVolumeCur"].filter(t => body.includes(t));
  ok(`${fn} reads no current-season layer`, i > -1 && dirty.length === 0, dirty.join(", "));
}

// ---- 3. empty placeholders degrade cleanly ----
console.log("\nempty placeholders degrade to 2025-only");
ok("both current-season layers gate on weeks_covered",
   /CUR_SEASON_LIVE\s*=\s*\(SNAP_TRAJECTORY_CUR\._meta\?\.weeks_covered\s*\|\|\s*0\)\s*>\s*0/.test(app) &&
   /CUR_QB_LIVE\s*=\s*\(QB_PROFILE_CUR\._meta\?\.weeks_covered\s*\|\|\s*0\)\s*>\s*0/.test(app) &&
   /CUR_VOLUME_LIVE\s*=\s*\(VOLUME_CUR\._meta\?\.weeks_covered\s*\|\|\s*0\)\s*>\s*0/.test(app));
ok("the accessors return null when the gate is closed",
   /getSnapTrendCur = \(name\) => \(CUR_SEASON_LIVE \?/.test(app) &&
   /getQbProfileCur = \(name\) => \(CUR_QB_LIVE \?/.test(app) &&
   /getVolumeCur = \(name\) => \(CUR_VOLUME_LIVE \?/.test(app));

for (const f of ["snap_trajectory_2026.json", "qb_profile_2026.json", "volume_2026.json"]) {
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


// ---- 5. THE VOLUME TWIN IS A TWIN, NOT A REPLACEMENT ----
// The whole reason this file exists is that the SCORED metrics file is frozen
// all season, so its anchors describe last season for the whole of this one.
// The fix is a context copy rendered BESIDE the frozen one, never instead of
// it. Two ways that goes wrong and both are silent:
//   - the current figure replaces the prior one on the card, and the reader
//     cannot tell which season a number describes
//   - the current figure is ranked against the 2025 percentile population,
//     printing a rank under a population that does not describe it
console.log("\nthe volume twin renders beside 2025, never instead of it");

ok("the card row takes a separate `cur` value",
   /const CardMetricRow = \(\{[^}]*\bcur\b/.test(app),
   "one value slot means one vintage, and the comparison is the finding");
ok("both vintages render when both exist",
   /\{cur != null && <>[\s\S]{0,240}\{value\}/.test(app) && /\{cur != null \? cur : value\}/.test(app));
ok("the current-season figure carries NO percentile",
   !/pct: cardPercentile\(pos, d\.key, cur\)/.test(app),
   "CARD_PERCENTILES is the 2025 population — ranking a partial season against it mislabels the rank");
ok("the Opportunity note names both vintages when the twin is live",
   /card\.volumeCur \?/.test(app) && /Rows showing/.test(app));

ok("the prompt block states that the current season outranks the frozen one",
   /THIS OUTRANKS THE 2025 BLOCK ABOVE/.test(app));
ok("...and each prompt line carries the 2025 figure beside it",
   /\(2025: \$\{fmt\(was\)\}\)/.test(app));
ok("...and it warns about small samples",
   /a share over two or three games is not a season/.test(app));
ok("the twin reaches BOTH prompts",
   (app.match(/\$\{volumeCurContext\}/g) || []).length === 2);

// The weekly job must actually build it, or the placeholder never fills.
ok("the weekly refresh builds the volume twin",
   /build-volume-current\.py/.test(sh));
ok("...from the download it already makes, not a new one",
   /reusing the same download[\s\S]{0,400}build-volume-current\.py/.test(sh),
   "a fourth network fetch for a third parse of one file");

// The builder must not be able to write the scored file by mistake.
const volBuilder = readFileSync(path.join(repoRoot, "scripts/build-volume-current.py"), "utf8");
// ⚠️ Check the OUTPUT PATH, not the presence of the string. The docstring
// legitimately names player_metrics_2025.json to explain why the twin exists,
// and a substring search fails on correct prose — a guard that fails on
// documentation is a guard someone deletes.
ok("the volume builder's default output is a volume file",
   /OUT = sys\.argv\[2\][^\n]*grading\/data\/volume_\d{4}\.json/.test(volBuilder));
ok("the volume builder opens nothing but its own output for writing",
   (volBuilder.match(/open\(([^,)]+),\s*"w"\)/g) || []).every(m => m.includes("OUT")));
ok("the volume builder documents the games-played denominator",
   /GAMES PLAYED, never the full season|per \(player, game\)/i.test(volBuilder));

// === THE WEEKLY REFRESH WORKFLOW ===
// The data files are STATIC IMPORTS bundled at build time, so nothing updates
// until a commit lands and Vercel rebuilds. This workflow is what makes that
// happen on a schedule, and its entire safety argument is four properties. A
// future edit could remove any of them and the job would still "work" — it
// would just start shipping unreviewed or unguarded data.
{
  const wfPath = path.join(repoRoot, ".github/workflows/weekly-data-refresh.yml");
  const wf = existsSync(wfPath) ? readFileSync(wfPath, "utf8") : "";
  ok("the weekly refresh workflow exists", wf.length > 0);
  if (wf) {
    // 1. THE GUARDS GATE THE COMMIT. A refresh that ships bad data is worse
    //    than a missed week: a missed week is visible in the vintage label and
    //    bad data is not. `npm test` must run, and must run BEFORE the commit.
    const testAt = wf.indexOf("npm test");
    const commitAt = wf.indexOf("git commit");
    ok("the workflow runs npm test", testAt > 0);
    ok("npm test runs BEFORE the commit step", testAt > 0 && commitAt > testAt);

    // 2. IT NEVER PUSHES TO THE DEFAULT BRANCH. CLAUDE.md rule 3 keeps
    //    development on a named branch, and the branch the live site serves
    //    must not receive unreviewed data commits.
    ok("it opens a PR rather than pushing to the base branch", /gh pr create/.test(wf));
    ok("it pushes only to its own data/ branch",
      /git push -f origin "\$BR"/.test(wf) && /BR="data\/refresh-/.test(wf));
    ok("no push to a default/main branch anywhere",
      !/git push[^\n]*\b(main|master|\$BASE)\b/.test(wf));

    // 3. THE FROZEN FILE IS NEVER REGENERATED. Guard 15's whole reason for
    //    existing. The workflow calls one script and that script has no step
    //    for it, but a future edit could add one.
    // ⚠️ THE PROPERTY IS "NEVER INVOKES IT", NOT "NEVER MENTIONS IT".
    //    Two earlier versions of this assertion failed on the workflow's own
    //    documentation: the header comment explains why the frozen file is
    //    untouched, and the PR body repeats it so a reviewer sees it too. Both
    //    are wanted. What must never appear is the BUILDER being run, or the
    //    file being written.
    ok("the workflow never invokes the frozen file's builder",
      !wf.includes("build-player-metrics"));
    ok("the workflow never writes the frozen file",
      !/player_metrics_2025[^\n]*>/.test(wf) && !/>[^\n]*player_metrics_2025/.test(wf));
    // The only refresh script it may call. If a future edit adds a second one,
    // this fails and the frozen/weekly split has to be re-argued on purpose.
    const scripts = [...wf.matchAll(/scripts\/([\w.-]+)/g)].map(m => m[1]);
    ok("it runs only refresh-inseason.sh",
      scripts.every(f => f === "refresh-inseason.sh"), scripts.join(", ") || "none");
    ok("the header still explains WHY the frozen file is untouched",
      /player_metrics_2025/.test(wf) && /frozen/i.test(wf));
    ok("it stages only grading/data", /git add grading\/data/.test(wf));
    ok("it fails if anything outside grading/data changed",
      /outside grading\/data/.test(wf) && /::error::/.test(wf));

    // A run that changes nothing must not open an empty PR. refresh-inseason.sh
    // always exits 0 — "not published yet" is its normal pre-season outcome —
    // so the decision has to come from the diff, never from the exit code.
    ok("the commit is gated on an actual data diff",
      /git diff --quiet -- grading\/data/.test(wf)
      && /steps\.diff\.outputs\.changed == 'true'/.test(wf));

    ok("it is scheduled and manually runnable",
      /schedule:/.test(wf) && /cron:/.test(wf) && /workflow_dispatch:/.test(wf));
    ok("permissions are declared rather than inherited", /^permissions:/m.test(wf));
  }
}

console.log(fail ? `\n${fail} failure(s)` : "\nall refresh-cadence guards passed");

process.exit(fail ? 1 : 0);
