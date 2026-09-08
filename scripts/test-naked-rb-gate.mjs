#!/usr/bin/env node
// test-naked-rb-gate.mjs — guard 32, the Naked RB insulation threshold.
//
// WHY THIS EXISTS. A user asked me to re-assess Rico Dowdle. Explaining why the
// engine flagged him, I quoted CLAUDE.md: "Gate 1 — HVT: 4.5+ high-value touches
// per game" plus a "Gate 2 — Zone/PROE 0.65+". I then measured 4.5 against the
// data and reported to the user that the gate was UNREACHABLE and therefore
// meaningless: zero of the 50 qualified 2025 RBs clear it, McCaffrey leads at
// 3.65.
//
// The measurement was right. The premise was not. NEITHER NUMBER WAS EVER IN
// THIS CODE. The shipped threshold has always been 1.5 (23 of 50 clear it) and
// there is no second gate at all. The doc had described an engine that does not
// exist, for months, and the only reason it surfaced is that someone read the
// implementation after quoting the doc out loud.
//
// That is the duplicate-definition class this repo has now hit eight times, with
// a new twist: the second definition was in PROSE, where no build warning and no
// test could see it. A number a human reads and acts on is a definition whether
// or not a machine parses it.
//
// So this guard pins the two together. The threshold lives in exactly one place
// in code, and CLAUDE.md must still print that same number.
//
// ⚠️ IT DOES NOT ASSERT THE VALUE IS 1.5. Re-tuning the gate is a legitimate data
// decision that would move grades and need its own calibration run. What must
// never happen again is the doc and the code disagreeing about it. So the guard
// reads the constant and requires the doc to agree, whatever the value becomes.
//
// Run: node scripts/test-naked-rb-gate.mjs   (exits non-zero on failure)
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(root, "App.jsx.jsx"), "utf8");
const doc = readFileSync(path.join(root, "CLAUDE.md"), "utf8");

let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) console.log("  ok   " + label);
  else { fail++; console.log("  FAIL " + label + (detail ? "  (" + detail + ")" : "")); }
};

console.log("\n=== the threshold has exactly one definition in code ===");

const decls = [...app.matchAll(/^const NAKED_RB_HVT_GATE\s*=\s*([\d.]+)\s*;/gm)];
ok("NAKED_RB_HVT_GATE is declared exactly once", decls.length === 1, `${decls.length} declaration(s)`);
const gate = decls.length === 1 ? Number(decls[0][1]) : null;
ok("...and it parses to a number", gate !== null && Number.isFinite(gate), String(gate));

// The check must USE the constant. A bare literal beside hvt_pg is the exact
// shape that let the doc drift, so it fails here rather than later.
ok("the insulation check reads the constant",
  /hvt_pg\s*>=\s*NAKED_RB_HVT_GATE/.test(app));

// ⚠️ SCOPED TO THE NAKED-RB BLOCK ON PURPOSE. `scoreFreeAgent` also tests
// `hvt_pg >= 3`, and that is a DIFFERENT gate answering a different question
// (is there evidence of volume for a waiver add). The first version of this
// assertion swept the whole file and failed on it, which would have pushed a
// future reader toward "unifying" two unrelated thresholds.
const blockStart = app.indexOf("=== NAKED RB INSULATION CHECK ===");
ok("the naked-RB block is findable", blockStart !== -1);
const block = blockStart === -1 ? "" : app.slice(blockStart, blockStart + 2400);
const bareLiteral = block.match(/hvt_pg\s*>=\s*[\d.]+/);
ok("no bare numeric literal is compared against hvt_pg inside that block",
  bareLiteral === null, bareLiteral ? bareLiteral[0] : "");

console.log("\n=== CLAUDE.md prints the same number ===");

// The naked-RB section of the doc, bounded so a stray number elsewhere in a
// 6,000-line file cannot pass or fail this by accident.
const secStart = doc.indexOf("### Naked RB Insulation Protocol");
ok("the Naked RB section still exists in CLAUDE.md", secStart !== -1);
const section = secStart === -1 ? "" : doc.slice(secStart, secStart + 2600);

ok("the doc names the constant by its code identifier",
  /NAKED_RB_HVT_GATE/.test(section));
ok("the doc prints the threshold the code actually uses",
  gate !== null && new RegExp(`\\*\\*${String(gate).replace(".", "\\.")}\\*\\*`).test(section),
  `looking for **${gate}**`);

// The specific dead claims. These are what a reader acted on.
//
// ⚠️ 4.5 MAY STILL APPEAR, BUT ONLY BEHIND THE CORRECTION MARKER. Deleting it
// outright would make the correction unreadable — this file is where correction
// history is supposed to live. What must never come back is 4.5 stated as a
// LIVE RULE, so the assertion is positional: every occurrence has to sit after
// the ⚠️ CORRECTED paragraph, never before it.
ok("the old live form of the claim is gone",
  !/\*\*Gate 1 — HVT:\*\* 4\.5/.test(section) && !/State Gate 1 \(HVT 4\.5/.test(doc));
const marker = section.indexOf("CORRECTED Sep 8 2026");
ok("the correction marker is present", marker !== -1);
const stray = [...section.matchAll(/4\.5/g)].filter(m => m.index < marker);
ok("no 4.5 appears ahead of the correction marker",
  stray.length === 0, `${stray.length} stray mention(s)`);
ok("the phantom Gate 2 is not presented as live",
  !/^- \*\*Gate 2 — Zone\/PROE/m.test(section));

console.log("\n=== the doc describes the branches the engine really has ===");

// Three independent ways to be insulated. If a future edit adds or removes one,
// the doc has to move with it.
for (const [label, codeRe, docRe] of [
  ["curated situationFlags branch",
   /flags\.includes\("scheme_fit"\)/, /situationFlags/],
  ["starter-capital branch (adp <= 36)",
   /rb\.adp <= 36 && !hasCommitteeRisk/, /adp <= 36/],
  ["measured HVT branch",
   /hvt_pg\s*>=\s*NAKED_RB_HVT_GATE\s*&&\s*!hasCommitteeRisk/, /hvt_pg\s*>=/],
]) {
  ok(`code has the ${label}`, codeRe.test(app));
  ok(`...and the doc names it`, docRe.test(section));
}

ok("code cancels branches 2 and 3 on a committee risk flag",
  /const hasCommitteeRisk = riskFlags\.includes\("creeping_committee"\) \|\| riskFlags\.includes\("confirmed_committee"\)/.test(app));
ok("...and the doc says so",
  /confirmed_committee/.test(section) && /creeping_committee/.test(section));

console.log(fail ? `\n${fail} failure(s)` : "\nall naked-RB gate guards passed");
process.exit(fail ? 1 : 0);
