#!/usr/bin/env node
// scout.mjs — dump everything the elite/mid/bad framework needs for one player.
//
// The framework is only as good as its inputs, and the failure mode it is most
// vulnerable to is ME REMEMBERING A NUMBER. This prints the real ones, from the
// real app module, so the read is done against data rather than recall.
//
// Usage: node scripts/scout.mjs "Wan'Dale Robinson" [--format standard|superflex|yahoo]
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const args = process.argv.slice(2);
const fmtIdx = args.indexOf("--format");
const format = fmtIdx >= 0 ? args[fmtIdx + 1] : "standard";
const skip = fmtIdx >= 0 ? new Set([fmtIdx, fmtIdx + 1]) : new Set();
const vsIdx = args.indexOf("--vs");
const rosterIdx = args.indexOf("--roster");
if (vsIdx >= 0) { skip.add(vsIdx); }
if (rosterIdx >= 0) { skip.add(rosterIdx); skip.add(rosterIdx + 1); }
// --vs splits the remaining words at the flag: everything before is player one,
// everything after is player two.
const words = args.map((a, i) => (skip.has(i) || a.startsWith("--")) ? null : a);
const vsSplit = vsIdx >= 0;
const query = (vsSplit ? words.slice(0, vsIdx) : words).filter(Boolean).join(" ").trim();
const query2 = vsSplit ? words.slice(vsIdx).filter(Boolean).join(" ").trim() : "";
const rosterPath = rosterIdx >= 0 ? args[rosterIdx + 1] : null;
if (!query) { console.error('usage: node scripts/scout.mjs "Player Name" [--format standard|superflex|yahoo]'); process.exit(2); }

const repoRoot = process.cwd();
const tmp = path.join(os.tmpdir(), "rxr-scout"); mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const outfile = path.join(tmp, "s.mjs");
await build({ stdin: { contents: readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { buildPlayerCard, findPlayer, teammateAbsence, getMetrics, getGameLog, GAME_LOGS, PLAYER_METRICS, ADP_DATA, SITUATIONS, RECENT_NEWS, VERDICTS, CEILING_RANKINGS, STATUS_LAYER, GAME_LOGS_CUR };\n",
  loader: "jsx", resolveDir: repoRoot, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: { "@vercel/analytics/react": path.join(tmp, "stub.js"), "@vercel/analytics": path.join(tmp, "stub.js") } });
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

// ============================ SNAP SHARE, THIS SEASON ======================
// Read straight off disk rather than through the app bundle: App.jsx does not
// import this layer yet, and a scout read should not wait on that.
let SNAP_CUR = null;
try { SNAP_CUR = JSON.parse(readFileSync(path.join(repoRoot, "grading/data/snap_current_2026.json"), "utf8")); } catch {}
const nmKey = (n) => (n || "").toLowerCase().replace(new RegExp("[.']","g"), "").replace(new RegExp("-","g"), " ").replace(new RegExp("\\s+(jr|sr|ii|iii|iv|v)$"), "").replace(new RegExp("\\s+","g"), " ").trim();
const snapCur = (n) => SNAP_CUR?.players?.[nmKey(n)] || null;

// ======================= EXPECTED POINTS (rank 2, in points) ===============
// Opportunity expressed as points: how many the offence GAVE him, whether or
// not he converted. Its own rules block is not decoration and this obeys three
// lines of it - ranks are within position and on EXPECTED (the opportunity,
// never the outcome), diff is "NOT a skill rating and NOT a forecast", and it
// may never be presented as Hayden Winks' model, whose published figures do not
// reproduce here under any single scoring.
const rdJson = (f) => { try { return JSON.parse(readFileSync(path.join(repoRoot, f), "utf8")); } catch { return null; } };
const EXP_CUR = rdJson("grading/data/expected_2026.json");
const EXP_PRIOR = rdJson("grading/data/expected_2025.json");
// ============================== FIRST READ =================================
// Was the play DESIGNED for him, or was he the outlet after the first option
// was covered? Target share cannot tell those apart. FTN charts the read the
// quarterback threw to; joining it to play-by-play gives the receiver.
// ⛔ THE STABILITY IS POSITION-SPECIFIC AND THE POOLED FIGURE IS A TRAP. It
// reads 0.908 pooled, which would be the stickiest input in this app - and it
// is measuring POSITION. Backs check down at a 0.19 median, receivers are the
// design at 0.73. Within position it is WR 0.567, TE 0.400, RB 0.244.
const FIRST_READ = rdJson("grading/data/first_read_2026.json");
const FR_R = { WR: 0.567, TE: 0.400, RB: 0.244 };
const frRow = (name) => FIRST_READ?.players?.[nmKey(name)] || null;
// The percentile is DERIVED from the rank and position count the file already
// publishes rather than recomputed. Two ways of producing one number is how
// they drift apart.
const expRow = (doc, name) => {
  const r = doc?.players?.[nmKey(name)];
  if (!r) return null;
  const n = doc?._meta?.counts?.[r.pos];
  return { ...r, n, pct: (n && r.exp_rank) ? Math.round(((n - r.exp_rank) / n) * 100) : null };
};

// ================================ YOUR ROSTER ==============================
// ⛔ THE ROSTER IS PASSED BY PATH AND NEVER LIVES IN THIS REPO. rosterxray-audit
// is PUBLIC; his rosters and leagues are private-repo-only by standing rule.
// One line of names, or JSON. Absent is the normal case and costs nothing.
let ROSTER = [];
if (rosterPath) {
  try {
    const t = readFileSync(rosterPath, "utf8");
    ROSTER = t.trim().startsWith("[") ? JSON.parse(t)
      : t.split(String.fromCharCode(10)).map((x) => x.replace(String.fromCharCode(13), "").replace(/#.*$/, "").trim()).filter(Boolean);
  } catch { console.log(`  (roster file not readable: ${rosterPath})`); }
}
const onRoster = (n) => ROSTER.some((r) => nmKey(r) === nmKey(n));

// STATUS is how a handcuff is DETECTED rather than remembered: same NFL team,
// same position, and you already hold the man in front of him.
const statusRows = e.STATUS_LAYER?.players ?? e.STATUS_LAYER ?? {};
const rosterMatesOn = (team, pos, selfName) => ROSTER.filter((r) => {
  const st = statusRows[nmKey(r)];
  return st && st.team === team && st.pos === pos && nmKey(r) !== nmKey(selfName);
}).map((r) => ({ name: r, dc: statusRows[nmKey(r)]?.depth_chart_order }));

// ================================ COMPARISON MODE ==========================
if (vsSplit) {
  if (!query || !query2) { console.error('usage: node scripts/scout.mjs "A" --vs "B"'); process.exit(2); }
  const cols = [query, query2].map((q) => {
    const h = e.findPlayer(q, format);
    if (!h) return { name: q, missing: true };
    const c = e.buildPlayerCard(h.name, h.pos, h.team, Date.now(), format);
    // ⛔ MATCH ON LABEL, NOT key. card.redzone rows carry a key field and
    // card.metrics rows do NOT - they are built from CARD_METRICS with label,
    // r, tier, value and pct only. Assuming the key existed printed a dash for
    // target share, WOPR and dud rate on a player who has all three.
    const pick = (arr, rx) => (arr || []).find((x) => rx.test(x.label || ""));
    const sc = snapCur(h.name);
    const st = statusRows[nmKey(h.name)] || {};
    return { name: h.name, pos: h.pos, team: h.team, card: c, st, sc,
      tgtSh: pick(c.metrics, /^Target share/), wopr: pick(c.metrics, /^WOPR/),
      snap: pick(c.metrics, /^Snap share/), dud: pick(c.descriptive, /^Duds/),
      exp: expRow(EXP_CUR, h.name) || expRow(EXP_PRIOR, h.name),
      expIsCur: !!expRow(EXP_CUR, h.name),
      tprr: (c.routes || []).find((x) => /route run/i.test(x.label)),
      rsh: (c.routes || []).find((x) => /Route share/i.test(x.label)) };
  });
  const cell = (x) => x ? `${String(x.value).padEnd(7)}${x.pct != null ? "(" + String(x.pct).padStart(2) + ")" : "    "}` : "  -        ";
  const W = 26;
  console.log(`
================ ${cols[0].name}  vs  ${cols[1].name} ================
`);
  const row = (label, f) => console.log(`  ${label.padEnd(22)} ${cols.map((c) => String(c.missing ? "NO MATCH" : f(c)).padEnd(W)).join("")}`);
  row("", (c) => `${c.pos} ${c.team}${onRoster(c.name) ? "  [YOURS]" : ""}`);
  row("depth chart", (c) => c.st.depth_chart_order != null ? `DC${c.st.depth_chart_order} ${c.st.depth_chart_position || ""}` : "-");
  row("injury", (c) => c.st.injury_status || "none");
  row("SNAP % this season", (c) => c.sc ? `${Math.round(c.sc.snap_pct * 100)}%  (${c.sc.gp} gp)` : "no 2026 snaps");
  row("EXPECTED pts / game", (c) => c.exp ? `${c.exp.exp_pg}  rk ${c.exp.exp_rank}/${c.exp.n}${c.expIsCur ? "" : " [2025]"}` : "-");
  console.log("  ---- 2025, and only where the season above cannot answer ----");
  row("route share", (c) => cell(c.rsh));
  row("tgts per route run", (c) => cell(c.tprr));
  row("target share", (c) => cell(c.tgtSh));
  row("WOPR", (c) => cell(c.wopr));
  row("dud rate", (c) => cell(c.dud));
  console.log(`
  (n) is his percentile AT HIS OWN POSITION among ${cols[0].card?.popGate ?? "draftable players"}.`);
  console.log(`  ⛔ RANK 1 AND 2 DECIDE. Snap share and depth chart are THIS season and`);
  console.log(`     outrank every 2025 row beneath them. Matchup is rank 5 and is not here.`);
  process.exit(0);
}

const hit = e.findPlayer(query, format);
if (!hit) { console.log(`NO MATCH for "${query}" in the ${format} table.`); process.exit(1); }
const key = hit.matchedKey;
const card = e.buildPlayerCard(hit.name, hit.pos, hit.team, Date.now(), format);
const m = e.getMetrics(hit.name);
const log = e.getGameLog(hit.name);

const L = (s = "") => console.log(s);
const pct = v => v == null ? "—" : `${Math.round(v * 100)}%`;

L(`================ ${hit.name}  ${hit.pos} ${hit.team}  ADP ${hit.adp ?? "—"} ================`);
L(`market: ${card.adpMarket} (${card.adpVintage})`);

// STEP 0 — the team check. Everything below is void if this fires.
L(`\n[0] TEAM CHECK`);
if (card.movedFrom) L(`  *** MOVED: 2025 numbers are ${card.movedFrom}, he is now ${hit.team}. Re-validate every row below. ***`);
else if (!m?.team) L(`  no 2025 row — rookie or below the volume gate. Nothing below is measured.`);
else L(`  2025 team ${m.team} matches 2026 team ${hit.team}. Rows describe the same job.`);

if (!m) { L(`\n  No 2025 metrics row: ${card.reason || "below the games/snap gate"}.`); }
else {
L(`\n[1] OPPORTUNITY  (the only tier that carries forward)`);
L(`  population: ${card.popGate} at ${hit.pos}`);
for (const x of card.metrics) L(`  ${x.label.padEnd(20)} r ${String(x.r ?? "—").padEnd(6)} ${String(x.value).padEnd(8)} ${x.pct != null ? x.pct + "%ile" : "—"}`);
// QBs carry no CARD_METRICS rows — their volume profile is its own block, and
// it is the position where using the wrong number matters most: rush att/gm is
// r=0.815, the stickiest input measured anywhere, while QB points/gm is 0.383.
if (card.qb) {
  const q = card.qb;
  L(`  Rush att / game      r 0.815  ${q.rush?.toFixed(2) ?? "—"}      league median ${q.median?.toFixed(2) ?? "—"}${q.runner ? `  << ${q.runner.toUpperCase()} profile` : ""}`);
  L(`  Pass att / game      r 0.605  ${q.pass?.toFixed(1) ?? "—"}`);
  L(`  Passing aDOT         r 0.486  ${q.adot?.toFixed(1) ?? "—"}`);
  L(`  (games ${q.gp})   DO NOT project a QB from last year's POINTS — r=0.383.`);
}

L(`
[1b] ROUTE WORKLOAD + SCORING EQUITY  (rank 2 - still opportunity)`);
// ROUTES WAS MISSING AND IT IS THE MOST-CITED METRIC IN THIS LANE. Counted
// across 141 minutes of the Yahoo show (ANALYST-REFERENCE.md 11b): routes 65
// mentions, snap share 45, carry share 27, red zone 25, and ADP ZERO. The card
// has carried card.routes and card.redzone all along; this script simply never
// printed them, so every scout read was blind to the spine of the position.
if (card.routes?.length) {
  for (const x of card.routes) L(`  ${String(x.label).padEnd(20)} r ${String(x.r ?? "-").padEnd(6)} ${String(x.value).padEnd(8)} ${x.pct != null ? x.pct + "%ile" : "-"}`);
  if (card.routesMeta) L(`  (${card.routesMeta.tgt} targets on ${card.routesMeta.routes} pass snaps, ${card.routesMeta.gp} games)`);
} else L(`  no route data on file - he is under the route gate, which is itself a finding.`);
if (card.redzone?.length) {
  for (const x of card.redzone) L(`  ${String(x.label).padEnd(20)} ${String(x.value)}`);
} else L(`  no red-zone share - player or team under the opportunity gate.`);

L(`
[1c] EXPECTED POINTS  (rank 2 - opportunity, expressed in points)`);
{
  const cur = expRow(EXP_CUR, hit.name), pri = expRow(EXP_PRIOR, hit.name);
  const show = (r, tag) => {
    if (!r) { L(`  ${tag}  no row.`); return; }
    L(`  ${tag}  expected ${r.exp_pg}/gm   rank ${r.exp_rank} of ${r.n} at ${r.pos}` +
      (r.pct != null ? `  (${r.pct}%ile)` : "") + `   ${r.gp} gp`);
    L(`              actual ${r.act_pg}/gm, ${r.diff_pg > 0 ? "+" : ""}${r.diff_pg}/gm against his opportunity`);
  };
  show(cur, "THIS SEASON");
  show(pri, "2025       ");
  {
    const fr = frRow(hit.name), r = FR_R[hit.pos];
    if (fr && fr.tgt >= 3) {
      L(`  first read  ${Math.round((fr.fr_rate || 0) * 100)}% of his own targets were the DESIGN` +
        `  (${fr.fr_tgt} of ${fr.tgt})   r=${r ?? "unmeasured"} at ${hit.pos}`);
      if (hit.pos === "RB") L(`     ⛔ r=0.244 at RB. Weak. Read it as history, never as a reason to start him.`);
      else if (hit.pos === "TE") L(`     ⚠ r=0.400 at TE. Soft - a tilt between close options, not a decider.`);
      L(`     ⛔ NEVER quote the pooled 0.908: backs check down, receivers are the design,`);
      L(`        so pooling the positions measures POSITION and not the player.`);
    } else if (fr) L(`  first read  too few targets (${fr.tgt}) to express as a rate.`);
  }
L(`  ⭐ THE RANK IS ON EXPECTED, NOT ACTUAL. It ranks the opportunity the offence`);
  L(`     handed him, which is the half that repeats.`);
  L(`  ⛔ The +/- is NOT a forecast and NOT a skill rating. Every efficiency input`);
  L(`     measured in this app sits between r=0.02 and r=0.31.`);
  if (EXP_CUR?._meta?.weeks_covered != null) {
    const w = EXP_CUR._meta.weeks_covered;
    L(`  ⚠ ITS EDGE EXPIRES, AND THAT IS MEASURED: expected beats actual as a`);
    L(`     predictor by +0.066 after 1 game, +0.026 after 2, +0.016 by 3, +0.002`);
    L(`     by week 8. You are at week ${w}.` + (w >= 4 ? "  THE EDGE IS MOSTLY GONE." : "  This is the window."));
  }
  L(`  ⛔ THIS REPO'S model, recomputed half-PPR from components. NOT Hayden`);
  L(`     Winks' model and never to be presented as his.`);
}

L(`\n[2] CONVERSION  (did the volume produce)`);
if (log?.g?.length) {
  const cols = e.GAME_LOGS._meta.cols[log.pos] || [];
  const i = n => cols.indexOf(n);
  const sum = n => i(n) < 0 ? null : log.g.reduce((s, r) => s + (r[i(n)] || 0), 0);
  const tgt = sum("tgt"), rec = sum("rec"), yds = sum("rec_yds"), ay = sum("air_yds"), td = sum("tds"), car = sum("car"), ry = sum("rush_yds");
  if (tgt) {
    L(`  ${rec}/${yds}/${td ?? 0} on ${tgt} targets over ${log.g.length} games`);
    L(`  yds / target      ${(yds / tgt).toFixed(2)}`);
    L(`  yds / reception   ${(yds / rec).toFixed(2)}`);
    L(`  catch rate        ${pct(rec / tgt)}`);
    if (ay != null) L(`  aDOT              ${(ay / tgt).toFixed(2)}   (air yds/gm ${(ay / log.g.length).toFixed(0)})`);
  }
  if (car) L(`  ${car} carries, ${ry} yds, ${(ry / car).toFixed(2)} ypc   << r=0.02, a coin flip. Never project from this.`);
  // The log's tds column is TOTAL touchdowns. Dividing it by targets is only
  // meaningful for a player whose touches ARE targets; a back with 232 carries
  // would read as a 13% receiving TD rate off rushing scores.
  if (td != null) {
    const touches = (rec || 0) + (car || 0);
    if (car) L(`  TD per touch      ${pct(td / touches)}   (${td} total TD over ${touches} touches — rushing and receiving combined)`);
    else if (tgt) L(`  TD per target     ${pct(td / tgt)}`);
  }
  L(`  HVT / game        ${m.hvt_pg?.toFixed(2) ?? "—"}   (rz tgt ${m.rz_tgt ?? "—"}, ez tgt ${m.ez_tgt ?? "—"})`);
}

L(`\n[3] CEILING SHAPE  (classifies, never projects)`);
for (const x of card.descriptive) L(`  ${x.label.padEnd(20)} r ${String(x.r ?? "—").padEnd(6)} ${String(x.value).padEnd(8)} ${x.pct != null ? x.pct + "%ile" : "—"}`);
L(`  READ THE PERCENTILE, NOT THE RATE. A 13% spike rate is the 67th percentile.`);

L(`\n[4] ROLE TRAJECTORY  (a season average can hide a role change)`);
if (card.trajectory) { const t = card.trajectory;
  L(`  W1-9 ${pct(t.early)} -> W10-18 ${pct(t.late)}   last4 ${pct(t.last4)}   trend ${t.trend}`);
} else L(`  none reported — the season average is a fair read.`);

L(`\n[5] WHO ELSE WAS ON THE FIELD  (steps 1-4 assume the same teammates)`);
if (card.absence?.length) for (const a of card.absence) {
  L(`  ${a.name} (${a.pos}, ${a.role}) played ${a.playedOf} of ${a.total}, missed ${a.missed}`);
  L(`     with him     ${a.withTgt != null ? a.withTgt.toFixed(1) + " tgt/gm  " : ""}${a.withPts.toFixed(1)} pts/gm`);
  L(`     without him  ${a.withoutTgt != null ? a.withoutTgt.toFixed(1) + " tgt/gm  " : ""}${a.withoutPts.toFixed(1)} pts/gm`);
} else L(`  no significant teammate absence — the shares above read at face value.`);

if (log?.g?.length) {
  L(`\n  GAME LOG (pts) — the distribution, not the average`);
  const cols = e.GAME_LOGS._meta.cols[log.pos] || [];
  const iw = cols.indexOf("week"), ip = cols.indexOf("pts"), it = cols.indexOf("tgt"), ia = cols.indexOf("air_yds");
  L("  " + log.g.map(r => `W${r[iw]}:${r[ip]}`).join("  "));
  if (it >= 0 && ia >= 0) {
    const spikes = log.g.filter(r => r[ip] >= 18);
    if (spikes.length) L(`  spike games required: ` + spikes.map(r => `W${r[iw]} ${r[it]}tgt/${r[ia]}ay`).join("  "));
  }
}
}

L(`
[5b] THIS SEASON  (rank 1 - outranks every 2025 number above)`);
// The old limits block said "There is no 2026 data in this app." True when it
// was written, false now, and the SKILL told every session to say it out loud.
// status_2026 carries the depth chart and injuries; gamelogs_2026 carries real
// weeks. A framework whose stated limit is wrong is worse than one with no
// limits at all, because it argues against looking.
{
  const st = (e.STATUS_LAYER?.players ?? e.STATUS_LAYER ?? {})[key] || null;
  if (st) {
    L(`  depth chart  ${st.depth_chart_order != null ? "DC" + st.depth_chart_order : "-"} ${st.depth_chart_position ?? ""}   status ${st.status ?? "-"}`);
    L(`  injury       ${st.injury_status ?? "none"}${st.injury_body_part ? " (" + st.injury_body_part + ")" : ""}   news ${st.news_updated ?? "-"}`);
  } else L(`  not on the 2026 depth-chart feed.`);
  const cur = e.GAME_LOGS_CUR?.[key];
  if (cur?.g?.length) {
    const cc = e.GAME_LOGS_CUR._meta?.cols?.[cur.pos] || [];
    L(`  2026 weeks played: ${cur.g.length}`);
    for (const r of cur.g) L(`    ` + cc.map((c, n) => `${c} ${r[n]}`).join("  "));
  } else L(`  no 2026 game log yet.`);
  const sc = snapCur(hit.name);
  if (sc) {
    L(`  SNAP SHARE this season  ${Math.round(sc.snap_pct * 100)}%  over ${sc.gp} game(s)  (latest ${Math.round(sc.last_pct * 100)}%)`);
    L(`    by week: ` + sc.weeks.map((w) => `W${w.week} ${Math.round(w.pct * 100)}% (${w.snaps})`).join("  "));
    if (SNAP_CUR._meta?.weeks_partial?.length)
      L(`    ⚠ week(s) ${SNAP_CUR._meta.weeks_partial.join(", ")} are PARTIAL - not every team has played.`);
    L(`    ⛔ This is SNAP share, not ROUTE share. Close (r=0.957) and not equal.`);
  } else L(`  no 2026 snap row.`);
  if (ROSTER.length) {
    L(`  YOUR ROSTER: ${onRoster(hit.name) ? "you hold him." : "not on your roster."}`);
    const mates = rosterMatesOn(hit.team, hit.pos, hit.name);
    if (mates.length) L(`    same team + position you also hold: ` + mates.map((m) => `${m.name}${m.dc != null ? " (DC" + m.dc + ")" : ""}`).join(", "));
  }
  if (card.trajectoryCur) { const t = card.trajectoryCur;
    L(`  snap trend THIS season: early ${pct(t.early)} -> late ${pct(t.late)}  trend ${t.trend}`); }
}

L(`\n[6] PROSE  (rank 1 — role CHANGE outranks every number above)`);
const sit = e.SITUATIONS[key], news = e.RECENT_NEWS[key], vd = e.VERDICTS[key];
if (sit) L(`  SITUATION verdict=${sit.verdict} trend=${sit.trend}\n    ${(sit.trendNote || sit.reason || "").slice(0, 1200)}`);
if (vd) L(`  VERDICT ${vd.verdict} (${vd.date ?? "undated"}) conf=${vd.confidence ?? "—"}`);
if (news) L(`  NEWS\n    ${String(news).slice(0, 1200)}`);
if (!sit && !news && !vd) L(`  none — no dated prose coverage for this player.`);
if (card.news?.length) for (const n of card.news) L(`  [card news] ${n.freshness ?? ""} ${n.ageDays != null ? n.ageDays + "d" : ""}`);

L(`\n[7] LIMITS — state these before concluding`);
L(`  Sections 1-4 are 2025. Section 5b is the season being played, and when they`);
L(`  disagree 5b WINS: role change is rank 1, and a season average describes the OLD job.`);
L(`  2026 coverage is thin this early BY DESIGN. What exists is printed above; an`);
L(`  empty 5b is a stated gap, never a licence to lean harder on 2025.`);
L(`  Efficiency (yds/target, ypc, EPA) explains the past; r runs 0.02-0.31. Never project from it.`);
L(`  Percentiles are among ${card.popGate}. A raw rate without its population means nothing.`);
