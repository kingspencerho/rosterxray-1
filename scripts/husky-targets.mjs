#!/usr/bin/env node
// husky-targets.mjs — screen the draftable pool for The Husky.
//
// ⚠ METHOD, and it is the Source Hierarchy rather than a preference.
// The matchup engine is a FILTER AND SORTER, never a generator: FPA is the
// least stable input in the app (WR is NEGATIVE year over year), so a player
// never makes or misses this list because of his December schedule. The pool is
// generated from ROLE AND OPPORTUNITY, then ordered by the Husky's own weeks.
//
// The Husky, read off the in-app rules:
//   R1  W1-14  3-of-12 (25.0%)      R2  W15  2-of-8 (25.0%)
//   R3  W16    1-of-6  (16.7%)  <-- the only gate that tightens
//   R4  W17    one 117-seat group, 65.7% of the pool inside it
// weights [1.25, 2, 2] — W16 and W17 both max, W15 on the soft plateau.
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const root = process.cwd();
const tmp = path.join(os.tmpdir(), "rxr-husky"); mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const src = readFileSync(path.join(root, "App.jsx.jsx"), "utf8") +
  "\nexport { ADP_DATA, FULL_SCHEDULE, TOURNAMENTS, getMatchupScoreForOpponent, playoffBoosts," +
  " PLAYER_METRICS, getMetrics, getNgsRec, getRedZone, getAvailability, getCareerArc, getVacated," +
  " getSnapTrend, NGS_RECEIVING, REDZONE, AVAILABILITY, SITUATIONS, RECENT_NEWS };\n";
const outfile = path.join(tmp, "h.mjs");
await build({ stdin: { contents: src, loader: "jsx", resolveDir: root, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: { "@vercel/analytics/react": path.join(tmp, "stub.js"), "@vercel/analytics": path.join(tmp, "stub.js") } });
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

const W = e.TOURNAMENTS.husky.weights;              // [1.25, 2, 2]
const WSUM = W.reduce((a, b) => a + b, 0);

// Weighted playoff score for a team+position, with the same two boosts the
// stack matrix applies. Quoting the RAW tier here would understate every player
// in a pick'em game — that error is already recorded in CLAUDE.md.
const playoff = (team, pos) => {
  const sched = e.FULL_SCHEDULE[team];
  if (!sched) return null;
  const wk = [14, 15, 16].map((i, k) => {           // 0-indexed W15, W16, W17
    const opp = sched[i];
    if (!opp || opp === "BYE") return { opp: "BYE", score: 0, tier: "BYE" };
    const m = e.playoffBoosts(e.getMatchupScoreForOpponent(opp, pos, false), team, opp, k);
    return { opp, score: m.score, tier: m.tier };
  });
  return { wk, weighted: (wk[0].score * W[0] + wk[1].score * W[1] + wk[2].score * W[2]) / WSUM,
           late: (wk[1].score * 2 + wk[2].score * 2) / 4 };   // W16+W17 only
};

const pct = (v) => v == null ? null : Math.round(v * 100);
const rows = [];
for (const [name, a] of Object.entries(e.ADP_DATA)) {
  if (!a || a.adp == null || a.adp > 216 || !["QB","RB","WR","TE"].includes(a.pos)) continue;
  const p = playoff(a.team, a.pos);
  if (!p) continue;
  const m = e.getMetrics(name), ngs = e.getNgsRec(name), rz = e.getRedZone(name);
  const av = e.getAvailability(name), arc = e.getCareerArc(name), vac = e.getVacated(a.team);
  const tr = e.getSnapTrend(name);
  rows.push({ name, ...a, ...p, m, ngs, rz, av, arc, vac, tr,
    sit: e.SITUATIONS[name]?.trendNote || e.SITUATIONS[name]?.reason || null });
}

// ADP tables carry short-code aliases (cmc, jsn, tuten) pointing at the same
// player. Keep the longest spelling per pos+team+adp so the screen lists a
// player once.
const seen = new Map();
for (const r of rows) {
  const k = `${r.pos}|${r.team}|${r.adp}`;
  const prev = seen.get(k);
  if (!prev || r.name.length > prev.name.length) seen.set(k, r);
}
const uniq = [...seen.values()];

const fmtWk = (p) => p.wk.map(w => `${w.opp}:${w.tier.slice(0,5)}`).join(" ");
const badge = (r) => {
  const b = [];
  if (r.ngs?.sep != null) {
    const med = e.NGS_RECEIVING._meta.medians[r.pos];
    if (med && r.ngs.sep >= med + 0.35) b.push("sep+");
    if (med && r.ngs.sep <= med - 0.35) b.push("sep-");
  }
  if (r.ngs?.iay >= 13) b.push("deep");
  if (r.rz?.rz_tgt_sh >= 0.20) b.push(`rz${pct(r.rz.rz_tgt_sh)}%`);
  if (r.rz?.i10_car_sh >= 0.45) b.push(`GL${pct(r.rz.i10_car_sh)}%`);
  if (r.av?.career >= 0.90) b.push("iron");
  if (r.av && (r.av.recent ?? r.av.career) <= 0.65) b.push("fragile");
  if (r.arc?.phase === "rising") b.push(`age${r.arc.age}↑`);
  if (r.arc?.phase === "decline") b.push(`age${r.arc.age}↓`);
  if (r.tr?.trend === "rising") b.push("role↑");
  if (r.tr?.trend === "falling") b.push("role↓");
  if (r.vac?.vacated_pct >= 35) b.push(`vac${Math.round(r.vac.vacated_pct)}%`);
  return b.join(" ");
};

const show = (title, list, n = 12) => {
  console.log(`\n${"=".repeat(76)}\n${title}\n${"=".repeat(76)}`);
  for (const r of list.slice(0, n)) {
    console.log(`${String(Math.round(r.adp)).padStart(4)} ${r.pos} ${r.team.padEnd(3)} ${r.name.padEnd(21)}` +
      ` W16+17 ${r.late.toFixed(2)}  wtd ${r.weighted.toFixed(2)}  ${fmtWk(r)}`);
    const b = badge(r); if (b) console.log(`${" ".repeat(31)}${b}`);
  }
};

console.log(`THE HUSKY — weights W15 ${W[0]} · W16 ${W[1]} · W17 ${W[2]} · advanceWeight ${e.TOURNAMENTS.husky.advanceWeight}`);
console.log(`Pool: ${rows.length} draftable players (ADP <= 216). Playoff scores carry the competitive-balance and high-pace boosts.`);

for (const pos of ["QB","RB","WR","TE"]) {
  const pool = uniq.filter(r => r.pos === pos).sort((x, y) => y.late - x.late || x.adp - y.adp);
  show(`${pos} — best W16+W17 (the two weeks the Husky maxes)`, pool, pos === "QB" ? 8 : 12);
}

// ---- TEAM VIEW: the Husky is won in W16 and W17, and stacks are the dominant
// signal in every format. A team whose W16 AND W17 are both live is the shape
// this format pays for.
const teams = {};
for (const r of uniq) {
  const t = (teams[r.team] ||= { team: r.team, wk: r.wk, byPos: {} });
  t.byPos[r.pos] = Math.max(t.byPos[r.pos] ?? 0, 0);
}
// Score a team on the QB-relevant view (pass-catcher matchups drive stacks).
const teamRows = Object.values(teams).map(t => {
  const wr = playoff(t.team, "WR"), qb = playoff(t.team, "QB");
  return { team: t.team, wr, qb, late: wr ? wr.late : 0, wtd: wr ? wr.weighted : 0 };
}).filter(t => t.wr).sort((a, b) => b.late - a.late || b.wtd - a.wtd);

console.log(`\n${"=".repeat(76)}\nTEAM STACK TARGETS — WR-side W16+W17, the two weeks the Husky maxes\n${"=".repeat(76)}`);
for (const t of teamRows.slice(0, 12)) {
  const v = e.getVacated(t.team);
  console.log(`${t.team.padEnd(4)} W16+17 ${t.late.toFixed(2)}  wtd ${t.wtd.toFixed(2)}  ${fmtWk(t.wr)}` +
    (v && v.vacated_pct >= 30 ? `   vacated ${Math.round(v.vacated_pct)}%` : ""));
}

// ---- W17 BRING-BACKS: both sides of one championship-week game.
console.log(`\n${"=".repeat(76)}\nW17 GAME LOCKS — both sides live in the championship week\n${"=".repeat(76)}`);
const w17 = new Map();
for (const t of teamRows) {
  const opp = (e.FULL_SCHEDULE[t.team] || [])[16];
  if (!opp || opp === "BYE") continue;
  const o = opp.replace("@", "");
  const key = [t.team, o].sort().join(" vs ");
  const cur = w17.get(key) || { sides: {} };
  cur.sides[t.team] = t.wr.wk[2].score;
  w17.set(key, cur);
}
const locks = [...w17.entries()]
  .filter(([, v]) => Object.keys(v.sides).length === 2)
  .map(([k, v]) => ({ k, min: Math.min(...Object.values(v.sides)), sum: Object.values(v.sides).reduce((a,b)=>a+b,0), sides: v.sides }))
  .sort((a, b) => b.min - a.min || b.sum - a.sum);
for (const l of locks.slice(0, 8)) {
  console.log(`${l.k.padEnd(14)} both sides ${Object.entries(l.sides).map(([t,s])=>`${t} ${s}`).join(" / ")}   weaker side ${l.min}`);
}

// ---- VALUE: best W16+W17 available past pick 100.
console.log(`\n${"=".repeat(76)}\nLATE VALUE — ADP 100+ with a live W16 AND W17\n${"=".repeat(76)}`);
const late = uniq.filter(r => r.adp >= 100 && r.wk[1].score >= 4 && r.wk[2].score >= 4)
  .sort((a, b) => b.late - a.late || a.adp - b.adp);
for (const r of late.slice(0, 16)) {
  console.log(`${String(Math.round(r.adp)).padStart(4)} ${r.pos} ${r.team.padEnd(3)} ${r.name.padEnd(21)} W16+17 ${r.late.toFixed(2)}  ${fmtWk(r)}`);
  const b = badge(r); if (b) console.log(`${" ".repeat(31)}${b}`);
}

// ---- THE FORMAT'S OWN EDGE ----
// Most Underdog formats make W15 the tighter gate: Puppy 3 cuts 1-of-10 there
// and BBM VII 1-of-14. The Husky does not — W15 is 2-of-8 (25%), the same as its
// qualifier, and W16 is the only gate that tightens. So a player with a soft W15
// and an elite W16+W17 is priced by a market optimising for a different shape,
// and is worth more here than his ADP reflects.
console.log(`\n${"=".repeat(76)}\nPUNT-W15 EDGE — weak W15, elite W16 AND W17 (mispriced by W15-heavy formats)\n${"=".repeat(76)}`);
const punt = uniq
  .filter(r => r.wk[0].score <= 2 && r.wk[1].score >= 4 && r.wk[2].score >= 4)
  .sort((a, b) => b.late - a.late || a.adp - b.adp);
for (const r of punt.slice(0, 14)) {
  console.log(`${String(Math.round(r.adp)).padStart(4)} ${r.pos} ${r.team.padEnd(3)} ${r.name.padEnd(21)} W15 ${r.wk[0].tier.padEnd(5)} -> W16+17 ${r.late.toFixed(2)}  ${fmtWk(r)}`);
  const b = badge(r); if (b) console.log(`${" ".repeat(31)}${b}`);
}

// ---- WHAT TO AVOID ----
console.log(`\n${"=".repeat(76)}\nW16 WALLS — the one gate the Husky tightens. A dead W16 ends the run.\n${"=".repeat(76)}`);
const walls = uniq.filter(r => r.adp <= 120 && r.wk[1].score <= 2)
  .sort((a, b) => a.adp - b.adp);
for (const r of walls.slice(0, 12)) {
  console.log(`${String(Math.round(r.adp)).padStart(4)} ${r.pos} ${r.team.padEnd(3)} ${r.name.padEnd(21)} W16 ${r.wk[1].tier.padEnd(5)}  ${fmtWk(r)}`);
}
