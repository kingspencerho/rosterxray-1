// Guard 42 — EXPECTED FANTASY POINTS and the FULL-PPR PREMIUM.
//
// WHAT THIS PROTECTS, in descending order of what a regression costs:
//
//  1. CONTAINMENT. Context only. A leak into either engine moves grades by a
//     fraction, passes a spot check, and silently invalidates every
//     calibration figure in CLAUDE.md. Nothing errors.
//  2. THE SOURCE FILE IS FULL PPR AND ITS TOTALS MUST STAY UNUSED. Verified by
//     reconstruction across four players: `total_fantasy_points_exp` matches
//     full PPR to 0.02. This app is half-PPR with 4-point passing TDs, so both
//     sides are recomputed from components. Copying their total prints a PPR
//     number on a half-PPR card.
//  3. THE SCORING IS NOT RETYPED. build-expected-points.py's SCORE must equal
//     build-gamelogs.py's. Thirteenth instance of the duplicate-definition
//     class if it drifts.
//  4. THE EDGE CLAIM EXPIRES. Expected points beats actual points only through
//     week 2 (+0.066 after one game, +0.026 after two, +0.002 by week eight).
//     A layer that keeps claiming an edge it no longer has is the
//     stale-verdict trap in a new costume, so the note must flip.
//  5. THE PPR PREMIUM IS READ AGAINST POSITION. 1.5 is p90 for a back and
//     about median for a receiver; an absolute bar says every receiver is
//     valuable in PPR, which is true of the position and says nothing about
//     the player.
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

// Comments blanked LENGTH-PRESERVING before any structural check. Six guards
// here have failed on their own documentation; preserving offsets keeps
// reported indices pointing at the real file.
const blank = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));

const app = txt("App.jsx");
const mirror = txt("App.jsx.jsx");
const code = blank(app);
const epBuild = txt("scripts/build-expected-points.py");
// SEVENTH instance of a guard failing on its own documentation: the module
// DOCSTRING names total_fantasy_points_exp while explaining why it is NOT
// used, and a #-only stripper leaves it standing. Blank the docstring too.
const epCode = epBuild
  .replace(/^"""[\s\S]*?"""/m, (m) => m.replace(/[^\n]/g, " "))
  .replace(/^\s*#[^\n]*$/gm, (m) => " ".repeat(m.length));
const volBuild = txt("scripts/build-volume-current.py");

console.log("\nexpected points + full-PPR premium");

// ---- 1. the files ---------------------------------------------------------
const cur = rd("grading/data/expected_2026.json");
const prior = rd("grading/data/expected_2025.json");
ok("both seasons exist", !!cur._meta && !!prior._meta);
ok("they are different seasons", cur._meta.season !== prior._meta.season);
ok("the prior is a complete season", prior._meta.season_complete === true);
ok("context only, never scored", cur._meta.context_only === true && cur._meta.scored === false);
ok("it never reaches the AI prompt", cur._meta.reaches_ai_prompt === false);
ok("the file records that the source totals are unused",
   /FULL PPR/i.test(cur._meta.rules?.recomputed || ""));
ok("it records that this is NOT Winks' model",
   /not the one|never present it as his/i.test(cur._meta.rules?.not_winks || ""));
ok("it warns the diff is not a skill rating",
   /NOT a skill rating|not a forecast/i.test(cur._meta.rules?.diff || ""));
ok("the prior carries real players", Object.keys(prior.players).length > 300,
   `${Object.keys(prior.players).length}`);

// ---- 2. THE SOURCE TOTALS STAY UNUSED -------------------------------------
ok("the builder never reads total_fantasy_points_exp",
   !/total_fantasy_points_exp/.test(epCode),
   "the source is FULL PPR — recompute from components or the card lies");
ok("it scores from component columns",
   /rec_yards_gained/.test(epCode) && /rush_touchdown/.test(epCode));
ok("both sides go through ONE function",
   /def score\(r, suffix\)/.test(epCode) || /def score\(r, suf/.test(epCode),
   "scoring expected and actual differently puts two scoring systems in the diff");

// ---- 3. THE SCORING IS NOT RETYPED ---------------------------------------
const grab = (src) => {
  const m = src.match(/SCORE\s*=\s*dict\(([^)]*)\)/);
  if (!m) return null;
  const o = {};
  for (const part of m[1].split(",")) {
    const kv = part.split("=");
    if (kv.length === 2) o[kv[0].trim()] = parseFloat(kv[1]);
  }
  return o;
};
const a = grab(txt("scripts/build-gamelogs.py"));
const b = grab(epBuild);
ok("both builders declare a SCORE dict", !!a && !!b);
if (a && b) {
  for (const k of Object.keys(b)) {
    ok(`SCORE.${k} matches build-gamelogs.py`, a[k] === b[k], `${a[k]} vs ${b[k]}`);
  }
  ok("it is half-PPR with 4-point passing TDs", b.rec === 0.5 && b.ptd === 4.0);
}

// ---- 4. CONTAINMENT -------------------------------------------------------
const SYMBOLS = ["EXPECTED_CUR", "EXPECTED_PRIOR", "expectedPoints",
                 "pprPremium", "PPR_META", "ExpectedRow", "EXPECTED_EDGE_WEEKS"];
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
  const bd = body(engine);
  ok(`${engine} was found`, !!bd);
  for (const sym of SYMBOLS) ok(`${engine} never reads ${sym}`, bd ? !bd.includes(sym) : false);
}
for (const fn of ["expectedPoints", "pprPremium"]) {
  const calls = [...code.matchAll(new RegExp(`${fn}\\(`, "g"))].length;
  ok(`${fn} has exactly one call site`, calls === 1, `${calls}`);
  ok(`...and it is inside buildPlayerCard`,
     (body("buildPlayerCard") || "").includes(`${fn}(`));
}

// ---- 5. THE EDGE CLAIM EXPIRES -------------------------------------------
ok("EXPECTED_EDGE_WEEKS exists and is 2", /EXPECTED_EDGE_WEEKS = 2\b/.test(code),
   "derived from the measurement, not chosen");
ok("the measured edge is recorded beside it", /\+0\.066/.test(app) && /\+0\.026/.test(app));
// Bounded to the section's own note, never a magic byte window. A fixed
// window asserts "these strings are near each other", which is not a
// property anyone wants and breaks the moment a sentence is added - the
// exact criticism guard 31 earned on Sep 6.
const noteStart = code.indexOf("card.expected.edgeLive");
const noteEnd = code.indexOf("<ExpectedRow", noteStart);
const note = noteStart > -1 && noteEnd > noteStart
  ? code.slice(noteStart, noteEnd) : "";
ok("the note carries BOTH branches, not just the good one",
   !!note && /stops beating raw points/.test(note)
   && /number to trust over raw points/.test(note),
   "it must SAY the edge is over, not merely go quiet");
ok("edgeLive is derived from the CURRENT week",
   /edgeLive:[^,]*wk <= EXPECTED_EDGE_WEEKS/.test(code));

// ---- 6. DIRECTION IS NOT A VERDICT ---------------------------------------
const rs = code.indexOf("const ExpectedRow = (");
const re_ = code.indexOf("const CardSection = (", rs);
const row = rs > -1 && re_ > rs ? code.slice(rs, re_) : "";
ok("ExpectedRow was found", !!row);
for (const tok of ["--pos", "--neg", "--caution", "--warn", "--tier"]) {
  ok(`ExpectedRow does not paint the gap with ${tok}`, !row.includes(tok),
     "out-scoring your usage is not good or bad, it is unexplained");
}

// ---- 7. THE PREMIUM IS POSITION-RELATIVE ---------------------------------
const volMeta = rd("grading/data/volume_2025.json")._meta.ppr_premium;
ok("the volume file carries per-position premium bands", !!volMeta?.by_pos);
ok("it records that it must be read against position",
   /POSITION/i.test(volMeta?.read_against || ""));
ok("QB is structurally zero", (volMeta?.by_pos?.QB?.median ?? 1) === 0);
ok("the medians differ by position",
   new Set(["RB", "WR", "TE"].map((p) => volMeta.by_pos[p]?.median)).size > 1,
   JSON.stringify(volMeta?.by_pos));
ok("the app reads the bands rather than typing one",
   /PPR_META\[pos\]/.test(code) && !/ppr_prem\s*>=\s*[0-9]/.test(code));
ok("the builder computes the premium as half a point per reception",
   /0\.5 \* a\["rec"\] \/ a\["gp"\]/.test(volBuild));

// ---- 8. BEHAVIOUR, NOT STRING MATCHING -----------------------------------
// A regex over source asserts text exists, never that code behaves.
const src = code.slice(code.indexOf("const pprPremium = ("),
                       code.indexOf("\n};", code.indexOf("const pprPremium = (")) + 3);
const make = (meta, curRow, priorRow) => new Function(
  "PPR_META", "getVolumeCur", "getVolumePrior", "VOLUME_CUR", "VOLUME_PRIOR",
  `${src} return pprPremium;`
)(meta, () => curRow, () => priorRow,
  { _meta: { season: 2026 } }, { _meta: { season: 2025 } });

const META = { RB: { median: 0.44, p75: 1.03, max: 3.0 },
               WR: { median: 0.79, p75: 1.50, max: 4.03 },
               QB: { median: 0, p75: 0, max: 0.06 } };

ok("a QB never gets a premium row",
   make(META, { ppr_prem: 0.05, gp: 17 }, null)("x", "QB") === null);
ok("a back above his position p75 is notable",
   make(META, { ppr_prem: 3.0, gp: 17 }, null)("y", "RB").notable === true);
ok("the SAME number is NOT notable for a receiver",
   make(META, { ppr_prem: 1.2, gp: 17 }, null)("z", "WR").notable === false,
   "1.2 clears the RB bar and not the WR bar — that is the whole point");
ok("...and it IS notable for a back",
   make(META, { ppr_prem: 1.2, gp: 17 }, null)("z", "RB").notable === true);
ok("it falls back to the prior season when there is no current row",
   make(META, null, { ppr_prem: 2.0, gp: 17 })("p", "RB").season === 2025);
ok("no row at all returns null",
   make(META, null, null)("q", "RB") === null);
ok("an unknown position returns null rather than guessing",
   make(META, { ppr_prem: 2, gp: 9 }, null)("k", "FB") === null);

// ---- 9. the provenance line on Week outcomes ------------------------------
ok("Week outcomes states its bands are half-PPR", /Bands are HALF-PPR/.test(app));
ok("...and carries the measured per-position shift",
   /26% at RB/.test(app) && /76% at TE/.test(app));
ok("...and does not pass judgement", !/should not start|avoid him/i.test(
   (app.match(/Bands are HALF-PPR[^"]*/) || [""])[0]));

// ---- 9b. SCOUT CONSUMPTION, added Sep 19 2026 ---------------------------
// scout.mjs now PRINTS this layer, which is new exposure: a number a reader
// acts on is different from a number sitting in a file. The layer's own rules
// block imposes three things and none of them are optional once it is on a
// page a lineup gets set from.
const sc = txt("scripts/scout.mjs");
ok("scout ranks on EXPECTED, not actual, and says so",
   /RANK IS ON EXPECTED, NOT ACTUAL/.test(sc));
ok("...and states the +/- is NOT a forecast",
   /NOT a forecast/.test(sc) && /NOT a skill rating/.test(sc));
ok("...and refuses the attribution the layer forbids",
   /NOT Hayden/.test(sc) && /never to be presented as his/i.test(sc));
ok("scout carries the measured expiry, not a vague caveat",
   /0\.066/.test(sc) && /0\.002/.test(sc) && /week 8/.test(sc));
// ⛔ CONTAINMENT IS THE ONE THAT COSTS MOST. Printing it in a scouting tool must
// not become feeding it to a grader - the whole layer is context_only, and a
// leak moves grades by a fraction and invalidates every calibration figure.
for (const f of ["grading/data/expected_2026.json", "grading/data/expected_2025.json"]) {
  const m = rd(f)._meta;
  ok(`${f} is still context-only`, m.context_only === true && m.scored === false);
  ok(`...and still out of the AI prompt`, m.reaches_ai_prompt === false);
}
ok("the percentile is DERIVED from the published rank, never recomputed",
   /DERIVED from the rank/.test(sc) && !/expPool|recomputePct/.test(sc));

// ---- 10. the mirror ------------------------------------------------------
ok("App.jsx and App.jsx.jsx are identical", app === mirror);

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall passed");
process.exit(fail ? 1 : 0);
