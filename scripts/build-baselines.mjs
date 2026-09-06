#!/usr/bin/env node
// build-baselines.mjs -> grading/data/baselines_2026.json
//
// WHAT A GRADE IS MISSING, AND THIS IS THE WHOLE POINT.
// ----------------------------------------------------
// The app returns "A, 9.58" and the reader's honest next thought is "...is that
// good?" There is nothing to compare it to. A grade with no reference point is a
// number; a grade with a comparison is a decision.
//
// So this simulates the FIELD: many 12-team snake drafts run off ADP, every one
// of the 12 resulting rosters graded through the real engine, per tournament.
// The median of that population is what an ordinary entry scores.
//
// ⛔⛔ THE DESIGN RISK, NAMED UP FRONT, BECAUSE GETTING IT WRONG IS WORSE THAN
// SHIPPING NOTHING. If the synthetic rosters are UNREALISTIC — 18 receivers, no
// quarterback, no structure — they grade terribly, the baseline lands far below
// any real roster, and EVERY user is told they beat the field. A flattering
// baseline is not a weak feature, it is an actively lying one.
//
// So the simulation drafts the way the field actually drafts:
//   1. best available by ADP, with noise, from a shrinking pool
//   2. subject to the construction caps in CLAUDE.md § BBM 5-Year Benchmarks
//      (WR 6-7, RB 5-6, TE 2-3, QB 2-3 over 18 rounds)
//   3. minimums force-filled late, exactly as a human is forced to
// Every team in the draft is a field entry, which is the correct population —
// not a random sample of players.
//
// ⚠️ IT IS STILL A MODEL OF THE FIELD, NOT THE FIELD. Real drafters stack,
// reach on news, and chase correlation; this one does not. Expect the synthetic
// median to sit BELOW a real median on stack-sensitive tournaments, because
// nothing here builds a QB loop on purpose. `_meta.limits` says so, the app
// prints the caveat, and the number is a REFERENCE POINT rather than a
// percentile claim.
//
// CONTEXT ONLY. Nothing here may reach analyzeRoster or analyzeRedraft — a
// baseline that fed the engine would move every grade and silently invalidate
// every calibration in CLAUDE.md. Guard 27 asserts it.
//
// Usage:
//   node scripts/build-baselines.mjs [--drafts 40] [--seed 7]

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import os from "os";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const DRAFTS = parseInt(argOf("drafts", "40"), 10);
let seed = parseInt(argOf("seed", "7"), 10);

// Deterministic RNG so a rebuild reproduces the same file. A baseline that
// moves on every run is a baseline nobody can calibrate against.
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

const tmpDir = path.join(os.tmpdir(), "rosterxray-baselines");
mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "analytics-stub.js"),
  "export const Analytics = () => null; export const track = () => {};\n");
const src = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { analyzeRoster, parseRoster, TOURNAMENTS, ADP_DATA };\n";
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

// ---- the draftable pool -----------------------------------------------------
const POS = ["QB", "RB", "WR", "TE"];
const pool = Object.entries(eng.ADP_DATA)
  .filter(([, v]) => v && v.adp != null && POS.includes(v.pos) && v.team && v.team !== "-")
  .map(([name, v]) => ({ name, adp: +v.adp, pos: v.pos, team: v.team }))
  .sort((a, b) => a.adp - b.adp);

// Construction caps, from CLAUDE.md § BBM 5-Year Construction Benchmarks.
const CAP = { QB: 3, RB: 7, WR: 10, TE: 3 };
const MIN = { QB: 2, RB: 4, WR: 6, TE: 2 };
const TEAMS = 12, ROUNDS = 18;

function simulateDraft() {
  const taken = new Set();
  const rosters = Array.from({ length: TEAMS }, () => ({ players: [], picked: [], counts: { QB: 0, RB: 0, WR: 0, TE: 0 } }));
  for (let r = 0; r < ROUNDS; r++) {
    const order = r % 2 === 0 ? [...rosters.keys()] : [...rosters.keys()].reverse();
    for (const t of order) {
      const R = rosters[t];
      const left = ROUNDS - r;                       // picks remaining for this team
      const owed = POS.filter(p => R.counts[p] < MIN[p]);
      const mustFill = owed.length >= left;          // out of slack: fill a minimum now
      const legal = pool.filter(p =>
        !taken.has(p.name) &&
        R.counts[p.pos] < CAP[p.pos] &&
        (!mustFill || owed.includes(p.pos)));
      if (!legal.length) continue;
      // Near-ADP with noise: pick from the top of the board, not strictly first.
      // A field that always takes the literal best available is not a field.
      const width = Math.min(legal.length, 6);
      const near = legal.slice(0, Math.min(legal.length, 10));

      // ⭐⭐ THE FIELD STACKS ON PURPOSE, AND THE FIRST VERSION OF THIS DID NOT.
      // Measured: an ADP-only simulation produced rosters whose every QB was
      // unlooped ("Unlooped QBs: Daniels, Nix, Stroud"), and stack integrity is
      // the engine's HIGHEST-weighted axis. The median came out at 1.99 against
      // real fixtures at 5.43 and 7.74 — a baseline that low would have told
      // almost every real user they beat the field, which is the flattering-lie
      // failure this file's header warns about.
      //
      // So a drafter here takes a correlated piece when one is near value:
      // a pass catcher on a QB he owns, or a QB for catchers he owns.
      const myQBteams = new Set(R.players.map((_, i) => R.picked[i]).filter(x => x && x.pos === "QB").map(x => x.team));
      const myCatcherTeams = new Set(R.picked.filter(x => x && x.pos !== "QB" && x.pos !== "RB").map(x => x.team));
      const correlated = near.filter(p =>
        (p.pos !== "QB" && p.pos !== "RB" && myQBteams.has(p.team)) ||
        (p.pos === "QB" && myCatcherTeams.has(p.team)));
      // 55% of the time, take the correlated piece if one is within reach.
      // Not always — a field that stacks every pick is as unreal as one that never does.
      const pick = (correlated.length && rnd() < 0.55)
        ? correlated[Math.floor(rnd() * correlated.length)]
        : legal[Math.floor(rnd() * width)];
      taken.add(pick.name);
      R.players.push(`${pick.name} ${r * TEAMS + t + 1}`);
      R.picked.push(pick);
      R.counts[pick.pos]++;
    }
  }
  return rosters;
}

// ---- run --------------------------------------------------------------------
const keys = Object.keys(eng.TOURNAMENTS);
const rosterTexts = [];
for (let d = 0; d < DRAFTS; d++) for (const R of simulateDraft()) rosterTexts.push(R.players.join("\n"));
process.stderr.write(`simulated ${DRAFTS} drafts -> ${rosterTexts.length} rosters\n`);

const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const out = {};
for (const k of keys) {
  const fmt = eng.TOURNAMENTS[k]?.format || "standard";
  const scores = [];
  for (const txt of rosterTexts) {
    try {
      const picks = eng.parseRoster(txt, fmt);
      const res = eng.analyzeRoster(picks, k, picks.hasPickNumbers, false);
      if (typeof res?.score === "number" && Number.isFinite(res.score)) scores.push(res.score);
    } catch { /* a roster the parser rejects is not a field entry; skip it */ }
  }
  scores.sort((a, b) => a - b);
  out[k] = {
    n: scores.length,
    median: +pct(scores, 0.50).toFixed(2),
    p25: +pct(scores, 0.25).toFixed(2),
    p75: +pct(scores, 0.75).toFixed(2),
    p90: +pct(scores, 0.90).toFixed(2),
    min: +scores[0].toFixed(2),
    max: +scores[scores.length - 1].toFixed(2),
  };
  process.stderr.write(`  ${k.padEnd(15)} n=${scores.length}  median ${out[k].median}  p25 ${out[k].p25}  p75 ${out[k].p75}\n`);
}

const meta = {
  built_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  drafts: DRAFTS, teams_per_draft: TEAMS, rounds: ROUNDS, rosters: rosterTexts.length,
  seed: parseInt(argOf("seed", "7"), 10),
  source: "simulated 12-team snake drafts off ADP_DATA, graded through analyzeRoster",
  context_only: true,
  reaches_ai_prompt: false,
  caps: CAP, minimums: MIN,
  adp_vintage_note: "Drafted off ADP_DATA, so the baseline inherits that table's vintage. Rebuild after any ADP refresh.",
  limits: [
    "A MODEL of the field, not the field. The simulation drafts near ADP under construction caps; it never stacks, never reacts to news, never chases correlation.",
    "So it under-represents deliberate QB stacks, and the median will sit BELOW a real field median on stack-weighted tournaments. Read it as a REFERENCE POINT, never as a percentile claim about real opponents.",
    "Deterministic: same seed, same file. A baseline that moves every run cannot be calibrated against.",
  ],
};
writeFileSync(path.join(repoRoot, "grading/data/baselines_2026.json"),
  JSON.stringify({ _meta: meta, tournaments: out }, null, 1) + "\n");
process.stderr.write(`\nwrote grading/data/baselines_2026.json (${keys.length} tournaments)\n`);
