// Guard 41 — THIS SEASON AGAINST HIS OWN PRIOR SEASON.
//
// The card has rendered both vintages side by side since Sep 1 2026 and never
// said whether the gap between them was large. This layer computes the delta
// and judges it against a bar derived from the observed spread.
//
// WHAT THIS GUARD PROTECTS, in descending order of what a regression costs:
//
//  1. CONTAINMENT. Context only. A leak into either engine moves grades by a
//     fraction, passes a spot check, and silently invalidates every
//     calibration figure recorded in CLAUDE.md. Nothing errors.
//  2. THE PRIOR IS A VOLUME FILE, NOT player_metrics_2025.json. That file
//     divides a traded player's FULL-SEASON targets by ONE team's totals -
//     Brandin Cooks reads 29.3% against a true 8.9% - so diffing against it
//     manufactures a role change for every mid-season mover, which is exactly
//     the population this layer exists to find. A delta between two numbers
//     computed differently measures the METHOD.
//  3. DIRECTION IS NEVER A GOOD/BAD HUE. Green means "good matchup" elsewhere
//     on this page. A rising aDOT is not good, it is a different job.
//  4. `moved: null` MEANS NOT YET MEASURABLE, never "flat". Rendering the two
//     the same way turns an unknown into a finding.
//  5. THE BAR AND THE r VALUES ARE READ, NEVER RETYPED. Twelfth instance of
//     the duplicate-definition class if either is hand-written here.
import { readFileSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
const rd = (f) => JSON.parse(readFileSync(path.join(repoRoot, f), "utf8"));
const txt = (f) => readFileSync(path.join(repoRoot, f), "utf8");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}${detail && !cond ? `  — ${detail}` : ""}`);
  if (!cond) fail++;
};

// ⚠️ Comments are blanked LENGTH-PRESERVING before any structural check. Five
// guards in this repo have failed on their own documentation (31 on `<button`,
// 17 on the cyan token, 25 on "matchup", 32 on `fieldPlacement`, the Sep 9
// `adjCoverageOpen` assertion). Preserving offsets keeps reported indices
// pointing at the real file.
const blank = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));

const app = txt("App.jsx");
const mirror = txt("App.jsx.jsx");
const code = blank(app);
const builder = txt("scripts/build-volume-current.py");
const buildCode = builder.replace(/^\s*#[^\n]*$/gm, (m) => " ".repeat(m.length));

console.log("\nusage vs prior season");

// ---- 1. the files line up ------------------------------------------------
const cur = rd("grading/data/volume_2026.json");
const prior = rd("grading/data/volume_2025.json");
ok("a prior-season volume file exists", !!prior._meta, "grading/data/volume_2025.json");
ok("the prior is a DIFFERENT season from the current one",
   prior._meta.season !== cur._meta.season, `${prior._meta.season} vs ${cur._meta.season}`);
ok("the prior is a COMPLETE season", prior._meta.season_complete === true);
ok("both were built by the same builder",
   prior._meta.source === cur._meta.source, `${prior._meta.source} / ${cur._meta.source}`);
ok("the prior carries real players", Object.keys(prior.players).length > 100,
   `${Object.keys(prior.players).length}`);

const vp = cur._meta.vs_prior;
ok("the current file carries a vs_prior block", !!vp);
ok("vs_prior names the season it compared against",
   vp && vp.prior_season === prior._meta.season);
ok("vs_prior states its method rule", !!vp?.rules?.method);
ok("the method rule forbids player_metrics explicitly",
   /player_metrics/.test(vp?.rules?.method || ""));
ok("vs_prior states that a null `moved` is not `flat`",
   /not yet measurable/i.test(vp?.rules?.moved_null || ""));
ok("vs_prior states an absent pair is not a failed gate",
   /NOT a gate he failed/i.test(vp?.rules?.no_pair || ""));
ok("vs_prior states it carries decisions only",
   /no yards|no touchdowns/i.test(vp?.rules?.decisions_only || ""));

// ---- 2. THE PRIOR IS NEVER player_metrics -------------------------------
// The single most damaging thing anyone could "simplify" this into.
ok("the builder never OPENS player_metrics",
   !/(open|load)\s*\([^)]*player_metrics/.test(buildCode),
   "naming the file in prose is fine; READING it for the prior is not");
ok("the prior comes from the PRIOR argument and nowhere else",
   /json\.load\(open\(PRIOR\)\)/.test(buildCode));
ok("App.jsx computes no shift against PLAYER_METRICS",
   !/vs_prior[\s\S]{0,400}PLAYER_METRICS|PLAYER_METRICS[\s\S]{0,200}vs_prior/.test(code));

// ---- 3. CONTAINMENT ------------------------------------------------------
const SYMBOLS = ["VOLUME_PRIOR", "usageShift", "SHIFT_META", "SHIFT_ROWS",
                 "SHIFT_STABILITY", "vs_prior", "ShiftRow"];
const body = (fn) => {
  const i = code.indexOf(`const ${fn} = (`);
  if (i < 0) return null;
  let d = 0, started = false;
  for (let j = i; j < code.length; j++) {
    if (code[j] === "{") { d++; started = true; }
    else if (code[j] === "}") { d--; if (started && d === 0) return code.slice(i, j + 1); }
  }
  return null;
};
for (const engine of ["analyzeRoster", "analyzeRedraft"]) {
  const b = body(engine);
  ok(`${engine} was found`, !!b);
  for (const sym of SYMBOLS) {
    ok(`${engine} never reads ${sym}`, b ? !b.includes(sym) : false);
  }
}

// Reviewed consumers, an allowlist rather than a count. The point is that every
// call site has been looked at, not that there are few — same shape as guard 13.
const defs = [...code.matchAll(/const usageShift = \(/g)].length;
const calls = [...code.matchAll(/usageShift\(/g)].length;
ok("usageShift is defined exactly once", defs === 1, `${defs} definitions`);
ok("usageShift has exactly one call site", calls === 1, `${calls} calls`);
ok("its one call site is inside buildPlayerCard",
   (body("buildPlayerCard") || "").includes("usageShift("));

// ---- 4. DIRECTION IS NOT A VERDICT --------------------------------------
const rowStart = code.indexOf("const ShiftRow = (");
const rowEnd = code.indexOf("const CardSection = (", rowStart);
const row = rowStart > -1 && rowEnd > rowStart ? code.slice(rowStart, rowEnd) : "";
ok("ShiftRow was found", !!row);
for (const tok of ["--pos", "--neg", "--caution", "--warn", "--tier", "--accent-"]) {
  ok(`ShiftRow does not paint direction with ${tok}`, !row.includes(tok),
     "up is not good and down is not bad — a rising aDOT is a different job");
}
ok("it carries the moved signal as WEIGHT", /fontWeight/.test(row));
ok("it carries direction as an arrow, not a colour",
   row.includes("\\u2191") && row.includes("\\u2193"));

// ---- 5. NOTHING IS RETYPED ----------------------------------------------
const rowsSpec = code.slice(code.indexOf("const SHIFT_ROWS = ["),
                            code.indexOf("];", code.indexOf("const SHIFT_ROWS = [")) + 2);
ok("SHIFT_ROWS was found", rowsSpec.length > 20);
ok("SHIFT_ROWS hand-writes no stability value",
   !/\br:\s*0\.\d/.test(rowsSpec),
   "the r is read from the file's own stability block");
ok("the r is read from the file", /SHIFT_STABILITY\[/.test(code));
ok("the bar is read from the file, never typed",
   /SHIFT_META\.metrics\?\.\[/.test(code) || /SHIFT_META\.metrics\[/.test(code));
ok("the builder derives the bar from a standard deviation",
   /stdev\(xs\)/.test(buildCode) && !/bar\s*[=:]\s*0\.\d/.test(buildCode) && !/"bar":\s*[0-9]/.test(buildCode));

// ---- 6. THE BAR IS HONEST ------------------------------------------------
// It only means "moved more than most players moved" if the distribution it
// came from is centred. A drifting median would make it measure league-wide
// change instead. Same property guard 13 pins for snap trajectory.
const metrics = vp?.metrics || {};
for (const [k, m] of Object.entries(metrics)) {
  if (m.n >= 30 && m.median != null) {
    const scale = Math.abs(m.stdev || 1);
    ok(`${k}: the shift distribution is centred`, Math.abs(m.median) <= scale,
       `median ${m.median} against 1 SD ${m.stdev}`);
  }
  if (m.n < 30) {
    ok(`${k}: an underived bar is null, never a guess`, m.bar === null,
       `n=${m.n} but bar=${m.bar}`);
  }
}

// ---- 7. BEHAVIOUR, NOT STRING MATCHING ----------------------------------
// A regex over source asserts that text exists, never that code behaves. This
// extracts the real function and RUNS it — the technique guard 29 adopted
// after a sabotage survived a string-match check. The no-prior branch is the
// one that needs it most: no fixture exercises it, because a rookie has no
// prior-season row by definition.
const src = code.slice(code.indexOf("const usageShift = ("),
                       code.indexOf("\n};", code.indexOf("const usageShift = (")) + 3);
const make = (live, meta, volume) => new Function(
  "SHIFT_LIVE", "SHIFT_META", "SHIFT_STABILITY", "SHIFT_ROWS", "getVolumeCur",
  `${src} return usageShift;`
)(live, meta, { adot: 0.826, tgt_sh: 0.729 },
  [{ key: "adot", label: "Air yards per target" }, { key: "tgt_sh", label: "Target share", pct: true }],
  () => volume);

const META = { prior_season: 2025, metrics: { adot: { bar: 1.5 }, tgt_sh: { bar: 0.02 } } };

const rookie = make(true, META, { gp: 3, vs_prior: null });
const r1 = rookie("x", "WR");
ok("a player with no prior returns a REASON, never an empty card",
   !!r1 && r1.rows.length === 0 && /no 2025 row/i.test(r1.why || ""), JSON.stringify(r1));
ok("...and that reason is not a gate he failed",
   !!r1 && !/needs \d/.test(r1.why || ""), r1?.why);

const moved = make(true, META, {
  gp: 3, prior_gp: 17, team: "MIA", prior_team: "MIA",
  vs_prior: { adot: { cur: 16.9, prior: 5.2, delta: 11.7, moved: "up" },
              tgt_sh: { cur: 0.296, prior: 0.14, delta: 0.156, moved: "up" } },
});
const r2 = moved("y", "WR");
ok("a moved player returns both rows with their bars",
   r2.rows.length === 2 && r2.rows[0].bar === 1.5 && r2.moved === 2,
   JSON.stringify(r2.rows.map((x) => [x.key, x.bar, x.moved])));
ok("...and reads its r from the stability block",
   r2.rows[0].r === 0.826);

const unmeasurable = make(true, { prior_season: 2025, metrics: { adot: { bar: null } } }, {
  gp: 2, prior_gp: 17, vs_prior: { adot: { cur: 9, prior: 8, delta: 1, moved: null } },
});
const r3 = unmeasurable("z", "WR");
ok("a null `moved` is reported as NOT MEASURABLE, never as flat",
   r3.measurable === false && r3.moved === 0, JSON.stringify(r3));

const changed = make(true, META, {
  gp: 3, prior_gp: 17, team: "PIT", prior_team: "IND", changed_team: true,
  vs_prior: { tgt_sh: { cur: 0.081, prior: 0.213, delta: -0.132, moved: "down" } },
});
ok("a changed team is surfaced with both team codes",
   changed("p", "WR").changedTeam === true && changed("p", "WR").priorTeam === "IND");

ok("a carries row is withheld from a receiver",
   make(true, META, { gp: 3, vs_prior: { car_pg: { cur: 1, prior: 0, delta: 1, moved: null } } })("q", "WR").rows.length === 0);

ok("the layer is dormant when the season has no data",
   make(false, META, { gp: 3, vs_prior: {} })("w", "WR") === null);

// ---- 8. THE RENDER SAYS WHICH IT IS -------------------------------------
ok("the render distinguishes not-measurable from flat",
   /measurable/.test(code) && /not yet measurable/i.test(code));
ok("the note names the two game counts", /priorGp\}[^`]*games then/.test(code));
ok("the note names the changed team when there is one",
   /changedTeam \?/.test(code) && /different offence/.test(code));

// ---- 9. the mirror ------------------------------------------------------
ok("App.jsx and App.jsx.jsx are identical", app === mirror);

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall passed");
process.exit(fail ? 1 : 0);
