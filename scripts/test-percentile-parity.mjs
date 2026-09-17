// Guard 43 — POSITION PERCENTILES, and the two implementations must agree.
//
// WHAT THIS PROTECTS, in descending order of what a regression costs:
//
//  1. THE DUPLICATE. scripts/matchup-brief.py re-implements App.jsx's
//     cardPercentile in Python, because the app's pools are built at module
//     load inside the browser bundle and no script can reach them. A
//     duplicated definition is the single most repeated bug class in this
//     repo. This guard runs BOTH implementations over every draftable player
//     and fails on the first disagreement, so the duplicate is proven rather
//     than trusted.
//  2. THE POPULATION. "draftable players, 8+ games" is not a detail, it is the
//     whole meaning of the number. Drop the ADP gate and a three-game backup
//     lands in the 90th percentile of something. Drop the 8-game gate and the
//     pool fills with players who never had a role.
//  3. THE 12-PLAYER FLOOR. A rank against eight players is a flattering
//     number, not information. Both sides must return null under it.
//  4. THE INVERT. dud_rate is the one metric where low is good. If the flip is
//     lost, the card and the brief both praise the players most likely to
//     ruin a week.
//
// WHY IT EXISTS AT ALL: on Sep 17 2026 a FLEX comparison in this repo set an
// RB's dud rate beside a WR's and read them as equals. RB median is 11.8%, WR
// median is 35.3%. The raw numbers said the opposite of the truth and the
// recommendation was wrong. The app had the right answer the whole time and
// the script could not see it.
import { readFileSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";

const repoRoot = process.cwd();
const rd = (f) => JSON.parse(readFileSync(path.join(repoRoot, f), "utf8"));
const txt = (f) => readFileSync(path.join(repoRoot, f), "utf8");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}${detail && !cond ? `  — ${detail}` : ""}`);
  if (!cond) fail++;
};

const app = txt("App.jsx");
const mirror = txt("App.jsx.jsx");
const py = txt("scripts/matchup-brief.py");

// ---- 1. the gate still reads the way the Python copied it -----------------
// String checks, and they are the WEAK half of this guard on purpose — section
// 4 is the one that actually runs both implementations. These exist so that a
// change to the gate trips something loud instead of silently re-defining what
// a percentile means on one side only.
ok("App.jsx still gates the pool on 8+ games",
   /\(m\.gp \|\| 0\) < 8/.test(app));
ok("...and on membership of the draftable ADP table",
   /!ADP_DATA\[name\]/.test(app));
ok("...and still refuses to rank against fewer than 12",
   /arr\.length < 12/.test(app));
ok("the Python mirror states the same three constants",
   /PCT_MIN_GP = 8/.test(py) && /PCT_MIN_POOL = 12/.test(py) && /CUR_TEAM/.test(py));
// The first version of this used /key: "dud_rate"[^}]*invert: true/ and failed
// on correct code: `fmt` holds a template literal containing a `}`, so [^}]*
// can never reach the flag. Anchor on the whole line instead.
ok("dud_rate is the only inverted metric in App.jsx",
   (app.match(/invert: true/g) || []).length === 1 &&
   /key: "dud_rate".*invert: true/.test(app));
ok("...and the Python inverts exactly dud_rate",
   /PCT_INVERT = \("dud_rate",\)/.test(py));

// ---- 2. extract the REAL function and make it runnable --------------------
// The first line looks the array up out of a module-scope table. Swap that one
// lookup for a parameter and everything that can actually drift — the floor,
// the counting loop, the rounding — is the app's own code, executed.
const src = (app.match(/const cardPercentile = \(pos, key, value\) => \{[\s\S]*?\n\};/) || [""])[0];
ok("cardPercentile was found in App.jsx", src.length > 0);
const runnable = src
  .replace("const cardPercentile = (pos, key, value) => {",
           "return function (arr, value) {")
  .replace(/const arr = CARD_PERCENTILES\[pos\]\?\.\[key\];\n/, "")
  .replace(/\n\};$/, "\n};");
let jsPct = null;
try { jsPct = new Function(runnable)(); } catch (e) { /* reported below */ }
ok("...and it executes as a standalone function", typeof jsPct === "function");

// ---- 3. rebuild the pools in JS, from the app's own rule ------------------
const METRICS = rd("grading/data/player_metrics_2025.json");
const adpNames = new Set(
  [...app.matchAll(/"([^"]+)":\s*\{\s*adp:\s*[\d.]+,\s*pos:\s*"\w+",\s*team:\s*"\w+"/g)]
    .map((m) => m[1]));
ok("the draftable ADP table parsed", adpNames.size > 200, `${adpNames.size} names`);

const KEYS = ["wopr", "tgt_sh", "snap_sh", "dud_rate"];
const pools = {};
for (const [name, m] of Object.entries(METRICS)) {
  if (name.startsWith("_") || !m || typeof m !== "object") continue;
  const pos = m.pos;
  if (!["RB", "WR", "TE"].includes(pos)) continue;
  if ((m.gp || 0) < 8 || !adpNames.has(name)) continue;
  for (const k of KEYS) {
    if (typeof m[k] === "number") ((pools[pos] ||= {})[k] ||= []).push(m[k]);
  }
}
for (const d of Object.values(pools)) for (const a of Object.values(d)) a.sort((x, y) => x - y);

// ---- 4. THE REAL TEST: both implementations, every player ----------------
const dump = JSON.parse(execFileSync("python",
  ["scripts/matchup-brief.py", "--pctdump"],
  { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

ok("the Python dump is non-trivial", dump.rows.length > 500, `${dump.rows.length} rows`);
for (const [pos, byKey] of Object.entries(dump.pools)) {
  for (const [k, n] of Object.entries(byKey)) {
    ok(`pool size agrees for ${pos}.${k}`, (pools[pos]?.[k]?.length ?? -1) === n,
       `js ${pools[pos]?.[k]?.length} vs py ${n}`);
  }
}

const compare = (rows) => {
  const bad = [];
  for (const [name, pos, key, value, pyPct] of rows) {
    let j = jsPct(pools[pos]?.[key], value);
    if (j != null && key === "dud_rate") j = 100 - j;   // App.jsx applies invert outside
    if (j !== pyPct) bad.push(`${name} ${pos}.${key}: js ${j} vs py ${pyPct}`);
  }
  return bad;
};
const bad = compare(dump.rows);
ok("every percentile agrees across both implementations", bad.length === 0,
   bad.slice(0, 3).join(" | "));

// ---- 5. the must-fail case ----------------------------------------------
// A checker that has never been seen to fail is not known to work. Perturb one
// value and require the comparison to catch it.
const sabotaged = dump.rows.map((r, i) => (i === 0 ? [...r.slice(0, 4), r[4] + 1] : r));
ok("...and a single wrong percentile IS caught", compare(sabotaged).length === 1);
ok("a pool under 12 returns null, not a flattering rank",
   jsPct([1, 2, 3, 4, 5], 3) === null);

// ---- 6. the mirror ------------------------------------------------------
ok("App.jsx and App.jsx.jsx are identical", app === mirror);

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall passed");
process.exit(fail ? 1 : 0);
