#!/usr/bin/env node
// test-explainers.mjs — guard 34. The first-run default on section explainers.
//
// WHAT THIS PROTECTS, AND WHY IT NEEDS A GUARD AT ALL.
//
// MEASURED Sep 6 2026 at 430px on a real roster: the results page carried 398
// words of prose at rest, 223 of them fixed teaching copy identical on every
// grade, against 105 words about the roster. Redraft was worse than four to one.
// The section explainers now default open for a first-time reader and closed for
// a returning one, reusing the flag the paste help already used.
//
// THREE WAYS THIS SILENTLY BREAKS, ALL OF THEM INVISIBLE IN THE SOURCE:
//
//   1. ⚠️⚠️ THE TIMING. `handleAnalyze` WRITES rxr_has_analyzed, and the results
//      tree mounts AFTER it does. A component reading the flag in its own
//      useState initialiser therefore sees "1" on a first-time reader's very
//      first grade and closes every explainer — the teaching copy effectively
//      deleted for everybody, first-timers included. THIS SHIPPED AND WAS
//      MEASURED: 0 of 5 open on a cleared localStorage. The source read fine.
//      FIRST_VISIT is captured at MODULE LOAD, before any grade can run.
//
//   2. THE HONESTY HALF OF THE LEVERAGE PANEL MUST NOT GO BEHIND THE TAP. The
//      Sep 6 leverage fix exists because that panel claimed a measurement it does
//      not have. Guard 30 pins the phrases; this pins that they stay AT REST.
//
//   3. HIDING IS NOT DELETING. Every explainer keeps a labelled way back.
//
// Run: node scripts/test-explainers.mjs   (exits non-zero on failure)

import { readFileSync } from "fs";
import path from "path";

const root = process.cwd();
const app = readFileSync(path.join(root, "App.jsx.jsx"), "utf8");
const mirror = readFileSync(path.join(root, "App.jsx"), "utf8");
let fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  ok   " : "  FAIL ") + l + (c ? "" : `  <${x}>`)); if (!c) fail++; };

console.log("the flag is read once, at module load");
ok("App.jsx and App.jsx.jsx are identical", app === mirror);
ok("FIRST_VISIT is declared exactly once",
  (app.match(/const FIRST_VISIT = /g) || []).length === 1);
ok("it is declared at MODULE level, not inside a component",
  /\nconst FIRST_VISIT = /.test(app),
  "an indented declaration is inside a component and would read the flag after handleAnalyze wrote it");
ok("the localStorage key is read exactly once in the whole file",
  (app.match(/localStorage\.getItem\("rxr_has_analyzed"\)/g) || []).length === 1,
  "a second inline read is the duplicate-definition class");
ok("the write still happens on analyze",
  app.includes('localStorage.setItem("rxr_has_analyzed", "1")'));
// The ordering that caused the bug, asserted directly: the READ must appear
// before the WRITE in the file, because the read is module-level and the write
// lives inside a handler. If the read ever moves into a component below it, the
// first-visit case silently inverts.
ok("the read is module-level and precedes the handler that writes it",
  app.indexOf('localStorage.getItem("rxr_has_analyzed")') < app.indexOf('localStorage.setItem("rxr_has_analyzed"'));

console.log("\nthe Explainer itself");
ok("Explainer is defined exactly once", (app.match(/const Explainer = /g) || []).length === 1);
ok("it seeds its open state from FIRST_VISIT, not from a fresh read",
  /useState\(FIRST_VISIT\)/.test(app));
ok("it is a real disclosure with a labelled way back",
  /<summary/.test(app) && /what this means/.test(app),
  "hiding is not deleting - the way back is where the text used to be");
// ⚠️ SCOPED TO THE COMPONENT BODY, NOT THE FILE. The first version matched the
// string anywhere in App.jsx and passed while the Explainer's own floor was
// deleted, because two header summaries carry the same declaration. A guard that
// can be satisfied by an unrelated line is not guarding this line.
const NL = String.fromCharCode(10);
const expBody = (() => {
  const at = app.indexOf("const Explainer = ");
  if (at === -1) return "";
  const end = app.indexOf(NL + "};", at);
  return end === -1 ? "" : app.slice(at, end);
})();
ok("the Explainer body was found", expBody.length > 200);
ok("the summary states its own 32px floor",
  /minHeight: "32px"/.test(expBody),
  "a <summary> is not a <button> and inherits no global tap-target floor");

const uses = (app.match(/<Explainer>/g) || []).length;
ok("it is used across the page, not on one section", uses >= 10, `${uses} call sites`);
ok("every opened Explainer is closed", uses === (app.match(/<\/Explainer>/g) || []).length);

console.log("\n⛔ the leverage honesty note stays AT REST");
// Pull every <Explainer>...</Explainer> body and assert the correction is in none
// of them. Guard 30 asserts the phrases exist; this asserts they are not hidden.
const bodies = [...app.matchAll(/<Explainer[^>]*>([\s\S]*?)<\/Explainer>/g)].map(m => m[1]);
ok("the Explainer bodies were found", bodies.length === uses, `${bodies.length} of ${uses}`);
for (const phrase of ["no ownership data exists here", "projection, not a measurement"]) {
  ok(`"${phrase}" is never inside an Explainer`,
    !bodies.some(b => b.includes(phrase)),
    "a returning reader who never opens the tap must still not read a team tier as ownership");
  ok(`"${phrase}" is still present in the file`, app.includes(phrase));
}

console.log("\ncontainment — presentation only");
for (const engine of ["const analyzeRoster = ", "const analyzeRedraft = "]) {
  const at = app.indexOf(engine);
  const open = app.indexOf("{", at);
  let d = 0, end = open;
  for (let i = open; i < app.length; i++) {
    if (app[i] === "{") d++;
    else if (app[i] === "}") { d--; if (!d) { end = i; break; } }
  }
  const body = app.slice(open, end + 1);
  const name = engine.match(/analyze\w+/)[0];
  ok(`${name} never references FIRST_VISIT`, !body.includes("FIRST_VISIT"));
  ok(`${name} never references Explainer`, !body.includes("Explainer"));
}

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
