#!/usr/bin/env node
// test-teamtrends.mjs — guard 39. TEAM TRENDS: PROE, PACE, DEFENSIVE FUNNEL.
//
// The layer is CONTEXT ONLY and must never reach analyzeRoster, analyzeRedraft
// or the AI prompt. A leak moves one roster by a fraction, passes a spot check,
// and SILENTLY INVALIDATES every calibration figure in CLAUDE.md.
//
// ⛔ THE ASSERTION THIS GUARD EXISTS FOR IS THE DIRECTION RULE. A team's funnel
// describes the defence it FIELDS, so it is a fact about the players who FACE
// it. CLAUDE.md's FPA Direction Rule forbids applying a team's defensive rating
// to that team's own offensive players, and the only thing standing between
// this layer and that error is that the render pairs `off` of one side with
// `def` of the OTHER. That pairing is asserted here.
//
// ⚠️ TWO CENTRING TRAPS ARE ALSO PINNED. Neither PROE nor the funnel gap is
// centred on zero — 2025's league mean pass_oe is -1.74 and its mean funnel gap
// is positive, because passing is more efficient than running everywhere. A
// build that labelled off the raw number would call most of the league a pass
// funnel and two thirds of it run-heavy, and it would look like it worked.
import { readFileSync } from "fs";

const app   = readFileSync("App.jsx", "utf8");
const prior = JSON.parse(readFileSync("grading/data/teamtrends_2025.json", "utf8"));
const cur   = JSON.parse(readFileSync("grading/data/teamtrends_2026.json", "utf8"));
const bld   = readFileSync("scripts/build-teamtrends.py", "utf8");
const sh    = readFileSync("scripts/refresh-inseason.sh", "utf8");
const claude = readFileSync("CLAUDE.md", "utf8");

let fail = 0;
const ok  = (m) => console.log(`  ok   ${m}`);
const bad = (m) => { console.log(`  FAIL ${m}`); fail++; };
const t   = (c, m) => (c ? ok(m) : bad(m));

// Comments are stripped before every structural check. This guard family has
// failed on its own documentation six times; spaces preserve offsets.
const blank = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
const appCode = blank(app);

const body = (name) => {
  const i = appCode.indexOf(`const ${name} = `);
  if (i < 0) return null;
  let d = 0, started = false;
  for (let j = i; j < appCode.length; j++) {
    const c = appCode[j];
    if (c === "{") { d++; started = true; }
    else if (c === "}") { d--; if (started && d === 0) return appCode.slice(i, j + 1); }
  }
  return null;
};

console.log("\n1. CONTAINMENT — neither engine may see this layer");
const TOKENS = ["TRENDS_PRIOR", "TRENDS_CUR", "getTeamOff", "getTeamDef",
                "pickTrend", "teamtrends_"];
for (const engine of ["analyzeRoster", "analyzeRedraft"]) {
  const b = body(engine);
  if (!b) { bad(`${engine} is locatable`); continue; }
  const hits = TOKENS.filter((k) => b.includes(k));
  t(hits.length === 0, `${engine} reads none of the team-trends layer${hits.length ? ` (found ${hits.join(", ")})` : ""}`);
}

console.log("\n2. NO AI PROMPT — an unattended feed must not outrank measured inputs");
t(!/trendsContext|teamTrendContext|funnelContext|proeContext/.test(appCode),
  "no team-trends prompt builder exists");
const news = body("newsContext");
t(!news || TOKENS.every((k) => !news.includes(k)), "newsContext reads none of it");
t(prior._meta.reaches_ai_prompt === false && cur._meta.reaches_ai_prompt === false,
  "both files declare reaches_ai_prompt false");
t(prior._meta.scored === false && cur._meta.scored === false,
  "both files declare scored false");

console.log("\n3. REVIEWED CONSUMERS — an allowlist, not a count");
// The point is that every consumer has been looked at, not that there are few.
const ALLOWED = ["buildGameEnvBoard", "pickTrend", "getTeamOff", "getTeamDef"];
for (const acc of ["getTeamOff", "getTeamDef"]) {
  const re = new RegExp(`${acc}\\s*\\(`, "g");
  const sites = [];
  let m;
  while ((m = re.exec(appCode))) {
    // find the enclosing top-level const
    const before = appCode.slice(0, m.index);
    const owner = [...before.matchAll(/^const (\w+) = /gm)].pop();
    sites.push(owner ? owner[1] : "(module)");
  }
  const outside = sites.filter((s) => !ALLOWED.includes(s));
  t(outside.length === 0,
    `${acc} is called only from reviewed consumers${outside.length ? ` (found ${[...new Set(outside)].join(", ")})` : ""}`);
}

console.log("\n4. THE DIRECTION RULE — off is mine, def is the opponent's");
const board = body("buildGameEnvBoard") || "";
t(/row\.offTrend\s*=\s*getTeamOff\(row\.side\)/.test(board),
  "the offence half is read from the roster's OWN side");
t(/row\.oppDef\s*=\s*getTeamDef\(row\.opp\)/.test(board),
  "the defence half is read from the OPPONENT");
t(!/getTeamDef\(row\.side\)|getTeamOff\(row\.opp\)/.test(board),
  "neither half is read from the wrong side");
// Structural, in the data as well as the code: a flat file would let a future
// edit read a funnel straight off a team's own row without noticing.
const anyTeam = Object.values(prior.teams)[0];
t(anyTeam && anyTeam.off && anyTeam.def,
  "the data file nests off and def rather than flattening both onto the team");
t(!("funnel" in (anyTeam.off || {})) && !("proe" in (anyTeam.def || {})),
  "no offensive field leaks into def and no defensive field into off");

console.log("\n5. CENTRING — labels are computed against the league, not zero");
const L = prior._meta.league || {};
t(typeof L.proe_mean === "number" && Math.abs(L.proe_mean) > 0.2,
  `the 2025 league PROE mean is genuinely off zero (${L.proe_mean}) — the trap is real`);
t(typeof L.funnel_mean === "number",
  "the league funnel mean is recorded so a label can be computed against it");
// Every labelled team must agree with its OWN relative value and the recorded SD.
let labelErrors = 0, labelled = 0;
for (const [tm, row] of Object.entries(prior.teams)) {
  const checks = [
    [row.off.proe_rel, row.off.proe_label, L.proe_sd, "pass-heavy", "run-heavy", +1],
    [row.off.pace_rel, row.off.pace_label, L.pace_sd, "fast", "slow", -1],
    [row.def.funnel_rel, row.def.funnel_label, L.funnel_sd, "pass funnel", "run funnel", +1],
  ];
  for (const [rel, lab, sd, hi, lo, sign] of checks) {
    if (rel == null || !lab || !sd) continue;
    labelled++;
    const v = rel * sign;
    const want = v >= sd ? hi : v <= -sd ? lo : "average";
    if (want !== lab) { labelErrors++; console.log(`       ${tm} ${lab} vs ${want} (rel ${rel})`); }
  }
}
t(labelled > 60, `enough labels to check (${labelled})`);
t(labelErrors === 0, "every label agrees with its own relative value and the recorded SD");
// Raw is stored too, so a reader can check the number against a public table.
t(Object.values(prior.teams).some((r) => r.off.proe != null && r.off.proe_rel != null
    && Math.abs(r.off.proe - r.off.proe_rel) > 0.5),
  "raw and league-relative values are both stored and differ");

console.log("\n6. GATES — derived, recorded, and actually enforced");
const G = prior._meta.gates || {};
t(G.proe_plays > 0 && G.pace_plays > 0 && G.funnel_plays_per_side > 0,
  `all three gates are recorded (${G.proe_plays}/${G.pace_plays}/${G.funnel_plays_per_side})`);
t(/gate_rule/.test(JSON.stringify(prior._meta)) && /half the league spread/i.test(prior._meta.gate_rule),
  "the file records HOW the gates were derived, not just their values");
let gateViolations = 0;
for (const row of Object.values(prior.teams)) {
  if (row.off.proe != null && row.off.proe_plays < G.proe_plays) gateViolations++;
  if (row.off.pace != null && row.off.pace_plays < G.pace_plays) gateViolations++;
  if (row.def.funnel != null &&
      (row.def.pass_plays < G.funnel_plays_per_side || row.def.rush_plays < G.funnel_plays_per_side))
    gateViolations++;
}
t(gateViolations === 0, "no team below its gate carries a value");
// ⚠️ ABSENCE MUST STILL CARRY THE COUNT. A row with no value and no sample size
// reads as "no data"; the count is what says "not readable yet".
const belowGate = Object.values(cur.teams).filter((r) => r.off.proe == null);
t(belowGate.length === 0 || belowGate.every((r) => typeof r.off.proe_plays === "number"),
  "a team below its gate still reports how many plays it has");
// The app must read the gate from the data rather than retyping it.
t(/TRENDS_GATES\.proe_plays/.test(appCode) && !/\b300\s*plays\b/.test(appCode),
  "the page prints the gates from the file, never a second hand-typed copy");

console.log("\n7. VINTAGE — never swapped silently");
const panelStart = appCode.indexOf('id="rxr-gameenv"');
const panelEnd = appCode.indexOf("buildRoleContext(analyzed.allStarters)", panelStart);
const panel = appCode.slice(panelStart, panelEnd > 0 ? panelEnd : panelStart + 20000);
t(panelStart >= 0 && panelEnd > panelStart, "the panel block is locatable");
t(/\{v \? <span/.test(panel) || /\{v\s*\?/.test(panel), "the rendered line carries a vintage");
const vs = panel.match(/const vs = \[[^\]]+\]/);
t(!!vs && /bits\.length \?/.test(vs[0]) && /funnel \?/.test(vs[0]),
  "the vintage is taken from the half that actually rendered, not from whichever object exists");
const pick = body("pickTrend") || "";
t(/TRENDS_CUR_LIVE/.test(pick) && /prior:/.test(pick),
  "the current season is preferred once live, and the prior value rides along");
t(/season_complete \? /.test(body("trendVintage") || ""),
  "a finished season is labelled final and a live one names its week");

console.log("\n8. THE BUILDER IS A PURE PARSE");
t(!/urllib|requests\.|http\.client|urlopen|nflreadpy|polars/.test(bld),
  "no HTTP client and no third-party import — the shell fetches, this parses");
t(/--empty/.test(bld), "a placeholder can be produced through the real code path");
t(cur._meta.weeks_covered === 0 || cur._meta.teams_covered >= 0,
  "the current-season file is shaped like a real build");
t(JSON.stringify(Object.keys(prior._meta).sort()) === JSON.stringify(Object.keys(cur._meta).sort()),
  "both vintages carry identical _meta shape");

console.log("\n9. THE WEEKLY JOB");
t(/build-teamtrends\.py/.test(sh), "refresh-inseason.sh calls the builder");
// \u26a0\u26a0 EXTRACT THE ACTUAL BRANCH BODY. This first read "everything before
// step 6 mentions the builder", which is POSITION, not CONTAINMENT \u2014 a step
// moved out of the if/else but still above step 6 passed it. Found by a
// sabotage that genuinely moved the step and was not caught. The body runs
// from the `else` to the `fi` at column 0.
const fullPassBody = (src) => {
  const i = src.indexOf('if [ "$LIVE_ONLY" = "1" ]');
  if (i < 0) return "";
  const e = src.indexOf("\nelse\n", i);
  if (e < 0) return "";
  const f = src.indexOf("\nfi\n", e);
  return f < 0 ? "" : src.slice(e, f);
};
const fullPass = fullPassBody(sh);
t(fullPass.length > 0, "the full-pass branch body is locatable");
t(fullPass.includes("build-teamtrends.py"),
  "the step sits INSIDE the full-pass branch, so --live-only skips it (pbp is a season release)");
t(/play_by_play_\$SEASON/.test(sh), "it fetches the play-by-play release");

console.log("\n10. CLAUDE.md AGREES WITH THE CODE");
// A number a human reads and acts on is a definition whether or not a machine
// parses it — the NAKED_RB_HVT_GATE lesson, applied to the gates.
// ⚠️ SCOPED TO THE SECTION. A bare `claude.includes("300")` passes on any
// document that happens to contain those digits — the aimed-too-wide failure
// this repo has now recorded three times.
const secStart = claude.indexOf("## Team Trends");
const secEnd = secStart >= 0 ? claude.indexOf("\n---", secStart) : -1;
const sec = secStart >= 0 ? claude.slice(secStart, secEnd > 0 ? secEnd : claude.length) : "";
t(secStart >= 0, "CLAUDE.md carries a Team Trends section");
for (const [k, v] of Object.entries(G)) {
  t(sec.includes(String(v)), `that section prints the ${k} gate (${v})`);
}
t(/not against zero|league mean/i.test(sec),
  "that section records the centring trap rather than only the gates");

console.log(`\n${fail ? `FAILED (${fail})` : "ALL CHECKS PASSED"}`);
process.exit(fail ? 1 : 0);
