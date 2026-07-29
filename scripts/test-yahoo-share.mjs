#!/usr/bin/env node
// test-yahoo-share.mjs — pins parsing of Yahoo's share-card format (Jul 2026).
//
// The share card rows read "QB B. PURDY Thu 5:35PM @ LAR — 18.85". Two traps
// this test guards:
//   1. The trailing decimal is a PROJECTION. The unlabelled-ADP capture must
//      NOT swallow it (14.61 for Pickens is within the 75-pick guard of his
//      table ADP, so only the shareMode flag prevents silent poisoning).
//   2. "5:35PM" sheds integer tokens that the pick extractor would otherwise
//      read as draft slots. Share cards carry no picks at all.
// Input below is the exact card from the Jul 28 2026 report, via Live Text.

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import os from "os";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = path.join(os.tmpdir(), "rosterxray-test-share");
mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "analytics-stub.js"),
  "export const Analytics = () => null; export const track = () => {};\n");
const src = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { parseRosterRedraft, parseRoster };\n";
const outfile = path.join(tmpDir, "engine.mjs");
await build({
  stdin: { contents: src, loader: "jsx", resolveDir: repoRoot, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: {
    "@vercel/analytics/react": path.join(tmpDir, "analytics-stub.js"),
    "@vercel/analytics": path.join(tmpDir, "analytics-stub.js"),
  },
});
const eng = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

const SHARE_CARD = `Week 1 Football H2H Points
IGBBMN
0 - 0 - 0 Spencer
QB B. PURDY Thu 5:35PM @ LAR — 18.85
WR G. PICKENS Sun 5:20PM @ NYG — 14.61
WR T. HIGGINS Sun 10:00AM v TB — 13.82
RB B. ROBINSON Sun 10:00AM @ PIT — 20.02
RB J. WARREN Sun 10:00AM v ATL — 12.23
TE T. MCBRIDE Sun 1:25PM @ LAC — 13.46
WRT M. NABERS Sun 5:20PM v DAL — 13.98
WRT J. DOWNS Sun 10:00AM v BAL — 11.33
K K. FAIRBAIRN Sun 10:00AM v BUF — 9.16
DEF EAGLES Sun 1:25PM v WAS — 9.97
BENCH
QB D. MAYE Wed 5:20PM @ SEA — 18.81
WR P. WASHINGTON Sun 10:00AM v CLE — 9.57
RB R. STEVENSON Wed 5:20PM @ SEA — 9.69
RB R. HARVEY Mon 5:15PM @ KC — 9.28
TE D. KINCAID Sun 10:00AM @ HOU — 7.98
RB D. SAMPSON Sun 10:00AM @ JAX — 6.14`;

let failures = 0;
const check = (label, cond, detail = "") => {
  if (cond) { console.log(`  ok   ${label}`); }
  else { failures++; console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`); }
};

const res = eng.parseRosterRedraft(SHARE_CARD);
const picks = res.picks || res;
const matched = picks.filter(p => p && p.team && !p.notFound);

console.log("Yahoo share card (redraft path):");
// 14 skill players on the card (K + DEF stripped by the redraft KDST filter)
check("14 skill players matched", matched.length === 14, `got ${matched.length}: ${matched.map(p => p.name).join(", ")}`);

const names = matched.map(p => (p.name || "").toLowerCase());
check("initials resolve (B. Purdy -> brock purdy)", names.some(n => n.includes("purdy")));
check("initials resolve (T. McBride)", names.some(n => n.includes("mcbride")));
check("bench section included (D. Sampson)", names.some(n => n.includes("sampson")));

// Trap 1: projections must never become ADP
const poisoned = matched.filter(p => p.adpSource === "roster" || (p.parsedAdp != null));
check("no projection ingested as ADP", poisoned.length === 0,
  poisoned.map(p => `${p.name}:${p.parsedAdp ?? p.adp}`).join(", "));

// Trap 2: kickoff times must never become pick numbers
const ghostPicks = matched.filter(p => p.actualPick != null || p.pick != null);
check("no ghost pick numbers from kickoff times", ghostPicks.length === 0,
  ghostPicks.map(p => `${p.name}:${p.pick ?? p.actualPick}`).join(", "));

if (failures) { console.log(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log("\nALL CHECKS PASSED");
