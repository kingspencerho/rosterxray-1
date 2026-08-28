#!/usr/bin/env node
// test-playoff-boosts.mjs — guard 16. Every playoff view shows the same tier.
//
// Reported by a user: the SF stack read Good/Good/Good in the stack matrix while
// the same player's W15-17 cells in the season schedule grid read Hard/Avoid.
// Both were "right" for their own code path, which is the problem.
//
// There were FOUR different boost levels across five consumers:
//   stack loop        competitive-balance + high-pace          (the scored path)
//   orphan loop       both, but high-pace skipped tierFromScore -> label lied
//   matchupScoreFor   competitive-balance only
//   seasonSchedules   neither                                   <- what the user saw
//   advance layer     neither, W1-14 only                       <- correct, leave alone
//
// analyzeRedraft is deliberately OUT OF SCOPE: it carries its own competitive
// balance thresholds (total >= 49) and its own calibration, and folding it in
// would move redraft grades. See the Aug 23 note in CLAUDE.md.
//
// This is the third time this class has bitten (Aug 14 tier/score, Aug 23
// competitive balance, now this), so the guard asserts the shape rather than
// the symptom: ONE helper, every playoff consumer routed through it, and the
// W1-14 scored path deliberately excluded.
//
// Run: node scripts/test-playoff-boosts.mjs   (exits non-zero on failure)

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";
import os from "os";

const repoRoot = process.cwd();
const tmpDir = path.join(os.tmpdir(), "rxr-pb");
mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const src = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { getMatchupTier, getMatchupScoreForOpponent, playoffBoosts, PLAYOFFS, FULL_SCHEDULE };\n";
const outfile = path.join(tmpDir, "pb.mjs");
await build({
  stdin: { contents: src, loader: "jsx", resolveDir: repoRoot, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: { "@vercel/analytics/react": path.join(tmpDir, "stub.js"), "@vercel/analytics": path.join(tmpDir, "stub.js") },
});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
const app = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${cond || !detail ? "" : `  (${detail})`}`);
  if (!cond) fail++;
};

// ---- 1. every playoff consumer routes through the one helper ----
console.log("one helper, every playoff consumer");
ok("playoffBoosts is defined once", (app.match(/const playoffBoosts = /g) || []).length === 1);
// The raw boosts must not be applied by hand anywhere outside it.
const cbCalls = [...app.matchAll(/competitiveBalanceBoost\(/g)].length;
ok("competitiveBalanceBoost has exactly one call site (inside playoffBoosts)", cbCalls === 1, `found ${cbCalls}`);
// Count the ACT of boosting, not the words: `type === "highPace"` also appears
// as a prompt label, which is not an application of the boost.
const hpApply = [...app.matchAll(/highPaceBoost: true/g)].length;
ok("the high-pace boost is applied in exactly one place", hpApply === 1, `found ${hpApply}`);
ok("the best-ball loops no longer boost by hand",
   !/getMatchupTier\([^)]*\)\s*;[\s\S]{0,400}?competitiveBalanceBoost/.test(app));

// ---- 1b. each consumer is structurally wired to the helper ----
const consumers = [
  { name: "seasonSchedules (the W1-18 grid)", start: "const seasonSchedules = [", end: "\n    }));" },
  { name: "matchupScoreFor (panel + pivots)", start: "const matchupScoreFor = (p) => {", end: "\n  };" },
  { name: "the orphan matchup loop", start: "const orphans = valid.filter", end: "\n    });" },
];
for (const c of consumers) {
  const a = app.indexOf(c.start);
  const b = a > -1 ? app.indexOf(c.end, a) : -1;
  const body = a > -1 && b > -1 ? app.slice(a, b) : "";
  ok(`${c.name} routes through playoffBoosts`, !!body && body.includes("playoffBoosts("),
     "a consumer that skips it shows raw tiers while the stack matrix shows boosted ones");
}
// The season grid must scope the boost to the playoff window, not blanket W1-18.
const ssI = app.indexOf("const seasonSchedules = [");
const ssBody = ssI > -1 ? app.slice(ssI, ssI + 900) : "";
ok("the season grid offsets the week index into the playoff window", ssBody.includes("weekIdx - 14"),
   "PLAYOFF_GAME_TOTALS is W15-17 only; boosting W1-14 would be inventing data");

// ---- 2. the W1-14 scored path is deliberately NOT boosted ----
console.log("\nthe scored W1-14 path stays raw");
const i = app.indexOf("const coreSchedAvgs");
const body = i > -1 ? app.slice(i, i + 700) : "";
ok("the Advance Rate Layer's W1-14 pass exists", i > -1);
ok("...and does not call playoffBoosts", !!body && !body.includes("playoffBoosts"),
   "PLAYOFF_GAME_TOTALS has no W1-14 data; boosting there would move grades");
ok("...and is still bounded to the first 14 weeks", body.includes("slice(0, 14)"));

// ---- 3. the two tier functions agree once boosted ----
console.log("\nthe stack matrix and the season grid cannot disagree");
let cells = 0, disagree = [], labelBad = [];
for (const team of Object.keys(e.PLAYOFFS)) {
  for (let w = 0; w < 3; w++) {
    const opp = e.PLAYOFFS[team][w];
    if (!opp) continue;
    for (const pos of ["QB", "RB", "WR", "TE"]) {
      const a = e.playoffBoosts(e.getMatchupTier(opp, pos, false), team, opp, w);
      const b = e.playoffBoosts(e.getMatchupScoreForOpponent(opp, pos, false), team, opp, w);
      cells++;
      if (a.tier !== b.tier || a.score !== b.score) disagree.push(`${team} W${15 + w} ${pos}: ${a.tier} vs ${b.tier}`);
      const want = a.score >= 5 ? "Smash" : a.score >= 4 ? "Good" : a.score >= 3 ? "Even" : a.score >= 2 ? "Hard" : "Avoid";
      if (a.tier !== want) labelBad.push(`${team} W${15 + w} ${pos}: score ${a.score} labelled ${a.tier}`);
    }
  }
}
ok(`all ${cells} playoff cells agree across both tier functions`, disagree.length === 0, disagree.slice(0, 3).join("; "));
ok("the tier label follows the score in every cell", labelBad.length === 0, labelBad.slice(0, 3).join("; "));

// ---- 4. the boosts still actually fire, in both directions ----
console.log("\nthe boosts still bite");
let lifted = 0;
for (const team of Object.keys(e.PLAYOFFS)) {
  for (let w = 0; w < 3; w++) {
    const opp = e.PLAYOFFS[team][w];
    if (!opp) continue;
    for (const pos of ["QB", "RB", "WR", "TE"]) {
      const raw = e.getMatchupTier(opp, pos, false);
      const up = e.playoffBoosts(raw, team, opp, w);
      if (up.score > raw.score) lifted++;
    }
  }
}
ok("some cells are lifted by a boost", lifted > 0, `${lifted} of ${cells}`);
ok("not everything is lifted", lifted < cells * 0.6, `${lifted} of ${cells} — a boost that fires everywhere is not a boost`);
// wkIdx outside the playoff window must be a no-op
const t0 = e.getMatchupTier(e.PLAYOFFS.SF[0], "WR", false);
ok("weeks outside W15-17 are never boosted",
   e.playoffBoosts(t0, "SF", e.PLAYOFFS.SF[0], -1).score === t0.score &&
   e.playoffBoosts(t0, "SF", e.PLAYOFFS.SF[0], 7).score === t0.score);

console.log(fail ? `\n${fail} failure(s)` : "\nall playoff-boost guards passed");
process.exit(fail ? 1 : 0);
