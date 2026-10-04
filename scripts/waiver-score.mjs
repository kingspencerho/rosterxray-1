#!/usr/bin/env node
// waiver-score.mjs — rank the players actually AVAILABLE in each of your leagues.
//
// WHAT IT IS (Oct 3 2026, his ask: "who is available in MY league that the numbers
// like"). The app's waiver pool and breakout board have always had to GUESS who is
// on the wire. `yahoo-pull.py --waivers` hands this script the real list, one league
// at a time, and this script runs the app's OWN scoring on it:
//   scoreFreeAgent   - the waiver pool's score, Source Hierarchy weights, matchup absent
//   buildBreakoutBoard - BREAKOUT / WATCH / OPENING, each player against his own baseline
// Nothing is re-implemented here. The functions are imported from App.jsx.jsx the same
// way scout.mjs does it, so this list and the app can never disagree about a player.
//
// ⛔ WHAT IT DOES NOT DO, ON PURPOSE:
//   - no AI. Plain code reading public data; Yahoo supplies only names, teams, tags.
//   - writes nothing. The league data arrives on stdin and leaves on stdout.
//     (The only file written is the bundled APP code, which holds no Yahoo data.)
//   - no matchup in the score. A schedule may sort a shortlist, never build one.
//
// Usage (normally called by yahoo-pull.py, never by hand):
//   echo '{"leagues":[...]}' | node scripts/waiver-score.mjs
//   node scripts/waiver-score.mjs --selftest
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const repoRoot = process.cwd();
const tmp = path.join(os.tmpdir(), "rxr-waivers"); mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const outfile = path.join(tmp, "w.mjs");
await build({ stdin: { contents: readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { scoreFreeAgent, buildBreakoutBoard, BREAKOUT_STATES, BREAKOUT_MIN_BASE_GP, findPlayer, normalize, CUR_VOLUME_LIVE };\n",
  loader: "jsx", resolveDir: repoRoot, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: { "@vercel/analytics/react": path.join(tmp, "stub.js"), "@vercel/analytics": path.join(tmp, "stub.js") } });
const A = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

// Yahoo's own injury tags that mean "cannot help you this week". These players are
// counted and named in the skip line, never silently dropped.
const OUT_TAGS = new Set(["O", "IR", "IR-R", "PUP", "PUP-R", "PUP-P", "NFI-R", "NFI-A", "SUSP", "NA", "D"]);
const SKILL = new Set(["QB", "RB", "WR", "TE"]);
const TEAM_FIX = { JAC: "JAX", WSH: "WAS", LA: "LAR" };
const ROLE_STATES = new Set(["breakout", "watch", "opening"]);
const TOP = 5;

// Yahoo spells names its own way. Use the app's resolver only when it lands on the
// SAME position; otherwise fall back to the plain normalised name, which is what
// every data layer is keyed on. A wrong match is worse than a miss.
const keyFor = (name, pos) => {
  for (const fmt of ["yahoo", "standard"]) {
    const hit = A.findPlayer(name, fmt);
    if (hit && hit.matchedKey && hit.pos === pos) return hit.matchedKey;
  }
  return A.normalize(name);
};

export const scoreLeague = (league) => {
  const rows = [], skipped = [];
  let nonSkill = 0;
  for (const p of league.players || []) {
    const pos = (p.pos || "").toUpperCase();
    if (!SKILL.has(pos)) { nonSkill++; continue; }
    if (OUT_TAGS.has(p.status || "")) { skipped.push(`${p.name} (${p.status})`); continue; }
    const team = TEAM_FIX[(p.team || "").toUpperCase()] || (p.team || "").toUpperCase();
    rows.push({ ...p, pos, team, key: keyFor(p.name, pos) });
  }
  // The breakout board assesses every WATCHED player whatever his rookie status or
  // roster, so watching the whole available list is how it is run on exactly this pool.
  const table = Object.fromEntries(rows.map(r => [r.key, { pos: r.pos, team: r.team, adp: null }]));
  const board = A.buildBreakoutBoard({ rosteredKeys: new Set(), adpTable: table,
                                       watchlist: rows.map(r => r.key), rookiesOnly: false, limit: 0 });
  const state = Object.fromEntries(board.watched.map(b => [b.key, b]));

  let noData = 0;
  const scored = rows.map(r => {
    const fa = A.scoreFreeAgent(r.key, r.pos, r.team);
    const b = state[r.key];
    if (!fa.measured && (!b || !b.gp)) noData++;
    return { ...r, fa, b };
  });
  const moving = scored
    .filter(s => s.b && ROLE_STATES.has(s.b.state))
    .sort((x, y) => A.BREAKOUT_STATES[y.b.state].rank - A.BREAKOUT_STATES[x.b.state].rank
                 || y.b.magnitude - x.b.magnitude)
    .slice(0, TOP);
  const movingKeys = new Set(moving.map(s => s.key));
  const best = scored
    .filter(s => !movingKeys.has(s.key) && s.fa.coverage >= 2)
    .sort((x, y) => y.fa.score - x.fa.score)
    .slice(0, TOP);
  // "None flagged" must say WHICH kind of empty it is: nobody moved, or nobody has
  // played enough games to measure a step yet. Opposite readings, one sentence each.
  const thin = scored.filter(s => s.b && s.b.blocked && s.b.state !== "opening").length;
  return { label: league.label, checked: (league.players || []).length, considered: rows.length,
           nonSkill, skipped, noData, moving, best, live: board.live, thin };
};

const pct = (p) => (p.pct_owned != null ? ` · ${p.pct_owned}% rostered` : "");
const who = (s) => `${s.name} (${s.pos} ${s.team || "-"})${pct(s)}`;

export const render = (results) => {
  const out = [];
  const cross = new Map();
  out.push(`WAIVER CHECK · ${results.length} league${results.length === 1 ? "" : "s"} · shown, not saved`);
  for (const r of results) {
    out.push(`\n  ${r.label}`);
    out.push(`    ${r.checked} available checked · ${r.considered} skill players scored` +
             (r.noData ? ` · ${r.noData} with no data in the app yet` : ""));
    if (r.skipped.length) out.push(`    skipped as injured: ${r.skipped.slice(0, 6).join(", ")}${r.skipped.length > 6 ? ` +${r.skipped.length - 6} more` : ""}`);
    out.push("    ROLE MOVING (his own usage, against his own earlier games)");
    if (!r.moving.length) {
      const need = A.BREAKOUT_MIN_BASE_GP * 2;
      out.push(!r.live ? "      none flagged — no current-season usage to measure yet"
        : r.thin >= r.considered / 2
          ? `      none flagged — but ${r.thin} of ${r.considered} have played under ${need} games, the minimum to measure a step. A sample-size gap, not a quiet wire.`
          : "      none flagged — the players who could be measured have not moved");
    }
    for (const s of r.moving) {
      const st = A.BREAKOUT_STATES[s.b.state];
      out.push(`      ${st.label.padEnd(9)} ${who(s)}`);
      for (const why of s.b.reasons.filter(x => x.supports).slice(0, 2)) out.push(`                + ${why.text}`);
      (cross.get(s.key) || cross.set(s.key, { s, leagues: [] }).get(s.key)).leagues.push(r.label);
    }
    out.push("    BEST BY THE NUMBERS (waiver score, matchup not counted)");
    if (!r.best.length) out.push("      nobody available clears two supporting signals");
    for (const s of r.best) {
      out.push(`      ${s.fa.score.toFixed(2).padEnd(9)} ${who(s)}`);
      for (const why of s.fa.reasons.slice(0, 2)) out.push(`                + ${why.label}`);
      (cross.get(s.key) || cross.set(s.key, { s, leagues: [] }).get(s.key)).leagues.push(r.label);
    }
  }
  const multi = [...cross.values()].filter(c => c.leagues.length >= 2)
    .sort((a, b) => b.leagues.length - a.leagues.length).slice(0, 8);
  if (results.length > 1) {
    out.push("\n  OPEN IN MORE THAN ONE LEAGUE");
    if (!multi.length) out.push("    no flagged player is available in two leagues at once");
    for (const c of multi) out.push(`    ${c.leagues.length} leagues · ${c.s.name} (${c.s.pos} ${c.s.team})`);
  }
  out.push("\n  Scores: the app's waiver score and breakout board, on public data (nflverse, Sleeper).\n" +
           "  Yahoo supplied only who is available. Nothing here was saved.");
  return out.join("\n");
};

const selftest = () => {
  let fail = 0;
  const ok = (label, cond, d = "") => { console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}${cond ? "" : "  — " + d}`); if (!cond) fail++; };
  // Synthetic league built from REAL app players, never from Yahoo data.
  const league = { label: "Test League", players: [
    { name: "Jaxon Smith-Njigba", pos: "WR", team: "SEA", status: null, pct_owned: 5 },
    { name: "Bijan Robinson", pos: "RB", team: "ATL", status: "IR" },
    { name: "Buffalo", pos: "DEF", team: "BUF" },
    { name: "Nobody Atall", pos: "WR", team: "SEA" },
  ] };
  const r = scoreLeague(league);
  ok("a defence is not scored as a skill player", r.nonSkill === 1, `${r.nonSkill}`);
  ok("an IR player is skipped and NAMED, not dropped", r.skipped.length === 1 && r.skipped[0].includes("Bijan"), r.skipped.join());
  ok("a known player resolves to the app's key", r.considered === 2);
  ok("a name the app has never heard of is counted as no data", r.noData >= 1, `${r.noData}`);
  ok("the known receiver scores on at least one signal",
     (() => { const s = A.scoreFreeAgent("jaxon smith-njigba", "WR", "SEA"); return s.measured >= 1; })());
  ok("a position mismatch never borrows another player's key", keyFor("Nobody Atall", "WR") === "nobody atall");
  const text = render([r, { ...r, label: "Second League" }]);
  ok("an empty role list says whether it is a sample-size gap",
     /sample-size gap|could be measured|no current-season usage/.test(render([r])));
  ok("the report names each league", text.includes("Test League") && text.includes("Second League"));
  ok("the report says it was not saved", /Nothing here was saved/.test(text));
  ok("the report never claims a matchup counts", /matchup not counted/.test(text));
  const src = readFileSync(path.join(repoRoot, "scripts/waiver-score.mjs"), "utf8");
  const body = src.slice(src.indexOf("export const scoreLeague"), src.indexOf("const selftest"));
  ok("scoring and rendering write nothing to disk", !/writeFileSync|appendFileSync|createWriteStream/.test(body));
  console.log(fail ? `\n${fail} FAILURE(S)` : "\nPASS  waiver-score self-test");
  process.exit(fail ? 1 : 0);
};

if (process.argv.includes("--selftest")) selftest();
else {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const payload = JSON.parse(raw || "{}");
  console.log(render((payload.leagues || []).map(scoreLeague)));
}
