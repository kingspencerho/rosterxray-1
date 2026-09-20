// Guard 49 - the coverage table scout PRINTS must equal the table 11m BANKED.
//
// WHY. The numbers in scout.mjs are hardcoded, because they are a constant of
// the 2025 season rather than something to recompute per run. Hardcoding buys
// speed and costs a drift risk: re-measure the season, update ANALYST-REFERENCE
// and forget scout, and the tool keeps advising off a table nobody believes any
// more. That failure is SILENT - the output looks exactly as authoritative.
//
// So this asserts the two copies agree, digit for digit, and that the reading
// aid actually fires on a defence that is heavy in one of the shapes.
import { readFileSync } from "fs";
import { execFileSync } from "child_process";

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}${detail && !cond ? `  — ${detail}` : ""}`);
  if (!cond) fail++;
};

// ---- 1. pull the numbers scout will print -------------------------------
const src = readFileSync("scripts/scout.mjs", "utf8");
const grab = (label) => {
  const re = new RegExp('\\["' + label + '\\s*",\\s*\\[([^\\]]*)\\],\\s*\\[([^\\]]*)\\]');
  const m = src.match(re);
  if (!m) return null;
  return [...m[1].split(","), ...m[2].split(",")].map((x) => parseFloat(x.trim()));
};
const scoutMan = grab("vs MAN");
const scoutC2 = grab("vs COVER-2");
ok("scout carries a MAN row", !!scoutMan && scoutMan.length === 6);
ok("scout carries a COVER-2 row", !!scoutC2 && scoutC2.length === 6);

// ---- 2. pull the same numbers out of the banked section -----------------
// 11m prints them as a change row inside a fenced block.
const ref = readFileSync("ANALYST-REFERENCE.md", "utf8");
const sec = ref.slice(ref.indexOf("11m"), ref.indexOf("11m") + 4000);
const changeRows = [...sec.matchAll(/change\s+([-+0-9.\s]+)/g)]
  .map((m) => m[1].trim().split(/\s+/).map(Number));
ok("11m carries two change rows", changeRows.length >= 2, `${changeRows.length}`);

// each banked change row is WR TE RB behindLOS short mid deep (7 numbers);
// scout prints WR TE RB + behindLOS mid deep (6) - it drops "short", which
// moved +0.4 and +3.4 and is the least decision-relevant column.
const bankedPick = (row) => row && row.length >= 7
  ? [row[0], row[1], row[2], row[3], row[5], row[6]] : null;
const bMan = bankedPick(changeRows[0]);
const bC2 = bankedPick(changeRows[1]);

const same = (a, b) => a && b && a.length === b.length
  && a.every((x, i) => Math.abs(x - b[i]) < 0.05);
ok("scout's MAN row equals the banked MAN row", same(scoutMan, bMan),
   `scout ${JSON.stringify(scoutMan)} vs banked ${JSON.stringify(bMan)}`);
ok("scout's COVER-2 row equals the banked COVER-2 row", same(scoutC2, bC2),
   `scout ${JSON.stringify(scoutC2)} vs banked ${JSON.stringify(bC2)}`);

// ---- 3. the sign directions are the whole finding, so pin them ----------
// man takes targets OFF the back and pushes them downfield; cover-2 does the
// reverse. If a future re-measure flips a sign, that is a new finding and this
// guard should stop the old prose from surviving it.
ok("MAN: receivers up, backs down", scoutMan[0] > 0 && scoutMan[2] < 0);
ok("MAN: behind-the-line down, deep up", scoutMan[3] < 0 && scoutMan[5] > 0);
ok("COVER-2: backs up, behind-the-line up", scoutC2[2] > 0 && scoutC2[3] > 0);
ok("COVER-2: middle depth down", scoutC2[4] < 0);

// ---- 4. it actually prints, and the reading aid fires on a heavy defence -
// NOTE: the opponent block lives ONLY in --vs mode. A single-player card has
// no opponent section at all, so there is nothing there to hang this on. That
// is a real gap in scout and it is named here rather than papered over.
const out = execFileSync("node",
  ["scripts/scout.mjs", "Jordan Addison", "--vs", "Wan'Dale Robinson"],
  { encoding: "utf8", maxBuffer: 20e6 });
ok("a SINGLE-player card still has no opponent block (known gap, not a regression)",
   !execFileSync("node", ["scripts/scout.mjs", "Jordan Addison"],
     { encoding: "utf8", maxBuffer: 20e6 }).includes("how they play"));
ok("the table prints on a real card", out.includes("WHAT THOSE SHAPES DID TO THE TARGET MIX"));
ok("...and keeps the per-player caveat beside it, not instead of it",
   out.includes("r=0.161") && out.includes("a DIFFERENT question"));
ok("...and names the game-script confound", /protect-the-lead/.test(out));
// Addison faces CHI, measured at man +12.0, so the live-row pointer must fire
ok("the live-row pointer fires on a HEAVY man defence", /this defence is HEAVY vs MAN/.test(out),
   (out.match(/\^ this defence is.*/) || ["(no pointer printed)"])[0]);

// ---- 5. must-fail ------------------------------------------------------
ok("a drifted digit WOULD be caught", !same(scoutMan, [9.5, -1.4, -8.0, -7.4, 4.3, 2.7]));
ok("a flipped sign WOULD be caught", !same(scoutC2, [-5.4, 0.9, -4.4, 4.1, -4.8, -2.7]));

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall passed");
process.exit(fail ? 1 : 0);
