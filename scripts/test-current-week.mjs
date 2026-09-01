#!/usr/bin/env node
// test-current-week.mjs — guard 24. The current-week layer.
//
// WHY THIS EXISTS. Before Sep 1 2026 the app knew the date and almost nothing
// acted on it: `getNflWeek()` had exactly ONE consumer (the redraft lineup
// strip) and the AI prompt filtered start/sit intel to `week >= 15`
// unconditionally, so from September to December the model was handed
// December's calls and nothing about the week being played.
//
// TWO THINGS ARE ASSERTED, AND THE SECOND IS THE ONE THAT MATTERS.
//
//   1. There is ONE definition of "now". Sixth time this repo has had to say
//      that (tier/score, competitive balance, posColor, position palettes,
//      playoff boosts, and now this) — a second copy of the week is a second
//      copy that will disagree.
//
//   2. THE DATE AND THE DATA CAN DISAGREE, AND THE APP MUST SAY SO. The week
//      is calendar-derived; the role numbers come from a weekly refresh a human
//      has to run. "Week 8" printed over data collected through Week 3 is the
//      stale-data trap wearing a date, and it is worse than showing no week at
//      all because it looks current.
//
// ⚠️ A LAG OF EXACTLY 1 IS HEALTHY, not a warning. After week N is played the
// refresh covers N and the decision in front of the user is N+1. A guard that
// fired on the steady state would train everyone to ignore it.
//
// Run: node scripts/test-current-week.mjs   (exits non-zero on failure)

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

console.log("one definition of now");
ok("App.jsx and App.jsx.jsx are identical", app === mirror);
for (const fn of ["const getNflWeek = ", "const seasonNow = ", "const SEASON_START = ", "const FINAL_WEEK = "]) {
  ok(`${fn.trim()} defined exactly once`,
    (app.match(new RegExp(fn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length === 1);
}
// Everything that wants the week goes through seasonNow, which carries the data
// vintage with it. A bare getNflWeek() call site gets the date and silently
// loses the staleness — the exact defect this guard exists for.
{
  const bare = [...app.matchAll(/getNflWeek\(/g)].map(m => m.index)
    .filter(i => !app.slice(Math.max(0, i - 40), i).includes("const getNflWeek = "))
    .filter(i => !app.slice(Math.max(0, i - 200), i).includes("const seasonNow = "));
  ok("getNflWeek has no consumer outside seasonNow", bare.length === 0,
    `${bare.length} bare call site(s) — they get the date and lose the refresh lag`);
}

console.log("\nthe prompt knows what week it is");
ok("both prompts open with the when-context",
  (app.match(/\$\{whenContext\}/g) || []).length === 2,
  "best ball and redraft each need it; one branch is not enough");
ok("the when-context names the week", /IT IS WEEK \$\{_now\.week\}/.test(app));
ok("the when-context declares stale data rather than hiding it",
  /WEEK\(S\) BEHIND/.test(app));
ok("the when-context says so when NO in-season data exists",
  /No in-season data has been collected yet/.test(app));
ok("the start/sit filter is no longer hard-coded to the playoff window",
  /wk\.week >= 15 \|\| \(_now\.inSeason && wk\.week === _now\.week\)/.test(app),
  "reverting to `week >= 15` hands the model December in October");

console.log("\nthe stale warning");
ok("the lineup panel surfaces the refresh lag", /nfl\.stale && \(/.test(app));
ok("it names both numbers, not just the complaint",
  /weeks 1-\{nfl\.dataWeeks\}/.test(app) && /behind week \{nfl\.week\}/.test(app));

// ---- behaviour, not just shape ----
console.log("\nseasonNow behaviour");
const SEASON_START = new Date("2026-09-10T00:00:00");
const FINAL_WEEK = 18;
const getNflWeek = (now) => {
  if (now < SEASON_START) return { week: 1, inSeason: false };
  const week = Math.floor((now - SEASON_START) / (7 * 24 * 60 * 60 * 1000)) + 1;
  if (week > FINAL_WEEK) return { week: 1, inSeason: false };
  return { week, inSeason: true };
};
const seasonNow = (now, dataWeeks) => {
  const nfl = getNflWeek(now);
  const lag = nfl.inSeason ? Math.max(0, nfl.week - 1 - dataWeeks) : 0;
  return { ...nfl, dataWeeks, lag, stale: lag > 0 };
};
const at = (iso, dw) => seasonNow(new Date(iso), dw);

// PRE-SEASON: nothing new renders, exactly as before Week 1.
const pre = at("2026-09-01T12:00:00", 0);
ok("before Week 1: not in season, nothing stale", !pre.inSeason && !pre.stale && pre.week === 1);

// THE STEADY STATE. Week 8 with data through week 7 is a lag of 1 and CLEAN.
const healthy = at("2026-10-29T12:00:00", 7);
ok(`week ${healthy.week} with data through 7 is not stale`, healthy.inSeason && !healthy.stale,
  `lag ${healthy.lag} — a lag of 1 is the steady state and must never warn`);

// A MISSED REFRESH. Same week, data three weeks older.
const missed = at("2026-10-29T12:00:00", 4);
ok("a missed refresh IS stale", missed.stale && missed.lag === 3, `lag ${missed.lag}`);

// Week 1 itself: no data can exist yet, and that must not read as neglect.
const wk1 = at("2026-09-12T12:00:00", 0);
ok("week 1 with no data yet is not stale", wk1.inSeason && wk1.week === 1 && !wk1.stale);

// OUT OF SEASON, THE FOLLOWING SUMMER. The old clamp pinned this at "Week 18"
// from January through August; the guard keeps that fix honest.
const summer = at("2027-07-01T12:00:00", 18);
ok("the following summer is out of season, not Week 18", !summer.inSeason && summer.week === 1);

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
