#!/usr/bin/env node
// ngs-targets.mjs — the whole receiving pool, ranked on Next Gen Stats tracking.
//
// TWO INPUTS, TWO DIFFERENT QUESTIONS:
//   sep  (r=0.66)  does he get open — the ONLY rank-3 talent input the app holds
//   iay  (r=0.83)  where is he used — the stickiest player input in the project
//
// ⚠ SEPARATION ALONE IS NOT A TARGET LIST. Rank 3 sits below rank 2, and talent
// without opportunity scores zero. So every row carries its snap share and
// target share, and the screen calls out the divergences explicitly — a player
// who gets open and is not on the field is a different bet from one who does
// both.
//
// ⚠ NGS HAS ITS OWN POPULATION: 40+ targets in 2025. That is not the card's
// draftable/8-game gate. Percentiles below are within THIS population.
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";
const root = process.cwd();
const tmp = path.join(os.tmpdir(), "rxr-ngs"); mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp,"stub.js"),"export const Analytics=()=>null;export const track=()=>{};\n");
const src = readFileSync(path.join(root,"App.jsx.jsx"),"utf8") +
  "\nexport { NGS_RECEIVING, ADP_DATA, getMetrics, getRedZone, getAvailability, getCareerArc, getSnapTrend, getNgsRec, SITUATIONS };\n";
const outfile = path.join(tmp,"n.mjs");
await build({ stdin:{contents:src,loader:"jsx",resolveDir:root,sourcefile:"App.jsx.jsx"}, bundle:true, platform:"node", format:"esm", outfile, logLevel:"silent",
  alias:{"@vercel/analytics/react":path.join(tmp,"stub.js"),"@vercel/analytics":path.join(tmp,"stub.js")}});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

const MED = e.NGS_RECEIVING._meta.medians;

// ⚠ RAW SEPARATION IS CONFOUNDED BY ROUTE DEPTH, and badly: measured across this
// pool, corr(separation, intended air yards) = -0.69. Deeper routes give the
// defender more time to close, so separation falls monotonically with aDOT —
// WR means run 3.62 at aDOT 0-7 down to 2.45 at 13+.
//
// So a raw separation ranking is substantially a "how short are his routes"
// ranking. Ranking on it alone rewards slot and screen usage and punishes every
// boundary X in the league, which is a measurement artefact rather than a talent
// finding.
//
// SEP+ is separation over expected AT THE DEPTH HE IS ACTUALLY USED: a
// least-squares fit of sep on iay, within position, and the residual. It moves
// people a long way — Alec Pierce goes from 82nd of 85 raw to 24th adjusted on a
// 19.0 aDOT, and Khalil Shakir falls from 6th to 30th once his 3.5-yard aDOT is
// accounted for.
//
// BOTH ARE PRINTED. SEP+ answers "does he beat his assignment", raw sep answers
// "how much space does he actually catch it in", and a best-ball ceiling case
// cares about the second as well as the first.
const fitSep = (pos, list) => {
  const p = list.filter(r => r.pos === pos);
  if (p.length < 12) return null;
  const mx = p.reduce((a, r) => a + r.iay, 0) / p.length;
  const my = p.reduce((a, r) => a + r.sep, 0) / p.length;
  let num = 0, den = 0;
  for (const r of p) { num += (r.iay - mx) * (r.sep - my); den += (r.iay - mx) ** 2; }
  const slope = num / den;
  return { slope, icpt: my - slope * mx };
};
const pool = Object.entries(e.NGS_RECEIVING.players);
// Percentile within the NGS population, by position.
const dist = {};
for (const [, r] of pool) (dist[r.pos] ||= { sep: [], iay: [] }) && (dist[r.pos].sep.push(r.sep), dist[r.pos].iay.push(r.iay));
for (const d of Object.values(dist)) { d.sep.sort((a,b)=>a-b); d.iay.sort((a,b)=>a-b); }
const pctl = (pos, k, v) => { const a = dist[pos][k]; let n=0; for (const x of a) { if (x<v) n++; else break; } return Math.round(n/a.length*100); };
const P = (v) => v==null?"—":`${Math.round(v*100)}%`;

const FIT = { WR: fitSep("WR", pool.map(([, r]) => r)), TE: fitSep("TE", pool.map(([, r]) => r)) };
const sepPlus = (r) => { const f = FIT[r.pos]; return f ? r.sep - (f.icpt + f.slope * r.iay) : null; };
// Percentile of SEP+ within position, so the adjusted figure is readable the
// same way the raw one is.
const spDist = {};
for (const [, r] of pool) (spDist[r.pos] ||= []).push(sepPlus(r));
for (const k of Object.keys(spDist)) spDist[k].sort((a, b) => a - b);
const spPct = (pos, v) => { const a = spDist[pos]; let n = 0; for (const x of a) { if (x < v) n++; else break; } return Math.round(n / a.length * 100); };

const rows = [];
for (const [name, n] of pool) {
  const a = e.ADP_DATA[name];
  if (!a || a.adp == null) continue;                       // undrafted in best ball
  const m = e.getMetrics(name), rz = e.getRedZone(name), tr = e.getSnapTrend(name),
        av = e.getAvailability(name), ar = e.getCareerArc(name);
  const sp = sepPlus(n);
  rows.push({ name, ...a, n, m, rz, tr, av, ar, sp,
    sepP: pctl(n.pos, "sep", n.sep), iayP: pctl(n.pos, "iay", n.iay),
    spP: sp == null ? null : spPct(n.pos, sp),
    sit: e.SITUATIONS[name] });
}

const flags = (r) => {
  const f = [];
  if (r.tr?.trend === "rising") f.push("role↑");
  if (r.tr?.trend === "falling") f.push("role↓");
  if (r.rz?.rz_tgt_sh >= 0.20) f.push(`rz${P(r.rz.rz_tgt_sh)}`);
  if (r.av && (r.av.recent ?? r.av.career) <= 0.70) f.push("fragile");
  if (r.ar?.phase === "rising") f.push(`age${r.ar.age}↑`);
  if (r.ar?.phase === "decline") f.push(`age${r.ar.age}↓`);
  if (r.m && r.m.gp >= 8 && r.m.spike_rate >= 0.25) f.push(`spike${P(r.m.spike_rate)}`);
  return f.join(" ");
};
const show = (r) => {
  const snap = r.m?.snap_sh != null ? P(r.m.snap_sh) : "—";
  const tsh = r.m?.tgt_sh != null ? P(r.m.tgt_sh) : "—";
  console.log(`${String(Math.round(r.adp)).padStart(4)} ${r.pos} ${r.team.padEnd(3)} ${r.name.padEnd(22)}` +
    ` sep ${String(r.n.sep).padEnd(5)} ${String(r.sepP).padStart(3)}%ile  sep+ ${(r.sp>0?"+":"")+r.sp.toFixed(2)} ${String(r.spP).padStart(3)}%ile  iay ${String(r.n.iay).padEnd(5)} ${String(r.iayP).padStart(3)}%ile` +
    `  ${String(r.n.tgt).padStart(3)}tgt  snap ${snap.padStart(4)}  tsh ${tsh.padStart(4)}  ${flags(r)}`);
};

console.log(`NGS RECEIVING — population: ${pool.length} players with ${e.NGS_RECEIVING._meta.min_targets}+ targets in 2025.`);
console.log(`Position medians: ${Object.entries(MED).map(([k,v])=>`${k} ${v}`).join(" · ")}. Percentiles are within THIS pool.\n`);

console.log(`⚠ corr(separation, aDOT) in this pool = ${(() => {
  const a = pool.map(([, r]) => r.sep), b = pool.map(([, r]) => r.iay);
  const m = x => x.reduce((s, v) => s + v, 0) / x.length, ma = m(a), mb = m(b);
  let n = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; n += x * y; da += x * x; db += y * y; }
  return (n / Math.sqrt(da * db)).toFixed(2);
})()}. Raw separation is substantially a ROUTE-DEPTH measurement, so sep+ is printed beside it.\n`);

console.log("=".repeat(140));
console.log("ELITE SEPARATION OVER EXPECTED (sep+) — beats his assignment AT THE DEPTH HE IS USED.");
console.log("This is the depth-adjusted talent read. Prefer it to the raw column for a talent claim.");
console.log("=".repeat(140));
for (const r of rows.filter(r => r.spP >= 80).sort((a,b)=>b.spP-a.spP)) show(r);

console.log("\n" + "=".repeat(140));
console.log("ELITE RAW SEPARATION — 80th percentile or better, UNADJUSTED.");
console.log("Read the sep+ column beside it: a short-route player scores high here almost automatically.");
console.log("=".repeat(140));
for (const r of rows.filter(r => r.sepP >= 80).sort((a,b)=>b.sepP-a.sepP)) show(r);

console.log("\n" + "=".repeat(140));
console.log("⚠ THE BIGGEST DISAGREEMENTS — where controlling for route depth changes the verdict.");
console.log("=".repeat(140));
for (const r of rows.filter(r => Math.abs(r.spP - r.sepP) >= 20).sort((a,b)=>Math.abs(b.spP-b.sepP)-Math.abs(a.spP-a.sepP)).slice(0,14)) show(r);

console.log("\n" + "=".repeat(118));
console.log("BOTH AXES LIVE — 70th+ in separation AND 70th+ in intended air yards.");
console.log("Rare on purpose: getting open underneath is common, getting open DOWNFIELD is not.");
console.log("=".repeat(118));
const both = rows.filter(r => r.sepP >= 70 && r.iayP >= 70).sort((a,b)=>(b.sepP+b.iayP)-(a.sepP+a.iayP));
both.length ? both.forEach(show) : console.log("  none clear both bars.");

console.log("\n" + "=".repeat(118));
console.log("DEEP DEPLOYMENT — 85th+ intended air yards. The stickiest input in the project (r=0.83).");
console.log("Where a coach AIMS the ball. Boom/bust by construction, which is what best ball pays for.");
console.log("=".repeat(118));
for (const r of rows.filter(r => r.iayP >= 85).sort((a,b)=>b.iayP-a.iayP)) show(r);

console.log("\n" + "=".repeat(118));
console.log("⚠ TALENT WITHOUT THE FIELD — elite separation, snap share under 70%.");
console.log("Rank 3 sits BELOW rank 2. These are contingency bets, not target-share bets.");
console.log("=".repeat(118));
for (const r of rows.filter(r => r.sepP >= 80 && r.m?.snap_sh != null && r.m.snap_sh < 0.70).sort((a,b)=>b.sepP-a.sepP)) show(r);

console.log("\n" + "=".repeat(118));
console.log("THE VALUE BOARD — elite on an NGS axis, ADP 100+, and the opportunity is already real.");
console.log("Requires: 80th+ on either axis · snap share 70%+ OR target share 18%+ · ADP past pick 100.");
console.log("=".repeat(118));
const value = rows.filter(r => (r.sepP >= 80 || r.iayP >= 80) && r.adp >= 100 &&
    (r.m && (r.m.snap_sh >= 0.70 || r.m.tgt_sh >= 0.18)))
  .sort((a,b) => Math.max(b.sepP,b.iayP) - Math.max(a.sepP,a.iayP) || a.adp - b.adp);
for (const r of value) show(r);

console.log("\n" + "=".repeat(118));
console.log("⚠ THE INVERSE — heavy target share, BOTTOM-QUARTILE separation. Volume propping up a profile.");
console.log("=".repeat(118));
for (const r of rows.filter(r => r.sepP <= 25 && r.m?.tgt_sh >= 0.20).sort((a,b)=>a.sepP-b.sepP)) show(r);
