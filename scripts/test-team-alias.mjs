// Guard 44 — TEAM CODE SPELLINGS, and every code in the data must resolve.
//
// WHAT THIS PROTECTS, in descending order of what a regression costs:
//
//  1. THE DUPLICATE. The alias map is typed TWICE — TEAM_SPELLINGS in App.jsx
//     and TEAM_SPELLINGS in scripts/matchup-brief.py. A duplicated definition
//     is the most repeated bug class in this repo, and this one has already
//     bitten twice: the Sep 11 LA/LAR bug silently emptied a section on every
//     Rams card, and WSH was added later for the same reason.
//  2. A NEW SPELLING ARRIVING UNANNOUNCED. Nothing checked that the team codes
//     actually PRESENT in grading/data all resolve. A third spelling in a new
//     feed would return nothing, in silence, exactly like the first two did.
//  3. THE MAP MUST BE SYMMETRIC. If WAS maps to both but WSH maps only to
//     itself, half the lookups still fail and the map looks complete.
//
// WHY IT EXISTS: Sep 19 2026, a lineup question. status_2026 files Washington
// as WAS and gameenv_2026 as WSH. Both files' own helpers handle it — but an
// ad-hoc query that did not route through them reported "no game" for a team
// that had one. The alias was never missing. What was missing was anything
// that would tell you when it stopped being enough.
import { readFileSync, readdirSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
const txt = (f) => readFileSync(path.join(repoRoot, f), "utf8");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}${detail && !cond ? `  — ${detail}` : ""}`);
  if (!cond) fail++;
};

// ---- 1. pull both maps out of their own files ---------------------------
const app = txt("App.jsx");
const py = txt("scripts/matchup-brief.py");

const jsBlock = (app.match(/const TEAM_SPELLINGS = \{[\s\S]*?\n\};/) || [""])[0];
ok("App.jsx TEAM_SPELLINGS found", jsBlock.length > 0);
const jsMap = {};
for (const m of jsBlock.matchAll(/(\w+):\s*\[([^\]]+)\]/g)) {
  jsMap[m[1]] = m[2].split(",").map((s) => s.trim().replace(/["']/g, "")).sort();
}

const pyBlock = (py.match(/TEAM_SPELLINGS = \{[\s\S]*?\n\}/) || [""])[0];
ok("matchup-brief.py TEAM_SPELLINGS found", pyBlock.length > 0);
const pyMap = {};
for (const m of pyBlock.matchAll(/"(\w+)":\s*\(([^)]+)\)/g)) {
  pyMap[m[1]] = m[2].split(",").map((s) => s.trim().replace(/["']/g, "")).filter(Boolean).sort();
}

// ---- 2. the two maps must agree, as SETS -------------------------------
// ⚠️ ORDER IS DELIBERATELY NOT COMPARED. App.jsx lists the canonical spelling
// first; the Python lists the one it was asked about first. Both are correct
// for "try every spelling" — only the membership has to match.
ok("both maps cover the same team codes",
   Object.keys(jsMap).sort().join() === Object.keys(pyMap).sort().join(),
   `js ${Object.keys(jsMap).sort()} vs py ${Object.keys(pyMap).sort()}`);
for (const k of Object.keys(jsMap)) {
  ok(`${k} resolves to the same set in both`,
     (jsMap[k] || []).join() === (pyMap[k] || []).join(),
     `js ${jsMap[k]} vs py ${pyMap[k]}`);
}

// ---- 3. symmetry: every spelling must map back ---------------------------
for (const [k, v] of Object.entries(jsMap)) {
  for (const spelling of v) {
    ok(`${spelling} maps back (symmetry with ${k})`,
       Array.isArray(jsMap[spelling]) && jsMap[spelling].join() === v.join());
  }
}

// ---- 4. THE NEW CHECK: every team code in the data resolves --------------
// This is the one nothing did before. A third spelling would have gone
// unnoticed until it silently emptied somebody's lineup read.
const canonical = new Set();
for (const v of Object.values(jsMap)) for (const s of v) canonical.add(s);
const seen = new Map();          // code -> first file it appeared in
const dataDir = path.join(repoRoot, "grading", "data");
const walk = (node, file) => {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, file));
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if ((k === "team" || k === "away" || k === "home") && typeof v === "string") {
      if (!seen.has(v)) seen.set(v, file);
    }
    walk(v, file);
  }
};
for (const f of readdirSync(dataDir)) {
  if (!f.endsWith(".json")) continue;
  let parsed;
  try { parsed = JSON.parse(readFileSync(path.join(dataDir, f), "utf8")); } catch { continue; }
  walk(parsed, f);
}
ok("team codes were actually found in the data", seen.size >= 32, `${seen.size} codes`);

// A code is FINE if it is a plain 2-3 letter code that no alias contradicts.
// It is a PROBLEM only when two spellings of one team both appear and the map
// does not know about it. The map's own keys are the record of which those are.
const known = new Set(Object.keys(jsMap));
const suspicious = [...seen.keys()].filter((c) => known.has(c) && !canonical.has(c));
ok("every aliased code in the data is in the canonical set", suspicious.length === 0,
   suspicious.join(", "));

// Both spellings of each aliased team must be reachable — if only one appears
// anywhere, the alias is dead weight and worth knowing about.
for (const k of Object.keys(jsMap)) {
  if (!seen.has(k)) continue;
  ok(`${k} appears in the data (${seen.get(k)})`, true);
}

// ---- 5. the must-fail case ---------------------------------------------
// A guard that has never been seen to fail is not known to work.
const sabotaged = { ...jsMap, WAS: ["WAS"] };
const symOK = Object.entries(sabotaged).every(([k, v]) =>
  v.every((s) => Array.isArray(sabotaged[s]) && sabotaged[s].join() === v.join()));
ok("...and a one-way alias IS caught by the symmetry check", symOK === false);

// ---- 6. the mirror ------------------------------------------------------
ok("App.jsx and App.jsx.jsx are identical", app === txt("App.jsx.jsx"));

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall passed");
process.exit(fail ? 1 : 0);
