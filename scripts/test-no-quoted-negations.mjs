#!/usr/bin/env node
// test-no-quoted-negations.mjs — prose entries are MODEL INPUT, not a changelog.
//
// WHY THIS EXISTS
//   SITUATIONS.trendNote and RECENT_NEWS are pasted verbatim into the AI prompt.
//   Anything written in them is quotable, and the model reproduces vivid strings
//   while dropping the framing around them.
//
//   This shipped twice. The Stefon Diggs entry was written to CORRECT a
//   hallucination, and to make the correction vivid it quoted the wrong claim:
//
//     "...told a user Diggs was 'unsigned and effectively retired per current
//      data' in the same output where the app listed him as WR-WAS"
//
//   The nutshell then told the user, in production:
//
//     "Stefon Diggs being listed as unsigned and effectively retired per recent
//      news is a genuine structural gap in that stack's WR corps."
//
//   The model lifted the quoted phrase and inverted the attribution — "per
//   recent news" — while the news section said the opposite two lines above.
//   The correction became the source of the error it was written to prevent.
//   The same shape had already been recorded for De'Zhaun Stribling, where an
//   entry naming an out player inside a depth chart caused him to be reported
//   as active.
//
// THE RULE
//   Write entries AFFIRMATIVELY, in the present tense, about what is true now.
//   Never quote a superseded claim, never narrate what a previous version of the
//   entry said, and never put a player's past unavailability in a form that reads
//   as current. The history belongs in CLAUDE.md and the commit message, where
//   humans read it and the model does not.
//
// WHAT IT CHECKS
//   1. No entry quotes an availability negation (unsigned / retired / free agent
//      / released / suspended / out for the season).
//   2. No entry narrates a superseded version of itself.
//   3. No entry names a team the player does NOT play for inside a negation.
//   All three are scoped to quoted, self-referential or negated text so ordinary
//   analysis — "he is not the lead back", "no defined role" — passes untouched.
//
// RULE 3 SHIPPED THE SAME FAILURE A THIRD TIME, IN A NEW SHAPE (Sep 2 2026)
//   The De'Zhaun Stribling and Diggs entries taught that a QUOTED negation is
//   quotable. The Deebo Samuel entry was written affirmatively and still failed,
//   because it listed the wrong teams in order to forbid them:
//
//     "HE IS A 49ER ... Do not describe him as a Commander, a Washington
//      player, or a free agent; any such reference is wrong for 2026."
//
//   Production nutshell, weeks later, on a roster card that rendered "WR SF":
//
//     "Deebo Samuel's situation note places them on different teams — Samuel is
//      now WAS WR2, not an SF piece"
//
//   The model lifted "Washington" straight out of the prohibition, invented a
//   "situation note" that does not exist, and then RE-PLANNED THE ROSTER around
//   the invented team. Every other layer had him correct: all three ADP tables,
//   the roster strip, and the stack engine.
//
//   THE GENERALISATION: a negated affiliation is still an affiliation. Naming
//   the wrong team is what makes it available, and the negation around it is
//   the part the model drops. Say only what is true; never enumerate what is
//   false in order to rule it out.
//
//   Only the SUBJECT's own affiliation is checked. An entry may freely name
//   other teams affirmatively ("traded PIT -> GB", "a Giant since 2024") and
//   may carry analytical prohibitions that assert no false fact ("do not treat
//   him as a stackable QB") — three such entries exist and all pass.

import { build } from "esbuild";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = path.join(repoRoot, "node_modules", ".cache", "rosterxray-negations");
mkdirSync(tmpDir, { recursive: true });

const res = await build({
  entryPoints: [path.join(repoRoot, "App.jsx.jsx")],
  bundle: true, write: false, format: "esm", platform: "node",
  jsx: "transform", loader: { ".jsx": "jsx" },
  external: ["react", "react-dom", "react/jsx-runtime", "lucide-react", "recharts", "html2canvas"],
  footer: { js: "export { SITUATIONS, RECENT_NEWS, ADP_DATA };" },
});
const bundlePath = path.join(tmpDir, "app.mjs");
writeFileSync(bundlePath, res.outputFiles[0].text);
const { SITUATIONS, RECENT_NEWS, ADP_DATA } = await import(pathToFileURL(bundlePath).href);

const UNAVAILABLE = "unsigned|effectively retired|a free agent|released by|out for the season|suspended|holding out";

const RULES = [
  {
    // an availability negation inside quotes — the exact Diggs failure
    re: new RegExp("['‘“][^'’”]{0,90}(" + UNAVAILABLE + ")[^'’”]{0,90}['’”]", "i"),
    why: "quotes an availability negation — the model reproduces the quote and drops the correction",
  },
  {
    re: /\b(the|this) (old|prior|previous|earlier) (note|entry|read|version)\b|\bTHIS ENTRY EXISTS\b|\bused to (read|say)\b|\bsaid the opposite\b|\buntil \w+ \d+ 20\d\d (said|read)\b/i,
    why: "narrates a superseded version of itself — that history belongs in CLAUDE.md, not in model input",
  },
];

// Nicknames and city names only — NEVER the abbreviations. "NO", "LV" and "WAS"
// collide with the ordinary English words "no", "LV" in a line, and "was", so an
// abbreviation match would fire on half the corpus and a noisy guard is one
// nobody reads. The failure this rule exists for named "Commander" and
// "Washington" in full, which is what a model can lift and re-plan around.
const TEAM_WORDS = {
  ARI: ["Cardinal", "Arizona"], ATL: ["Falcon", "Atlanta"], BAL: ["Raven", "Baltimore"],
  BUF: ["Bill", "Buffalo"], CAR: ["Panther", "Carolina"], CHI: ["Bear", "Chicago"],
  CIN: ["Bengal", "Cincinnati"], CLE: ["Brown", "Cleveland"], DAL: ["Cowboy", "Dallas"],
  DEN: ["Bronco", "Denver"], DET: ["Lion", "Detroit"], GB: ["Packer", "Green Bay"],
  HOU: ["Texan", "Houston"], IND: ["Colt", "Indianapolis"], JAX: ["Jaguar", "Jacksonville"],
  KC: ["Chief", "Kansas City"], LAC: ["Charger"], LAR: ["Ram"], LV: ["Raider", "Las Vegas"],
  MIA: ["Dolphin", "Miami"], MIN: ["Viking", "Minnesota"], NE: ["Patriot", "New England"],
  NO: ["Saint", "New Orleans"], NYG: ["Giant"], NYJ: ["Jet"],
  PHI: ["Eagle", "Philadelphia"], PIT: ["Steeler", "Pittsburgh"], SEA: ["Seahawk", "Seattle"],
  SF: ["49er", "Niner", "San Francisco"], TB: ["Buccaneer", "Tampa"],
  TEN: ["Titan", "Tennessee"], WAS: ["Commander", "Washington"],
};
// ⚠️ THE TEAM WORD MUST BE IN THE SAME CLAUSE AS THE NEGATION, not merely near
// it. A window-based first draft failed a CORRECT entry: David Njoku's reads
// "THIS IS NOT THE DEPTH CHART, IT IS THE PLAY CALLER. Mike McDaniel's Miami
// offenses ranked THIRD..." — an ordinary analytical negation about a depth
// chart, followed one SENTENCE later by an affirmative and true mention of
// another team. A guard that fails correct prose is a guard that gets deleted,
// so both halves are tightened: `is not the` is not a trigger at all, and the
// team word must follow the negation with no sentence break between them.
const NEGATED_TEAM = (word) => new RegExp(
  "(?:" +
    // a model-directed prohibition, then the team it names, same clause
    "\\b(?:do not|don'?t|never)\\s+(?:describe|call|refer to|list|treat|say|report)\\b[^.;]{0,60}" +
  "|" +
    // a negated affiliation: "is not a Commander", "no longer a Washington player"
    "\\b(?:is|are|was|were)?\\s*(?:not|no longer)\\s+(?:a|an|the)\\s+(?:\\w+\\s+){0,2}" +
  ")" + word + "s?\\b", "i");

const entries = [];
for (const [k, v] of Object.entries(RECENT_NEWS)) entries.push(["RECENT_NEWS", k, v]);
for (const [k, v] of Object.entries(SITUATIONS)) if (v?.trendNote) entries.push(["SITUATIONS", k, v.trendNote]);
for (const [k, v] of Object.entries(SITUATIONS)) if (v?.reason) entries.push(["SITUATIONS.reason", k, v.reason]);

const negatedWrongTeam = (key, text) => {
  const own = ADP_DATA[key]?.team;
  if (!own) return null;                       // not a draftable subject; nothing to compare against
  const s = String(text);
  for (const [abbr, words] of Object.entries(TEAM_WORDS)) {
    if (abbr === own) continue;                // his OWN team is always legal to name
    for (const w of words) {
      const m = s.match(NEGATED_TEAM(w));
      if (m) return { frag: m[0].replace(/\s+/g, " ").slice(0, 90), team: abbr };
    }
  }
  return null;
};

const failures = [];
for (const [src, key, text] of entries) {
  let hit = false;
  for (const rule of RULES) {
    const m = String(text).match(rule.re);
    if (m) { failures.push({ src, key, why: rule.why, frag: m[0].slice(0, 90) }); hit = true; break; }
  }
  if (hit) continue;
  const wrong = negatedWrongTeam(key, text);
  if (wrong) failures.push({
    src, key, frag: wrong.frag,
    why: `names ${wrong.team} inside a negation — the model lifts the team and drops the negation (he plays for ${ADP_DATA[key].team})`,
  });
}

if (failures.length) {
  console.error(`FAIL  ${failures.length} prose entr${failures.length === 1 ? "y" : "ies"} contain text the model can quote back as a finding:\n`);
  for (const f of failures) {
    console.error(`  ${f.src}  "${f.key}"`);
    console.error(`      ${f.why}`);
    console.error(`      ...${f.frag}...\n`);
  }
  console.error("Rewrite the entry affirmatively: say what is true now, in the present tense.");
  console.error("Put the correction history in CLAUDE.md and the commit message instead.");
  process.exit(1);
}
console.log(`PASS  ${entries.length} prose entries carry no quotable negation, no self-narration and no negated wrong team`);
