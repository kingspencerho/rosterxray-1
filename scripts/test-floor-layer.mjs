#!/usr/bin/env node
// test-floor-layer.mjs — guard 21, the redraft Floor Layer.
//
// The mirror of the Ceiling Shape Layer, built on the metrics redraft actually
// wants: the stability run measured dud rate at r=0.67 and usable rate at
// r=0.65 against spike's 0.475, and until this layer the redraft engine never
// read either — it graded construction and schedule and never asked whether
// the starters produce usable weeks.
//
// What this asserts, in the order a regression would cost:
//
//   1. POSITION NORMALISATION. A QB posts a usable week almost by default
//      (starter-pool median blend 0.882) while the TE median is 0.133. Raw
//      blends would reward every QB for reasons unrelated to the lineup.
//   2. THE BASELINE POPULATION IS STARTERS, NOT THE DRAFTED POOL. The first
//      derivation centred on all drafted players and ref1's ordinary lineup
//      saturated the cap, because starting lineups are early-ADP by
//      construction. The median STARTER must score zero.
//   3. SATURATE AND SIT STILL. Floor-max and floor-min synthetic lineups must
//      both reach the cap; the reference fixtures must not.
//   4. CONTAINMENT. Redraft only — analyzeRoster (best ball) never reads it.
//
// Run: node scripts/test-floor-layer.mjs   (exits non-zero on failure)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const repoRoot = process.cwd();
const tmp = path.join(os.tmpdir(), "rxr-floor"); mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const app = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");
const outfile = path.join(tmp, "f.mjs");
await build({ stdin: { contents: app + "\nexport { analyzeRoster, parseRoster, analyzeRedraft, parseRosterRedraft, PLAYER_METRICS, findPlayer };\n",
  loader: "jsx", resolveDir: repoRoot, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: { "@vercel/analytics/react": path.join(tmp, "stub.js"), "@vercel/analytics": path.join(tmp, "stub.js") } });
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

let fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  ok   " : "  FAIL ") + l + (c ? "" : `  <${x}>`)); if (!c) fail++; };

// ---------------------------------------------------------------- structure
console.log("=== structure ===");
const li = app.indexOf("const FLOOR_BASE");
ok("FLOOR_BASE declared exactly once", (app.match(/const FLOOR_BASE/g) || []).length === 1);
const baseLine = app.slice(li, app.indexOf(";", li));
ok("baselines are per-position (all four present)",
   ["QB:", "RB:", "WR:", "TE:"].every(k => baseLine.includes(k)), baseLine.slice(0, 80));
ok("QB baseline is far above TE (the normalisation that matters)",
   /QB: 0\.8/.test(baseLine) && /TE: 0\.1/.test(baseLine), baseLine);
ok("the layer reads the STARTERS, not the roster", app.slice(li - 3000, li + 800).includes("(allStarters || [])"));
// UPDATED Sep 6 2026. This asserted the LITERAL 8 and 0.35, and correctly failed
// the moment the gate became one shared constant - which is the fix it was asking
// for. The property is that the floor layer uses THE SAME gate as the ceiling
// layer, not that a particular number is typed here.
ok("the floor layer reads the shared CEILING_GATE, not its own copy",
   app.slice(li, li + 900).includes("CEILING_GATE.gp") && app.slice(li, li + 900).includes("CEILING_GATE.snap"));
ok("CEILING_GATE still holds the values this layer was calibrated on",
   app.includes("const CEILING_GATE = { gp: 8, snap: 0.35 }"),
   "FLOOR_BASE was derived at 8 games / 35% snaps; changing the gate invalidates it");

// -------------------------------------------------------------- calibration
console.log("\n=== fixtures sit still ===");
const ref = {};
for (const f of ["ref1", "ref2", "ref3"]) {
  const picks = e.parseRosterRedraft(readFileSync(path.join(repoRoot, `scripts/fixtures/${f}.txt`), "utf8"));
  const r = e.analyzeRedraft(picks, "yahoo_std", picks.hasPickNumbers, false);
  ref[f] = r;
  ok(`${f} floorLayer computed`, !!r.floorLayer, JSON.stringify(r.floorLayer));
  if (r.floorLayer) ok(`${f} does not saturate (|pts| < 0.5)`, Math.abs(r.floorLayer.score) < 0.5,
     String(r.floorLayer.score));
}

console.log("\n=== synthetics saturate ===");
const rows = { QB: [], RB: [], WR: [], TE: [] };
for (const [name, m] of Object.entries(e.PLAYER_METRICS)) {
  if (!rows[m.pos]) continue;
  if ((m.gp || 0) < 8 || (m.snap_sh || 0) < 0.35) continue;
  if (m.usable_rate == null || m.dud_rate == null) continue;
  if (!e.findPlayer(name, "standard")) continue;
  rows[m.pos].push({ name, blend: m.usable_rate - m.dud_rate });
}
const pickN = (pos, n, best) => [...rows[pos]].sort((a, b) => best ? (b.blend - a.blend) : (a.blend - b.blend)).slice(0, n).map(x => x.name);
const synth = (best) => {
  const roster = [...pickN("QB", 1, best), ...pickN("RB", 6, best), ...pickN("WR", 8, best), ...pickN("TE", 1, best)].join("\n");
  return e.analyzeRedraft(e.parseRosterRedraft(roster), "yahoo_std", false, false);
};
const mx = synth(true), mn = synth(false);
ok("floor-max lineup saturates at +0.5", mx.floorLayer?.score === 0.5, JSON.stringify(mx.floorLayer));
ok("floor-min lineup saturates at -0.5", mn.floorLayer?.score === -0.5, JSON.stringify(mn.floorLayer));
ok("...and they diverge by the full swing", (mx.floorLayer?.score ?? 0) - (mn.floorLayer?.score ?? 0) === 1);
ok("the strength line fires on the max lineup", mx.strengths.some(s => /High-floor lineup/.test(s)));
ok("the weakness line fires on the min lineup", mn.weaknesses.some(s => /Fragile floor/.test(s)));

// -------------------------------------------------------------- containment
console.log("\n=== containment: best ball never reads it ===");
const ai = app.indexOf("const analyzeRoster");
let depth = 0, j = app.indexOf("{", ai), end = j;
for (let k = j; k < app.length; k++) {
  if (app[k] === "{") depth++;
  else if (app[k] === "}") { depth--; if (depth === 0) { end = k; break; } }
}
const bbBody = app.slice(ai, end);
ok("analyzeRoster contains no FLOOR_BASE", !bbBody.includes("FLOOR_BASE"));
ok("analyzeRoster contains no floorLayer", !bbBody.includes("floorLayer"));
const bb = e.analyzeRoster(e.parseRoster(readFileSync(path.join(repoRoot, "scripts/fixtures/ref1.txt"), "utf8"), "standard"), "main", false, false);
ok("a best-ball result carries no floorLayer key", !("floorLayer" in bb));

console.log(fail ? `\nFAIL  ${fail} assertion(s)` : "\nPASS  floor layer: normalised, starter-centred, saturates and sits still, redraft-only");
process.exit(fail ? 1 : 0);
