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
//   Both are scoped to quoted or self-referential text so ordinary analysis —
//   "he is not the lead back", "no defined role" — passes untouched.

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
  footer: { js: "export { SITUATIONS, RECENT_NEWS };" },
});
const bundlePath = path.join(tmpDir, "app.mjs");
writeFileSync(bundlePath, res.outputFiles[0].text);
const { SITUATIONS, RECENT_NEWS } = await import(pathToFileURL(bundlePath).href);

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

const entries = [];
for (const [k, v] of Object.entries(RECENT_NEWS)) entries.push(["RECENT_NEWS", k, v]);
for (const [k, v] of Object.entries(SITUATIONS)) if (v?.trendNote) entries.push(["SITUATIONS", k, v.trendNote]);

const failures = [];
for (const [src, key, text] of entries) {
  for (const rule of RULES) {
    const m = String(text).match(rule.re);
    if (m) { failures.push({ src, key, why: rule.why, frag: m[0].slice(0, 90) }); break; }
  }
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
console.log(`PASS  ${entries.length} prose entries carry no quotable negation and no self-narration`);
