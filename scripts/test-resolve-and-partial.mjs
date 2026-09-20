// Guard 50 - two fixes for the same disease: output that looks finished and is not.
//
// FIX B, THE ADP GATE. findPlayer resolves against an ADP table. ADP is a DRAFT
// artifact, so a player who went undrafted or signed in-season is invisible to
// it. The tool printed "NO MATCH" for a STARTING QUARTERBACK holding a status
// row, a crosswalk id, a 2025 metrics row and a 2026 expected row. "NO MATCH"
// reads as "no such player"; the truth was "nobody drafted him in August".
//
// FIX A, THE DILUTED DENOMINATOR. exp_pg divides by gp, and gp counts a PARTIAL
// appearance as a whole game. A quarterback who entered in relief was quoted at
// 10.12/gm against a full starter's 28.29 as though those were comparable.
//
// ⛔ THE QB-ONLY SCOPE IS THE LOAD-BEARING DESIGN CHOICE, NOT A SHORTCUT.
// A quarterback either started or he did not, so a low snap share means he
// entered or left. For a back or receiver a low share is usually his ROLE -
// flagging Jaylen Warren's 37% as a "partial game" would be flatly false, and
// would re-create the exact class of confident-wrong output this guard exists
// to stop. The room is where a skill player's share gets read.
import { execFileSync } from "child_process";

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}${detail && !cond ? `  — ${detail}` : ""}`);
  if (!cond) fail++;
};
const run = (args) => {
  try {
    return { out: execFileSync("node", ["scripts/scout.mjs", ...args],
      { encoding: "utf8", maxBuffer: 20e6 }), code: 0 };
  } catch (e) {
    return { out: (e.stdout || "") + (e.stderr || ""), code: e.status ?? 1 };
  }
};

// ---- FIX B: the undrafted starter resolves -------------------------------
const w = run(["Carson Wentz"]);
ok("an undrafted in-season starter RESOLVES at all", w.code === 0 && /QB MIN/.test(w.out));
ok("...and the card says WHY the ADP-derived rows are thin",
   /NOT IN THE .* ADP TABLE/.test(w.out));
ok("...and his CURRENT-SEASON expected row is real, not blank",
   /THIS SEASON\s+expected\s+[0-9]/.test(w.out));
ok("...and his prior-season row survived too",
   /2025\s+expected\s+[0-9]/.test(w.out));

// ⭐ the fallback must NOT make everything resolve. If it does, a typo becomes
// a confident card about the wrong person - worse than the bug being fixed.
const junk = run(["Zzqq Notarealplayer"]);
ok("a name that is nobody still FAILS, loudly", junk.code !== 0 && /NO MATCH/.test(junk.out));

// ---- FIX A: the dilution flag -------------------------------------------
ok("a QB who played 83% of snaps is flagged PARTIAL",
   /snaps in those game\(s\)/.test(w.out) && /PARTIAL START\(S\)/.test(w.out));

const sh = run(["Tyler Shough"]);
ok("a QB who played 100% is NOT flagged partial",
   /snaps in those game\(s\): W1 100%/.test(sh.out) && !/PARTIAL START/.test(sh.out));

// ⛔ the false-positive this guard mainly exists to prevent
const jw = run(["Jaylen Warren"]);
ok("a 37% RB is NOT called a partial game", !/PARTIAL START/.test(jw.out));
ok("...he is pointed at the room instead", /usually ROLE, not a part-game/.test(jw.out));

// ---- the snap line must carry real numbers, not a placeholder ------------
const m = w.out.match(/snaps in those game\(s\): (.+)/);
ok("the snap line prints an actual percentage", !!m && /W\d+ \d+%/.test(m[1]),
   m ? m[1] : "(absent)");

// ---- must-fail: prove each assertion can actually fail -------------------
ok("the PARTIAL matcher would reject a card with no flag", !/PARTIAL START/.test(sh.out));
ok("the ADP-banner matcher would reject a normal card", !/NOT IN THE .* ADP TABLE/.test(sh.out));

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall passed");
process.exit(fail ? 1 : 0);
