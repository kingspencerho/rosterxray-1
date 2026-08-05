#!/usr/bin/env node
// test-alias-adp-sync.mjs — the ADP tables must not contradict themselves about
// one player. Two invariants, both violated in production on Aug 3 2026:
//
//   CHECK 1  same player listed twice in ONE table with different ADP
//   CHECK 2  same player listed in TWO tables with a different team or position
//
// ---------------------------------------------------------------------------
// CHECK 1 — duplicate spellings, divergent ADP
//
// Three of these were live at once, and two were
// introduced by the Aug 2 ADP_SUPERFLEX refresh itself:
//
//   ADP_SUPERFLEX  "kenneth gainwell" 117    vs "kenny gainwell" 111.0
//   ADP_SUPERFLEX  "chig okonkwo"     138.0  vs "chigoziem okonkwo" 127
//   ADP_YAHOO      "kenneth gainwell" 113.1  vs "kenny gainwell" 104.0
//
// The mechanism is the same every time. A refresh source prints ONE spelling —
// 4for4 uses the legal name, the platforms print the nickname — so the update
// lands on one key and the other keeps whatever it had. Nothing errors. The
// grade is simply computed against a stale ADP whenever the user happens to
// paste the other spelling, which for Gainwell is the spelling Yahoo and
// Underdog actually print. A 9-pick delta error silently flips a value into a
// reach.
//
// This is the ADP-table sibling of test-no-duplicate-keys.mjs. That one catches
// the SAME key twice (JS keeps the last). This one catches the same PERSON
// twice (both survive, and findPlayer returns whichever the query matched).
//
// THE ALLOWLIST IS THE WHOLE DESIGN PROBLEM. Same surname, same position and
// same team is a strong signal of one player double-listed — but it is not
// proof. Bijan Robinson and Brian Robinson are both ATL RBs and their ADPs
// SHOULD differ by 160 picks. So genuinely distinct players are listed below
// and skipped. Add to it only when you have confirmed two real humans; never
// add a pair just to silence the check, because the thing being silenced is a
// wrong ADP feeding a real grade.
//
// If this fails: find which value came from the newer source (git blame the two
// lines — the refresh commit is usually right there) and copy the fresher
// number onto the other key. Keep BOTH keys. Deleting one saves nothing and
// costs a lookup for anyone who types that spelling.
//
// ---------------------------------------------------------------------------
// CHECK 2 — cross-table team / position disagreement
//
// Added the same day, after the AI nutshell told a user that Tua Tagovailoa was
// Miami's "healthy starter" months after he signed with Atlanta. That specific
// bug was a PROMPT gap, not a data one (ADP_DATA correctly had him at ATL), but
// auditing for it surfaced a genuine data version:
//
//   "stefon diggs"  ADP_DATA = FA   vs  ADP_SUPERFLEX = NE
//
// New England released Diggs on Mar 11 2026 and he is still unsigned, so FA was
// right and the superflex table was carrying his 2025 team. `team` is not
// cosmetic — it selects the opponent for every W15-17 matchup tier, so one
// stale table grades a player against a schedule he will not play.
//
// Free-agent placeholders are NOT consistent across the tables ("FA" in one,
// "-" in another). Both mean the same thing and are normalized here rather than
// forced into one convention, because changing a placeholder is a data edit and
// this file is a check.
//
// Run: node scripts/test-alias-adp-sync.mjs   (exits non-zero on failure)
import { readFileSync } from "fs";

const src = readFileSync("App.jsx", "utf8");

// Confirmed DIFFERENT people who collide on surname + pos + team.
// Format: sorted pair of normalized keys.
const DISTINCT_PLAYERS = new Set([
  "bijan robinson|brian robinson", // ATL RBs, both real, ADPs correctly ~160 apart
]);

const TABLES = ["ADP_DATA", "ADP_SUPERFLEX", "ADP_YAHOO"];
const SUFFIX_RE = /\s+(jr|sr|ii|iii|iv|v)$/;
const strip = (k) => k.replace(SUFFIX_RE, "").replace(/[.']/g, "").trim();

function parseTable(name) {
  const m = new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`).exec(src);
  if (!m) throw new Error(`${name} not found in App.jsx`);
  const body = m[1];
  const startLine = src.slice(0, src.indexOf(body)).split("\n").length;
  const out = [];
  body.split("\n").forEach((L, i) => {
    // team is deliberately "[^\"]*" and not "[A-Z]+": free agents are stored as
    // "FA" in one table and "-" in another, and an [A-Z]+ pattern skips the
    // second silently — which is exactly how a placeholder mismatch would hide.
    const e = /^\s*"([^"]+)":\s*\{\s*adp:\s*([\d.]+),\s*pos:\s*"([^"]*)",\s*team:\s*"([^"]*)"/.exec(L);
    if (e) out.push({ key: e[1], adp: parseFloat(e[2]), pos: e[3], team: e[4], line: startLine + i });
  });
  return out;
}

const fails = [];
let pairsChecked = 0;

for (const tableName of TABLES) {
  const entries = parseTable(tableName);
  const byLast = new Map();
  for (const e of entries) {
    const parts = strip(e.key).split(" ");
    const last = parts[parts.length - 1];
    if (!byLast.has(last)) byLast.set(last, []);
    byLast.get(last).push(e);
  }

  for (const group of byLast.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        // Only a candidate if the app itself treats them as interchangeable:
        // same position AND same team. Different team or position means the
        // tables already disagree about something bigger than ADP.
        if (a.pos !== b.pos || a.team !== b.team) continue;
        const pair = [strip(a.key), strip(b.key)].sort().join("|");
        if (DISTINCT_PLAYERS.has(pair)) continue;
        pairsChecked++;
        if (a.adp !== b.adp) {
          fails.push({ table: tableName, a, b });
        }
      }
    }
  }
}

// === CHECK 2: same player, two tables, different team or position ===
// ADP legitimately differs between tables — they are different markets, that is
// the whole point. Team and position do not: those are facts about the player,
// and `team` drives every matchup tier the engine computes.
const NO_TEAM = new Set(["FA", "-", "", "NA", "N/A"]);
const normTeam = (t) => (NO_TEAM.has((t || "").toUpperCase()) ? "(free agent)" : (t || "").toUpperCase());

const parsed = Object.fromEntries(TABLES.map(n => [n, parseTable(n)]));
const byName = new Map();
for (const [tableName, entries] of Object.entries(parsed)) {
  for (const e of entries) {
    const k = strip(e.key);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push({ ...e, table: tableName });
  }
}

const crossFails = [];
let namesChecked = 0;
for (const [name, rows] of byName) {
  // One row per table — a player listed twice in the SAME table is CHECK 1's job.
  const perTable = new Map();
  for (const r of rows) if (!perTable.has(r.table)) perTable.set(r.table, r);
  if (perTable.size < 2) continue;
  namesChecked++;
  const list = [...perTable.values()];
  const teams = new Set(list.map(r => normTeam(r.team)));
  const poss = new Set(list.map(r => (r.pos || "").toUpperCase()));
  if (teams.size > 1) crossFails.push({ name, field: "team", rows: list });
  if (poss.size > 1) crossFails.push({ name, field: "pos", rows: list });
}

if (fails.length === 0 && crossFails.length === 0) {
  console.log(`PASS  ${pairsChecked} same-player key pairs (ADP) + ${namesChecked} cross-table names (team/pos) — no contradictions`);
  process.exit(0);
}

if (fails.length) {
  console.log(`FAIL  ${fails.length} player(s) listed twice with DIFFERENT ADP:\n`);
  for (const f of fails) {
    console.log(`  ${f.table}`);
    console.log(`      "${f.a.key}"  adp ${f.a.adp}   L${f.a.line}`);
    console.log(`      "${f.b.key}"  adp ${f.b.adp}   L${f.b.line}`);
    console.log(`      ${f.a.pos} ${f.a.team} — delta ${Math.abs(f.a.adp - f.b.adp).toFixed(1)} picks`);
    console.log();
  }
  console.log("Copy the value from the NEWER source onto both keys (git blame the two");
  console.log("lines to see which refresh wrote which). Keep both keys.");
  console.log("If these are genuinely two different people, add the pair to");
  console.log("DISTINCT_PLAYERS at the top of this file — with a comment saying why.\n");
}

if (crossFails.length) {
  console.log(`FAIL  ${crossFails.length} cross-table ${crossFails.length === 1 ? "disagreement" : "disagreements"} on team/position:\n`);
  for (const f of crossFails) {
    console.log(`  "${f.name}" — tables disagree on ${f.field.toUpperCase()}`);
    for (const r of f.rows) {
      console.log(`      ${r.table.padEnd(14)} ${f.field === "team" ? normTeam(r.team) : r.pos}   L${r.line}`);
    }
    console.log();
  }
  console.log("Team and position are facts about the player, not market opinions —");
  console.log("they must match across tables. `team` picks the opponent for every");
  console.log("W15-17 matchup tier, so a stale one grades a player against a");
  console.log("schedule he will not play. Verify which is current, then fix the");
  console.log("stale table (the newer refresh commit is usually the right one).");
}
process.exit(1);
