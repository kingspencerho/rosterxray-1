// Guard 45 — CURRENT-SEASON SNAP SHARE, and the public/private boundary.
//
// WHAT THIS PROTECTS, in descending order of what a regression costs:
//
//  1. ⛔ NO ROSTER FILE IN THIS REPO. rosterxray-audit is PUBLIC and his
//     rosters and leagues are private-repo-only by standing rule. The --roster
//     flag takes a PATH so the data can live outside; this asserts nobody ever
//     "helpfully" checks one in.
//  2. SNAP SHARE IS NOT ROUTE SHARE. They measure at r=0.957 and are not equal
//     - one counts pass plays, the other every offensive snap. On the same
//     week-1 sample one receiver read 37% of snaps against 29% of routes. If
//     the label drifts, a snap number gets quoted as a route number.
//  3. A PARTIAL WEEK MUST ANNOUNCE ITSELF. A week with two teams in it is a
//     Thursday game. Players in it have a denominator nobody else has.
//  4. THE LAYER IS RANK 2 AND CURRENT, so it outranks the 2025 rows. If that
//     ordering is lost the tool starts answering with last year's job.
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}${detail && !cond ? `  — ${detail}` : ""}`);
  if (!cond) fail++;
};

// ---- 1. the boundary ----------------------------------------------------
const rosterish = /(^|[-_])roster[-_.]|my-?roster|lineup\.(txt|json|md)$/i;
const offenders = [];
const walk = (dir, depth = 0) => {
  if (depth > 3) return;
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (f.name === "node_modules" || f.name === ".git") continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, depth + 1);
    else if (rosterish.test(f.name)) offenders.push(path.relative(repoRoot, p));
  }
};
walk(repoRoot);
ok("no roster file is checked into this PUBLIC repo", offenders.length === 0, offenders.join(", "));

const scout = readFileSync(path.join(repoRoot, "scripts/scout.mjs"), "utf8");
ok("the roster is taken by PATH, never embedded", /--roster/.test(scout) && /rosterPath/.test(scout));
ok("...and the reason is written down beside it", /PUBLIC/.test(scout) && /private/i.test(scout));

// ---- 2. the layer, and what it refuses to be ----------------------------
const f = "grading/data/snap_current_2026.json";
ok("the snap layer exists", existsSync(path.join(repoRoot, f)));
const d = JSON.parse(readFileSync(path.join(repoRoot, f), "utf8"));
ok("it carries players", Object.keys(d.players || {}).length > 200,
   `${Object.keys(d.players || {}).length}`);
ok("it states that it is NOT route share", /NOT route share/i.test(d._meta?.is_not || ""));
ok("...and names the r it is close at", /0\.957/.test(d._meta?.is_not || ""));
ok("it is labelled rank 2 and current", /^2\b/.test(d._meta?.hierarchy_rank || "")
   && /outrank/i.test(d._meta?.hierarchy_rank || ""));

// ---- 3. partial weeks announce themselves -------------------------------
ok("complete and partial weeks are separated",
   Array.isArray(d._meta?.weeks_complete) && Array.isArray(d._meta?.weeks_partial));
const overlap = (d._meta.weeks_complete || []).filter((w) => (d._meta.weeks_partial || []).includes(w));
ok("...and no week is called both", overlap.length === 0, overlap.join(","));
ok("the builder warns about partial weeks in its caveats",
   (d._meta.caveats || []).some((c) => /partial/i.test(c)));
ok("scout prints the partial-week warning", /PARTIAL - not every team/.test(scout));

// ---- 4. every player row is coherent ------------------------------------
let bad = [];
for (const [k, p] of Object.entries(d.players)) {
  if (!(p.snap_pct >= 0 && p.snap_pct <= 1)) bad.push(`${k} pct ${p.snap_pct}`);
  if (p.gp > (p.weeks || []).length) bad.push(`${k} gp ${p.gp} > weeks ${p.weeks.length}`);
}
ok("every snap_pct is a fraction and gp never exceeds weeks", bad.length === 0, bad.slice(0, 3).join(" | "));

// ---- 5. the must-fail case ----------------------------------------------
// A guard never seen to fail is not known to work.
const sabotage = { ...d._meta, is_not: "route share, basically" };
ok("...and a label that calls it route share IS caught",
   !/NOT route share/i.test(sabotage.is_not));

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall passed");
process.exit(fail ? 1 : 0);
