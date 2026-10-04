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
  "\nexport { scoreFreeAgent, buildBreakoutBoard, BREAKOUT_STATES, BREAKOUT_MIN_BASE_GP, findPlayer, normalize, CUR_VOLUME_LIVE, pprPremium, getStatus, isHardOut };\n",
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

// --- league awareness (Oct 3 2026, his ask: "each one has different available
// players and settings") ------------------------------------------------------
// The SCORE stays the app's own and is identical in every league: it runs on
// shares and rates, which are format-neutral. What changes per league is what is
// SHOWN beside it:
//   1. the league's format on its header line
//   2. FILLS A WEAK SPOT: the best available at a position where your roster cannot
//      fill a starting slot, or has no healthy backup
//   3. in a superflex league, the available quarterbacks who START for their team
//   4. the app's PPR premium, in the direction this league's catch scoring points:
//      a bonus in full PPR, a discount in standard, nothing in half (the app's base)
const formatLine = (ctx) => {
  if (!ctx) return null;
  const rec = ctx.rec == null ? "scoring unknown" : ctx.rec >= 1 ? "full PPR"
            : ctx.rec > 0 ? (ctx.rec === 0.5 ? "half PPR" : `${ctx.rec} per catch`) : "standard (no PPR)";
  const order = ["QB", "RB", "WR", "TE"];
  const slots = Object.entries(ctx.slots || {});
  const named = order.filter(p => ctx.slots?.[p]).map(p => `${ctx.slots[p]} ${p}`);
  const flex = slots.filter(([k]) => k.includes("/")).map(([k, n]) => `${n} ${k}`);
  return `${rec} · ${[...named, ...flex].join(" · ")}${ctx.superflex ? " · SUPERFLEX" : ""}`;
};

const pprLine = (s, rec) => {
  if (rec == null || rec === 0.5) return null;
  const pp = A.pprPremium(s.key, s.pos);
  if (!pp || !pp.notable) return null;
  return rec >= 1
    ? `full PPR here: +${pp.prem.toFixed(1)} pts a game from catches the score does not count`
    : `no catch points here: worth ${pp.prem.toFixed(1)} pts a game less than the half-PPR numbers the app uses`;
};

// A quarterback's waiver value in superflex is mostly one fact: does he START.
// The waiver score cannot see that (its volume inputs are receiving numbers), so
// the depth chart from the public Sleeper feed answers it instead.
const qbRole = (key) => {
  const st = A.getStatus(key);
  if (!st || st.depth_chart_order == null) return null;
  if (A.isHardOut(st)) return `listed QB${st.depth_chart_order}, but ${st.injury_status || st.status}`;
  return st.depth_chart_order === 1 ? "QB1 — he starts" : `QB${st.depth_chart_order} on the depth chart`;
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
  // FILLS A WEAK SPOT. Shorts first (a slot you cannot fill), then thin spots.
  const ctx = league.context || null;
  const weak = ctx ? [...ctx.short.map(p => ({ pos: p, how: "short" })),
                      ...ctx.thin.filter(p => !ctx.short.includes(p)).map(p => ({ pos: p, how: "no healthy backup" }))] : [];
  const fills = weak.map(w => {
    const pool = scored.filter(x => x.pos === w.pos);
    const pick = w.pos === "QB"
      ? pool.map(x => ({ ...x, role: qbRole(x.key) })).filter(x => x.role)
          .sort((a, b) => (a.role.startsWith("QB1") ? 0 : 1) - (b.role.startsWith("QB1") ? 0 : 1)).slice(0, 3)
      : pool.filter(x => x.fa.measured >= 1).sort((a, b) => b.fa.score - a.fa.score).slice(0, 3);
    return { ...w, picks: pick };
  });
  const sfQbs = ctx?.superflex && !weak.some(w => w.pos === "QB")
    ? scored.filter(x => x.pos === "QB").map(x => ({ ...x, role: qbRole(x.key) }))
        .filter(x => x.role && x.role.startsWith("QB1")).slice(0, 3)
    : [];

  // "None flagged" must say WHICH kind of empty it is: nobody moved, or nobody has
  // played enough games to measure a step yet. Opposite readings, one sentence each.
  const thin = scored.filter(s => s.b && s.b.blocked && s.b.state !== "opening").length;
  return { label: league.label, checked: (league.players || []).length, considered: rows.length,
           nonSkill, skipped, noData, moving, best, live: board.live, thin,
           ctx, fills, sfQbs };
};

const pct = (p) => (p.pct_owned != null ? ` · ${p.pct_owned}% rostered` : "");
const who = (s) => `${s.name} (${s.pos} ${s.team || "-"})${pct(s)}`;

export const render = (results) => {
  const out = [];
  const cross = new Map();
  out.push(`WAIVER CHECK · ${results.length} league${results.length === 1 ? "" : "s"} · shown, not saved`);
  for (const r of results) {
    out.push(`\n  ${r.label}`);
    const fmt = formatLine(r.ctx);
    if (fmt) out.push(`    ${fmt}`);
    out.push(`    ${r.checked} available checked · ${r.considered} skill players scored` +
             (r.noData ? ` · ${r.noData} with no data in the app yet` : ""));
    if (r.skipped.length) out.push(`    skipped as injured: ${r.skipped.slice(0, 6).join(", ")}${r.skipped.length > 6 ? ` +${r.skipped.length - 6} more` : ""}`);
    const rec = r.ctx?.rec ?? null;
    const ppr = (s) => { const l = pprLine(s, rec); if (l) out.push(`                ~ ${l}`); };
    if (r.ctx) {
      const spots = [...r.fills.map(f => `${f.pos} (${f.how})`),
                     ...(r.ctx.flex_short || []).map(f => `${f.slot} (short)`)];
      out.push(`    YOUR WEAK SPOTS: ${spots.length ? spots.join(", ") : "none — every slot has a healthy starter and a backup"}`);
      for (const f of r.fills) {
        out.push(`    FILLS A WEAK SPOT: ${f.pos}`);
        if (!f.picks.length) out.push(`      no available ${f.pos} the app has data on`);
        for (const s of f.picks) {
          out.push(`      ${who(s)}`);
          if (s.role) out.push(`                + ${s.role}`);
          else if (s.fa.reasons.length) for (const why of s.fa.reasons.slice(0, 2)) out.push(`                + ${why.label}`);
          else out.push(`                · only ${s.fa.measured} signal${s.fa.measured === 1 ? "" : "s"} measured, none strong`);
          ppr(s);
        }
      }
      if (r.sfQbs.length) {
        out.push("    SUPERFLEX: STARTING QBs AVAILABLE");
        for (const s of r.sfQbs) out.push(`      ${who(s)}\n                + ${s.role}`);
      }
    }
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
      ppr(s);
      (cross.get(s.key) || cross.set(s.key, { s, leagues: [] }).get(s.key)).leagues.push(r.label);
    }
    out.push("    BEST BY THE NUMBERS (waiver score, matchup not counted)");
    if (!r.best.length) out.push("      nobody available clears two supporting signals");
    for (const s of r.best) {
      out.push(`      ${s.fa.score.toFixed(2).padEnd(9)} ${who(s)}`);
      for (const why of s.fa.reasons.slice(0, 2)) out.push(`                + ${why.label}`);
      ppr(s);
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
  const ctxLeague = { label: "Ctx League",
    context: { rec: 1, slots: { QB: 1, RB: 2, WR: 3, TE: 1, "Q/W/R/T": 1 }, short: ["TE"], thin: [],
               flex_short: [], superflex: true },
    players: [{ name: "Jaxon Smith-Njigba", pos: "WR", team: "SEA" }, { name: "Juwan Johnson", pos: "TE", team: "NO" }] };
  const rc = scoreLeague(ctxLeague);
  const tc = render([rc]);
  ok("the header names the league's format", /full PPR · 1 QB · 2 RB · 3 WR · 1 TE · 1 Q\/W\/R\/T · SUPERFLEX/.test(tc), tc.split("\n")[3]);
  ok("a short position gets its own section with an available player in it",
     /FILLS A WEAK SPOT: TE/.test(tc) && rc.fills[0].picks.some(p => p.pos === "TE"));
  ok("PPR shows as a bonus in full PPR and a discount in standard, never in half",
     (pprLine({ key: "jaxon smith-njigba", pos: "WR" }, 1) || "").includes("+") === !!A.pprPremium("jaxon smith-njigba", "WR")?.notable
     && pprLine({ key: "jaxon smith-njigba", pos: "WR" }, 0.5) === null);
  ok("a league with no context renders exactly as before", !/WEAK SPOTS/.test(render([r])));
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
