#!/usr/bin/env node
// grade-cli.mjs — run the REAL app grading engine from the command line.
//
// Bundles App.jsx.jsx with esbuild and calls the actual analyzeRoster /
// analyzeRedraft functions — zero reimplementation, zero logic drift. Output
// is compact JSON: grade, score, stacks, bring-backs, strengths, weaknesses.
// The AI layer (nutshell prose, gradeModifier) is NOT run — that requires an
// Anthropic API call; use the app when you want it.
//
// Usage:
//   node scripts/grade-cli.mjs roster.txt                      # best ball, "main"
//   node scripts/grade-cli.mjs roster.txt --tournament puppy
//   node scripts/grade-cli.mjs roster.txt --redraft [--league yahoo_std]
//   node scripts/grade-cli.mjs roster.txt --projected          # 2026-est data mode
//   cat roster.txt | node scripts/grade-cli.mjs -
// Roster file: one player per line, optional pick number ("James Cook 12").
// Pick analysis auto-enables when any line has a pick number.

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import os from "os";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (!args.length) {
  console.error("usage: node scripts/grade-cli.mjs <roster.txt|-> [--redraft] [--tournament key] [--league key] [--projected]");
  process.exit(1);
}
// ⚠ UNKNOWN FLAGS ARE A HARD ERROR, and this is the reason.
//
// `--mode redraft` reads like a flag and is not one. It was silently ignored,
// so a redraft roster was graded through the BEST BALL engine and a plausible
// answer was printed with no indication anything was wrong. That is the
// silent-drop failure class this repo has fixed five times in the app itself:
// a wrong answer nobody can tell is wrong costs more than a crash.
//
// So every argument is validated. A typo exits non-zero and names the flag.
const KNOWN_FLAGS = new Set(["--redraft", "--projected", "--tournament", "--league", "--json"]);
const TAKES_VALUE = new Set(["--tournament", "--league"]);
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith("--")) {
    // A bare token is legal only as the value of the flag before it.
    if (i > 0 && TAKES_VALUE.has(args[i - 1])) continue;
    console.error(`grade-cli: unexpected argument "${a}"`);
    process.exit(2);
  }
  if (!KNOWN_FLAGS.has(a)) {
    const hint = a === "--mode"
      ? `  did you mean --redraft?  ("--mode redraft" is not a flag and was silently ignored before Sep 1 2026)`
      : `  known flags: ${[...KNOWN_FLAGS].join(" ")}`;
    console.error(`grade-cli: unknown flag "${a}"\n${hint}`);
    process.exit(2);
  }
  if (TAKES_VALUE.has(a) && (i + 1 >= args.length || args[i + 1].startsWith("--"))) {
    console.error(`grade-cli: ${a} needs a value`);
    process.exit(2);
  }
}

const rosterText = args[0] === "-" ? readFileSync(0, "utf8") : readFileSync(args[0], "utf8");
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i === -1 ? dflt : (args[i + 1] || true); };
const isRedraft = args.includes("--redraft");
const useProjected = args.includes("--projected");
const tournamentKey = flag("tournament", "main");
const leagueKey = flag("league", "yahoo_std");


// Bundle the real app module with exports appended. Stub the analytics
// package (browser-only side effects); React bundles fine unused.
const tmpDir = path.join(os.tmpdir(), "rosterxray-cli");
mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "analytics-stub.js"),
  "export const Analytics = () => null; export const track = () => {};\n");
const src = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { analyzeRoster, parseRoster, analyzeRedraft, parseRosterRedraft, TOURNAMENTS };\n";
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

let result;
if (isRedraft) {
  const picks = eng.parseRosterRedraft(rosterText);
  result = eng.analyzeRedraft(picks, leagueKey, picks.hasPickNumbers, useProjected);
} else {
  // Same reason as the flag check above: an unknown key would fall through to
  // `undefined` and the engine would return a plausible number for a tournament
  // that does not exist.
  if (!eng.TOURNAMENTS[tournamentKey]) {
    console.error(`grade-cli: unknown tournament "${tournamentKey}"\n  known: ${Object.keys(eng.TOURNAMENTS).join(" ")}`);
    process.exit(2);
  }
  const fmt = eng.TOURNAMENTS[tournamentKey]?.format || "standard";
  const picks = eng.parseRoster(rosterText, fmt);
  result = eng.analyzeRoster(picks, tournamentKey, picks.hasPickNumbers, useProjected);
}

// Compact, chat-friendly summary — full result object is huge.
const tierStr = (details) => (details || []).map(d => `${d.name}:${d.tier}`).join(" ");
const out = {
  grade: result.grade,
  score: Number(result.score?.toFixed(2)),
  mode: isRedraft ? `redraft:${leagueKey}` : `bestball:${tournamentKey}`,
  dataMode: useProjected ? "2026-projected" : "2025-actual",
  matched: `${result.valid?.length}/${(result.valid?.length || 0) + (result.picks?.unmatched?.length || 0)}`,
  unmatched: result.picks?.unmatched || undefined,
  posCounts: result.posCounts,
  strengths: result.strengths,
  weaknesses: result.weaknesses,
  stacks: (result.stackGrades || []).map(s => ({
    team: s.team, type: s.type, hasQB: s.hasQB,
    players: s.players.map(p => `${p.name} ${p.pos}`),
    normalizedScore: Number(s.normalizedScore?.toFixed(1)),
    weeks: (s.weekDetails || []).map((wk, i) => `W${15 + i} ` + tierStr(wk)),
    qualityDiscount: s.qualityDiscount || undefined, discountReason: s.discountReason || undefined,
  })),
  bringBacks: (result.bringBacks || []).map(bb => ({
    week: bb.week, game: `${bb.teamA?.team || bb.stackTeam} vs ${bb.teamB?.team || bb.opponent}`,
    pieces: (bb.allPieces || []).map(p => `${p.name} ${p.pos}·${p.team}`),
    ceilingGame: bb.isCeilingGame || undefined,
  })),
  advanceLayer: result.advanceLayer || undefined,
  orphans: (result.orphans || []).map(o => `${o.name} (${o.team}) ${o.tier}`),
  adpFlags: (result.adpFlags || []).map(p => `${p.name} ${p.delta > 0 ? "+" : ""}${Math.round(p.delta)}`),
};
console.log(JSON.stringify(out, null, 1));
