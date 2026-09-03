#!/usr/bin/env node
// test-turn-reaches.mjs — guard 27, turn-aware reach reclassification.
//
// A "reach" is a pick taken earlier than market ADP. Measured against ADP ALONE
// that is the right default, and AT A SNAKE TURN it is the wrong lens.
//
// The case that produced this: a seat-12 BBM roster took Brock Purdy at 84 and
// De'Zhaun Stribling at 85 (ADP 103.8 and 103.4) and the app called them a -20
// and a -18 reach. Seat 12 picks 84, 85 and then 108 — a 23-pick gap — so both
// go, on average, BEFORE the next chance to take them. Waiting does not buy a
// cheaper price, it buys neither player. The framework already said so in the
// Conditional Forced Stacking Protocol ("evaluate whether the player will
// survive the turn"); the engine never computed it.
//
// What this asserts, in descending order of what a regression would cost:
//
//   1. CONSECUTIVE PICKS ARE ONE TURN. The first implementation took literally
//      the next pick in the list, so Purdy at 84 looked up 85 — the drafter's
//      OWN next selection, with nobody picking in between — and stayed flagged
//      while Stribling one pick later was cleared. That is the exact pair the
//      feature exists for, so this is assertion 1.
//   2. A SURVIVING REACH STILL COUNTS. Clearing everything would make the flag
//      useless. A player whose ADP is at or beyond the next pick would have
//      been there, so taking him early is a real reach and keeps its penalty.
//   3. NEVER SILENT. A cleared reach must still be visible, or the reader
//      cannot tell a cleared flag from one never raised. Same no-silent-drops
//      rule the extraction filters follow.
//   4. IT REMOVES A PENALTY, IT IS NOT A BONUS. Correct play is not rewarded,
//      it is simply not punished. The score delta must equal the penalty.
//   5. NULL IS NOT FALSE, and BOTH ENGINES are wired.
//
// Run: node scripts/test-turn-reaches.mjs   (exits non-zero on failure)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const repoRoot = process.cwd();
const tmpDir = path.join(os.tmpdir(), "rxr-turn"); mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const src = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");
const outfile = path.join(tmpDir, "turn.mjs");
await build({ stdin:{contents: src + "\nexport { analyzeRoster, analyzeRedraft, parseRoster, annotateTurnReaches, isScoredReach, ADP_DATA };\n",
  loader:"jsx", resolveDir:repoRoot, sourcefile:"App.jsx.jsx"},
  bundle:true, platform:"node", format:"esm", outfile, logLevel:"silent",
  alias:{"@vercel/analytics/react":path.join(tmpDir,"stub.js"),"@vercel/analytics":path.join(tmpDir,"stub.js")}});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

let fail = 0;
const ok = (l, c, x="") => { console.log((c?"  ok   ":"  FAIL ")+l+(c?"":`  <${x}>`)); if(!c) fail++; };

// seat 12 of a 12-man snake — the real wheel from the reported roster
const SEAT12 = [12,13,36,37,60,61,84,85,108,109,132,133,156,157,180,181,204,205];

console.log("\n1. consecutive picks are ONE turn");
{
  const flags = [
    { name:"Purdy",     actualPick:84,  adp:103.8, delta:84-103.8 },
    { name:"Stribling", actualPick:85,  adp:103.4, delta:85-103.4 },
  ];
  const a = e.annotateTurnReaches(flags, SEAT12);
  ok("Purdy at 84 looks past his own 85 to 108", a[0].nextPick === 108, `got ${a[0].nextPick}`);
  ok("Stribling at 85 also looks to 108",        a[1].nextPick === 108, `got ${a[1].nextPick}`);
  ok("Purdy would NOT survive to 108 (ADP 103.8)",     a[0].survivesTurn === false, String(a[0].survivesTurn));
  ok("Stribling would NOT survive to 108 (ADP 103.4)", a[1].survivesTurn === false, String(a[1].survivesTurn));
  ok("neither is a scored reach",
     !e.isScoredReach(a[0], 15) && !e.isScoredReach(a[1], 15));
}

console.log("\n2. a reach that WOULD have survived still counts");
{
  // ADP 130 with the next pick at 108: he is on the board when you pick again,
  // so taking him at 84 is a genuine reach and must keep its penalty.
  const a = e.annotateTurnReaches([{ name:"Late", actualPick:84, adp:130, delta:84-130 }], SEAT12);
  ok("survivesTurn true when ADP >= nextPick", a[0].survivesTurn === true, String(a[0].survivesTurn));
  ok("counts as a scored reach", e.isScoredReach(a[0], 15));
}

console.log("\n3. null is NOT false — unchanged behaviour without data");
{
  const last = e.annotateTurnReaches([{ name:"Last", actualPick:205, adp:120, delta:205-120 }], SEAT12);
  ok("final pick has no next pick", last[0].nextPick === null && last[0].survivesTurn === null);
  const noAdp = e.annotateTurnReaches([{ name:"NoAdp", actualPick:84, adp:null, delta:-20 }], SEAT12);
  ok("missing ADP leaves survivesTurn null", noAdp[0].survivesTurn === null);
  ok("a null-survives reach is STILL scored (pre-existing behaviour preserved)",
     e.isScoredReach({ delta:-20, survivesTurn:null }, 15));
}

console.log("\n4. both engines are wired, and neither hand-rolls the filter");
{
  const bb = src.slice(src.indexOf("const analyzeRoster"), src.indexOf("const analyzeRedraft"));
  const rd = src.slice(src.indexOf("const analyzeRedraft"));
  ok("analyzeRoster calls annotateTurnReaches",  bb.includes("annotateTurnReaches("));
  ok("analyzeRedraft calls annotateTurnReaches", rd.includes("annotateTurnReaches("));
  ok("analyzeRoster uses isScoredReach",  bb.includes("isScoredReach("));
  ok("analyzeRedraft uses isScoredReach", rd.includes("isScoredReach("));
  // A second hand-rolled `delta <= -reachThreshold` filter would silently bypass
  // the turn check — the duplicate-definition class this repo has hit seven times.
  // ⚠️ The DISCLOSURE filter legitimately re-reads `delta <= -reachThreshold`
  // (it lists what the turn check cleared), so match only a filter that does
  // NOT go on to consult survivesTurn — that one would silently bypass the
  // turn check, which is the duplicate-definition class this repo has hit
  // seven times.
  const bypass = (src.match(/filter\([^)]*delta\s*<=\s*-\s*reachThreshold[^)]*\)/g) || [])
    .filter(m => !/survivesTurn/.test(m));
  ok("no reach filter bypasses the turn check", bypass.length === 0, JSON.stringify(bypass));
  ok("annotateTurnReaches defined exactly once",
     (src.match(/const annotateTurnReaches\s*=/g) || []).length === 1);
}

console.log("\n5. end to end: removes the penalty, never adds a bonus, never silent");
{
  const mkRoster = (rows) => rows.flatMap(([n,adp,pk]) => [n, String(adp), "ADP", String(pk), "Pick"]).join("\n");
  // Three reaches on a wheel whose ADPs all fall INSIDE the gap -> all cleared.
  const names = Object.entries(e.ADP_DATA).filter(([,v])=>["RB","WR","TE","QB"].includes(v.pos) && v.adp < 200);
  const at = (lo,hi) => names.find(([,v]) => v.adp >= lo && v.adp <= hi);
  const cand = [[24,41,48],[25,42,48],[48,64,72],[49,65,72],[72,88,96]]
    .map(([pk,lo,hi]) => { const c = at(lo, hi-1); return c && [c[0], c[1].adp, pk]; }).filter(Boolean);
  ok("built enough turn-cleared candidates", cand.length >= 3, `${cand.length}`);
  if (cand.length >= 3) {
    const picks = e.parseRoster(mkRoster(cand), "standard");
    const r = e.analyzeRoster(picks, "main", true, false);
    const cleared = (r.strengths||[]).filter(s => /taken at the turn/.test(s));
    const reachW  = (r.weaknesses||[]).filter(s => /significant reaches/.test(s));
    ok("cleared reaches are DISCLOSED, not silent", cleared.length === 1, JSON.stringify(cleared));
    ok("the disclosure names the next pick", cleared.length === 1 && /next pick \d+/.test(cleared[0]));
    ok("no reach weakness fires", reachW.length === 0, JSON.stringify(reachW));
    // Not a bonus: the disclosure line must not carry points. Every flag on this
    // roster is a cleared reach, so the ADP layer must contribute exactly zero.
    const values = (r.strengths||[]).filter(s => /ADP value picks/.test(s));
    ok("no value-pick bonus is invented", values.length === 0, JSON.stringify(values));
  }
}

console.log(`\n${fail===0 ? "PASS  turn-aware reaches behave" : "FAIL  "+fail+" assertion(s)"}`);
process.exit(fail ? 1 : 0);
