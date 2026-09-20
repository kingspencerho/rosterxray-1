// Guard 46 — FIRST-READ TARGETS, and the confound that nearly shipped.
//
// WHAT THIS PROTECTS, in descending order of what a regression costs:
//
//  1. ⛔⛔ THE POOLED NUMBER IS A TRAP. fr_rate repeats at 0.908 pooled, which
//     would be the stickiest input measured anywhere in this app. It is
//     measuring POSITION: backs check down at a 0.19 median, receivers are the
//     design at 0.73, tight ends sit between. Within position it is WR 0.567,
//     TE 0.400, RB 0.244. It was one falsifying run away from being quoted as
//     a finding.
//  2. fr_share IS A RESTATEMENT. It overlaps target share at 0.89 - the same
//     ruling route share got against snap share at 0.957. Shipping it as an
//     independent signal adds a column and no information.
//  3. THE NAME. Outside analysts publish first-read targets PER ROUTE. That
//     denominator needs pbp_participation, 404 for 2026. Calling ours the same
//     thing would claim a metric we cannot compute.
//  4. CONTAINMENT. Context only, out of the AI prompt, like every layer whose
//     stability has not earned a place in a grade.
import { readFileSync, existsSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
const rd = (f) => JSON.parse(readFileSync(path.join(repoRoot, f), "utf8"));
const txt = (f) => readFileSync(path.join(repoRoot, f), "utf8");
let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}${detail && !cond ? `  — ${detail}` : ""}`);
  if (!cond) fail++;
};

const F = "grading/data/first_read_2026.json";
ok("the first-read layer exists", existsSync(path.join(repoRoot, F)));
const d = rd(F);
const m = d._meta;

ok("it carries players", Object.keys(d.players || {}).length > 150,
   `${Object.keys(d.players || {}).length}`);
ok("the charting join is complete", m.join_rate >= 0.99, `${m.join_rate}`);
ok("...and no player id went unresolved", m.unresolved_ids === 0, `${m.unresolved_ids}`);

// ---- the name ------------------------------------------------------------
ok("it states it is NOT first-read targets per route", /NOT first-read targets per route/i.test(m.is_not || ""));
ok("...and says why the route denominator is unavailable", /participation/i.test(m.is_not || ""));

// ---- THE CONFOUND, and this is the assertion that matters ---------------
const st = m.stability || {};
ok("stability is recorded, not promised", typeof st === "object" && !!st.measured_by);
ok("...PER POSITION, not only pooled", !!st.fr_rate_WITHIN_position
   && typeof st.fr_rate_WITHIN_position.WR === "number"
   && typeof st.fr_rate_WITHIN_position.RB === "number");
ok("...and the within-position figures are far below the pooled one",
   st.fr_rate_pooled - st.fr_rate_WITHIN_position.WR > 0.25,
   `pooled ${st.fr_rate_pooled} vs WR ${st.fr_rate_WITHIN_position?.WR}`);
ok("the ruling forbids quoting the pooled number", /NEVER quote the pooled/i.test(st.ruling || ""));
ok("...and rules RB out", /NOT USE IT FOR RB|DO NOT USE/i.test(st.ruling || ""));
ok("fr_share is declared a restatement of target share", /restatement/i.test(st.ruling || ""));

// ---- the reader is told, not just the file ------------------------------
const sc = txt("scripts/scout.mjs");
ok("scout carries the position-specific r, not the pooled one",
   /0\.567/.test(sc) && /0\.244/.test(sc));
ok("...and warns against the pooled figure where a lineup is set",
   /NEVER quote the pooled 0\.908/.test(sc));
ok("...and marks RB weak rather than printing it plain", /Weak\./.test(sc));

// ---- containment --------------------------------------------------------
ok("the layer is not scored", m.scored === false);
ok("...and does not reach the AI prompt", m.reaches_ai_prompt === false);

// ---- the must-fail case -------------------------------------------------
// A guard never seen to fail is not known to work.
const sab = { ...st, fr_rate_WITHIN_position: { WR: 0.9, TE: 0.9, RB: 0.9 } };
ok("...and a stability block hiding the position split IS caught",
   !(sab.fr_rate_pooled - sab.fr_rate_WITHIN_position.WR > 0.25));

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall passed");
process.exit(fail ? 1 : 0);
