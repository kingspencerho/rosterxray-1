#!/usr/bin/env node
// test-fpa-current.mjs — guard 40. The live in-season FPA layer.
//
// ⛔⛔ THIS IS THE ONLY IN-SEASON LAYER THAT IS SCORED. Every other one built
// since August is context — a leak into analyzeRoster fails their guards. This
// one FEEDS the grade on purpose, which inverts the usual risk: the danger is
// not that it reaches the engine, it is that it reaches the engine WRONG and
// silently re-bases every calibration figure in CLAUDE.md.
//
// What it protects, worst regression first:
//
//  1. THE RANK POOL MUST MATCH THE VINTAGE THE VALUE CAME FROM. Ranking a live
//     2026 number inside the 2025 distribution places it against a league that
//     no longer exists. Same population error as the card's five separate
//     percentile tables, one level up.
//  2. WHEN LIVE, NO ADJUSTMENT APPLIES. COACHING_ADJ and OFFSEASON_ADJ_2026 are
//     guesses at what a defence would BECOME; real results already contain it.
//  3. ONE PAIR OF HELPERS, NOT TWO PASTED BLOCKS. getMatchupTier and
//     getMatchupScoreForOpponent had identical lookup+adjust+rank logic, and
//     duplicating it is the class this repo has paid for ten times.
//  4. THE GATES ARE READ FROM _meta.gates, never retyped in App.jsx.
//  5. THE PLACEHOLDER IS INERT. weeks_covered 0 means no position is live and
//     the app behaves exactly as it did before 2026 existed.
//
// Derivation and the 0.355 significance bar: ANALYST-REFERENCE.md §2b.
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const app = readFileSync(path.join(root, "App.jsx"), "utf8");
const fpa = JSON.parse(readFileSync(path.join(root, "grading/data/fpa_2026.json"), "utf8"));

let fail = 0;
const ok = (label, cond, why = "") => {
  if (cond) console.log(`  ok   ${label}`);
  else { console.log(`  FAIL ${label}${why ? `   <- ${why}` : ""}`); fail++; }
};

// ⚠️ Comments legitimately NAME the things these assertions forbid — five guards
// in this repo have failed on their own documentation. Blank them length-
// preservingly so reported offsets still point at the real file.
const codeOnly = app
  .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));

console.log("");
console.log("live in-season FPA");

// ---------------------------------------------------------------- shape
const m = fpa._meta || {};
ok("the file declares it is SCORED", m.scored === true,
  "unlike every other in-season layer, this one feeds the grade");
ok("and that it never reaches the AI prompt", m.reaches_ai_prompt === false);
ok("no prompt builder exists", !/fpaCurrentContext|fpaContext\s*=/.test(codeOnly));
ok("gates are published in _meta", m.gates && ["QB", "RB", "WR", "TE"].every((p) => typeof m.gates[p] === "number"));
ok("RB's gate is looser than the pass positions",
  m.gates.RB > m.gates.WR, "sample parity: 1.79 backs/game vs a receiver's 2.29");
ok("live flags agree with weeks_covered and the gates",
  ["QB", "RB", "WR", "TE"].every((p) => m.live[p] === (m.weeks_covered >= m.gates[p])));
ok("the derivation is cited", /2b/.test(m.derivation || ""));
ok("the raw-FPA confound is stated", (m.caveats || []).some((c) => /schedule-adjusted/i.test(c)));

// ---------------------------------------------------------------- placeholder
ok("the committed file is the inert placeholder",
  m.weeks_covered === 0 && Object.keys(fpa.defences || {}).length === 0,
  "a real refresh lands via refresh-inseason.sh, reviewed in a PR");
ok("...so no position is live", Object.values(m.live).every((v) => v === false));

// ---------------------------------------------------------------- one helper pair
const count = (re) => (codeOnly.match(re) || []).length;
ok("fpaPointsFor is declared exactly once", count(/const fpaPointsFor\s*=/g) === 1);
ok("fpaRankPool is declared exactly once", count(/const fpaRankPool\s*=/g) === 1);
ok("fpaVintageLabel is declared exactly once", count(/const fpaVintageLabel\s*=/g) === 1);

const fnBody = (name) => {
  const i = codeOnly.indexOf(`const ${name} = `);
  return i < 0 ? "" : codeOnly.slice(i, codeOnly.indexOf("\n};", i));
};
for (const fn of ["getMatchupTier", "getMatchupScoreForOpponent"]) {
  const body = fnBody(fn);
  ok(`${fn} routes through fpaPointsFor`, /fpaPointsFor\(pos,/.test(body));
  ok(`${fn} ranks through fpaRankPool`, /fpaRankPool\(pos, live\)/.test(body));
  ok(`${fn} no longer adjusts inline`, !/COACHING_ADJ\[/.test(body) && !/OFFSEASON_ADJ_2026\[/.test(body),
    "a second adjust site is the duplicate-definition class");
  ok(`${fn} no longer ranks against the raw 2025 pool`,
    !/Object\.values\(FPA\[pos\]\)\.sort/.test(body));
}

// ---------------------------------------------------------------- behaviour
// The helpers are pure apart from the module tables, so EXTRACT AND RUN them.
// A regex over source asserts that text exists, never that code behaves — the
// lesson the LA/LAR fix cost a day to on Sep 11.
const cut = (start, end) => {
  const i = app.indexOf(start);
  const j = app.indexOf(end, i);
  return i < 0 || j < 0 ? "" : app.slice(i, j + end.length);
};
const src = [
  "const FPA = " + cut("const FPA = {", "\n};").slice("const FPA = ".length),
  cut("const COACHING_ADJ = {", "\n};"),
  cut("const OFFSEASON_ADJ_2026 = {", "\n};"),
  cut("const TEAM_SPELLINGS = ", "};"),
  cut("const lookupTeam = ", "};"),
  cut("const FPA_CUR_LIVE = ", ";"),
  cut("const fpaPointsFor = ", "\n};"),
  cut("const fpaRankPool = ", ";"),
].join("\n");

let pts = null, pool = null;
try {
  const made = new Function("FPA_CUR", `${src}; return { fpaPointsFor, fpaRankPool };`);
  const live2026 = {
    _meta: { live: { QB: true, RB: true, WR: true, TE: true }, weeks_covered: 6 },
    defences: { DAL: { WR: { pts: 9.99, g: 6 } }, MIN: { WR: { pts: 40.01, g: 6 } } },
  };
  const dead = { _meta: { live: { QB: false, RB: false, WR: false, TE: false }, weeks_covered: 0 }, defences: {} };
  const A = made(live2026), B = made(dead);

  const liveHit = A.fpaPointsFor("WR", "DAL", true);
  ok("live data replaces the 2025 base outright", liveHit.pts === 9.99 && liveHit.live === true,
    JSON.stringify(liveHit));
  ok("...and NO adjustment is added on top", liveHit.pts === 9.99,
    "COACHING_ADJ/OFFSEASON would have moved it off 9.99");

  const off = A.fpaPointsFor("WR", "DAL", false);
  ok("actual mode never reads the live file", off.live === false && off.pts !== 9.99);

  const notLive = B.fpaPointsFor("WR", "DAL", true);
  ok("an empty file falls back to the estimate", notLive.live === false && notLive.pts !== 9.99);
  // ⚠️ The first version asserted only that pts moved OFF the raw 33.14, and
  // OFFSEASON_ADJ alone satisfied that — so deleting COACHING_ADJ passed. Assert
  // the EXACT sum, the only form that catches either adjustment going missing.
  const rawDal = 33.14, coachDal = 1.0, offDal = 1.0;  // COACHING_ADJ.DAL.all, OFFSEASON.DAL.wr
  const r2 = (v) => Math.round(v * 100) / 100;
  ok("the fallback carries BOTH adjustments in projected mode",
    r2(notLive.pts) === r2(rawDal + coachDal + offDal),
    `expected ${r2(rawDal + coachDal + offDal)}, got ${notLive.pts}`);
  ok("...and only the coaching one in actual mode",
    r2(off.pts) === r2(rawDal + coachDal),
    `expected ${r2(rawDal + coachDal)}, got ${off.pts}`);

  const livePool = A.fpaRankPool("WR", true);
  ok("the live pool is the LIVE distribution", livePool.length === 2 && livePool[0] === 40.01,
    JSON.stringify(livePool));
  const oldPool = A.fpaRankPool("WR", false);
  ok("the fallback pool is the 2025 distribution", oldPool.length === 32);
  ok("the two pools are never the same object", livePool.length !== oldPool.length);
  pts = liveHit; pool = livePool;
} catch (e) {
  ok("the helpers extract and run", false, String(e).slice(0, 120));
}
ok("the helpers extracted and ran", pts !== null && pool !== null);

// ---------------------------------------------------------------- no retyped gates
const helperSrc = cut("const FPA_CUR_LIVE = ", "const getVacated");
// ⚠️ The first version forbade a LITERAL and missed `weeks_covered >= 3`, which
// is the same duplication wearing a comparison. Assert the POSITIVE property:
// the live flag is READ from _meta.live, which the builder already derived from
// the gates. Recomputing it in App.jsx is a second copy of the gate.
ok("the live flag is READ from _meta.live, never recomputed",
  helperSrc.includes("_meta?.live?.[pos]"),
  "recomputing it duplicates the gate the builder already applied");
ok("and no bare gate comparison is typed in App.jsx",
  !/weeks_covered[^\n]*>=\s*\d/.test(helperSrc));

console.log("");
console.log(fail ? `FAIL  live in-season FPA (${fail})` : "PASS  live in-season FPA: one helper pair, vintage-matched ranking, inert placeholder");
process.exit(fail ? 1 : 0);
