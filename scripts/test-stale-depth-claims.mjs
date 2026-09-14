#!/usr/bin/env node
// test-stale-depth-claims.mjs — guard 41. A depth chart is a weekly fact, so a
// prose entry may not claim one permanently, and may not claim one in the
// present tense off a date that a game has already been played on top of.
//
// WHY THIS EXISTS (Sep 13 2026)
//   The Kyler Murray entry read, in production, on Week 1 Sunday:
//
//     "McCarthy is the BACKUP. NO leash or re-evaluation language was
//      attached ... THE JOB IS SETTLED"
//
//   Minnesota had named Carson Wentz QB2 and dropped J.J. McCarthy to QB3 on
//   Sep 9 2026 - FOUR DAYS BEFORE THE DEPLOY - and Murray then left Week 1 with
//   a concussion after eleven snaps. Two wrong claims in one entry, one of them
//   already wrong when it shipped.
//
//   ⛔ GUARD 12 CANNOT SEE THIS, AND THAT IS THE POINT OF A SECOND FILE. Guard
//   12 catches an availability word on a rostered player and narration about a
//   superseded version. A depth-chart claim that reality overturned contains
//   neither: every word in it is affirmative, present tense and was true when
//   written. The defect is not the wording, it is the CLOCK.
//
// TWO RULES, AND THEY FAIL FOR DIFFERENT REASONS
//
//   RULE 1 - PERMANENCE. Year-round. "the job is settled", "no leash", "the
//   competition is over". A weekly-refreshed file may not foreclose next week.
//   This is a phrasing defect and has no cure but a rewrite.
//
//   RULE 2 - STALE ROLE CLAIM. In season only. An entry asserting a CURRENT
//   depth-chart position, dated more than IN_SEASON_ROLE_DAYS ago, with no
//   instruction to look again. The cure is one clause, not a rewrite: say when
//   you will re-check it, and the guard steps back.
//
//   Rule 2 is off in the offseason on purpose. Out of season the card's own
//   30/45-day ageing is the right instrument and this one would only duplicate
//   it. In season a camp-dated depth chart is a different kind of wrong: games
//   have been played on top of it.
//
// ⚠️ CALIBRATED AGAINST THE WHOLE CORPUS BEFORE IT SHIPPED, because a guard
// that fails correct prose is a guard that gets deleted. Measured over all 294
// prose entries on Sep 13 2026:
//
//     rule 1 (permanence)                 2 hits, both the Murray defect
//     a BROAD role regex, stale, no cure  36 hits  <- a wall, rejected
//     rule 2 as written                    3 hits
//
//   ROLE_CLAIM IS DELIBERATELY HIGH PRECISION AND LOW RECALL. It matches a
//   stated position ("is the starter", "named the starter", "is the WR2"), not
//   every sentence that mentions a depth chart. It will miss role claims phrased
//   loosely, and that is the correct trade: 36 red entries teaches a session to
//   delete the guard, 3 teaches it to fix three entries.
//
// Run: node scripts/test-stale-depth-claims.mjs             (exits non-zero on failure)
//      node scripts/test-stale-depth-claims.mjs --selftest  (proves both rules fire)

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = path.join(repoRoot, "node_modules", ".cache", "rosterxray-stale-depth");
mkdirSync(tmpDir, { recursive: true });

// App.jsx.jsx is the file the dev server and the deploy build serve, so it is
// the file every prose guard reads. See the Sep 12 2026 note in CLAUDE.md.
const res = await build({
  entryPoints: [path.join(repoRoot, "App.jsx.jsx")],
  bundle: true, write: false, format: "esm", platform: "node",
  jsx: "transform", loader: { ".jsx": "jsx" },
  external: ["react", "react-dom", "react/jsx-runtime", "lucide-react", "recharts", "html2canvas"],
  footer: { js: "export { SITUATIONS, RECENT_NEWS, VERDICTS, ADP_DATA, parseNewsDate, seasonNow };" },
});
const bundlePath = path.join(tmpDir, "app.mjs");
writeFileSync(bundlePath, res.outputFiles[0].text);
const { SITUATIONS, RECENT_NEWS, VERDICTS, parseNewsDate, seasonNow } =
  await import(pathToFileURL(bundlePath).href);

// A role claim written last Tuesday survived no games. One written eight days
// ago has had a Sunday land on it. That is the whole of the number.
const IN_SEASON_ROLE_DAYS = 7;

// RULE 1. A claim that forecloses the future. None of these has a safe use in a
// file that is re-read every week.
const PERMANENCE = /\bthe job is settled\b|\bno leash\b|\bjob is locked\b|\blocked in for the season\b|\bthe competition is over\b|\bsettled for the season\b|\bnothing (?:can|will) change (?:it|that)\b|\bpermanently the\b/i;

// RULE 2. A STATED position, not a mention of one. "is the starter" is a claim;
// "the depth chart is unofficial" is analysis and must pass untouched.
//
// ⚠️ THE DETERMINER IS LOAD-BEARING. The first draft allowed a bare role noun
// after the copula and immediately failed a correct Brissett sentence - "$15M
// guaranteed IS STARTER MONEY" is a contract fact, not a depth-chart claim.
// Requiring "the" / "his team's" costs the loose phrasings ("is RB1") and buys
// back the false positive, which is the trade this whole guard is calibrated on.
const ROLE_CLAIM = /\b(?:is|remains|becomes|stays) (?:the|his team's|their) (?:clear |outright |de facto |undisputed |unquestioned )?(?:starter|backup|starting (?:quarterback|running back|receiver|job)|lead back|bell[- ]cow|RB1|RB2|WR1|WR2|TE1|QB1|QB2|QB3)\b|\bnamed (?:the|him the|as the|him) (?:starter|backup|starting \w+|QB\d|RB1|WR1|TE1)\b|\b(?:won|owns|holds) the (?:starting |no\.? ?1 )?job\b/i;

// The cure for rule 2: an instruction to look again. An entry that says when it
// expires is not making a permanent claim, whatever its date.
const RECHECK = /\bre-?check\b|\bre-?validate\b|\bre-?source\b|\bre-?confirm\b|\bunconfirmed\b|\bunresolved\b|\bweek[- ]to[- ]week\b|\bgame to game\b|\blook again\b/i;

// All THREE prose tables, three loops, no exceptions - the Diggs lesson, banked
// in guard 12 on Sep 13 2026 after VERDICTS turned out never to have been swept.
const entries = [];
for (const [k, v] of Object.entries(RECENT_NEWS)) entries.push(["RECENT_NEWS", k, v, v]);
for (const [k, v] of Object.entries(SITUATIONS)) {
  if (v?.trendNote) entries.push(["SITUATIONS", k, v.trendNote, v]);
  if (v?.reason) entries.push(["SITUATIONS.reason", k, v.reason, v]);
}
for (const [k, v] of Object.entries(VERDICTS)) if (v?.reason) entries.push(["VERDICTS.reason", k, v.reason, v]);

const now = Date.now();
const season = seasonNow();

const check = (text, row) => {
  const s = String(text);
  const perm = s.match(PERMANENCE);
  if (perm) return {
    frag: perm[0],
    why: "claims a job is permanently settled - a depth chart is a weekly fact and this entry forecloses next week",
    fix: "state the job and its date; drop the permanence. \"He is the Week 1 starter (Sep 9 2026)\" survives Sunday, \"THE JOB IS SETTLED\" does not.",
  };
  if (!season.inSeason) return null;           // rule 2 is an in-season rule
  const role = s.match(ROLE_CLAIM);
  if (!role) return null;
  if (RECHECK.test(s)) return null;            // it says when it expires
  const d = parseNewsDate(s, now) || (typeof row?.date === "string" ? { ts: Date.parse(row.date + "T00:00:00Z") } : null);
  if (!d || Number.isNaN(d.ts)) return null;   // undated prose is guard 12's problem, not this one
  const ageDays = Math.floor((now - d.ts) / 86400000);
  if (ageDays <= IN_SEASON_ROLE_DAYS) return null;
  return {
    frag: role[0],
    why: `states a current depth-chart position off a ${ageDays}-day-old date, in week ${season.week} - games have been played on top of it`,
    fix: "re-source it, or add the clause that makes it honest: when will you look again?",
  };
};

if (process.argv.includes("--selftest")) {
  const cases = [
    ["permanence fires", "MIN - he was named the starter on Aug 12 2026. THE JOB IS SETTLED.", null, true],
    ["permanence fires on no-leash", "Named the starter Aug 12 2026 with no leash attached.", null, true],
    ["stale role claim fires", "He is the starter (updated Aug 12 2026) and took every first-team rep.", null, season.inSeason],
    ["fresh role claim passes", `He is the starter (updated ${new Date(now).toUTCString().slice(8, 11)} ${new Date(now).getUTCDate()} ${new Date(now).getUTCFullYear()}).`, null, false],
    ["stale role claim with a re-check passes", "He is the starter (updated Aug 12 2026). Re-check after each game.", null, false],
    ["ordinary depth-chart analysis passes", "The depth chart is early and unofficial (updated Aug 12 2026); rookie WR1 labels are the most reversible in August.", null, false],
    ["a negative role read passes", "He is not the lead back and never held the job (updated Aug 12 2026).", null, false],
    // regression: the first draft of ROLE_CLAIM failed this correct sentence
    ["a contract fact is not a role claim", "$15M guaranteed is starter money (updated Aug 28 2026).", null, false],
  ];
  let bad = 0;
  for (const [label, text, row, shouldFail] of cases) {
    const got = !!check(text, row);
    const ok = got === shouldFail;
    if (!ok) bad++;
    console.log(`  ${ok ? "ok  " : "FAIL"}  ${label} (expected ${shouldFail ? "fail" : "pass"}, got ${got ? "fail" : "pass"})`);
  }
  if (!season.inSeason) console.log("  note: rule 2 cases are relaxed because seasonNow() reports the offseason");
  console.log(bad ? `\nSELFTEST FAILED (${bad})` : "\nSELFTEST PASS - both rules fire, and correct prose does not");
  process.exit(bad ? 1 : 0);
}

const failures = [];
for (const [src, key, text, row] of entries) {
  const hit = check(text, row);
  if (hit) failures.push({ src, key, ...hit });
}

if (failures.length) {
  console.error(`FAIL  ${failures.length} prose entr${failures.length === 1 ? "y" : "ies"} make a depth-chart claim the calendar has outrun:\n`);
  for (const f of failures) {
    console.error(`  ${f.src}  "${f.key}"`);
    console.error(`      ${f.why}`);
    console.error(`      ...${f.frag}...`);
    console.error(`      -> ${f.fix}\n`);
  }
  process.exit(1);
}
console.log(`PASS  ${entries.length} prose entries carry no permanent job claim${season.inSeason ? ` and no week-${season.week} role claim older than ${IN_SEASON_ROLE_DAYS} days` : " (rule 2 idle: offseason)"}`);
