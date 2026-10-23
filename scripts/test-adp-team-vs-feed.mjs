// Guard 52 - every ADP table's `team` must match the live Sleeper feed.
//
// WHY IT EXISTS. Oct 23 2026: Marvin Harrison Jr. still read ARI in all three
// ADP tables eleven days after his Oct 12 trade to Houston, and J.J. McCarthy
// read MIN after the Giants acquired him. Correcting the two moved 22 of 90
// fixture grades. status_2026.json (Sleeper) had both right the whole time.
//
// WHAT IT REPLACED. Guard 9 (test-alias-adp-sync) checks that the three ADP
// tables agree WITH EACH OTHER. They did - on the wrong team. Agreement between
// three hand-maintained copies is not evidence any of them is current; this
// checks them against the one source a machine refreshes every week.
//
// THE MATCH IS THE APP'S OWN. normalize, SUFFIX_RE, METRIC_NAME_ALIASES,
// lookupPlayer and teamKey are lifted out of App.jsx as source text and run
// here, so "marvin harrison jr" resolves to Sleeper's "marvin harrison" exactly
// the way getStatus() resolves it in the app. No second resolver to drift.
// A match is only COMPARED when the feed row has the same position and the
// name is not in _meta.ambiguous_off; anything else is reported as INFO, never
// guessed at.
//
// INFO, NOT FAIL: a player missing from the feed (released, unsigned - the feed
// only keeps rostered players), an ADP team written "-"/"FA", a position
// mismatch, an ambiguous name, and a row past guard 10's draftable line.
//
// TWO MODES, the guard 41 pattern. In a session commit a stale team FAILS.
// Under RXR_DATA_REFRESH=1 (the weekly workflow only) it is a REPORT: the
// refresh changes status_2026.json, so a trade lands in the feed before anyone
// edits App.jsx, and failing there would block the data over news. The hits
// go to RXR_ADP_TEAM_OUT for the PR body and the job continues.
import { readFileSync, writeFileSync } from "fs";

const app = readFileSync("App.jsx", "utf8");
// "Draftable" is guard 10's line, read from guard 10 rather than retyped: a
// deep redraft-tail row (Beckham at 242) can drift without costing a grade.
const DRAFTABLE_MAX = Number(
  /const DRAFTABLE_MAX = (\d+)/.exec(readFileSync("scripts/test-table-coverage.mjs", "utf8"))?.[1]);
if (!DRAFTABLE_MAX) throw new Error("DRAFTABLE_MAX not found in scripts/test-table-coverage.mjs");
const FEED = JSON.parse(readFileSync("grading/data/status_2026.json", "utf8"));

// ---- the app's resolver, verbatim -----------------------------------------
const slice = (from, to) => {
  const a = app.indexOf(from), b = app.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`App.jsx moved: cannot find "${from}" .. "${to}"`);
  return app.slice(a, b);
};
const resolverSrc = slice("const normalize = ", "const getMetrics = ");
const teamSrc = slice("const TEAM_ALIAS = ", "const TEAM_SPELLINGS = ");
const { lookupPlayer, teamKey } = new Function(
  `${resolverSrc}\n${teamSrc}\nreturn { lookupPlayer, teamKey };`)();

// ---- the three tables -------------------------------------------------------
const TABLES = ["ADP_DATA", "ADP_SUPERFLEX", "ADP_YAHOO"];
const parseTable = (name) => {
  const m = new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`).exec(app);
  if (!m) throw new Error(`${name} not found in App.jsx`);
  const rows = [];
  for (const L of m[1].split("\n")) {
    const e = /^\s*"([^"]+)":\s*\{\s*adp:\s*([\d.]+),\s*pos:\s*"([^"]*)",\s*team:\s*"([^"]*)"/.exec(L);
    if (e) rows.push({ table: name, key: e[1], adp: parseFloat(e[2]), pos: e[3], team: e[4] });
  }
  return rows;
};

const NO_TEAM = new Set(["", "-", "FA", "NA", "N/A"]);
const ambiguous = new Set(FEED._meta?.ambiguous_off || []);

function check(rows, players) {
  const stale = [], info = [];
  for (const r of rows) {
    const where = `${r.table} "${r.key}"`;
    if (NO_TEAM.has(r.team.toUpperCase())) { info.push(`${where}: ADP team "${r.team}" (no team to compare)`); continue; }
    const f = lookupPlayer(players, r.key);
    if (!f) { info.push(`${where}: not in the feed (released or unsigned?) - ADP says ${r.team}`); continue; }
    const fk = Object.keys(players).find((k) => players[k] === f);
    if (ambiguous.has(fk)) { info.push(`${where}: feed name "${fk}" is shared by two players - not compared`); continue; }
    if (f.pos !== r.pos) { info.push(`${where}: feed row is a ${f.pos}, ADP a ${r.pos} - not compared`); continue; }
    if (teamKey(r.team) === teamKey(f.team)) continue;
    if (r.adp > DRAFTABLE_MAX) { info.push(`${where}: past the draftable line (ADP ${r.adp} > ${DRAFTABLE_MAX}) - ADP says ${r.team}, Sleeper says ${f.team}`); continue; }
    stale.push({ ...r, feedTeam: f.team });
  }
  return { stale, info };
}

const rows = TABLES.flatMap(parseTable);
let fail = 0;
const ok = (label, cond) => { console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}`); if (!cond) fail++; };

// ---- sabotage, both ways, every run ------------------------------------------
// (a) The Oct 23 case, on SYNTHETIC rows: the ADP key carries "jr", Sleeper's
// does not. Built from fixtures rather than the live row so a future trade
// cannot turn this self-test red - that would block the weekly refresh on news.
const sfx = { "marvin harrison": { pos: "WR", team: "HOU" } };
const mhj = { table: "T", key: "marvin harrison jr", adp: 1, pos: "WR", team: "ARI" };
const sab = check([mhj], sfx).stale;
ok("a stale ARI on Harrison Jr is CAUGHT (suffix resolves to Sleeper's bare name)", sab.length === 1 && sab[0].feedTeam === "HOU");
ok("...and the corrected row passes", check([{ ...mhj, team: "HOU" }], sfx).stale.length === 0);
// (b) Spelling aliases must NOT fire: LA/LAR and WAS/WSH are the same team.
const fakeFeed = { "x one": { pos: "WR", team: "LA" }, "x two": { pos: "QB", team: "WSH" } };
ok("LAR vs LA and WAS vs WSH are NOT flagged",
   check([{ table: "T", key: "x one", adp: 1, pos: "WR", team: "LAR" }, { table: "T", key: "x two", adp: 1, pos: "QB", team: "WAS" }], fakeFeed).stale.length === 0);
// (c) Absent / "-" / position mismatch are INFO, never a failure.
const soft = check([
  { table: "T", key: "nobody at all", adp: 1, pos: "RB", team: "DAL" },
  { table: "T", key: "x one", adp: 1, pos: "WR", team: "-" },
  { table: "T", key: "x one", adp: 1, pos: "TE", team: "NYJ" },
], fakeFeed);
ok("missing player, '-' team and position mismatch are INFO only", soft.stale.length === 0 && soft.info.length === 3);
// (d) A wrong team past the draftable line is INFO; the same row inside it FAILS.
const deep = { table: "T", key: "x one", adp: DRAFTABLE_MAX + 1, pos: "WR", team: "NYJ" };
ok("a deep-tail stale team is INFO, the same row at a draftable ADP fails",
   check([deep], fakeFeed).stale.length === 0 && check([{ ...deep, adp: DRAFTABLE_MAX }], fakeFeed).stale.length === 1);

// ---- the real check ---------------------------------------------------------
const { stale, info } = check(rows, FEED.players);
const probed = FEED._meta?.source_probed || "?";
console.log(`\n  ${rows.length} ADP rows checked against Sleeper (probed ${probed}); ${info.length} INFO:`);
for (const i of info) console.log(`    INFO  ${i}`);

if (fail) { console.error(`\nSELFTEST FAILED (${fail}) - the guard itself is broken`); process.exit(1); }

if (!stale.length) { console.log(`\nPASS  every ADP team matches the feed`); process.exit(0); }

const lines = stale.map((s) => `- ${s.table} "${s.key}" (${s.pos}): ADP says ${s.team}, Sleeper says ${s.feedTeam}`);
if (process.env.RXR_DATA_REFRESH === "1") {
  console.log(`\nADVISORY  ${stale.length} ADP team(s) disagree with the feed (fix App.jsx in a session; this does not block the data):\n${lines.join("\n")}`);
  if (process.env.RXR_ADP_TEAM_OUT) writeFileSync(process.env.RXR_ADP_TEAM_OUT, lines.join("\n") + "\n");
  process.exit(0);
}
console.error(`\nFAIL  ${stale.length} ADP team(s) disagree with the live Sleeper feed:\n${lines.join("\n")}`);
console.error(`\n-> Verify the move, then fix the team in EVERY ADP table (guard 9 needs them to agree)`);
console.error(`   and re-source any player note that names the old team.`);
process.exit(1);
