// Guard 51 - the custom-scoring repricer, and the league configs it carries.
//
// WHY. The app's expected/actual model is HALF-PPR and nothing in its output
// says so. Section 11p records a start/sit call that REVERSED once the real
// scoring was applied, and two of his leagues pay for things the model cannot
// see at all: completions, sacks taken, and passing/rushing/receiving first
// downs are absent from gamelogs_* entirely.
//
// This runs reprice.py's own selftest (hand-computed arithmetic, both bonus
// readings, a must-fail on an empty line) and then pins the two transcribed
// league configs, because THOSE are what rot. A scoring table is copied off a
// settings page by eye; if a digit drifts, every number downstream is wrong
// and looks exactly as authoritative as before.
import { execFileSync } from "child_process";
import { readFileSync } from "fs";

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}${detail && !cond ? `  — ${detail}` : ""}`);
  if (!cond) fail++;
};

// ---- 1. the arithmetic proves itself -----------------------------------
let out = "", code = 0;
try {
  out = execFileSync("python", ["scripts/reprice.py", "--selftest"],
    { encoding: "utf8", maxBuffer: 10e6 });
} catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status ?? 1; }
ok("reprice.py selftest passes", code === 0 && /all passed/.test(out),
   out.split("\n").filter((l) => /FAIL/.test(l)).join("; ") || `exit ${code}`);
ok("...and it actually ran assertions, not zero", (out.match(/\bok\b/g) || []).length >= 5);

// ---- 2. the transcribed configs are what rot, so pin them --------------
const src = readFileSync("scripts/reprice.py", "utf8");
const cfg = (league, key) => {
  const block = src.slice(src.indexOf(`"${league}"`), src.indexOf(`"${league}"`) + 1200);
  const m = block.match(new RegExp(`"${key}":\\s*(-?[0-9.]+(?:\\s*/\\s*[0-9.]+)?)`));
  if (!m) return null;
  const v = m[1];
  return v.includes("/") ? eval(v) : parseFloat(v);
};

// JFL #3 is the only league of his that charges for a sack. If that ever
// reads 0, a QB behind a bad line silently stops being penalised.
ok("jfl3 charges -1.5 per sack", cfg("jfl3", "sack") === -1.5, String(cfg("jfl3", "sack")));
ok("jfl3 pays 5 per passing TD, not the Yahoo default 4",
   cfg("jfl3", "pass_td") === 5, String(cfg("jfl3", "pass_td")));
ok("jfl3 first downs are 0.1", cfg("jfl3", "rush_1d") === 0.1, String(cfg("jfl3", "rush_1d")));

// ⭐ THE CONTRAST THAT DECIDES PLAYERS: the same stat pays 5x more in the
// other league, and that league charges nothing for a sack. Confusing the two
// is how a rushing QB gets ranked under the wrong rules.
ok("battleroyale first downs are 0.5, FIVE TIMES jfl3",
   cfg("battleroyale", "rush_1d") === 0.5, String(cfg("battleroyale", "rush_1d")));
ok("battleroyale charges NOTHING for a sack",
   cfg("battleroyale", "sack") === 0, String(cfg("battleroyale", "sack")));
ok("both leagues are full PPR", cfg("jfl3", "rec") === 1 && cfg("battleroyale", "rec") === 1);

// ---- all FOUR leagues, because the contrast is what decides players -----
// These four tables are the entire reason a repricer exists. A player who
// wins in one loses in another, and the differences are not cosmetic:
ok("footballbaybee is the only HALF-ppr league of his",
   cfg("footballbaybee", "rec") === 0.5, String(cfg("footballbaybee", "rec")));
ok("jfl2 pays SIX per passing TD", cfg("jfl2", "pass_td") === 6, String(cfg("jfl2", "pass_td")));
ok("...and jfl2 softens fumbles to -1", cfg("jfl2", "fumble_lost") === -1,
   String(cfg("jfl2", "fumble_lost")));
ok("neither new league charges for a sack",
   cfg("jfl2", "sack") === 0 && cfg("footballbaybee", "sack") === 0);
// ⭐ FOUR DIFFERENT PASSING-TD VALUES ACROSS FOUR LEAGUES. A single hard-coded
// 4 or 6 anywhere in an analysis is wrong for at least two of his teams.
const tds = ["jfl2", "jfl3", "battleroyale", "footballbaybee"].map((l) => cfg(l, "pass_td"));
ok("his four leagues carry three different passing-TD values",
   new Set(tds).size >= 3, tds.join(", "));

// ---- 4. qb-floor.py rides on the same scoring, so pin it here ----------
// It IMPORTS reprice.py rather than restating the tables. If that import ever
// becomes a copy, two scoring definitions drift and the distribution stops
// describing the league the repricer prices.
let qf = "", qfCode = 0;
try {
  qf = execFileSync("python", ["scripts/qb-floor.py", "--selftest"],
    { encoding: "utf8", maxBuffer: 10e6 });
} catch (e) { qf = (e.stdout || "") + (e.stderr || ""); qfCode = e.status ?? 1; }
ok("qb-floor.py selftest passes", qfCode === 0 && /all passed/.test(qf),
   `exit ${qfCode}`);
const qfSrc = readFileSync("scripts/qb-floor.py", "utf8");
ok("...and it IMPORTS the scoring rather than restating it",
   /from reprice import/.test(qfSrc));
ok("...and declares no league table of its own",
   !/LEAGUES\s*=\s*\{/.test(qfSrc));

// ---- 5. the name normalizer must AGREE WITH THE CROSSWALK BUILDER'S ----
// FIFTH INSTANCE OF THE NAME JOIN, and the first one inside the scoring path.
// build-player-ids.py strips a generational suffix when it WRITES by_name, so
// every key is "michael pittman". reprice.py's own norm() did not strip it, so
// four players sitting on his rosters at once - Pittman Jr., Burden III,
// Rodriguez Jr., Penix Jr. - could not be priced at all. scout.mjs's nmKey has
// stripped suffixes since the fourth instance; the two python scripts never
// caught up, and nothing compared them.
//
// ⛔ THIS DELIBERATELY DOES NOT STRING-MATCH THE SOURCE. A guard that asserts a
// regex LOOKS right is the guard-that-cannot-fail class banked twice in this
// repo - and the first draft of this very block had a broken source regex that
// would have passed itself. Both implementations are RUN and their outputs
// compared, which is the only thing that can hold two languages together.
const NAME_PROBE = `
import sys, json, importlib.util
sys.path.insert(0, 'scripts')
from reprice import norm
spec = importlib.util.spec_from_file_location('bpi', 'scripts/build-player-ids.py')
bpi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bpi)
names = ['Michael Pittman Jr.', 'Luther Burden III', 'Chris Rodriguez Jr.',
         'Michael Penix Jr.', "De'Von Achane", 'Amon-Ra St. Brown', 'Jr Smith']
xw = json.load(open('grading/data/player_ids.json'))['by_name']
print(json.dumps({
    'agree': sum(1 for n in names if norm(n) == bpi.nm(n)),
    'total': len(names),
    'out': [norm(n) for n in names],
    'resolved': sum(1 for n in names[:4] if xw.get(norm(n))),
}))
`;
let probe = null, probeErr = "";
try {
  probe = JSON.parse(execFileSync("python", ["-c", NAME_PROBE], { encoding: "utf8" }));
} catch (e) { probeErr = ((e.stdout || "") + (e.stderr || "")).trim(); }

ok("the name probe ran at all", probe !== null, probeErr);
if (probe) {
  ok("reprice.norm() and the crosswalk builder's nm() agree on every name",
     probe.agree === probe.total, `${probe.agree}/${probe.total}: ${probe.out.join(", ")}`);
  ok("...Jr. is stripped", probe.out[0] === "michael pittman", probe.out[0]);
  ok("...III is stripped", probe.out[1] === "luther burden", probe.out[1]);
  ok("...and apostrophes still go", probe.out[4] === "devon achane", probe.out[4]);
  // ⭐ must-fail: the suffix regex is anchored, so a name that merely BEGINS
  // with one survives. An unanchored version would quietly rename players.
  ok("a leading 'Jr' is NOT eaten - the regex is anchored", probe.out[6] === "jr smith",
     probe.out[6]);
  // the end-to-end assertion. The regex is only HOW it broke; this is WHAT broke.
  ok("all four suffixed players on his rosters resolve in the crosswalk",
     probe.resolved === 4, `${probe.resolved}/4`);
}

// ---- 3. must-fail ------------------------------------------------------
ok("a drifted sack value WOULD be caught", cfg("jfl3", "sack") !== -1.0);
ok("the two leagues are NOT accidentally identical",
   cfg("jfl3", "rush_1d") !== cfg("battleroyale", "rush_1d"));

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall passed");
process.exit(fail ? 1 : 0);
