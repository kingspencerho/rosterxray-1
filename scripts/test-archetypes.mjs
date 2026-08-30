#!/usr/bin/env node
// test-archetypes.mjs — guard 20, sanctioned positional archetypes.
//
// The generic construction bands measure DEVIATION FROM THE MEAN. That is the
// right default and the wrong answer for a build that deviates ON PURPOSE.
// Three of the five layouts the framework names as valid were being charged by
// them: 2-4-10-2 took a full -1.0 for the ten receivers the archetype REQUIRES,
// and 2-5-9-2 and 2-4-9-3 each took a silent -0.3 that never surfaced as a
// weakness. A roster cannot be both a recommended construction and a scored flaw.
//
// What this asserts, in descending order of what a regression would cost:
//
//   1. THE PRECONDITION GATE. This is the whole reason the waiver is not a free
//      pass. Matching 2-4-10-2 waives the WR flag only when the roster actually
//      bought an RB inside the first two rounds. Same shape without that anchor
//      is not Hyper-Fragile, it is thin at RB, and it KEEPS the deduction.
//   2. "UNDER" IS NEVER WAIVED. Being short at a position is a real hole
//      whatever shape the rest of the roster is in.
//   3. DISCLOSURE SURVIVES THE WAIVER. Removing the deduction must never remove
//      the label — "Hyper-Fragile" is called that for a reason.
//   4. CONTAINMENT. Superflex, 20-round and redraft are out of scope.
//
// Run: node scripts/test-archetypes.mjs   (exits non-zero on failure)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path"; import os from "os";

const repoRoot = process.cwd();
const tmpDir = path.join(os.tmpdir(), "rxr-arch"); mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const raw = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");
const outfile = path.join(tmpDir, "arch.mjs");
await build({ stdin:{contents: raw + "\nexport { analyzeRoster, parseRoster, ADP_DATA };\n",
  loader:"jsx", resolveDir:repoRoot, sourcefile:"App.jsx.jsx"},
  bundle:true, platform:"node", format:"esm", outfile, logLevel:"silent",
  alias:{"@vercel/analytics/react":path.join(tmpDir,"stub.js"),"@vercel/analytics":path.join(tmpDir,"stub.js")}});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

let fail = 0;
const ok = (l, c, x="") => { console.log((c?"  ok   ":"  FAIL ")+l+(c?"":`  <${x}>`)); if(!c) fail++; };

// Build a roster of exact positional shape from real ADP_DATA names, letting the
// caller pin the earliest RB so the precondition can be exercised both ways.
const pool = (pos, pred) => Object.entries(e.ADP_DATA)
  .filter(([, v]) => v.pos === pos && typeof v.adp === "number" && (!pred || pred(v)))
  .sort((a, b) => a[1].adp - b[1].adp).map(([n]) => n);

const make = ({ QB, RB, WR, TE }, { rbEarly }) => {
  const rbs = rbEarly
    ? [pool("RB", v => v.adp <= 20)[0], ...pool("RB", v => v.adp > 60).slice(0, RB - 1)]
    : pool("RB", v => v.adp > 60).slice(0, RB);
  const names = [
    ...pool("QB", v => v.adp > 40).slice(0, QB), ...rbs,
    ...pool("WR", v => v.adp > 40).slice(0, WR), ...pool("TE", v => v.adp > 80).slice(0, TE),
  ];
  return e.parseRoster(names.join("\n"), "standard");
};
const grade = (shape, opts) => e.analyzeRoster(make(shape, opts), "main", false, false);
const hasOver = (r) => r.weaknesses.some(w => /^Heavy at/.test(w));
const hasArchLine = (r) => r.strengths.some(s => /Deliberate .* construction/.test(s));
const HF = { QB: 2, RB: 4, WR: 10, TE: 2 };

// ------------------------------------------------------- 1. the precondition
console.log("=== the precondition gate is what makes this safe ===");
const paid = grade(HF, { rbEarly: true });
const unpaid = grade(HF, { rbEarly: false });

ok("both fixtures really are 2-4-10-2",
   JSON.stringify(paid.posCounts) === JSON.stringify(HF) && JSON.stringify(unpaid.posCounts) === JSON.stringify(HF),
   JSON.stringify(paid.posCounts));
ok("with an early RB the WR flag is waived", !hasOver(paid),
   paid.weaknesses.filter(w => /Heavy/.test(w)).join("; "));
ok("...and the archetype is named", hasArchLine(paid));
ok("WITHOUT an early RB the WR flag STANDS", hasOver(unpaid));
ok("...and it is not credited as an archetype", !hasArchLine(unpaid));
ok("...and the reader is told what is missing",
   unpaid.weaknesses.some(w => /shape without/.test(w)),
   unpaid.weaknesses.join("; ").slice(0, 120));
ok("the unpaid build scores BELOW the paid one", unpaid.score < paid.score,
   `${unpaid.score} vs ${paid.score}`);
ok("...by roughly the one waived major", Math.abs((paid.score - unpaid.score) - 1.0) < 0.35,
   `delta ${(paid.score - unpaid.score).toFixed(2)}`);

// --------------------------------------------------- 2. "under" is never waived
console.log("\n=== a hole is a hole, whatever the shape ===");
const src = raw;
const waiverBlock = src.slice(src.indexOf("const archetypeWaived"), src.indexOf("const archetypeWaived") + 700);
ok("the waiver filter is restricted to over-count flags",
   /i\.type === "over"/.test(waiverBlock),
   waiverBlock.slice(0, 90));
// A layout short at a position is not one of the five, so it cannot be waived.
const thin = grade({ QB: 2, RB: 3, WR: 11, TE: 2 }, { rbEarly: true });
ok("a 3-RB build is not a sanctioned layout", !hasArchLine(thin));
ok("...and keeps its Light-at flag", thin.weaknesses.some(w => /^Light at RB/.test(w)),
   thin.weaknesses.join("; ").slice(0, 120));

// ------------------------------------------------------------ 3. disclosure
console.log("\n=== the waiver removes the deduction, never the label ===");
ok("the archetype line names the layout", paid.strengths.some(s => /2-4-10-2/.test(s)));
ok("...names the archetype", paid.strengths.some(s => /Hyper-Fragile/.test(s)));
ok("...and says which count is the archetype rather than a flaw",
   paid.strengths.some(s => /is the archetype, not a flaw/.test(s)));

// Balanced 2-5-9-2 carries no precondition, so it waives on shape alone.
const bal = grade({ QB: 2, RB: 5, WR: 9, TE: 2 }, { rbEarly: false });
ok("2-5-9-2 is recognised without an RB gate", hasArchLine(bal) && !hasOver(bal),
   bal.strengths.filter(s => /Deliberate/.test(s)).join(""));

// ----------------------------------------------------------- 4. containment
console.log("\n=== containment ===");
const arch = src.slice(src.indexOf("const ARCHETYPES"), src.indexOf("const benchmarkIssues"));
ok("ARCHETYPES is declared once", (src.match(/const ARCHETYPES =/g) || []).length === 1);
ok("all five sanctioned layouts are present",
   ["2-4-10-2","2-5-9-2","2-6-8-2","3-5-8-2","2-4-9-3"].every(l => arch.includes(l)));
ok("superflex is excluded", /format === "superflex" \|\| is20Round\) \? null/.test(src));
ok("20-round rosters are excluded", /is20Round\) \? null/.test(src));
const redraft = src.slice(src.indexOf("const analyzeRedraft"));
ok("analyzeRedraft never reads the archetype",
   !redraft.includes("archetypeQualified") && !redraft.includes("ARCHETYPES"));

console.log(fail ? `\nFAIL  ${fail} assertion(s)` : "\nPASS  archetypes: precondition gate, no waived holes, disclosure kept, contained");
process.exit(fail ? 1 : 0);
