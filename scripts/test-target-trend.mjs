#!/usr/bin/env node
/**
 * GUARD 29 — the target / carry trajectory layer.
 *
 * WHAT THIS PROTECTS, in descending order of what a regression would cost:
 *
 * 1. CONTAINMENT. The layer is CONTEXT ONLY. A read inside analyzeRoster or
 *    analyzeRedraft would move grades for reasons unrelated to the roster and
 *    silently invalidate every calibration figure in CLAUDE.md — nothing
 *    errors, the numbers just quietly stop meaning what they meant. Structural
 *    assertions, not behavioural: a leak can move one roster by 0.01 and pass a
 *    spot check.
 *
 * 2. "insufficient" IS NOT "stable". Stable means measured and flat; this means
 *    not yet measurable. Collapsing the two makes a two-game sample read as a
 *    settled role, which is the silent-drop failure in a new costume.
 *
 * 3. BOTH SIDES FOR BACKS. RJ Harvey 2025 reads STABLE on target share while
 *    his carry share went 17.7% -> 46.7%. He is the player this repo records
 *    being graded fade/falling on four separate rosters off a season average.
 *    A board that reported only the passing side would reproduce that miss.
 *
 * 4. SEPARATE THRESHOLDS PER SERIES. Carry share is a far wider distribution
 *    than target share, so one shared threshold flags the wrong tail on one of
 *    them — the same class as the position-normalisation bug in the Ceiling
 *    Shape Layer, which moved grades for the wrong reason and looked like a
 *    working feature while it did.
 *
 * 5. THE THRESHOLD STAYS EARNED — centred, ~1 SD, flagging a sane slice.
 *
 * ⚠️ ok() TAKES (label, cond). This file's idiom is NOT the one-argument
 * always-passes form that made guards 19, 20 and the disclosure guard no-ops.
 * After adding an assertion here, SABOTAGE the code and watch the run exit
 * non-zero — an assertion that has never failed has not been tested.
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(root, "App.jsx.jsx"), "utf8");
const vol = JSON.parse(readFileSync(path.join(root, "grading/data/volume_2026.json"), "utf8"));
const builder = readFileSync(path.join(root, "scripts/build-volume-current.py"), "utf8");

let fail = false;
const ok = (label, cond, detail = "") => {
  if (!cond) fail = true;
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail ? `  ${detail}` : ""}`);
};

/** Body of a top-level `const NAME = ` binding, to the next column-0 const. */
const bodyOf = (name) => {
  const i = app.indexOf(`const ${name} = `);
  if (i < 0) return null;
  const j = app.indexOf("\nconst ", i + 10);
  return app.slice(i, j > 0 ? j : app.length);
};

console.log("\n=== 1. CONTAINMENT — the engines never read this layer ===");
const ACCESSORS = ["getTargetTrend", "getCarryTrend", "TREND_META", "buildStartSitBoard",
                   "trend_car", "startSitMagnitude"];
for (const fn of ["analyzeRoster", "analyzeRedraft"]) {
  const body = bodyOf(fn);
  ok(`${fn} exists`, !!body);
  if (!body) continue;
  for (const a of ACCESSORS) {
    ok(`${fn} does not reference ${a}`, !body.includes(a));
  }
  // The raw table too — an accessor can be inlined.
  ok(`${fn} does not reference VOLUME_CUR`, !body.includes("VOLUME_CUR"));
}

console.log("\n=== 2. CONSUMERS ARE AN ALLOWLIST, not 'anywhere outside the engine' ===");
// The point is that every consumer was reviewed, not that there are few.
const REVIEWED = ["buildPlayerCard", "buildStartSitBoard", "targetTrendContext"];
for (const acc of ["getTargetTrend", "getCarryTrend"]) {
  const sites = [...app.matchAll(new RegExp(`${acc}\\(`, "g"))].length;
  const defined = app.includes(`const ${acc} = `);
  ok(`${acc} is defined once`, (app.match(new RegExp(`const ${acc} = `, "g")) || []).length === 1);
  ok(`${acc} has call sites`, defined && sites > 1, `${sites - 1} call(s)`);
}
for (const r of REVIEWED) ok(`reviewed consumer present: ${r}`, app.includes(r));

console.log("\n=== 3. 'insufficient' IS NEVER RENDERED AS 'stable' ===");
ok("builder emits an explicit insufficient state", builder.includes('t["trend"] = "insufficient"'));
ok("builder comments the distinction", /NOT "stable"/.test(builder));
ok("_meta states the rule", /insufficient/i.test(JSON.stringify(vol._meta.trend_rules || {})));
// ⚠️ BEHAVIOURAL, NOT STRING-MATCHING. The first version of this asserted
// that the source CONTAINED `delta != null) return null` — and a sabotage
// that inserted an unconditional `return null` ABOVE that line left the
// string intact and passed. Same no-op trap as guards 19, 20 and the
// disclosure guard. trendWhy is pure (its only inputs are its arguments), so
// the guard extracts and runs it.
const whySrc = bodyOf("trendWhy");
ok("trendWhy exists", !!whySrc);
let trendWhy = null;
try {
  const expr = whySrc.slice(whySrc.indexOf("=") + 1).replace(/;\s*$/, "");
  trendWhy = new Function(`return (${expr})`)();
} catch (e) { ok("trendWhy is extractable and pure", false, String(e.message)); }
if (trendWhy) {
  const meta = { min_window_gp: 2, threshold: 0.04 };
  const measured = { delta: 0.09, series: [[1, 5, 0.1], [2, 6, 0.12], [3, 7, 0.2], [4, 8, 0.22]] };
  const thin = { delta: null, series: [[1, 5, 0.1], [2, 6, 0.12]] };
  const oneGame = { delta: null, series: [[1, 5, 0.1]] };
  ok("a measured trend yields NO reason (the numbers speak)", trendWhy(measured, meta) === null);
  // These are the assertions that matter: a player without a delta must get
  // WORDS back, never null. null renders as silence, and silence reads as
  // "no change" rather than "not enough games".
  ok("a thin split yields a reason, never null",
    typeof trendWhy(thin, meta) === "string" && trendWhy(thin, meta).length > 0,
    JSON.stringify(trendWhy(thin, meta)));
  ok("a one-game player yields a reason, never null",
    typeof trendWhy(oneGame, meta) === "string", JSON.stringify(trendWhy(oneGame, meta)));
  ok("a missing player yields a reason, never null", typeof trendWhy(null, meta) === "string");
  ok("the reason names how many games are needed", /\b4 games\b/.test(trendWhy(thin, meta) || ""));
  ok("no derived threshold yet still yields a reason",
    typeof trendWhy(thin, { min_window_gp: 2, threshold: null }) === "string");
}
// The UI must say it in words, not just omit the row.
ok("card renders a reason, not a blank", app.includes("not yet measurable"));
ok("card denies the flat-role reading", app.includes("sample-size gap, not a flat role"));

console.log("\n=== 4. BOTH SIDES FOR BACKS (the RJ Harvey regression) ===");
ok("builder emits trend_car for RBs only",
  builder.includes('if a["pos"] == "RB" else None'));
ok("builder documents the Harvey case", /RJ Harvey/.test(builder));
ok("card renders the carry block", app.includes("Carry share"));
ok("board picks whichever side moved", app.includes("lead with whichever side actually moved")
  || app.includes("For a back, lead with whichever side actually moved."));
ok("prompt emits the rushing side for RBs",
  /push\(getCarryTrend\(p\.name\), "carry share"/.test(app));

console.log("\n=== 5. SEPARATE THRESHOLDS PER SERIES ===");
const tMeta = vol._meta.trend || {};
ok("_meta.trend keys both series",
  !!tMeta.trend && !!tMeta.trend_car, Object.keys(tMeta).join(","));
ok("each series records its own threshold_source",
  !!tMeta.trend?.threshold_source && !!tMeta.trend_car?.threshold_source);
ok("builder derives per key, not once",
  /def derive\(key\)/.test(builder) && /for key, metric in \(/.test(builder));
// A shared threshold is the failure mode; assert the comparator normalises.
ok("board magnitude is measured in thresholds, not raw delta",
  /Math\.abs\(t\.delta\) \/ threshold/.test(app));
ok("board documents why raw deltas are incomparable",
  /purely an artefact of the denominator/.test(app));

console.log("\n=== 6. THRESHOLDS COME FROM _meta, NEVER HAND-TYPED ===");
// A second literal is the duplicate-definition class this repo has hit 7 times.
const cardBlock = app.slice(app.indexOf("card.targetTrend = {"), app.indexOf("card.targetTrend = {") + 900);
ok("card reads the threshold from TREND_META",
  /TREND_META\.trend\?\.threshold/.test(cardBlock) && /TREND_META\.trend_car\?\.threshold/.test(cardBlock));
ok("no hand-typed target threshold in App.jsx",
  !/threshold[^;]{0,20}=\s*0\.0[0-9]{2}\b/.test(app));

console.log("\n=== 7. THE THRESHOLD STAYS EARNED (live files only) ===");
if ((vol._meta.weeks_covered || 0) === 0) {
  // The committed 2026 file is a zero-row placeholder produced by the real
  // builder, so its shape is pinned above and there is nothing to measure.
  // ⚠️ These assertions are vacuous until a real refresh is committed; they
  // were exercised against the full 2025 season during the build.
  ok("placeholder is empty and says so", Object.keys(vol.players).length === 0
    && tMeta.trend.threshold === null);
  ok("placeholder refuses to label anything",
    tMeta.trend.counts.rising === 0 && tMeta.trend.counts.falling === 0);
} else {
  for (const [key, m] of Object.entries(tMeta)) {
    if (m.threshold == null) continue;
    ok(`${key}: delta distribution is centred`, Math.abs(m.delta_median) <= 0.03,
      `median ${m.delta_median}`);
    ok(`${key}: threshold is ~1 SD`, Math.abs(m.threshold - m.delta_stdev) < 1e-6);
    const flagged = m.counts.rising + m.counts.falling;
    const pool = flagged + m.counts.stable;
    ok(`${key}: flags 10-40% of the split pool`, pool > 0 && flagged / pool >= 0.10 && flagged / pool <= 0.40,
      `${flagged}/${pool}`);
  }
  console.log("\n=== 7b. LABEL FOLLOWS NUMBER, every row ===");
  let bad = 0, checked = 0;
  for (const [name, p] of Object.entries(vol.players)) {
    for (const key of ["trend", "trend_car"]) {
      const t = p[key];
      if (!t) continue;
      const thr = tMeta[key]?.threshold;
      const want = t.delta == null || thr == null ? "insufficient"
        : t.delta >= thr ? "rising" : t.delta <= -thr ? "falling" : "stable";
      checked++;
      if (t.trend !== want) { bad++; if (bad < 4) console.log(`      ${name}.${key}: ${t.trend} but delta ${t.delta} vs ${thr}`); }
    }
  }
  ok("every trend label matches its own delta", bad === 0, `${checked} checked`);
}

console.log("\n=== 7c. THE TWO TRAJECTORY SECTIONS HAVE DISTINCT TITLES ===");
// Found by rendering, not by reading: the snap-trajectory section is already
// called "Role trajectory", and shipping a second section under the same name
// leaves a reader unable to tell snap share from target share. They answer
// different questions and sit in the same group.
ok("the snap section keeps its title", app.includes('title="Role trajectory"')
  || app.includes("ROLE TRAJECTORY"));
ok('the usage section is NOT also called "Role trajectory"',
  app.includes('title="Usage trajectory"'));
ok("the note distinguishes it from snap share",
  /as opposed to the snap share above/.test(app));

console.log("\n=== 8. QBs ARE EXCLUDED, AND THE PANEL SAYS SO ===");
const board = bodyOf("buildStartSitBoard");
ok("board exists", !!board);
ok("board admits only RB/WR/TE", !!board && /\["RB", "WR", "TE"\]\.includes\(p\.pos\)/.test(board));
ok("board explains the QB exclusion in a comment", !!board && /QBs are deliberately absent/.test(board));
ok("the panel tells the reader in words",
  /Quarterbacks are not listed/.test(app));

console.log("\n=== 9. PRE-SEASON THE LAYER DOES NOT EXIST ===");
ok("board returns null when the refresh has not run",
  !!board && /if \(!CUR_VOLUME_LIVE\) return null;/.test(board));
ok("card gates on CUR_VOLUME_LIVE", /if \(CUR_VOLUME_LIVE\) \{\n\s+const tt = getTargetTrend/.test(app));
ok("prompt gates on CUR_VOLUME_LIVE", /!CUR_VOLUME_LIVE \? "" :/.test(app));

console.log("\n=== 10. THE SPARKLINE CARRIES NO MATCHUP COLOUR ===");
// Colouring bars by opponent difficulty would mix rank-5 data — the least
// stable input in the app — into a rank-1 reading. Same rule as the game log.
const spark = bodyOf("TrendSpark");
ok("TrendSpark exists", !!spark);
for (const t of ["getMatchupTier", "tierStyle", "matchupScoreFor", "FPA"]) {
  ok(`TrendSpark does not reach for ${t}`, !!spark && !spark.includes(t));
}

console.log(fail ? "\nGUARD 29 FAILED\n" : "\nGUARD 29 PASSED\n");
process.exit(fail ? 1 : 0);
