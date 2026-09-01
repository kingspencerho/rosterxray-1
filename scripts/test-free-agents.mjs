#!/usr/bin/env node
// test-free-agents.mjs — guard 25. The redraft waiver-target pool.
//
// THE GAP IT CLOSES. Every other layer describes a player already on your
// roster. The most common in-season decision — "who do I add" — had nothing.
//
// FOUR THINGS ARE ASSERTED, IN DESCENDING ORDER OF WHAT A REGRESSION COSTS.
//
//   1. IT NEVER REACHES THE SCORING ENGINE. The pool reads SIX context layers.
//      Putting it inside analyzeRedraft would have made the engine unprovable,
//      so it lives at module level and is invoked from the React component,
//      exactly as buildPlayerCard is. A leak here silently invalidates every
//      calibration figure on file — nothing errors, the numbers just stop
//      meaning what they meant.
//
//   2. MATCHUP DATA IS ABSENT FROM THE SCORE. Rank 5 is the least stable input
//      measured in this project and WR FPA is NEGATIVE year over year. A
//      schedule may SORT a shortlist; it must never GENERATE one. This is the
//      same rule that keeps man/zone coverage (r=0.16) out of the AI prompt,
//      and the same rule Section 3's generator-versus-sorter distinction states.
//
//   3. A DISPLAYED REASON IS EVIDENCE *FOR*, NOT EVERY NUMBER MEASURED. The
//      first render listed "above 21% of RBs" as a bullet under a
//      recommendation. A 21st-percentile figure argues against, and printing it
//      as support is the label-disagrees-with-its-own-number failure again.
//
//   4. THE UI STATES WHAT THE APP CANNOT SEE. It does not know the other
//      rosters in the league. Presenting the list as "your best available add"
//      would assert something unknowable.
//
// Run: node scripts/test-free-agents.mjs   (exits non-zero on failure)

import { readFileSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
const app = readFileSync(path.join(repoRoot, "App.jsx"), "utf8");
const mirror = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${cond || !detail ? "" : `  (${detail})`}`);
  if (!cond) fail++;
};

// Body of a top-level `const NAME = ` up to the next top-level `\nconst `.
const bodyOf = (name) => {
  const i = app.indexOf(`const ${name} = `);
  if (i === -1) return null;
  const j = app.indexOf("\nconst ", i + 8);
  return app.slice(i, j === -1 ? app.length : j);
};

console.log("definitions");
ok("App.jsx and App.jsx.jsx are identical", app === mirror);
for (const fn of ["buildFreeAgentPool", "scoreFreeAgent", "FA_WEIGHTS", "FA_POOLS", "faPct"]) {
  ok(`${fn} defined exactly once`,
    (app.match(new RegExp(`const ${fn}\\s*=`, "g")) || []).length === 1);
}

// ---- 1. CONTAINMENT (the assertion that protects the grades) ----
console.log("\ncontainment");
for (const engine of ["analyzeRoster", "analyzeRedraft"]) {
  const i = app.indexOf(`const ${engine} = `);
  const j = app.indexOf("\nconst ", i + 10);
  const body = i === -1 ? "" : app.slice(i, j === -1 ? app.length : j);
  ok(`${engine} located`, !!body);
  for (const t of ["buildFreeAgentPool", "scoreFreeAgent", "FA_WEIGHTS", "FA_POOLS"]) {
    ok(`${engine} never references ${t}`, !body.includes(t),
      "the pool reads six context layers; inside the engine it would move grades");
  }
}
ok("the pool is invoked from the component, not the engine",
  /const freeAgents = useMemo\(/.test(app) && /buildFreeAgentPool\(/.test(app));
{
  const calls = [...app.matchAll(/buildFreeAgentPool\(/g)].map(m => m.index)
    .filter(i => !app.slice(Math.max(0, i - 40), i).includes("const buildFreeAgentPool"));
  ok("buildFreeAgentPool has exactly one call site", calls.length === 1, `found ${calls.length}`);
}

// ---- 2. MATCHUP DATA IS NOT IN THE SCORE ----
console.log("\nthe schedule sorts, it never generates");
const scoreBody = bodyOf("scoreFreeAgent") || "";
ok("scoreFreeAgent exists", !!scoreBody);
for (const t of ["getMatchupTier", "PLAYOFFS", "FPA", "matchupScoreFor", "playoffBoosts",
                 "getMatchupScoreForOpponent", "FULL_SCHEDULE"]) {
  ok(`the score never reads ${t}`, !scoreBody.includes(t),
    "rank 5 is the least stable input measured here; WR FPA is negative year over year");
}
ok("FA_WEIGHTS carries no matchup component",
  !/matchup|schedule|opponent|fpa/i.test(bodyOf("FA_WEIGHTS") || ""));
// Every weight names a hierarchy rank in its comment, so nobody adds one blind.
ok("every FA weight is annotated with its hierarchy rank",
  (bodyOf("FA_WEIGHTS") || "").match(/rank \d/g)?.length >= 5);

// ---- 3. REASONS ARE EVIDENCE FOR ----
console.log("\nreasons are a case, not a data dump");
ok("a support threshold exists", /const SUPPORT = 0\.\d/.test(scoreBody));
ok("coverage counts SUPPORTING signals only", /coverage: support\.length/.test(scoreBody),
  "gating on any-two-signals lets two weak numbers recommend a player");
ok("reasons are sorted by contribution, not by raw weight",
  /b\.unit \* FA_WEIGHTS\[b\.key\] - a\.unit \* FA_WEIGHTS\[a\.key\]/.test(scoreBody));
ok("the pool requires two supporting signals", /scored\.coverage < 2/.test(app));

// ---- 4. THE HONEST LIMIT IS ON SCREEN ----
console.log("\nthe app says what it cannot see");
ok("the panel states it cannot see the waiver wire",
  /cannot see your league's waiver wire/i.test(app));
ok("...and that the score excludes the schedule",
  /Schedule is not[\s\S]{0,40}in the score/i.test(app));
ok("an exclusion list is offered rather than the limit being assumed",
  /ALREADY TAKEN IN YOUR LEAGUE/.test(app) && /setFaTaken/.test(app));
ok("unsigned players are excluded — no team means no role",
  /row\.team === "-" \|\| row\.team === "FA"/.test(app));
ok("best ball is out of scope", /analyzed\.mode !== "redraft"/.test(app),
  "Underdog rosters lock after the draft; a waiver pool there cannot be acted on");
ok("the nav entry resolves to a rendered id",
  app.includes('id: "rxr-freeagents"') && app.includes('id="rxr-freeagents"'));

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
