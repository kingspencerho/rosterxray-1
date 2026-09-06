#!/usr/bin/env node
// test-discipline.mjs — guard 31, the ADP discipline component of the
// Advance Rate Layer.
//
// Asked for by a user who had just drafted the most disciplined board this
// project has seen — three ADP flags on eighteen picks, none past 15 — and
// scored ZERO on ADP for it. The discrete value/reach block counts EVENTS at a
// 15-pick threshold, so it rewards variance, not discipline: eighteen picks at
// +8 earn nothing while sixteen at -5 and two at +16 earn +1.0.
//
// THE DERIVATION DECIDED THE DESIGN, AND THE GUARD PINS WHAT IT FOUND:
//
//   1. THE TABLE HAS A +7 OFFSET BAKED IN. mean(rank - adp) over ADP_DATA's
//      top 216 is +7.16 and grows with rank (2.7 / 7.0 / 9.6 / 10.4 by band),
//      because a late player's ADP is a mean over only the drafts he was taken
//      in. Simulated snakes at the measured drift land at +5.7 for picks <= 156.
//      Against a real board the same roster measures +1.9. Centering on 0 with
//      table ADP is a free +7 for everyone; centering on +7 with board ADP
//      punishes perfect discipline. So THE TABLE PATH DOES NOT SCORE. This is
//      the biased-baseline bug the Ceiling Shape Layer already hit, in a new
//      costume, and it is why ref1-4 are all silent here.
//
//   2. CENTRE 0 IS DEFINITIONAL — ADP is the market's expectation, and a pick
//      taken exactly there extracted nothing. Scale is the simulated roster
//      SD (2.3); saturation at 2 SD; per-pick clip at ~p90 of |delta|; cutoff
//      at round 13 per the Late-Round Flattening Protocol; turn-cleared
//      reaches floor at 0, consistent with isScoredReach.
//
//   3. ref5 EXISTS BECAUSE NOTHING ELSE EXERCISES THIS. It is the only fixture
//      in block format carrying board ADP. If it ever stops firing, this guard
//      silently stops testing anything — so it asserts that it fires.
//
// Behavioural where it can be: the formula is RECOMPUTED from the engine's own
// output and compared, and the clip / floor / saturation / centre are each
// exercised by mutating real picks. String-matching a source file asserts
// that text exists, never that code behaves — recorded five times here.
//
// Run: node scripts/test-discipline.mjs   (exits non-zero on failure)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const repoRoot = process.cwd();
const tmp = path.join(os.tmpdir(), "rxr-disc"); mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const app = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");
const outfile = path.join(tmp, "d.mjs");
await build({ stdin: { contents: app + "\nexport { analyzeRoster, parseRoster, analyzeRedraft, parseRosterRedraft, DISCIPLINE_PICK_CUTOFF, DISCIPLINE_PICK_CLIP, DISCIPLINE_SATURATE, DISCIPLINE_MIN_PICKS, DISCIPLINE_CAP, TOURNAMENTS };\n",
  loader: "jsx", resolveDir: repoRoot, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: { "@vercel/analytics/react": path.join(tmp, "stub.js"), "@vercel/analytics": path.join(tmp, "stub.js") } });
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

let fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  ok   " : "  FAIL ") + l + (c ? "" : `  <${x}>`)); if (!c) fail++; };
const fx = f => readFileSync(path.join(repoRoot, `scripts/fixtures/${f}.txt`), "utf8");
const parse = (f, fmt = "standard") => e.parseRoster(fx(f), fmt, "bestball").filter(p => !p.notFound);
const run = (picks, t = "bbm7", fmt = "standard") => e.analyzeRoster(picks, t, true, false, fmt);
const near = (a, b, eps = 0.011) => Math.abs(a - b) <= eps;

// ------------------------------------------------------- 1. constants
console.log("=== every threshold is a named, derived constant ===");
for (const k of ["DISCIPLINE_PICK_CUTOFF", "DISCIPLINE_PICK_CLIP", "DISCIPLINE_SATURATE", "DISCIPLINE_MIN_PICKS", "DISCIPLINE_CAP"])
  ok(`${k} declared exactly once`, (app.match(new RegExp(`const ${k}\\b`, "g")) || []).length === 1);
ok("the cutoff is the last pick of round 13 in a 12-man draft", e.DISCIPLINE_PICK_CUTOFF === 13 * 12);
ok("the cap matches the other advance components (0.5)", e.DISCIPLINE_CAP === 0.5);
ok("saturation is 2 x the simulated roster SD (2.3)", near(e.DISCIPLINE_SATURATE, 4.6, 1e-9));
const block = app.slice(app.indexOf("// 4. ADP discipline"), app.indexOf("const advScore ="));
ok("the component block exists and precedes the clamp", block.length > 500 && block.length < 8000, block.length);
ok("the block reads the constants rather than literals",
   !/actualPick <= \d/.test(block) && !/Math\.min\(\d+, d\)/.test(block) && !/\/ 4\.6/.test(block));
ok("disciplinePts is INSIDE the advance layer clamp",
   /Math\.min\(1\.25, \(schedPts \+ usablePts \+ byePts \+ disciplinePts\)\)/.test(app));
ok("the clamp itself is unchanged at ±1.25", /Math\.max\(-1\.25, Math\.min\(1\.25, \(schedPts/.test(app));

// ------------------------------------------------ 2. the fixture that fires
console.log("\n=== ref5 fires; ref1-4 are silent and say why ===");
const p5 = parse("ref5");
ok("ref5 resolves all 18", p5.length === 18, p5.length);
ok("ref5 carries BOARD ADP (adpSource roster) on every pick", p5.every(p => p.adpSource === "roster"));
const r5 = run(p5);
const a5 = r5.advanceLayer;
ok("ref5 scores the component", a5.disciplinePts > 0 && a5.disciplineWhy == null, JSON.stringify(a5));
ok("...on at least the minimum pick count", a5.disciplineN >= e.DISCIPLINE_MIN_PICKS, a5.disciplineN);
ok("...and does NOT saturate (sits still on a real roster)", a5.disciplinePts < e.DISCIPLINE_CAP, a5.disciplinePts);
ok("...and the strength line names the mean and the count",
   r5.strengths.some(s => /ADP discipline/.test(s) && s.includes(`${a5.disciplineMean.toFixed(1)}`) && s.includes(`${a5.disciplineN} picks`)));
for (const f of ["ref1", "ref2", "ref3", "ref4"]) {
  const a = run(parse(f)).advanceLayer;
  ok(`${f} (table ADP) scores 0 and names the snapshot`, a.disciplinePts === 0 && /snapshot/.test(a.disciplineWhy || ""), a.disciplineWhy);
}

// ------------------------------------------ 3. the formula, recomputed
// Clip, floor and cutoff applied by hand to the engine's OWN picks and flags,
// and compared to what it reported. If any of the three is dropped, this fails.
console.log("\n=== the reported mean equals the formula recomputed from the engine's picks ===");
const cleared = new Set(r5.adpFlags.filter(f => f.survivesTurn === false).map(f => f.name));
ok("at least one ref5 pick is turn-cleared, so the floor is exercised", cleared.size >= 1, [...cleared].join(","));
const q5 = r5.valid.filter(p => p.actualPick != null && p.adp != null && p.adp < 200 && p.actualPick <= e.DISCIPLINE_PICK_CUTOFF && p.adpSource === "roster");
const ds = q5.map(p => { let d = p.actualPick - p.adp; if (d < 0 && cleared.has(p.name)) d = 0; return Math.max(-e.DISCIPLINE_PICK_CLIP, Math.min(e.DISCIPLINE_PICK_CLIP, d)); });
const meanHand = ds.reduce((s, v) => s + v, 0) / ds.length;
ok("n matches", a5.disciplineN === ds.length, `${a5.disciplineN} vs ${ds.length}`);
ok("mean matches to 0.1", near(a5.disciplineMean, meanHand, 0.051), `${a5.disciplineMean} vs ${meanHand.toFixed(3)}`);
ok("pts = clamp(mean / saturate) x cap", near(a5.disciplinePts, Math.max(-0.5, Math.min(0.5, meanHand / e.DISCIPLINE_SATURATE * 0.5))), a5.disciplinePts);
const rawNoFloor = q5.map(p => p.actualPick - p.adp).reduce((s, v) => s + v, 0) / q5.length;
ok("the turn floor MOVED the mean (a cleared reach did not count against it)", meanHand > rawNoFloor + 0.3, `${meanHand.toFixed(2)} vs raw ${rawNoFloor.toFixed(2)}`);

// ------------------------------------------------ 4. clip, saturate, centre
console.log("\n=== clip, saturation, centre — by mutating real picks ===");
const mut = (fn) => p5.map(p => ({ ...p, ...fn(p) }));
// One long fall: push a single in-window pick 60 past its ADP. The mean may
// move by at most clip/n, never 60/n.
const base = a5.disciplineMean;
const victim = q5.find(p => p.actualPick > 20 && !cleared.has(p.name));
const oneFall = run(mut(p => p.name === victim.name ? { adp: p.actualPick - 60 } : {})).advanceLayer;
ok("a +60 fall is clipped to the per-pick clip", near(oneFall.disciplineMean - base, (e.DISCIPLINE_PICK_CLIP - (victim.actualPick - victim.adp)) / q5.length, 0.06),
   `moved ${(oneFall.disciplineMean - base).toFixed(2)}, victim raw delta ${(victim.actualPick - victim.adp).toFixed(1)}`);
// Saturate both ways.
const allValue = run(mut(p => ({ adp: p.actualPick - 40 }))).advanceLayer;
const allReach = run(mut(p => ({ adp: p.actualPick + 40 }))).advanceLayer;
ok("every pick +40 saturates at +cap", allValue.disciplinePts === e.DISCIPLINE_CAP, allValue.disciplinePts);
ok("every pick -40 saturates at -cap", allReach.disciplinePts === -e.DISCIPLINE_CAP, allReach.disciplinePts);
ok("saturated means are the clip, not 40 (clip applied before the mean)",
   near(allValue.disciplineMean, e.DISCIPLINE_PICK_CLIP, 0.06) && near(allReach.disciplineMean, -e.DISCIPLINE_PICK_CLIP, 0.06),
   `${allValue.disciplineMean} / ${allReach.disciplineMean}`);
// Centre: every pick exactly at ADP earns exactly nothing.
const atAdp = run(mut(p => ({ adp: p.actualPick }))).advanceLayer;
ok("a roster drafted exactly at its board's ADP scores 0.00 (centre is 0)", atAdp.disciplinePts === 0 && atAdp.disciplineMean === 0, JSON.stringify(atAdp));
// The advance clamp still binds with four components.
ok("the advance layer never exceeds ±1.25 x advanceWeight on a saturated roster",
   Math.abs(allValue.score) <= 1.25 * e.TOURNAMENTS.bbm7.advanceWeight + 1e-9, allValue.score);

// ----------------------------------------------------------- 5. the gates
console.log("\n=== the gates ===");
const nine = run(mut(p => (q5.slice(0, 4).some(x => x.name === p.name) ? { adpSource: "table" } : {}))).advanceLayer;
ok("under the minimum pick count it scores 0 and names the count", nine.disciplinePts === 0 && /only 9 board-priced/.test(nine.disciplineWhy || ""), nine.disciplineWhy);
const sfx = e.analyzeRoster(p5, "fieldgeneral", true, false, "superflex").advanceLayer;
ok("superflex scores 0 and names the seeded-ordering reason", sfx.disciplinePts === 0 && /superflex/.test(sfx.disciplineWhy || ""), sfx.disciplineWhy);
const noPicks = e.analyzeRoster(p5, "bbm7", false, false, "standard").advanceLayer;
ok("no pick numbers scores 0 and says so", noPicks.disciplinePts === 0 && /no pick numbers/.test(noPicks.disciplineWhy || ""), noPicks.disciplineWhy);
// ⚠️ The button path passes `showPickAnalysis && picks.hasPickNumbers`, so a
// roster that CARRIES numbers with the checkbox off arrives as false. Found by
// rendering: the line read "no pick numbers on the roster" for a roster with
// eighteen of them. The UNFILTERED parseRoster array keeps its own flag, and
// the engine must branch on it. (p5 above is filtered, which drops the flag —
// that is why the previous case reads as genuinely-no-numbers.)
const p5raw = e.parseRoster(fx("ref5"), "standard", "bestball");
ok("parseRoster stamps hasPickNumbers on the array it returns", p5raw.hasPickNumbers === true, p5raw.hasPickNumbers);
const toggledOff = e.analyzeRoster(p5raw, "bbm7", false, false).advanceLayer;
ok("checkbox off + numbers present names the SWITCH, never the roster",
   toggledOff.disciplinePts === 0 && /switched off/.test(toggledOff.disciplineWhy || "") && !/no pick numbers/.test(toggledOff.disciplineWhy || ""),
   toggledOff.disciplineWhy);
ok("...and the switch reason tells the reader where the box is", /tick the pick-numbers box/.test(toggledOff.disciplineWhy || ""));
ok("out-of-window picks are excluded (a pick past the cutoff never counts)",
   p5.filter(p => p.actualPick > e.DISCIPLINE_PICK_CUTOFF).length >= 1 && a5.disciplineN === q5.length);

// ---------------------------------------------- 6. the absence is visible
// When the component declines to score, the reason must reach the reader on
// the results page — not only the CLI JSON. A drafter who pastes a plain list
// would otherwise never learn that a board carrying ADP would have scored their
// discipline. That is a silent absence by the Jul 27 rule.
console.log("\n=== the declined-to-score reason renders under the grade header ===");
const whyRef = "analyzed.advanceLayer?.disciplineWhy";
const whyIdx = app.indexOf(whyRef);
ok("the results view reads disciplineWhy exactly once", (app.split(whyRef).length - 1) === 1, app.split(whyRef).length - 1);
const bbOpen = app.indexOf('analyzed.mode !== "redraft" && (');
const rdOpen = app.indexOf('analyzed.mode === "redraft" && (');
ok("it renders inside the BEST BALL branch, before the redraft branch opens", whyIdx > bbOpen && whyIdx < rdOpen, `${bbOpen} < ${whyIdx} < ${rdOpen}`);
// WARNING: THE WINDOW USED TO BE A MAGIC 700 CHARACTERS AND THAT WAS THE BUG,
// NOT THE FEATURE. When the three header qualifiers were compressed into one
// <details> on Sep 6 2026, the reason moved further from its own guard clause and
// all four assertions below failed on code that was correct. A fixed byte window
// asserts "these strings are near each other", which is not a property anyone
// wants. Bound it to the ENCLOSING RENDER BLOCK instead: same intent, no magic
// number, and it survives any future reshuffle inside that block.
const whyStart = app.lastIndexOf("{(() => {", whyIdx);
const whyEnd = app.indexOf("})()}", whyIdx);
ok("the reason lives inside one render block", whyStart !== -1 && whyEnd > whyIdx);
const whyBlock = app.slice(whyStart, whyEnd + 5);
const whyBefore = app.slice(Math.max(0, whyStart - 3000), whyStart);
ok("it sits after the counts-row button, as a sibling, not inside it",
  whyBefore.includes("</button>") && !whyBlock.includes("<button"));
ok("it is muted chrome (--text-muted), not a warning (--caution)",
  whyBlock.includes("var(--text-muted)") && !whyBlock.includes("var(--caution)"));
ok("it names itself so the reader knows which layer declined", whyBlock.includes("ADP discipline not scored"));
ok("it renders the engine's own reason string, not a hand-typed copy", /\{analyzed\.advanceLayer\.disciplineWhy\}/.test(whyBlock));
// Compressing the header may not bury the reason with no way back to it.
ok("the block is a disclosure the reader can open", /<details/.test(whyBlock) && /<summary/.test(whyBlock));

// ------------------------------------------------------- 6. containment
console.log("\n=== best ball only ===");
const rdStart = app.indexOf("const analyzeRedraft = ");
const rdBody = app.slice(rdStart, app.indexOf("\n};\n", rdStart));
ok("analyzeRedraft is found", rdStart > 0);
ok("analyzeRedraft never references disciplinePts", !rdBody.includes("disciplinePts"));
ok("analyzeRedraft never references a DISCIPLINE_ constant", !/DISCIPLINE_/.test(rdBody));
const rd = e.analyzeRedraft(e.parseRosterRedraft(fx("ref1"), "yahoo_std"), "yahoo_std", true, false);
ok("a redraft result carries no discipline key anywhere", !JSON.stringify(rd).includes("discipline"));

console.log(fail ? `\nFAIL  ${fail} assertion(s)` : "\nPASS  discipline: board-ADP only, centred at 0, clipped, saturates and sits still, best-ball only");
process.exit(fail ? 1 : 0);
