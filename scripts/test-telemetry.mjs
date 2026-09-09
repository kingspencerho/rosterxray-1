#!/usr/bin/env node
// GUARD 37 — telemetry may describe the APP, never the USER.
//
// The app is free, has no login, and asks people to paste their own roster into
// it. That makes analytics a trust surface: a single player name in an event
// property is somebody's private team leaving their browser, permanently, into
// a third-party dashboard. It would also be indefensible on a public repo where
// anyone can read exactly what is collected.
//
// So the rule is not "be careful", it is mechanical: every track() call is
// parsed, and every property value is checked against a list of expressions
// that carry user content. Counts, buckets, grades and section titles describe
// how the APP performed. Names, rosters and raw input describe the PERSON.
//
// Run: node scripts/test-telemetry.mjs   (exits non-zero on failure)

import fs from "fs";

const app = fs.readFileSync(new URL("../App.jsx", import.meta.url), "utf8");
let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${cond || !detail ? "" : `  (${detail})`}`);
  if (!cond) fail++;
};

// Strip comments first. A comment EXPLAINING that names must never be tracked
// contains the word "name", and this repo has now lost three guards to exactly
// that (guard 31 on "<button", guard 17 on the cyan token, guard 25 on
// "matchup"). Fourth time is not the charm.
const code = app.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

console.log("\ntelemetry describes the app, never the user");

// Pull every track( ... ) call with its argument list.
const calls = [];
const re = /track\??\.?\(\s*"([a-z_]+)"\s*(?:,\s*(\{[\s\S]*?\})\s*)?\)/g;
let m;
while ((m = re.exec(code))) calls.push({ event: m[1], props: m[2] || "" });

ok("track() calls were found to check", calls.length >= 6, `${calls.length}`);

// Every event name is a snake_case literal, never a variable. A computed event
// name could interpolate anything, including a player.
const literalNames = /track\??\.?\(\s*[^"]/.test(code);
ok("every event name is a string literal, not a variable", !literalNames);

// THE CORE ASSERTION. These identifiers all carry user-authored content.
// LITERAL SUBSTRINGS, not regexes. The first version passed these to RegExp
// and "picks[" threw on an unterminated character class - a guard that crashes
// is a guard that never runs. Nothing on this list needs pattern matching.
const BANNED = [
  "input", "raw", "roster", "picks[", ".name", "playerName", "names",
  "uploadedImages[", "faTaken", "tradeGive", "tradeGet", "textarea",
  "valid[", "r.label",
];
const leaks = [];
for (const c of calls) {
  for (const b of BANNED) {
    if (c.props.includes(b)) leaks.push(`${c.event}: ${b}`);
  }
}
ok("no track() property carries user content", leaks.length === 0, leaks.join(" | "));

// Roster SIZE may be sent; the roster may not. Length and bucket helpers are the
// sanctioned way to describe an input without quoting it.
const sized = calls.filter(c => /picks\.length|\.length/.test(c.props));
ok("input is described by length or bucket, never by value", sized.every(c =>
  !/\bpicks\b(?!\.length)/.test(c.props)));

console.log("\nthe funnel can actually be read");

// A funnel needs its top. Without a session event every later number is a raw
// count with no denominator, and a drop-off is invisible by construction.
const names = calls.map(c => c.event);
for (const need of ["session", "grade", "analyze_empty", "example_run", "section_open"]) {
  ok(`"${need}" is instrumented`, names.includes(need));
}

// The session event must fire on mount with no user action, or it measures
// engagement rather than arrival.
ok("session fires from a mount effect, not from a click",
  /React\.useEffect\(\(\) => \{\s*track\("session"/.test(code));

console.log("\nthe visit counter is not an identifier");

const visitBody = (() => {
  const at = code.indexOf("const RX_VISIT");
  if (at === -1) return "";
  const end = code.indexOf("})();", at);
  return end === -1 ? "" : code.slice(at, end);
})();
ok("RX_VISIT exists", !!visitBody);
// No randomness, no crypto, no uuid: a counter and a date cannot follow a person.
ok("it generates no identifier of any kind",
  !!visitBody && !/random|uuid|crypto|Math\.random|nanoid/i.test(visitBody));
// It must tolerate storage that throws — private windows and blocked site data.
ok("it survives storage being unavailable", /catch\s*\{[^}]*return/.test(visitBody));
// Raw counts never ship; buckets do.
const shipsRaw = calls.some(c => /RX_VISIT\.(n|days)\s*[,}]/.test(c.props));
ok("raw visit counts are bucketed before they are sent", !shipsRaw);

console.log(fail ? `\n${fail} telemetry failure(s)` : "\nall telemetry guards passed");
process.exit(fail ? 1 : 0);
