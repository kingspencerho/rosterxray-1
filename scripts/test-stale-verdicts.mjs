#!/usr/bin/env node
// test-stale-verdicts.mjs — fails when a SITUATIONS verdict contradicts the
// newer, dated RECENT_NEWS entry for the same player.
//
// Why this exists (Aug 2 2026): three verdicts in a row were caught by hand,
// all with the same shape — a judgement written at one point in time outliving
// the evidence that produced it, while a newer RECENT_NEWS entry said the
// opposite. Nobody noticed until a human happened to read both lines.
//
//   wan'dale robinson  verdict "fade" + roleCeiling slot_only, while the note
//                      in the same entry read "not historically slot-only"
//   malik nabers       verdict "hold", trend "falling", "Week 1 uncertain",
//                      while RECENT_NEWS said he AVOIDED the PUP list and took
//                      a full Day 1 practice
//   jonathan taylor    no SITUATIONS entry at all while his rate stats were
//                      being read without the QB-injury context
//
// The Source Hierarchy in CLAUDE.md is explicit: for role/volume questions the
// freshest DATED entry wins, and RECENT_NEWS beats a stale verdict. Two app
// records contradicting each other is worse than either being wrong on its
// own, because the AI prompt receives both and the grade silently picks one.
//
// This is deliberately NARROW. It only fires on unambiguous availability and
// role language, not on tone. A test that cried wolf would get ignored the way
// the eleven duplicate-key build warnings were.
//
// WHAT IT CATCHES (verified against the real cases before shipping):
//   - news says OUT / season-ending, verdict still reads TARGET or rising
//   - news confirms availability (avoided PUP, cleared, named starter),
//     verdict still fade/hold or trending down          <- the Nabers case
//   - news reports a contested or denied role, verdict a clean rising TARGET
//   - the record contradicts itself (TARGET + falling, fade + rising)
//
// WHAT IT DOES NOT CATCH, on purpose:
//   The wan'dale robinson case. His contradiction lived inside his own
//   trendNote prose — the verdict said "fade" and carried a slot_only
//   roleCeiling while the same sentence read "not historically slot-only" —
//   with no availability language anywhere in RECENT_NEWS to compare against.
//   Detecting that needs sentiment analysis of free text, which would be noisy
//   enough to get this test ignored. Reading a note against its own verdict is
//   still a human job.
//
// If this fails: RECENT_NEWS is the newer record. Update the SITUATIONS
// verdict/trend to agree with it, or — if the verdict is right and the news
// line is what's stale — rewrite the news entry. Do not silence the check by
// deleting language from either side.
//
// Run: node scripts/test-stale-verdicts.mjs   (exits non-zero on failure)
import { readFileSync } from "fs";

const src = readFileSync("App.jsx", "utf8");

function tableBody(name) {
  const m = new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`).exec(src);
  if (!m) throw new Error(`${name} not found in App.jsx`);
  return m[1];
}

// --- SITUATIONS: key -> { verdict, trend, line } ---
const situations = new Map();
{
  const body = tableBody("SITUATIONS");
  const offset = src.slice(0, src.indexOf(body)).split("\n").length;
  body.split("\n").forEach((L, i) => {
    const k = /^\s*"([^"]+)"\s*:\s*\{/.exec(L);
    if (!k) return;
    const verdict = /verdict:\s*"([^"]*)"/.exec(L)?.[1] ?? "";
    const trend = /trend:\s*"([^"]*)"/.exec(L)?.[1] ?? "";
    const riskFlags = /riskFlags:\s*\[([^\]]*)\]/.exec(L)?.[1] ?? "";
    situations.set(k[1], { verdict, trend, riskFlags, line: offset + i });
  });
}

// --- RECENT_NEWS: key -> { text, line } ---
const news = new Map();
{
  const body = tableBody("RECENT_NEWS");
  const offset = src.slice(0, src.indexOf(body)).split("\n").length;
  body.split("\n").forEach((L, i) => {
    const k = /^\s*"([^"]+)"\s*:\s*"([\s\S]*)"\s*,\s*$/.exec(L);
    if (!k) return;
    news.set(k[1], { text: k[2], line: offset + i });
  });
}

// --- VERDICTS: the THIRD prose layer, and the one this test used to miss ---
//
// Added Aug 5 2026 after three verdicts were found contradicting their own
// newer RECENT_NEWS entries — kyler murray ("heavy favorite" vs an OPEN
// competition), eli stowers ("buy now, TE1 in 2027" vs buried at TE3), and
// travis hunter (a WR2 projection vs reporting that he plays mostly corner).
// All three were missed by the SAME session that fixed their SITUATIONS rows,
// which is exactly why this needs to be mechanical rather than remembered.
//
// The app self-protects at runtime: analyzeRoster marks a verdict `stale` past
// 45 days and the prompt filters those out, so an aged wrong verdict is inert
// rather than actively lying. That is why this check is scoped to CONTRADICTION
// rather than age. Age alone is not a defect here — it is the designed expiry.
// What IS a defect is a verdict that disagrees with fresher news, because the
// moment someone refreshes the date without re-reading the content, it goes live.
const verdicts = new Map();
{
  const body = tableBody("VERDICTS");
  const offset = src.slice(0, src.indexOf(body)).split("\n").length;
  body.split("\n").forEach((L, i) => {
    const k = /^\s*"([^"]+)"\s*:\s*\{/.exec(L);
    if (!k) return;
    const verdict = /verdict:\s*"([^"]*)"/.exec(L)?.[1] ?? "";
    const date = /date:\s*"([^"]*)"/.exec(L)?.[1] ?? "";
    const reason = /reason:\s*"([^"]*)"/.exec(L)?.[1] ?? "";
    verdicts.set(k[1], { verdict, date, reason, line: offset + i });
  });
}

// Unambiguous signals only. Each must be a phrase that cannot reasonably appear
// in a note arguing the opposite direction.
const OUT = [
  /\bOUT FOR (THE )?20\d\d\b/i, /\bseason-ending\b/i, /\bundraftable\b/i,
  /\bplaced on (season-ending )?IR\b/i, /\bmiss the (entire|whole) season\b/i,
];
const AVAILABLE = [
  /\bAVOIDED the PUP\b/i, /\bactivated off (the )?PUP\b/i,
  /\bcleared for full participation\b/i, /\bno known limitations\b/i,
  /\bfully cleared\b/i, /\bNAMED THE STARTER\b/i,
];
const ROLE_DENIED = [
  /\bDENY the expected\b/i, /\breps DENY\b/i, /\bOPEN QB COMPETITION\b/i,
];

const hit = (t, pats) => pats.some((p) => p.test(t));
const NEGATIVE_VERDICT = (v) => /^(fade|hard fade|hold)$/i.test(v);
const POSITIVE_VERDICT = (v) => /^target/i.test(v);

const fails = [];
for (const [player, sit] of situations) {
  const n = news.get(player);
  if (!n) continue;

  // 1. News says the player is OUT, verdict still reads like a buy.
  if (hit(n.text, OUT) && (POSITIVE_VERDICT(sit.verdict) || sit.trend === "rising")) {
    fails.push({ player, sit, n, why: `RECENT_NEWS says the player is OUT, but SITUATIONS reads verdict "${sit.verdict}" / trend "${sit.trend}"` });
    continue;
  }
  // 2. News confirms availability, verdict still trending down. (The Nabers case.)
  if (hit(n.text, AVAILABLE) && (sit.trend === "falling" || NEGATIVE_VERDICT(sit.verdict))) {
    fails.push({ player, sit, n, why: `RECENT_NEWS confirms availability, but SITUATIONS reads verdict "${sit.verdict}" / trend "${sit.trend}"` });
    continue;
  }
  // 3. News says the role is contested or denied, verdict still a clean TARGET.
  if (hit(n.text, ROLE_DENIED) && POSITIVE_VERDICT(sit.verdict) && sit.trend === "rising") {
    fails.push({ player, sit, n, why: `RECENT_NEWS reports a contested or denied role, but SITUATIONS reads verdict "${sit.verdict}" / trend "rising"` });
    continue;
  }
  // 4. The record contradicts itself: verdict and trend point opposite ways.
  //
  // EXCEPTION — schedule_avoid. `trend` tracks the PLAYER (role, opportunity);
  // `verdict` is the draft call. Those normally move together, which is why
  // this check exists. They come apart legitimately when the fade is driven by
  // the W15-17 schedule rather than by the player: Jaylin Noel went from
  // "competing for WR3" to a listed STARTER in Aug 2026 while HOU's playoff
  // slate (JAX / @PHI / @GB) stayed a 3-week avoid. Rising role, unchanged
  // fade. Forcing trend back to "stable" there would delete a true fact to
  // satisfy a check, which is backwards — so the app's own schedule_avoid
  // riskFlag is what licenses the divergence. Anything else still fires.
  const scheduleDriven = /schedule_avoid/.test(sit.riskFlags);
  if (POSITIVE_VERDICT(sit.verdict) && sit.trend === "falling") {
    fails.push({ player, sit, n, why: `SITUATIONS is internally inconsistent: verdict "${sit.verdict}" with trend "falling"` });
  } else if (NEGATIVE_VERDICT(sit.verdict) && sit.trend === "rising" && !/^hold$/i.test(sit.verdict) && !scheduleDriven) {
    fails.push({ player, sit, n, why: `SITUATIONS is internally inconsistent: verdict "${sit.verdict}" with trend "rising" (add the schedule_avoid riskFlag if the fade is purely a W15-17 schedule call and the player himself is improving)` });
  }
}

// === VERDICTS vs RECENT_NEWS ===
// A dated verdict whose news entry is NEWER and points the other way. Only
// fires when the news is genuinely more recent than the verdict, so a verdict
// updated today against older news is fine.
let verdictPairs = 0;
for (const [player, v] of verdicts) {
  const n = news.get(player);
  if (!n || !v.date) continue;
  verdictPairs++;
  const blob = `${v.verdict} ${v.reason}`;

  // The news says the role is contested/denied while the verdict asserts it is
  // settled. "heavy favorite" / "confirmed" / "locked" are the tells.
  const assertsSettled = /\b(heavy favorite|confirmed|locked|no competition|clear starter|won the job)\b/i.test(blob);
  if (hit(n.text, ROLE_DENIED) && assertsSettled) {
    fails.push({ player, sit: { verdict: v.verdict, line: v.line }, n,
      why: `VERDICTS asserts a settled role ("${v.verdict}", ${v.date}) but RECENT_NEWS reports the role is contested or unresolved` });
    continue;
  }
  // News says OUT, verdict still a buy.
  if (hit(n.text, OUT) && POSITIVE_VERDICT(v.verdict)) {
    fails.push({ player, sit: { verdict: v.verdict, line: v.line }, n,
      why: `VERDICTS reads "${v.verdict}" (${v.date}) but RECENT_NEWS says the player is OUT` });
  }
}

if (fails.length === 0) {
  console.log(`PASS  ${situations.size} SITUATIONS + ${verdictPairs} VERDICTS entries checked against ${news.size} RECENT_NEWS entries — no contradictions`);
  process.exit(0);
}

console.log(`FAIL  ${fails.length} stale or self-contradicting verdict(s):\n`);
for (const f of fails) {
  console.log(`  "${f.player}"`);
  console.log(`      ${f.why}`);
  console.log(`      SITUATIONS   L${f.sit.line}`);
  console.log(`      RECENT_NEWS  L${f.n.line}  ${f.n.text.slice(0, 96)}…`);
  console.log();
}
console.log("RECENT_NEWS is the newer record — update the verdict to agree with it,");
console.log("or rewrite the news entry if the verdict is the one that's right.");
process.exit(1);
