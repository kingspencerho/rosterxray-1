#!/usr/bin/env node
// w16-games.mjs — rank the Week 16 slate, then the players inside the best games.
//
// W16 IS THE HUSKY'S ONLY TIGHTENING GATE (1-of-6, 16.7%) and carries max weight
// alongside W17. A dead W16 ends the run regardless of everything else.
//
// ⚠ GAME TOTALS ARE DIRECTIONAL REFERENCE, NEVER A LOGIC GATE. The framework is
// explicit: use them as ONE contextual signal beside defensive quality, pace and
// competitive balance. So the ranking below leads with the position-specific
// matchup tier (which carries the boosts) and shows the total beside it.
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";
const root = process.cwd();
const tmp = path.join(os.tmpdir(), "rxr-w16"); mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp,"stub.js"),"export const Analytics=()=>null;export const track=()=>{};\n");
const src = readFileSync(path.join(root,"App.jsx.jsx"),"utf8") +
  "\nexport { PLAYOFF_GAME_TOTALS, FULL_SCHEDULE, ADP_DATA, getMatchupScoreForOpponent, playoffBoosts," +
  " getMetrics, getNgsRec, getRedZone, getAvailability, getCareerArc, getQbProfile, getSnapTrend, getVacated," +
  " NGS_RECEIVING, AVAILABILITY, QB_PROFILE, REDZONE, SITUATIONS, getGameSelectionNode };\n";
const outfile = path.join(tmp,"w.mjs");
await build({ stdin:{contents:src,loader:"jsx",resolveDir:root,sourcefile:"App.jsx.jsx"}, bundle:true, platform:"node", format:"esm", outfile, logLevel:"silent",
  alias:{"@vercel/analytics/react":path.join(tmp,"stub.js"),"@vercel/analytics":path.join(tmp,"stub.js")}});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

const WK = 16, IDX = 15;                    // 0-indexed W16
const games = e.PLAYOFF_GAME_TOTALS[`W${WK}`] || [];

// Per-side, per-position tier WITH the boosts applied.
const side = (team, opp) => {
  const out = {};
  for (const pos of ["QB","RB","WR","TE"]) {
    const m = e.playoffBoosts(e.getMatchupScoreForOpponent(opp, pos, false), team, opp, 1);
    out[pos] = m;
  }
  out.avg = (out.QB.score + out.RB.score + out.WR.score + out.TE.score) / 4;
  return out;
};

const rows = games.map(g => {
  const a = side(g.away, g.home), h = side(g.home, g.away);
  const sp = Math.abs(g.spread);
  return { ...g, a, h, sp,
    // Framework checks, applied explicitly and separately.
    competitive: sp <= 3 && g.total >= 46,
    blowout: sp >= 7 && g.total < 44,
    node: e.getGameSelectionNode(g.away, g.home, WK),
    // Rank on the WEAKER side: a shootout you can attack from both directions is
    // worth more than one good side facing a wall.
    both: Math.min(a.avg, h.avg), sum: a.avg + h.avg };
});

console.log(`WEEK 16 SLATE — ${rows.length} games. The Husky's only tightening gate (1-of-6).`);
console.log(`Tiers carry the competitive-balance and high-pace boosts. Totals are reference, not a gate.\n`);
console.log(`${"GAME".padEnd(13)} ${"TOT".padEnd(5)} ${"SPR".padEnd(5)} both  sum   away QB/RB/WR/TE      home QB/RB/WR/TE     flags`);
const t = (s) => s.tier.slice(0,5).padEnd(5);
for (const r of [...rows].sort((x,y) => y.both - x.both || y.sum - x.sum)) {
  const flags = [r.competitive && "COMPETITIVE", r.blowout && "BLOWOUT-RISK", r.node && r.node.label].filter(Boolean).join(" ");
  console.log(`${(r.away+" @ "+r.home).padEnd(13)} ${String(r.total).padEnd(5)} ${String(r.spread).padEnd(5)} ${r.both.toFixed(2)}  ${r.sum.toFixed(2)}  ` +
    `${r.away.padEnd(4)}${t(r.a.QB)}${t(r.a.RB)}${t(r.a.WR)}${t(r.a.TE)}  ${r.home.padEnd(4)}${t(r.h.QB)}${t(r.h.RB)}${t(r.h.WR)}${t(r.h.TE)}  ${flags}`);
}

// ---- PLAYERS INSIDE THE BEST W16 ENVIRONMENTS ----
// The game gets a player CONSIDERED. Whether he is a target is decided by role,
// opportunity and talent — the schedule never generates the list.
const P = (v) => v == null ? "—" : `${Math.round(v*100)}%`;
const line = (n, a, opp, tier) => {
  const m = e.getMetrics(n), ng = e.getNgsRec(n), rz = e.getRedZone(n), av = e.getAvailability(n),
        ar = e.getCareerArc(n), qb = e.getQbProfile(n), tr = e.getSnapTrend(n);
  const bits = [];
  if (a.pos === "QB" && qb) bits.push(`${qb.rush_att_pg} rush/gm (med ${e.QB_PROFILE._meta.rush_att_pg_median}) · ${qb.pass_att_pg} pass/gm`);
  if (m && m.gp >= 8) {
    if (a.pos === "WR" || a.pos === "TE") bits.push(`${(m.tgt/m.gp).toFixed(1)} tgt/gm · ${P(m.tgt_sh)} sh · ${P(m.ay_sh)} AY · WOPR ${m.wopr} · ${P(m.snap_sh)} snap`);
    if (a.pos === "RB") bits.push(`${P(m.snap_sh)} snap · ${m.hvt_pg} HVT · ${(m.tgt/m.gp).toFixed(1)} tgt/gm`);
    bits.push(`spike ${P(m.spike_rate)}/nuc ${P(m.nuclear_rate)} · dud ${P(m.dud_rate)}`);
  } else if (m) bits.push(`only ${m.gp} gp in 2025`);
  else bits.push("no 2025 role data");
  if (ng) { const med = e.NGS_RECEIVING._meta.medians[a.pos];
    bits.push(`sep ${ng.sep}${ng.sep>=med+0.3?"↑":ng.sep<=med-0.3?"↓":""} (med ${med}) · iay ${ng.iay}`); }
  if (rz) { const r=[]; if (rz.rz_tgt_sh!=null) r.push(`${P(rz.rz_tgt_sh)} RZ tgt`); if (rz.i10_car_sh!=null) r.push(`${P(rz.i10_car_sh)} i10 car`);
    const gl=(rz.i5_tgt||0)+(rz.i5_car||0); if (gl) r.push(`${gl} GL`); if (r.length) bits.push(r.join(" · ")); }
  if (tr?.trend && tr.trend !== "stable") bits.push(`role ${P(tr.early)}->${P(tr.late)} ${tr.trend}`);
  if (av) bits.push(`on-field ${P(av.recent ?? av.career)}${av.recent!=null&&av.recent<=av.career-0.12?" FALLING":""}`);
  if (ar && ar.phase !== "peak") bits.push(`age ${ar.age} ${ar.phase}`);
  const s = e.SITUATIONS[n];
  console.log(`  ${String(Math.round(a.adp)).padStart(4)} ${a.pos} ${n.padEnd(21)} ${tier.padEnd(5)} ${bits.join(" · ")}`);
  if (s?.verdict) console.log(`${" ".repeat(33)}app: ${s.verdict}/${s.trend||"—"}`);
};

const TOP = process.argv.slice(2).length ? process.argv.slice(2)
  : ["CIN","IND","KC","JAX","MIN","DET","NYG","DEN","LV","ATL"];
const byTeam = {};
for (const [n, a] of Object.entries(e.ADP_DATA)) {
  if (!a || a.adp == null || a.adp > 216 || !TOP.includes(a.team)) continue;
  (byTeam[a.team] ||= []).push([n, a]);
}
// Drop alias keys.
for (const t of Object.keys(byTeam)) {
  const seen = new Map();
  for (const [n, a] of byTeam[t]) {
    const k = `${a.pos}|${a.adp}`;
    if (!seen.has(k) || n.length > seen.get(k)[0].length) seen.set(k, [n, a]);
  }
  byTeam[t] = [...seen.values()].sort((x, y) => x[1].adp - y[1].adp);
}
for (const team of TOP) {
  const g = rows.find(r => r.away === team || r.home === team);
  if (!g || !byTeam[team]) continue;
  const isAway = g.away === team, me = isAway ? g.a : g.h, opp = isAway ? g.home : g.away;
  console.log(`\n${"=".repeat(90)}\n${team} ${isAway ? "@" : "vs"} ${opp} — total ${g.total}, spread ${g.spread}` +
    `${g.competitive ? " · COMPETITIVE" : ""}${g.blowout ? " · BLOWOUT RISK" : ""}${g.node ? " · " + g.node.label : ""}` +
    `\n  W16 tiers: QB ${me.QB.tier} · RB ${me.RB.tier} · WR ${me.WR.tier} · TE ${me.TE.tier}\n${"=".repeat(90)}`);
  for (const [n, a] of byTeam[team]) line(n, a, opp, me[a.pos].tier);
}
