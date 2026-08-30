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
const query = args.filter((a, i) => !skip.has(i) && !a.startsWith("--")).join(" ").trim();
if (!query) { console.error('usage: node scripts/scout.mjs "Player Name" [--format standard|superflex|yahoo]'); process.exit(2); }

const repoRoot = process.cwd();
const tmp = path.join(os.tmpdir(), "rxr-scout"); mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const outfile = path.join(tmp, "s.mjs");
await build({ stdin: { contents: readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { buildPlayerCard, findPlayer, teammateAbsence, getMetrics, getGameLog, GAME_LOGS, PLAYER_METRICS, ADP_DATA, SITUATIONS, RECENT_NEWS, VERDICTS, CEILING_RANKINGS };\n",
  loader: "jsx", resolveDir: repoRoot, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: { "@vercel/analytics/react": path.join(tmp, "stub.js"), "@vercel/analytics": path.join(tmp, "stub.js") } });
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

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
  if (td != null && tgt) L(`  TD rate           ${pct(td / tgt)} of targets`);
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

L(`\n[6] PROSE  (rank 1 — role CHANGE outranks every number above)`);
const sit = e.SITUATIONS[key], news = e.RECENT_NEWS[key], vd = e.VERDICTS[key];
if (sit) L(`  SITUATION verdict=${sit.verdict} trend=${sit.trend}\n    ${(sit.trendNote || sit.reason || "").slice(0, 1200)}`);
if (vd) L(`  VERDICT ${vd.verdict} (${vd.date ?? "undated"}) conf=${vd.confidence ?? "—"}`);
if (news) L(`  NEWS\n    ${String(news).slice(0, 1200)}`);
if (!sit && !news && !vd) L(`  none — no dated prose coverage for this player.`);
if (card.news?.length) for (const n of card.news) L(`  [card news] ${n.freshness ?? ""} ${n.ageDays != null ? n.ageDays + "d" : ""}`);

L(`\n[7] LIMITS — state these before concluding`);
L(`  Every number above is 2025. There is no 2026 data in this app.`);
L(`  Efficiency (yds/target, ypc, EPA) explains the past; r runs 0.02-0.31. Never project from it.`);
L(`  Percentiles are among ${card.popGate}. A raw rate without its population means nothing.`);
