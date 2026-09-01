#!/usr/bin/env node
// test-status-layer.mjs — guard 26. The Sleeper availability / depth-chart layer.
//
// THIS GUARD HOLDS THREE PROMISES, AND THE SECOND ONE IS UNUSUAL.
//
//   1. CONTEXT ONLY.  Same promise every layer since Jul 26 2026 carries: it
//      must never reach analyzeRoster or analyzeRedraft. A layer that starts
//      scoring silently invalidates every calibration figure in CLAUDE.md —
//      nothing errors, the numbers just quietly stop meaning what they meant.
//
//   2. NOT WIRED AT ALL, YET.  Approved Sep 1 2026: build it, ship it reading,
//      do not render until the feed has been watched for a week. Sleeper is
//      third-party and unversioned, unlike a pinned nflverse release, so the
//      watch is the whole point. This guard asserts App.jsx has NO consumer of
//      any kind — so wiring one is a deliberate act that fails the build until
//      someone updates this file on purpose.
//
//   3. THE FEED NEVER WINS.  A fetched status may not overwrite, outrank or
//      out-date a hand-written note. Asserted structurally against
//      report-stale-news.mjs, which is the only reader.
//
// ⚠️ ASSERTION IDIOM: ok(label, condition). CLAUDE.md records the one-argument
// ok() trap biting three times in this repo — a helper that always prints a
// pass makes every assertion in the file a no-op and both negative tests pass.
// Every assertion below was negative-tested by breaking it on purpose.
//
// Run: node scripts/test-status-layer.mjs   (exits non-zero on failure)

import { readFileSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
const rd = f => JSON.parse(readFileSync(path.join(repoRoot, f), "utf8"));
const txt = f => readFileSync(path.join(repoRoot, f), "utf8");

const STATUS = rd("grading/data/status_2026.json");
const app = txt("App.jsx");
const mirror = txt("App.jsx.jsx");
const builder = txt("scripts/build-status.py");
const report = txt("scripts/report-stale-news.mjs");
const refresh = txt("scripts/refresh-inseason.sh");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${cond || !detail ? "" : `  (${detail})`}`);
  if (!cond) fail++;
};

// Body of a top-level arrow/function by brace depth. Same technique the other
// containment guards use.
const bodyOf = (src, decl) => {
  const at = src.indexOf(decl);
  if (at < 0) return null;
  const open = src.indexOf("{", at);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  return null;
};

// ---- 1. CONTAINMENT: no consumer anywhere, engines clean ------------------
console.log("containment");

ok("App.jsx and App.jsx.jsx are identical", app === mirror);

// The layer is deliberately unwired. Each of these is a way it could be
// consumed; all must be absent until the watch period ends.
const CONSUMER_TOKENS = ["status_2026", "STATUS_LAYER", "getStatus(", "statusContext", "getPlayerStatus"];
for (const tok of CONSUMER_TOKENS) {
  ok(`App.jsx has no consumer: ${tok}`, !app.includes(tok),
    "approved Sep 1 2026 as build-but-do-not-render — wiring this is a deliberate act, update this guard first");
}

// Survives assertion 1 being deliberately relaxed later: even once a reviewed
// consumer exists, the engines must stay clean. This is the assertion that
// actually protects the grades.
for (const engine of ["const analyzeRoster = ", "const analyzeRedraft = "]) {
  const body = bodyOf(app, engine);
  ok(`${engine.trim()} found`, !!body);
  if (!body) continue;
  const name = engine.match(/analyze\w+/)[0];
  for (const tok of [...CONSUMER_TOKENS, "STATUS"]) {
    // Identifier boundary, not a substring: "STATUS" appears in ordinary prose.
    const re = tok.endsWith("(") || tok.includes("_2026")
      ? new RegExp(tok.replace(/[().]/g, m => "\\" + m))
      : new RegExp(`(^|[^A-Za-z0-9_$])${tok}[.\\[(]`);
    ok(`${name} never reads ${tok}`, !re.test(body),
      "a context layer reaching the scoring engine moves grades and invalidates every recorded calibration");
  }
}

// ---- 2. THE FILE DECLARES WHAT IT IS ---------------------------------------
console.log("\nself-description");

const m = STATUS._meta;
ok("context_only is true", m.context_only === true);
ok("reaches_ai_prompt is false", m.reaches_ai_prompt === false,
  "RECENT_NEWS reaches the model under 'override everything above for these players' — the highest-authority block in the prompt. An unattended feed must not sit there.");
ok("renders is false", m.renders === false, "the approved decision was build-but-do-not-render");
ok("renders_reason explains why", typeof m.renders_reason === "string" && m.renders_reason.length > 40);

ok("conflict_rule says the feed NEVER overwrites",
  /NEVER overwrites/.test(m.conflict_rule) && /flag/i.test(m.conflict_rule));
ok("why_not_freshest_wins is recorded", typeof m.why_not_freshest_wins === "string" &&
  /decoration/.test(m.why_not_freshest_wins),
  "the reasoning is what stops a future session 'simplifying' this to freshest-date-wins");

// A snapshot has no year-over-year r. R4: a borrowed prior is not a finding,
// and an invented one is worse. Explicit null, never a number.
ok("stability is explicitly null, not a number", m.stability === null,
  "a point-in-time snapshot has no year-over-year correlation — inventing one would license the model to weigh it");

ok("join_key names normalize(full_name), not gsis_id",
  /normalize\(full_name\)/.test(m.join_key) && /NOT gsis_id/.test(m.join_key),
  "Sleeper carries gsis_id on 18% of skill players and no layer in grading/data/ keys on it");

// ---- 3. SHAPE CANNOT DRIFT -------------------------------------------------
console.log("\nrow shape");

const ROW_FIELDS = m.row_fields;
ok("row_fields is declared in _meta", Array.isArray(ROW_FIELDS) && ROW_FIELDS.length > 0);
for (const f of ROW_FIELDS) {
  ok(`builder emits ${f}`, new RegExp(`"${f}"\\s*:`).test(builder));
}

const rows = Object.entries(STATUS.players);
let shapeBad = null;
for (const [k, v] of rows) {
  const keys = Object.keys(v).sort().join(",");
  if (keys !== [...ROW_FIELDS].sort().join(",")) { shapeBad = `${k}: ${keys}`; break; }
}
ok(`every row matches row_fields exactly (${rows.length} rows)`, !shapeBad, shapeBad || "");

// The placeholder is generated by the real builder, so an empty file is not a
// special case — it carries the same _meta a live run does.
ok("counts cover all four positions", ["QB", "RB", "WR", "TE"].every(p => p in m.counts));
ok("hard_status is a non-empty list", Array.isArray(m.hard_status) && m.hard_status.length > 0);

// ---- 4. THE JOIN MIRRORS App.jsx -------------------------------------------
console.log("\njoin key");

// normalize() in App.jsx: lowercase, trim, strip . , ' ’ , hyphen->space,
// collapse whitespace. The builder must mirror it character for character —
// a second resolver is a second thing to drift.
ok("App.jsx normalize is still the expected shape",
  /const normalize = \(s\) => s\.toLowerCase\(\)\.trim\(\)\.replace\(\/\[\.,''\]\/g, ""\)\.replace\(\/-\/g, " "\)\.replace\(\/\\s\+\/g, " "\)/.test(app),
  "if this fails, App.jsx's normalize changed and build-status.py must be updated to match");
ok("builder strips the same punctuation class", /\[\.,'’\]/.test(builder));
ok("builder maps hyphen to space", /replace\("-", " "\)/.test(builder));
ok("builder does NOT strip accents", !/unicodedata|normalize\('NFK/.test(builder),
  "the metrics file carries accented names; stripping here would silently unjoin every one");

const badKey = Object.keys(STATUS.players).find(k => k !== k.toLowerCase() || /[.,'’-]/.test(k));
ok("no emitted key carries uppercase or stripped punctuation", !badKey, badKey || "");

// ---- 5. THE TWO CLOCKS, AND THE FEED NEVER WINS ----------------------------
console.log("\nthe two clocks");

ok("report declares a 7-day status clock", /STATUS_STALE_DAYS\s*=\s*7\b/.test(report));
ok("the prose clock is still the framework's own rule",
  /45-day rule/.test(report) && /notes\.some\(n => n\.status !== "stale"\)/.test(report),
  "section 1 must keep ageing prose against 30-45 days — the status clock is additive, not a replacement");
ok("the status clock only applies in season", /season\.inSeason\s*&&/.test(report),
  "a 7-day clock out of season would flag the whole corpus every August");

// The report is the ONLY reader, and it must not write.
ok("report reads the layer directly, not through App.jsx",
  /readFileSync\(path\.join\(root, "grading\/data\/status_2026\.json"\)/.test(report),
  "reading it here rather than in App.jsx is what keeps containment true by construction");
for (const mutation of [/\.date\s*=[^=]/, /\.ageDays\s*=[^=]/, /notes\[[^\]]*\]\s*=[^=]/]) {
  ok(`report never assigns ${mutation}`, !mutation.test(report),
    "the feed flags; it never edits a note, a date or an age");
}
ok("report prints the questions-not-corrections warning",
  /QUESTIONS, NOT CORRECTIONS/.test(report));
ok("report skips players whose note post-dates the feed", /feedTs <= noteTs\) continue/.test(report),
  "a note written after the feed already knows the status is not contradicted by it");

// ---- 6. WIRED INTO THE WEEKLY JOB ------------------------------------------
console.log("\nrefresh wiring");

ok("refresh-inseason.sh calls the builder", /build-status\.py/.test(refresh));
ok("the Sleeper step has its own fetch", /api\.sleeper\.app\/v1\/players\/nfl/.test(refresh),
  "it cannot reuse the nflverse download — different host, and it is the only step that returns data pre-season");
ok("a partial refresh is reported as partial", /got_any/.test(refresh) && /Partly refreshed/.test(refresh),
  "Sleeper returning while the season releases 404 is the NORMAL pre-season outcome; reporting it as 'nothing refreshed' is a false negative");
ok("the raw dump is never written into the repo", !/grading\/data\/sleeper\.json/.test(refresh),
  "14.6MB of raw payload belongs in $TMP and dies with the trap");

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
