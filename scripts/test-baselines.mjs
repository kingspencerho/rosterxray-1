#!/usr/bin/env node
// test-baselines.mjs — guard 32. The field baseline shown beside the grade.
//
// TWO PROMISES, AND THE SECOND ONE IS UNUSUAL FOR A GUARD IN THIS REPO.
//
//   1. CONTEXT ONLY. Standard: it must never reach analyzeRoster or analyzeRedraft.
//      A baseline that fed the engine would move every grade and silently invalidate
//      every calibration figure in CLAUDE.md.
//
//   2. ⭐⭐ IT MUST NOT FLATTER. This is the one that matters and it has no precedent
//      here. If the simulated field is unrealistic the baseline lands far below any
//      real roster and EVERY user is told they beat the field. That is not a weak
//      feature, it is an actively lying one — and it is invisible, because a
//      too-generous comparison looks exactly like a working one.
//
//      MEASURED, and it is why the first build was thrown away: an ADP-only
//      simulation never stacked, every synthetic QB came out unlooped, and the median
//      landed at 1.99 against real fixtures at 5.43 and 7.74. The fix was to make the
//      simulated drafters stack, not to adjust the number.
//
//      So the assertion is ORDERING, not a threshold: the five committed fixtures must
//      place against the field in the same order their grades rank them. A flattering
//      baseline puts a C+ roster above the median and fails here.
//
// Run: node scripts/test-baselines.mjs   (exits non-zero on failure)

import { readFileSync } from "fs";
import path from "path";

const root = process.cwd();
const txt = f => readFileSync(path.join(root, f), "utf8");
const B = JSON.parse(txt("grading/data/baselines_2026.json"));
const app = txt("App.jsx");
const mirror = txt("App.jsx.jsx");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${cond || !detail ? "" : `  (${detail})`}`);
  if (!cond) fail++;
};
const bodyOf = (src, decl) => {
  const at = src.indexOf(decl); if (at < 0) return null;
  const open = src.indexOf("{", at); if (open < 0) return null;
  let d = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") d++;
    else if (src[i] === "}") { d--; if (!d) return src.slice(open, i + 1); }
  }
  return null;
};

console.log("containment");
ok("App.jsx and App.jsx.jsx are identical", app === mirror);
for (const engine of ["const analyzeRoster = ", "const analyzeRedraft = "]) {
  const body = bodyOf(app, engine);
  ok(`${engine.trim()} found`, !!body);
  if (!body) continue;
  const name = engine.match(/analyze\w+/)[0];
  for (const tok of ["BASELINES", "fieldPlacement", "baselines_2026"]) {
    const re = new RegExp(`(^|[^A-Za-z0-9_$])${tok}[.\\[(]`);
    ok(`${name} never reads ${tok}`, !re.test(body),
      "a baseline feeding the engine moves every grade and invalidates every recorded calibration");
  }
}
ok("fieldPlacement is defined exactly once",
  (app.match(/const fieldPlacement = /g) || []).length === 1);
const calls = [...app.matchAll(/fieldPlacement\(/g)].map(m => m.index)
  .filter(i => !app.slice(Math.max(0, i - 30), i).includes("const fieldPlacement = "));
ok("fieldPlacement has exactly one call site", calls.length === 1, `${calls.length} found`);

console.log("\nthe file describes itself honestly");
const m = B._meta;
ok("context_only is true", m.context_only === true);
ok("reaches_ai_prompt is false", m.reaches_ai_prompt === false);
ok("the roster count is recorded", typeof m.rosters === "number" && m.rosters >= 100);
ok("it is deterministic (a seed is recorded)", typeof m.seed === "number",
  "a baseline that moves every run cannot be calibrated against");
ok("its limits are recorded", Array.isArray(m.limits) && m.limits.length >= 2);
ok("it says it is a MODEL of the field, not the field",
  m.limits.some(l => /model of the field/i.test(l)));

console.log("\nshape");
const keys = Object.keys(B.tournaments);
ok("every tournament has a baseline", keys.length >= 15, `${keys.length} present`);
let bad = null;
for (const [k, v] of Object.entries(B.tournaments)) {
  if (!(v.min <= v.p25 && v.p25 <= v.median && v.median <= v.p75 && v.p75 <= v.p90 && v.p90 <= v.max)) bad = k;
  if (v.n < 100) bad = `${k} (n=${v.n})`;
}
ok("percentiles are ordered and every sample is >=100 rosters", !bad, bad || "");

console.log("\n⭐ the anti-flattery assertion — fixtures must place in grade order");
// Live grades, recorded Sep 6 2026. If the engine changes these move, and the
// ORDERING is what is asserted rather than the values.
const FIX = {
  ref1: { grade: "A",  bbm7: 7.74, main: 9.58 },
  ref5: { grade: "A",  bbm7: 7.50, main: 6.48 },
  ref4: { grade: "A",  bbm7: 7.16, main: 6.20 },
  ref3: { grade: "B+", bbm7: 5.37, main: 5.43 },
  ref2: { grade: "C+", bbm7: 1.11, main: 1.29 },
};
for (const t of ["bbm7", "main"]) {
  const b = B.tournaments[t];
  const scores = Object.entries(FIX).map(([f, v]) => ({ f, s: v[t] }));
  // A roster graded A must not sit below the field median.
  for (const { f, s } of scores) {
    if (FIX[f].grade === "A") ok(`${t}: ${f} (A) is at or above the field median`, s >= b.median, `${s} vs ${b.median}`);
    if (FIX[f].grade === "C+") ok(`${t}: ${f} (C+) is below the field median`, s < b.median, `${s} vs ${b.median}`);
  }
  // And the whole set must be monotonic against the bands.
  const band = s => s >= b.p90 ? 4 : s >= b.p75 ? 3 : s >= b.median ? 2 : s >= b.p25 ? 1 : 0;
  const order = ["ref2", "ref3", "ref4", "ref5", "ref1"];      // worst -> best by grade
  const bands = order.map(f => band(FIX[f][t]));
  ok(`${t}: bands never decrease as grade improves`, bands.every((v, i) => i === 0 || v >= bands[i - 1]),
    order.map((f, i) => `${f}:${bands[i]}`).join(" "));
}
// The median must sit in a plausible place: not so low that everything beats it,
// not so high that nothing does.
for (const t of ["bbm7", "main"]) {
  const b = B.tournaments[t];
  ok(`${t}: the field median is not implausibly low`, b.median >= 3.0,
    `${b.median} — a median this low would tell almost every real roster it beats the field`);
  ok(`${t}: the field median is not implausibly high`, b.median <= 8.0, `${b.median}`);
}

console.log("\nthe copy does not overclaim");
ok("the UI calls them simulated, not real opponents",
  /simulated rosters drafted off ADP, not real opponents/.test(app),
  "a percentile against a simulation must never read as a percentile against the field");
ok("the UI is muted chrome, not --caution",
  /vs the field<\/span>/.test(app) && !/vs the field[\s\S]{0,200}--caution/.test(app),
  "a comparison is information; --caution is reserved for real warnings");

console.log("\nmetric coverage — resolved is not measured");
// ONE DEFINITION OF THE GATE. It was hand-typed twice before Sep 6 2026 (Ceiling
// Shape Layer and Floor Layer) and a third consumer was about to be added. Eighth
// instance of the duplicate-definition class in this repo.
ok("CEILING_GATE is defined exactly once",
  (app.match(/const CEILING_GATE = /g) || []).length === 1);
// ⚠️ SCOPED TO THE COMBINED gp-AND-snap GATE, deliberately. `CARD_PERCENTILES`
// carries its own `gp >= 8` for the percentile POPULATION (draftable + 8 games, no
// snap share) — a different gate that happens to share one number. Unifying them
// would be WORSE than the duplication: a future change to the scoring gate would
// then silently move every percentile on the player card.
ok("no hand-typed copy of the SCORING gate survives",
  !app.includes("(m.snap_sh || 0) < 0.35"),
  "a second literal 8 + 0.35 pair is the duplicate-definition class");
ok("three consumers read the constant",
  (app.match(/CEILING_GATE\.gp/g) || []).length >= 3,
  "Ceiling Shape (best ball), Floor (redraft), and the coverage line");

ok("metricCoverage is defined exactly once",
  (app.match(/const metricCoverage = /g) || []).length === 1);
const covCalls = [...app.matchAll(/metricCoverage\(/g)].map(x => x.index)
  .filter(i => !app.slice(Math.max(0, i - 30), i).includes("const metricCoverage = "));
// TWO call sites now, one per mode. It renders wherever a grade is shown; the
// FIELD BASELINE deliberately stays best-ball-only because its file is keyed by
// tournament and the render reads the best-ball `tournament` state.
ok("metricCoverage has exactly two call sites (best ball + redraft)", covCalls.length === 2, `${covCalls.length}`);
ok("the redraft copy names the layers that go blind THERE",
  app.includes("floor and lineup-confidence checks cannot see them"),
  "best ball says ceiling/floor/naked-RB; redraft has different consumers");
ok("the field baseline stays best-ball only",
  (app.match(/fieldPlacement\(/g) || []).length === 1,
  "exactly one CALL site; a redraft copy would compare a redraft score against a best-ball field");
for (const engine of ["const analyzeRoster = ", "const analyzeRedraft = "]) {
  const body = bodyOf(app, engine); if (!body) continue;
  ok(`${engine.match(/analyze\w+/)[0]} never calls metricCoverage`, !body.includes("metricCoverage("),
    "it reports ON the grade and must never be an input TO it");
}

// The line must give the reader something to act on: the count, the gate, and
// which checks go blind. A bare "13 of 18" is a number nobody can use.
ok("the line names the count", app.includes("players with 2025 data"));
ok("the gate is printed FROM the constant, never re-typed into the copy",
  app.includes("{CEILING_GATE.gp}+ games") && app.includes("Math.round(CEILING_GATE.snap"));
ok("the line names which checks go blind",
  app.includes("ceiling, floor and naked-RB checks cannot see them"));
ok("a thin roster is flagged as resting on construction",
  app.includes("rests mostly on construction") && app.includes("mc.measured / mc.total < 0.7"));
// The gate moved from an early `mc.measured >= mc.total` return to a named
// `partial` flag when the header was compressed on Sep 6 2026, because the block
// now also carries the field baseline and the discipline reason and cannot bail
// out on coverage alone. Assert the PROPERTY — no coverage line without partial
// coverage — rather than one literal early-return, which is the same lesson the
// floor-layer guard learned when CEILING_GATE became a constant.
ok("it renders ONLY when coverage is incomplete",
  (app.match(/mc\.measured < mc\.total/g) || []).length === 2
  && (app.match(/\{partial && \(/g) || []).length >= 1
  && app.includes("if (!partial) return null;"),
  "on a fully measured roster the qualifier would be noise on every grade");

// ⭐ COMPRESSION MUST NOT DROP WHAT THE COPY WAS GUARDED FOR. The three header
// qualifiers were folded into one <details> because ~60 words of 11px prose under
// the grade is unreadable on a phone mid-draft. The caveat that the field is
// SIMULATED is the one thing that may not move behind the tap: at rest the line
// reads "<placement> of a simulated field", so a percentile against a model can
// never be read as a percentile against real opponents even unopened.
ok("the RESTING line still says the field is simulated",
  /of a simulated field/.test(app),
  "the full caveat may live inside the disclosure; the word may not");
ok("the header qualifiers are one disclosure, not three stacked lines",
  (app.match(/why ⌄<\/span>/g) || []).length >= 1,
  "one affordance, opened by choice");
ok("it is muted chrome, not --caution",
  app.includes("measured on</span>") && !/measured on[\s\S]{0,200}--caution/.test(app));

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
