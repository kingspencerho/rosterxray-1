#!/usr/bin/env node
// test-breakout.mjs — guard 35, the Breakout Watch board.
//
// Asked for directly: a tracker for late-round darts and rookies that flags
// the ones about to break out. Zavion Thomas was the example — a rookie buried
// in Week 1 who accumulates snaps as the year goes.
//
// ⚠️⚠️ THE POPULATION IS THE DESIGN PROBLEM. Rookies are excluded by every
// gate in this app (percentiles need gp>=8, snap trajectory needs 3 games a
// window, the ceiling and floor layers need gp>=8 AND snap>=0.35). So a
// league-relative board would render silence for exactly the players it exists
// for, and the thresholds here are SELF-REFERENCED instead: a player against
// his own trailing baseline.
//
// What this guard protects, worst regression first:
//
//   1. CONTAINMENT. Nothing here may reach analyzeRoster or analyzeRedraft. A
//      leak moves one roster by 0.01, passes a spot check, and silently
//      invalidates every calibration figure in CLAUDE.md.
//   2. THE 2x2 STAYS A 2x2. Opportunity and production are separate axes and
//      production alone is NOISE, never a recommendation. Collapsing them is
//      how a board fills with one-week flukes.
//   3. "no signal yet" IS NOT "quiet". Collapsing them makes a two-game sample
//      read as a settled role.
//   4. Thresholds are READ from the volume file, never hand-typed, and each
//      series uses its own — carry share is a far wider distribution than
//      target share.
//
// ⭐ THE PURE FUNCTIONS ARE EXTRACTED AND RUN, not string-matched. Sep 5
// recorded a guard that passed while the behaviour it named was destroyed,
// because an unconditional `return null` was inserted ABOVE the line it
// matched. Asserting text exists is not asserting code behaves.
//
// Run: node scripts/test-breakout.mjs   (exits non-zero on failure)
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(root, "App.jsx.jsx"), "utf8");
const volume = JSON.parse(readFileSync(path.join(root, "grading/data/volume_2026.json"), "utf8"));

let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) console.log("  ok   " + label);
  else { fail++; console.log("  FAIL " + label + (detail ? "  (" + detail + ")" : "")); }
};
const between = (start, end) => {
  const i = app.indexOf(start);
  if (i === -1) return "";
  const j = app.indexOf(end, i + start.length);
  return j === -1 ? app.slice(i) : app.slice(i, j);
};

console.log("\n=== 1. containment: the engines never see this ===");

const engine = (name) => {
  const i = app.indexOf(`const ${name} = (`);
  if (i === -1) return "";
  // Bounded to the function body: the next top-level `};` at column 0.
  const j = app.indexOf("\n};", i);
  return app.slice(i, j === -1 ? app.length : j);
};
const SYMBOLS = ["buildBreakoutBoard", "breakoutStep", "breakoutWhy",
                 "BREAKOUT_STATES", "BREAKOUT_MIN_MOVE", "readWatchlist", "WATCHLIST_KEY"];
for (const eng of ["analyzeRoster", "analyzeRedraft"]) {
  const body = engine(eng);
  ok(`${eng} is found`, body.length > 500, `${body.length} chars`);
  const leaks = SYMBOLS.filter(s => body.includes(s));
  ok(`${eng} references no breakout symbol`, leaks.length === 0, leaks.join(", "));
}
// Built at module level, invoked from a useMemo — the same shape as
// buildPlayerCard and the free-agent pool.
ok("buildBreakoutBoard is declared once at module level",
  (app.match(/^const buildBreakoutBoard = /gm) || []).length === 1);
ok("...and is invoked from a useMemo", /useMemo\(\(\) => \{[\s\S]{0,400}buildBreakoutBoard\(/.test(app));

console.log("\n=== 2. the pure reason function, EXTRACTED AND RUN ===");

const grab = (decl) => {
  const i = app.indexOf(decl);
  if (i === -1) throw new Error("not found: " + decl);
  const j = app.indexOf("\n};", i);
  return app.slice(i, j + 3);
};
let breakoutWhy, breakoutStep;
try {
  const src = grab("const BREAKOUT_MIN_MOVE").split("\n")[0] + "\n" +
              "const BREAKOUT_MIN_BASE_GP = " +
              (app.match(/const BREAKOUT_MIN_BASE_GP = (\d+)/) || [, "2"])[1] + ";\n" +
              grab("const breakoutWhy = (") + "\n" + grab("const breakoutStep = (") +
              "\nreturn { breakoutWhy, breakoutStep };";
  ({ breakoutWhy, breakoutStep } = new Function(src)());
  ok("breakoutWhy and breakoutStep extract and evaluate", true);
} catch (e) {
  ok("breakoutWhy and breakoutStep extract and evaluate", false, e.message);
}

if (breakoutWhy) {
  // ⚠️ THE FOUR STATES MEAN DIFFERENT THINGS AND MUST NOT SHARE A SENTENCE.
  const preSeason = breakoutWhy(0, false, false);
  const noRow     = breakoutWhy(0, false, true);
  const thin      = breakoutWhy(2, true, true);
  const clear     = breakoutWhy(6, true, true);
  ok("pre-season names the season, not the player", /season has not started/i.test(preSeason || ""));
  ok("no row says he has not played, not that he is flat",
    /not recorded a game/i.test(noRow || "") && !/flat/i.test(noRow || ""));
  ok("a thin sample says SAMPLE SIZE explicitly, never 'stable'",
    /sample-size gap, not a flat role/i.test(thin || ""));
  ok("...and it states the count it has and the count it needs",
    /\b2 games?\b/.test(thin || "") && /\b2\b/.test(thin || ""));
  ok("a real sample is NOT blocked", clear === null, String(clear));
}

if (breakoutStep) {
  const th = 0.04;
  const series = (vals) => vals.map((v, i) => [i + 1, 5, v]);
  ok("a step below the sample floor returns null",
    breakoutStep(series([0.10, 0.12, 0.11]), th) === null);
  const rise = breakoutStep(series([0.05, 0.05, 0.20, 0.20]), th);
  ok("a real rise measures in THRESHOLD units, not raw share",
    rise && Math.abs(rise.units - (0.15 / th)) < 1e-9, rise ? String(rise.units) : "null");
  ok("...and both window sizes are reported", rise && rise.baseGp === 2 && rise.recentGp === 2);
  ok("a missing threshold returns null rather than dividing by zero",
    breakoutStep(series([0.05, 0.05, 0.20, 0.20]), null) === null);
  ok("rows with a null share are skipped, not counted as zero",
    breakoutStep([[1, 0, null], [2, 5, 0.1], [3, 5, 0.1]], th) === null);
}

console.log("\n=== 3. the 2x2 stays a 2x2 ===");

const board = between("const buildBreakoutBoard", "\nconst WATCHLIST_KEY");
ok("all four states are declared", ["breakout", "watch", "noise", "quiet"]
  .every(s => new RegExp(`^\\s+${s}:`, "m").test(app)));
// Production alone must land on NOISE. The exact expression is asserted
// because inverting it is the one change that turns this board into a list of
// one-week flukes and still looks like it works.
ok("opportunity AND production -> breakout; production alone -> noise",
  /oppMoved \? \(prodMoved \? "breakout" : "watch"\) : \(prodMoved \? "noise" : "quiet"\)/.test(board));
ok("ranking is by state first, then magnitude",
  /BREAKOUT_STATES\[b\.state\]\.rank - BREAKOUT_STATES\[a\.state\]\.rank/.test(board)
  && /b\.magnitude - a\.magnitude/.test(board));
// Magnitude is the OPPORTUNITY move, never the production one. Ranking on
// points would reorder the board by outcome, which is rank 4 beating rank 1.
ok("magnitude is the opportunity move, in threshold units",
  /out\.magnitude = best \? best\.units : 0/.test(board));

console.log("\n=== 4. thresholds are READ, and each series has its own ===");

ok("the target threshold is read from the volume file",
  /TREND_META\?\.trend\?\.threshold/.test(board));
ok("the carry threshold is read separately",
  /TREND_META\?\.trend_car\?\.threshold/.test(board));
ok("they are not the same expression",
  !/trend_car\?\.threshold \|\| TREND_META\?\.trend\?\.threshold/.test(board));
ok("no hand-typed share literal is compared against a step",
  !/units >= 0\.\d/.test(board) && /units >= BREAKOUT_MIN_MOVE/.test(board));
// The carry side is RB-only: a receiver's carry share is three jet sweeps.
ok("the carry side is gated to RBs", /row\.pos === "RB"/.test(board));
ok("the file still declares both trend blocks",
  volume._meta?.trend?.trend && volume._meta?.trend?.trend_car);

console.log("\n=== 5. vacancy is context, never a ranking input ===");

// It is a TEAM number. Scoring it would clump every player on one roster
// together for a reason that says nothing about which of them wins the job.
const vacLine = board.slice(board.indexOf("const vac = getVacated"));
ok("vacancy is read", /getVacated\(row\.team\)/.test(board));
ok("...and only ever pushes a reason with supports:false",
  /key: "vacancy", supports: false/.test(vacLine));
ok("...and never touches magnitude or state",
  !/vac[\s\S]{0,200}out\.magnitude/.test(vacLine) && !/vac[\s\S]{0,200}out\.state =/.test(vacLine));

console.log("\n=== 6. the watchlist ===");

ok("reads and writes are both wrapped in try/catch",
  /const readWatchlist = \(\) => \{\s*try \{/.test(app)
  && /const writeWatchlist = \([\s\S]{0,80}try \{/.test(app));
ok("a private-window failure falls back to an EMPTY list, not a crash",
  /\} catch \{ return \[\]; \}/.test(app));
// A watched player is assessed and shown whatever his state, including quiet
// and blocked — that is the entire point of curating one.
ok("watched players bypass the rookie filter and the rostered filter",
  /if \(watchSet\.has\(key\)\) \{ watched\.push\(assess\(key, row\)\); continue; \}/.test(board));
// Split into two statements when the empty-list reason needed counting, so
// this asserts the PROPERTY (both are dropped, separately) rather than the one
// expression that happened to implement it.
ok("the auto-flagged list drops blocked rows",
  /if \(a\.blocked\) \{[^}]*continue; \}/.test(board));
ok("...and drops quiet rows too",
  /if \(a\.state === "quiet"\) continue;/.test(board));

console.log("\n=== 6b. the rookie filter, and what the fixture CANNOT reach ===");

// NO SIMULATION BUILT FROM A PRIOR SEASON CAN CONTAIN THIS YEAR'S ROOKIES.
// The live dry run for this feature relabelled 2025 weeks as 2026, and all 223
// rookies in career_arc had ZERO rows in it - correctly, they had not played.
// So `rookiesOnly: true` returned an empty board, which was the fixture's
// limit rather than a bug. The predicate is asserted STRUCTURALLY here, and
// the state machine was exercised against the general path instead (311
// players: 19 breakout / 39 watch / 16 noise / 154 quiet).
ok("the rookie predicate reads career-arc experience, not ADP or age",
  /const rookieOf = \(key\) => \(getCareerArc\(key\)\?\.exp === 0\)/.test(board));
ok("it gates the AUTO list only, never the watchlist",
  /if \(rookiesOnly && !rookieOf\(key\)\) continue;/.test(board)
  && board.indexOf("watchSet.has(key)") < board.indexOf("rookiesOnly && !rookieOf"));
const arc = JSON.parse(readFileSync(path.join(root, "grading/data/career_arc_2026.json"), "utf8"));
const rookieN = Object.values(arc.players || {}).filter(x => x.exp === 0).length;
ok("career_arc carries a real rookie population to filter on", rookieN > 100, String(rookieN));

// An empty auto-list has to say WHICH kind of empty. "No player is flagging"
// is true whether nobody moved or nobody has played, and those are opposite
// readings. The first render said "played too few games" for 43 rookies who
// had played NONE - a false explanation, the card-audit class.
ok("an empty list distinguishes has-not-played from too-few-games",
  /has recorded a game yet/.test(board) && /played too few games to measure a step/.test(board));
ok("...and the thin counter only counts players who actually played",
  /if \(a\.blocked\) \{ blockedN\+\+; if \(a\.gp > 0\) thinN\+\+; continue; \}/.test(board));

// PRE-SEASON THIS BOARD IS DORMANT BY DESIGN, so a behavioural sweep over the
// committed files would assert nothing - the same limit guard 29 records for
// its own section 7. Stated rather than hidden.
const volLive = (JSON.parse(readFileSync(path.join(root, "grading/data/volume_2026.json"), "utf8"))
  ._meta || {}).weeks_covered > 0;
console.log(volLive
  ? "  ok   volume_2026 is live - the board has real rows to rank"
  : "  INFO volume_2026 has 0 weeks, so the board is dormant and a live sweep\n" +
    "       here would assert nothing. Exercised during the build against a\n" +
    "       simulated 2026-through-W8 (465 players): all four states fired.");

console.log("\n=== 7. the render ===");

const render = between("{/* Breakout Watch */}", "{/* Bench Moves */}");
ok("the section renders", render.length > 500, `${render.length} chars`);
// ⚠️ BOUNDED TO THE bestball ARRAY. The first version used
// `bestball: \[[\s\S]*rxr-breakout`, and `[\s\S]*` is greedy across the whole
// file — it matched the REDRAFT entry and the render, so the assertion failed
// on correct code. An unbounded span asserts "these strings both exist", which
// is not the property anybody wants.
const bbArr = between('bestball: [', '],');
const rdArr = between('redraft: [', '],');
ok("the sticky entry exists and is REDRAFT only",
  /\{ id: "rxr-breakout", *label: "Breakout" \}/.test(rdArr)
  && !bbArr.includes("rxr-breakout"));
ok("it renders the ENGINE's reason string, never a hand-typed copy",
  /\{r\.blocked\}?[\s\S]{0,80}r\.blocked/.test(render) && /BREAKOUT_STATES\[r\.state\]\.why/.test(render));

// ⚠️⚠️ THIS ASSERTION WAS MISSING AND A SABOTAGE PROVED IT. `supports` is
// computed per reason and the first render threw it away, so a NOISE row's
// non-supporting opportunity line was indistinguishable from real evidence.
// The browser caught it; the guard did not, and deleting the mark still passed
// nine other checks. A reason must be evidence FOR, not every number measured.
ok("each reason renders its supports mark",
  /x\.supports \? "\+" : "·"/.test(render));
ok("...and a non-supporting reason is visually demoted, not just re-punctuated",
  /x\.supports \? "var\(--text-secondary\)" : "var\(--text-muted\)"/.test(render));
// An empty group that says nothing reads as "nothing is happening", which a
// reader cannot tell apart from a bug.
// The flagged group's empty text moved INTO the engine (flaggedEmptyWhy) so it
// could name which kind of empty it is; the render must therefore print the
// engine's field rather than a literal, exactly like the blocked reason.
ok("an empty group says so in words, both groups",
  /Nothing on your watchlist yet/.test(render) && /breakout\.flaggedEmptyWhy/.test(render));
ok("pre-season states why it is empty rather than rendering blank",
  /season has not started/i.test(render));
// Every tap target on this page has a 32px floor; a bare <button> without the
// global rule and a <summary> both need it stated.
ok("the star toggle states a 32px floor",
  /minWidth: "32px", minHeight: "32px"/.test(render));
ok("the filter toggle and the input state one too",
  (render.match(/minHeight: "32px"/g) || []).length >= 3);
// Chrome, not data. Same rule as the sticky index and the game-log toggle.
ok("the state badge is hueless chrome, not a matchup or position colour",
  !/BREAKOUT_STATES\[r\.state\][\s\S]{0,300}--tier-|--accent-(green|lime|red|orange)/.test(render));

console.log(fail ? `\n${fail} failure(s)` : "\nall breakout guards passed");
process.exit(fail ? 1 : 0);
