#!/usr/bin/env node
// test-gameenv.mjs — guard 38. GAME ENVIRONMENT + WEEKLY PROJECTION.
//
// The layer is CONTEXT ONLY. A leak into a scoring engine moves one roster by a
// fraction, passes a spot check, and SILENTLY INVALIDATES every calibration
// figure in CLAUDE.md — nothing errors, the numbers just stop meaning what they
// meant. So containment is asserted STRUCTURALLY, not behaviourally.
//
// It also must never reach the AI prompt. RECENT_NEWS enters the prompt under
// "override everything above for these players", which is the highest-authority
// block in the app; an unattended third-party feed placed anywhere near that
// holds veto power over every measured input. Same call as man/zone coverage.
import { readFileSync } from "fs";

const app = readFileSync("App.jsx", "utf8");
const env = JSON.parse(readFileSync("grading/data/gameenv_2026.json", "utf8"));
const bld = readFileSync("scripts/build-gameenv.py", "utf8");
const sh  = readFileSync("scripts/refresh-inseason.sh", "utf8");

let fail = 0;
const ok  = (m) => console.log(`  ok   ${m}`);
const bad = (m) => { console.log(`  FAIL ${m}`); fail++; };
const t   = (c, m) => (c ? ok(m) : bad(m));

// Comments are stripped before every structural check. This guard family has
// failed on its own documentation five times (guard 31 on `<button`, guard 17
// on the cyan token, guard 25 on "matchup", guard 15 on adjCoverageOpen, guard
// 22 on getVacated). Spaces preserve offsets so indices still point at the file.
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

console.log("\n=== 1. containment: the engines never see it ===");
const TOKENS = ["GAMEENV", "gameEnvFor", "getProj(", "buildGameEnvBoard", "projDivergence"];
for (const eng of ["analyzeRoster", "analyzeRedraft"]) {
  const b = body(eng);
  if (!b) { bad(`${eng} not found`); continue; }
  const hits = TOKENS.filter((tok) => b.includes(tok));
  t(hits.length === 0, `${eng} references none of the layer (${hits.join(", ") || "clean"})`);
}

console.log("\n=== 2. containment: it never reaches the AI prompt ===");
t(!/const\s+gameEnvContext|const\s+projContext|const\s+matchupOddsContext/.test(appCode),
  "no prompt builder exists for this layer");
const nb = body("newsContext");
t(!nb || !TOKENS.some((tok) => nb.includes(tok)), "newsContext reads none of it");
t(env._meta.reaches_ai_prompt === false, "_meta.reaches_ai_prompt is false");
t(env._meta.scored === false, "_meta.scored is false");

console.log("\n=== 3. reviewed consumers, allowlisted ===");
// The point is that every consumer has been LOOKED AT, not that there are few.
// Do not relax this to "any number of call sites"; an unlisted one still fails.
const ALLOWED = ["buildGameEnvBoard"];
for (const acc of ["gameEnvFor", "getProj", "projDivergence"]) {
  const sites = [];
  const re = new RegExp(`\\b${acc.replace("(", "\\(")}\\s*\\(`, "g");
  let m;
  while ((m = re.exec(appCode))) {
    const before = appCode.slice(0, m.index);
    const decl = [...before.matchAll(/const\s+(\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>/g)].pop();
    const owner = decl ? decl[1] : "(top level)";
    if (owner !== acc) sites.push(owner);
  }
  const badSites = sites.filter((x) => !ALLOWED.includes(x));
  t(badSites.length === 0, `${acc} consumers reviewed (${[...new Set(sites)].join(", ") || "none"})`);
}

console.log("\n=== 4. thresholds live in the data, not retyped in the app ===");
const f = env._meta.flags || {};
t(f.blowout?.min_abs_spread === 7 && f.blowout?.max_total === 44,
  "blowout gate matches CLAUDE.md Section 4 (7+ spread, under 44)");
t(f.shootout?.max_abs_spread === 3 && f.shootout?.min_total === 46,
  "shootout gate matches Section 4 (within 3, 46+)");
const bb = body("buildGameEnvBoard") || "";
t(!/\b44\b|\b46\b/.test(bb), "buildGameEnvBoard does not retype the thresholds");
t(bb.includes("GAMEENV_META.flags") || bb.includes("_meta?.flags") || bb.includes("flags:"),
  "the board reads the gates from the file");

console.log("\n=== 5. one alias map, extended not duplicated ===");
t((appCode.match(/const TEAM_SPELLINGS\b/g) || []).length === 1,
  "TEAM_SPELLINGS declared exactly once");
// ⚠️ The first version only counted the exact name, so a RIVAL map called
// TEAM_SPELLINGS2 sailed through — the duplicate-definition class it was
// written to stop, wearing a different identifier. Catch any of them.
// TWO mechanisms exist ON PURPOSE and the file documents why: teamKey gives the
// CANONICAL form for display and comparison, lookupTeam tries EVERY spelling for
// lookups. Normalising alone was the wrong first fix on Sep 11 and changed
// nothing. So the property is "no THIRD map", not "only one" — an assertion that
// forbade both would be right-shaped and aimed too wide, which is how guard 32
// tripped on scoreFreeAgent and guard 34 on a file-wide 32px check.
const KNOWN_MAPS = ["TEAM_SPELLINGS", "TEAM_ALIAS"];
const rivals = [...appCode.matchAll(/const\s+(\w*(?:TEAM_SPELL\w*|TEAM_ALIAS\w*|_SPELLINGS))\s*=/g)]
  .map((m) => m[1]).filter((n) => !KNOWN_MAPS.includes(n));
t(rivals.length === 0, `no THIRD team-alias map (${rivals.join(", ") || "none"})`);
t(/WSH/.test(appCode.slice(appCode.indexOf("const TEAM_ALIAS"), appCode.indexOf("const TEAM_ALIAS") + 80)),
  "the canonical map knows WSH, so the panel does not print two spellings of one team");
const bb2 = body("buildGameEnvBoard") || "";
t(bb2.includes("teamKey("), "the board renders canonical team codes");
t(!/["']WSH["']\s*[:?]/.test(appCode.replace(appCode.slice(appCode.indexOf("const TEAM_SPELLINGS"), appCode.indexOf("const lookupTeam")), "")),
  "no inline WSH ternary outside the alias map");
t(/WSH/.test(appCode.slice(appCode.indexOf("const TEAM_SPELLINGS"), appCode.indexOf("const TEAM_SPELLINGS") + 260)),
  "WSH handled inside TEAM_SPELLINGS, not a second map");
const geb = body("gameEnvFor") || "";
t(geb.includes("TEAM_SPELLINGS"), "gameEnvFor resolves through the alias map");

console.log("\n=== 6. the shell fetches; the builder is a pure parse ===");
t(!/urllib\.request|requests\.get|http\.client/.test(bld.replace(/"""[\s\S]*?"""/g, "").replace(/#[^\n]*/g, "")),
  "build-gameenv.py contains no HTTP client");
t(/--scoreboard/.test(bld) && /--projections/.test(bld), "it takes files as input");
// \u26a0\ufe0f ASSERT THE PROPERTY, NOT THE STEP NUMBER. This read /6\\/6/ and broke
// the moment a seventh step was added, on a script that was still correct. The
// real property is that the refresh runs it AND that it stays on the live-only
// path, because betting lines move all week.
t(/build-gameenv\.py/.test(sh), "refresh-inseason.sh runs the builder");
const liveOnlySkips = sh.slice(sh.indexOf('if [ "$LIVE_ONLY" = "1" ]'), sh.indexOf("build-status.py"));
t(!liveOnlySkips.includes("build-gameenv.py"),
  "it is NOT inside the full-pass-only branch \u2014 the late-week pass must refresh it");
t(/week\.number|\(d\.get\('week'\)/.test(sh) || /'week'\)/.test(sh),
  "the week comes from ESPN rather than date math");

console.log("\n=== 7. the file's own shape ===");
t(typeof env._meta.week === "number", "_meta.week present");
t(typeof env._meta.fetched_at === "string" && /Z$/.test(env._meta.fetched_at),
  "_meta.fetched_at is a UTC stamp — lines move and the vintage must be knowable");
t(Array.isArray(env._meta.caveats) && env._meta.caveats.length >= 3, "caveats recorded in the file");
// A section's ok() must never depend on whether an EARLIER section failed,
// which is what a global !fail check silently does.
let reconciled = true;
for (const g of env.games || []) {
  if (g.total == null || g.spread == null || !g.implied) continue;
  const vals = Object.values(g.implied);
  const sum = vals.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - g.total) > 0.011) { bad(`${g.away}@${g.home}: implied totals do not sum to the game total`); break; }
  const spread = Math.abs(vals[0] - vals[1]);
  if (Math.abs(spread - g.spread) > 0.011) { bad(`${g.away}@${g.home}: implied split does not match the spread`); reconciled = false; break; }
}
if (reconciled) ok(`implied totals reconcile to total and spread on every priced game`);
const live = (env._meta.games_covered || 0) > 0;
t(true, live ? `LIVE file: ${env._meta.games_covered} games, ${env._meta.players_projected} projections`
             : "placeholder file — section 8 is vacuous until a real refresh is committed");

console.log("\n=== 8. flags fire, and do not fire everywhere ===");
if (live) {
  const priced = (env.games || []).filter((g) => g.total != null && g.spread != null);
  const bw = priced.filter((g) => g.blowout), shq = priced.filter((g) => g.shootout);
  t(priced.length > 0, `${priced.length} priced games`);
  t(bw.length < priced.length && shq.length < priced.length, "neither flag fires on every game");
  let agree = true;
  for (const g of priced) {
    const wantB = g.spread >= f.blowout.min_abs_spread && g.total < f.blowout.max_total;
    const wantS = g.spread <= f.shootout.max_abs_spread && g.total >= f.shootout.min_total;
    if (g.blowout !== wantB || g.shootout !== wantS) {
      bad(`${g.away}@${g.home}: flag disagrees with its own numbers (${g.spread}/${g.total})`);
      agree = false; break;
    }
  }
  if (agree) ok("every flag agrees with the spread and total it was computed from");
  t(!priced.some((g) => g.blowout && g.shootout), "no game is both a blowout and a shootout");
} else {
  ok("skipped — placeholder");
}

console.log("\n=== 9. the projection is framed as a reference, never a verdict ===");
// Bounded by the block it belongs to, never by a magic byte window: a fixed
// window asserts "these strings are near each other", which is not a property
// anybody wants, and it broke guard 31 on Sep 6 when a block simply moved.
const panelStart = app.indexOf('id="rxr-gameenv"');
const panelEnd = app.indexOf("buildRoleContext(analyzed.allStarters)", panelStart);
// ⚠️ WHITESPACE IS NORMALISED because JSX wraps prose at arbitrary points. The
// first version of this failed on "it does\n  not show its work" — the sentence
// was correct and the assertion was reading the source layout, not the copy.
const panel = (panelStart < 0 ? "" : app.slice(panelStart, panelEnd > panelStart ? panelEnd : undefined))
  .replace(/\s+/g, " ");
t(panelStart >= 0 && panelEnd > panelStart, "the panel block is locatable");
t(/not a recommendation/i.test(panel), "the page says the projection is not a recommendation");
t(/Lines move all week/i.test(panel), "the page states that lines move");
t(/does not show its work/i.test(panel),
  "the page says the projection is a black box");
t(/None of this touches your grade/i.test(panel), "the page says it does not affect the grade");
t(!/--pos-good|--danger|--accent-lime.{0,40}proj/i.test(panel.replace(/shootout", "var\(--accent-lime\)/, "")),
  "the projection number is not painted as good/bad");

console.log(`\n${fail ? `FAILED (${fail})` : "ALL CHECKS PASSED"}`);
process.exit(fail ? 1 : 0);
