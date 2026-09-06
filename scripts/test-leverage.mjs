#!/usr/bin/env node
// test-leverage.mjs — guard 30, the stack-uniqueness (leverage) proxy.
//
// Reported by a user asking a question, not by a test: "how is leverage
// calibrated on my app... is it fully updated?" The answer was no, and worse
// than no. THREE defects, all in one small block:
//
//   1. THE UI CLAIMED A MEASUREMENT THAT DOES NOT EXIST. The cards printed
//      "sharp ownership" and "low ownership". There is no ownership data
//      anywhere in this app — no file, no field, no feed. TEAM_CHALK is a
//      hand-typed 32-team constant with no source and nothing refreshing it.
//      Same class as the tier labels that disagreed with their own scores and
//      the stale verdicts rendered as current: a label asserting more than the
//      data behind it carries.
//
//   2. THE BONUS WAS UNCAPPED. `score += leverageStacks.length * 0.4` with no
//      clamp gave a real five-stack roster +2.0 — a quarter of its grade — out
//      of that unsourced table. Every OTHER layer here is clamped (ceiling
//      ±0.5, floor ±0.5, advance ±1.25). The one input that is not measured
//      was the only one that could run away.
//
//   3. THE MEAN WAS THE WRONG STATISTIC. Averaging every piece let one very
//      late pick drag a stack past the gate. Worked example from the same
//      roster: CAR = Tetairoa McMillan 41.0 + Darren Waller 210.4, mean 125.7,
//      cleared the sharp gate of 80 and rendered HIGH LEVERAGE — while being
//      anchored by a round-four receiver. Averaging hid the expensive piece
//      behind the cheap one.
//
// The anchor (earliest pick) is the honest test: a stack is only something the
// field lacks if NO piece in it is expensive.
//
// ⚠️ ref1/ref2/ref3 PRODUCE ZERO LEVERAGE STACKS, under the old rule and the
// new one. They are early-anchored balanced builds, so this layer was invisible
// to every calibration ever recorded against them and none of them could have
// caught the uncapped bonus. ref4 exists for exactly this reason and the guard
// asserts it still exercises the layer.
//
// Run: node scripts/test-leverage.mjs   (exits non-zero on failure)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const repoRoot = process.cwd();
const tmp = path.join(os.tmpdir(), "rxr-lev"); mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const app = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");
const outfile = path.join(tmp, "l.mjs");
await build({ stdin: { contents: app + "\nexport { analyzeRoster, parseRoster, TEAM_CHALK, LEVERAGE_ANCHOR, LEVERAGE_BONUS_PER_STACK, LEVERAGE_BONUS_CAP };\n",
  loader: "jsx", resolveDir: repoRoot, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: { "@vercel/analytics/react": path.join(tmp, "stub.js"), "@vercel/analytics": path.join(tmp, "stub.js") } });
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

let fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  ok   " : "  FAIL ") + l + (c ? "" : `  <${x}>`)); if (!c) fail++; };
const grade = (f, t) => e.analyzeRoster(
  e.parseRoster(readFileSync(path.join(repoRoot, `scripts/fixtures/${f}.txt`), "utf8"), "standard", "bestball")
    .filter(p => !p.notFound), t, true, false, "standard");

// ------------------------------------------------------- 1. named constants
// A second hand-typed 80 or 0.4 is the duplicate-definition class this repo has
// hit seven times. The guard reads the constants, so a re-tune stays legal and
// a rival literal does not.
console.log("=== constants are named, declared once, and readable ===");
for (const k of ["LEVERAGE_ANCHOR", "LEVERAGE_BONUS_PER_STACK", "LEVERAGE_BONUS_CAP"])
  ok(`${k} declared exactly once`, (app.match(new RegExp(`const ${k}\\b`, "g")) || []).length === 1);
ok("LEVERAGE_ANCHOR carries a gate for each chalk tier it reads",
   ["sharp", "low", "chalk"].every(k => typeof e.LEVERAGE_ANCHOR[k] === "number"));
ok("the classifier reads the constants, never a literal gate",
   !/(?:avgADP|anchorAdp)\s*[<>]\s*\d/.test(app));

// --------------------------------------------------------------- 2. THE CAP
// Extracted and RUN, not string-matched. Guard 29 recorded the lesson: a
// sabotage that inserts an unconditional return above a matched line leaves the
// string intact and the guard green. So the expression is evaluated.
console.log("\n=== the bonus is capped (expression extracted and run) ===");
const bonusLine = (app.match(/score \+= Math\.min\(leverageStacks\.length \* [A-Z_]+, [A-Z_]+\);/) || [])[0];
ok("the bonus site applies Math.min against the cap", !!bonusLine, "no capped bonus expression found");
if (bonusLine) {
  const expr = bonusLine.replace(/^score \+= /, "").replace(/;$/, "");
  const f = new Function("leverageStacks", "LEVERAGE_BONUS_PER_STACK", "LEVERAGE_BONUS_CAP",
    `return ${expr};`);
  const at = n => f({ length: n }, e.LEVERAGE_BONUS_PER_STACK, e.LEVERAGE_BONUS_CAP);
  ok("1 leverage stack pays the per-stack rate", Math.abs(at(1) - e.LEVERAGE_BONUS_PER_STACK) < 1e-9, at(1));
  ok("2 pays double", Math.abs(at(2) - 2 * e.LEVERAGE_BONUS_PER_STACK) < 1e-9, at(2));
  ok("the cap BINDS at the count that used to run away (5)", Math.abs(at(5) - e.LEVERAGE_BONUS_CAP) < 1e-9, at(5));
  ok("and cannot be exceeded at any count", at(50) === e.LEVERAGE_BONUS_CAP, at(50));
  ok("the cap sits below the advance layer and above the ceiling layer",
     e.LEVERAGE_BONUS_CAP > 0.5 && e.LEVERAGE_BONUS_CAP <= 1.25, e.LEVERAGE_BONUS_CAP);
}

// ------------------------------------------------------------ 3. THE ANCHOR
console.log("\n=== the classifier tests the ANCHOR, not the mean ===");
ok("no mean over stack ADP survives in the classifier",
   !/players\.reduce\(\(sum, p\) => sum \+ p\.adp, 0\) \/ stack\.players\.length/.test(app));
ok("the anchor is the minimum ADP in the stack", /Math\.min\(\.\.\.adps\)/.test(app));

const r4 = grade("ref4", "bbm7");
const by = Object.fromEntries(r4.stackGrades.map(s => [s.team, s]));
ok("every stack carries its anchor", r4.stackGrades.every(s => "anchorAdp" in s));
ok("the anchor is the EARLIEST pick, not the average",
   r4.stackGrades.every(s => {
     const adps = s.players.map(p => p.adp).filter(a => a != null);
     return !adps.length || s.anchorAdp === Math.min(...adps);
   }));
// The reported case. CAR = a round-4 WR beside a round-18 TE.
ok("CAR is in ref4 and is anchored by an expensive piece", by.CAR && by.CAR.anchorAdp < e.LEVERAGE_ANCHOR.sharp,
   by.CAR && by.CAR.anchorAdp);
ok("...so a very late second piece can NOT rescue it into a scored tier",
   by.CAR && by.CAR.uniqueness !== "High Leverage" && by.CAR.uniqueness !== "Moderate Leverage",
   by.CAR && by.CAR.uniqueness);
ok("...while its mean WOULD have cleared the gate (the bug is reproduced)",
   by.CAR && (by.CAR.players.reduce((s, p) => s + p.adp, 0) / by.CAR.players.length) > e.LEVERAGE_ANCHOR.sharp);
// And the rule still lets a genuinely late stack through, or it is decorative.
const lev = r4.stackGrades.filter(s => s.uniqueness === "High Leverage" || s.uniqueness === "Moderate Leverage");
ok("a genuinely late-anchored stack still earns a leverage tier", lev.length >= 1,
   r4.stackGrades.map(s => `${s.team}:${s.uniqueness}`).join(" "));
ok("...and not every stack does", lev.length < r4.stackGrades.length, lev.length);

// -------------------------------------------------- 4. the massive-field gate
// Per the Field Size Overlay the uniqueness premium is for 100k+ fields only.
console.log("\n=== the bonus applies to massive fields only ===");
const strengthLine = /under-the-radar stack/;
ok("bbm7 (672k) awards it", r4.strengths.some(s => strengthLine.test(s)));
for (const t of ["puppy", "puppy4"]) ok(`${t} awards it`, grade("ref4", t).strengths.some(s => strengthLine.test(s)));
for (const t of ["main", "pitbull", "husky", "boxer", "rottweiler", "schnauzer", "fieldgeneral"])
  ok(`${t} does NOT`, !grade("ref4", t).strengths.some(s => strengthLine.test(s)));

// ------------------------------------------------------------ 5. UI HONESTY
// The defect that prompted the whole change. "ownership" must never be rendered
// as a claim, and the panel must say out loud that this is projected.
console.log("\n=== the UI does not claim ownership it cannot see ===");
ok("no rendered label pairs chalkLevel with the word ownership",
   !/\{stack\.chalkLevel\}[^\n]*ownership/.test(app));
ok("the panel discloses that this is a projection",
   /projection, not a measurement/.test(app) && /no ownership data exists here/.test(app));
ok("the card prints the anchor it actually used", /anchor ADP \$\{stack\.anchorAdp/.test(app));
ok("TEAM_CHALK carries the warning that it is unsourced and unrefreshed",
   /THIS IS A PROJECTION, NOT A MEASUREMENT/.test(app));
ok("nothing writes TEAM_CHALK — it is hand-typed, and the comment says so",
   (app.match(/TEAM_CHALK\s*=/g) || []).length === 1);

// ------------------------------------------- 6. the fixture that covers this
// ref1-3 are blind to this layer. If ref4 ever stops exercising it, this guard
// silently stops testing anything and nobody finds out.
console.log("\n=== ref4 is the fixture that exercises the layer ===");
for (const f of ["ref1", "ref2", "ref3"]) {
  const n = grade(f, "bbm7").stackGrades.filter(s => /Leverage$/.test(s.uniqueness) && s.uniqueness !== "Slight Leverage").length;
  ok(`${f} still produces zero scored leverage stacks (recorded, not desired)`, n === 0, n);
}
ok("ref4 produces at least one, so the branch is live in the suite", lev.length >= 1, lev.length);

console.log(fail ? `\nFAIL  ${fail} assertion(s)` : "\nPASS  leverage: capped, anchor-tested, massive-field only, and honest about having no ownership data");
process.exit(fail ? 1 : 0);
