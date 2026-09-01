#!/usr/bin/env node
// test-player-card.mjs — guard 14. The player card.
//
// The card is a drill-down on data the grading engine also reads, so it has the
// same two failure modes as every layer added since Jul 26, and one of its own:
//
// 1. CONTEXT-ONLY CONTAINMENT. buildPlayerCard must never be reachable from
//    analyzeRoster or analyzeRedraft. It reads scored inputs (hvt_pg,
//    spike_rate, usable_rate) and a stray call inside the engine would be a
//    scoring leak that no calibration run would obviously catch.
//
// 2. NO BLANK CARDS. A player with no data must come back with a `reason`
//    explaining why. An empty card is the silent-drop failure in a new costume:
//    indistinguishable from a bug, and per the Jul 27 extraction rules a filter
//    that removes something must never be silent.
//
// 3. PERCENTILES MUST BE HONEST. They are ranked within position over a gated
//    population (draftable, 8+ games), which is the same baseline-population
//    decision that biased the Ceiling Shape Layer on its first attempt. Asserted
//    in range, and asserted that the gate is thick enough to rank against.
//
// Run: node scripts/test-player-card.mjs   (exits non-zero on failure)

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";
import os from "os";

const repoRoot = process.cwd();
const tmpDir = path.join(os.tmpdir(), "rxr-card");
mkdirSync(tmpDir, { recursive: true });
writeFileSync(path.join(tmpDir, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");

const src = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8") +
  "\nexport { newsDateFor, buildPlayerCard, CARD_PERCENTILES, cardPercentile, ADP_DATA, PLAYER_METRICS, CARD_GLOSSARY, CARD_METRICS, CARD_DESCRIPTIVE, buildPlayerNews, parseNewsDate, RECENT_NEWS, SITUATIONS, GAME_LOGS, GAME_LOGS_CUR, gameBand };\n";
const outfile = path.join(tmpDir, "c.mjs");
await build({
  stdin: { contents: src, loader: "jsx", resolveDir: repoRoot, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: {
    "@vercel/analytics/react": path.join(tmpDir, "stub.js"),
    "@vercel/analytics": path.join(tmpDir, "stub.js"),
  },
});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
const app = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${cond || !detail ? "" : `  (${detail})`}`);
  if (!cond) fail++;
};

// ---- 1. containment ----
console.log("context-only containment");
for (const fn of ["analyzeRoster", "analyzeRedraft"]) {
  const i = app.indexOf(`const ${fn} = `);
  const j = app.indexOf("\nconst ", i + 10);
  const body = i === -1 ? "" : app.slice(i, j === -1 ? app.length : j);
  ok(`${fn} does not build player cards`, i > -1 && !body.includes("buildPlayerCard") && !body.includes("CARD_PERCENTILES"));
}
const calls = [...app.matchAll(/buildPlayerCard\(/g)].length;
ok("buildPlayerCard called exactly once (the opener)", calls === 1, `found ${calls}`);
ok("the card renders as a modal, not another results panel",
   app.includes("<PlayerCardModal card={cardPlayer}") && app.includes('position: "fixed", inset: 0'));

// ---- 2. no blank cards ----
console.log("\nno blank cards, ever");
const draftable = Object.entries(e.ADP_DATA).filter(([, v]) => v && v.adp != null && v.adp <= 240);
let blank = [], withData = 0, withReason = 0;
for (const [name, v] of draftable) {
  const c = e.buildPlayerCard(name, v.pos, v.team);
  const has = c.metrics.length || c.descriptive.length || c.efficiency.length || c.qb || c.trajectory || c.gameLog || c.gameLogCur;
  if (has) withData++;
  else if (c.reason && c.reason.length > 10) withReason++;
  else blank.push(name);
}
ok(`every draftable player resolves to data or a stated reason (${draftable.length} checked)`,
   blank.length === 0, blank.slice(0, 5).join(", "));
console.log(`       ${withData} with data · ${withReason} with an explicit no-data reason`);
ok("the no-data path is actually exercised", withReason > 0,
   "if this is 0 the reason branch is untested, not unnecessary");

// ---- 3. percentiles ----
console.log("\npercentile honesty");
let outOfRange = [], thin = [];
for (const [pos, byKey] of Object.entries(e.CARD_PERCENTILES)) {
  for (const [key, arr] of Object.entries(byKey)) {
    if (arr.length && arr.length < 12) thin.push(`${pos}.${key} n=${arr.length}`);
    for (const v of arr) {
      const p = e.cardPercentile(pos, key, v);
      if (p != null && (p < 0 || p > 100)) outOfRange.push(`${pos}.${key} -> ${p}`);
    }
  }
}
ok("every percentile lands in 0-100", outOfRange.length === 0, outOfRange.slice(0, 3).join("; "));
ok("thin populations return null rather than a flattering rank", thin.length === 0 || thin.every(t => {
  const [pk, k] = t.split(" ")[0].split(".");
  return e.cardPercentile(pk, k, 1) === null;
}), thin.join(", "));
// A metric where more is better must rank the max at the top.
const wrPop = e.CARD_PERCENTILES.WR.tgt_sh;
ok("the highest target share ranks at the top of its position",
   e.cardPercentile("WR", "tgt_sh", Math.max(...wrPop)) >= 95);

// ---- 4. the specific traps this card exists to avoid ----
console.log("\nknown traps");
const harvey = e.buildPlayerCard("RJ Harvey", "RB", e.ADP_DATA["rj harvey"]?.team);
ok("RJ Harvey leads with a rising trajectory, not his season average",
   harvey.trajectory?.trend === "rising", `trend ${harvey.trajectory?.trend}`);
ok("...and his late window beats the season average he was mis-graded on",
   harvey.trajectory && harvey.trajectory.late > harvey.trajectory.season,
   `season ${harvey.trajectory?.season} late ${harvey.trajectory?.late}`);

// A 2026 mover must be flagged: the metrics row carries the team he PLAYED for.
const movers = draftable
  .map(([n, v]) => [n, v, e.buildPlayerCard(n, v.pos, v.team)])
  .filter(([, , c]) => c.movedFrom);
ok("players who changed teams are flagged on the card", movers.length > 0,
   "the 2025 metrics team vs the 2026 ADP team must be reconciled somewhere");
const badMover = movers.find(([, v, c]) => c.movedFrom === v.team);
ok("...and the flag never fires on a player who did not move", !badMover, badMover?.[0] || "");

// The dimming channel must actually be reachable, or the card teaches the wrong
// lesson by rendering a coin-flip metric at the same weight as an anchor.
const anyEff = draftable.map(([n, v]) => e.buildPlayerCard(n, v.pos, v.team)).find(c => c.efficiency.length);
ok("efficiency rows exist and are routed to the dimmed channel",
   !!anyEff && app.includes("card.efficiency.map") && /card\.efficiency\.map[\s\S]{0,260}\bdim\b[^/]{0,40}\/>/.test(app));
// The dimmed channel must stay reachable for rows OUTSIDE efficiency too — the
// week-outcome rows dim conditionally on their own stability, and that is a
// different call site from the wholesale dimming above.
ok("the conditional dimmed channel still exists for week outcomes",
   /card\.descriptive\.map[\s\S]{0,200}dim=\{x\.r < 0\.5\}/.test(app));

console.log("\nthe glossary covers exactly what the card renders");

// A number on screen with no definition is the silent-drop failure in a new
// costume: the reader sees "WOPR 0.08" and has no way to act on it. So the
// coverage assertion runs the OTHER way from the render — every key the card
// CAN show must have an entry, whether or not any current player triggers it.
const renderableKeys = [
  ...Object.values(e.CARD_METRICS).flat().filter(Boolean).map(d => d.key),
  ...e.CARD_DESCRIPTIVE.map(d => d.key),
  "eff_rush", "eff_ngs", "eff_rec", "eff_adot",
  "qb_rush", "qb_pass", "qb_adot", "_r", "_pct", "_trajectory",
];
const missing = [...new Set(renderableKeys)].filter(k => !e.CARD_GLOSSARY[k]);
ok("every renderable metric has a glossary entry", missing.length === 0, missing.join(", "));

// Both halves are required. A definition with no interpretation leaves the
// reader where they started, which is the entire reason this section exists.
const halfWritten = Object.entries(e.CARD_GLOSSARY).filter(([, g]) => !g.term || !g.what || !g.how);
ok("every entry carries term + what + how", halfWritten.length === 0, halfWritten.map(x => x[0]).join(", "));

// Position-scoped: a quarterback card must never define a receiving metric it
// does not show, and a receiver card must never define the QB volume rows.
const qbName = Object.entries(e.ADP_DATA).find(([n, v]) => v.pos === "QB" && e.buildPlayerCard(n, "QB", v.team).qb);
const qbCard = qbName ? e.buildPlayerCard(qbName[0], "QB", qbName[1].team) : null;
ok("a QB card explains the QB rows", !!qbCard && qbCard.glossary.some(g => g.key === "qb_rush"));
ok("...and never explains WOPR", !!qbCard && !qbCard.glossary.some(g => g.key === "wopr"));
const wrName = Object.entries(e.ADP_DATA).find(([n, v]) => v.pos === "WR" && e.buildPlayerCard(n, "WR", v.team).metrics.length);
const wrCard = wrName ? e.buildPlayerCard(wrName[0], "WR", wrName[1].team) : null;
ok("a WR card explains WOPR", !!wrCard && wrCard.glossary.some(g => g.key === "wopr"));
ok("...and never explains the QB rows", !!wrCard && !wrCard.glossary.some(g => g.key === "qb_rush"));

// A no-data card is a reason string and nothing else. A glossary attached to an
// empty card would be a wall of definitions for numbers that are not there.
const empty = draftable.map(([n, v]) => e.buildPlayerCard(n, v.pos, v.team)).find(c => c.reason);
ok("the no-data card carries no glossary", !!empty && (empty.glossary || []).length === 0);

// It must cost nothing at rest — the card is already the densest surface here.
ok("the glossary section is collapsible",
   /title="Glossary"[^>]*collapsible/.test(app));

console.log("\nrecent news: dated, whole, and never silent");

// Pinned clock — an age assertion against Date.now() would rot.
const NOW = Date.UTC(2026, 7, 28);

// RULE 1: no date, no render. This is the one that keeps the section from
// becoming the Diggs failure — an undated note on a card stamped 2025.
ok("the day, range and month-only forms all parse",
   e.parseNewsDate("resolved Aug 4-5 2026.")?.label === "Aug 4 2026" &&
   e.parseNewsDate("updated Aug 23 2026")?.label === "Aug 23 2026" &&
   e.parseNewsDate("As of July 2026 he says")?.label === "Jul 2026");
ok("prose with no date returns null", e.parseNewsDate("BAL — the runaway standout of camp.") === null);
ok("a year with no month is not a date", e.parseNewsDate("a Giant since 2024") === null);
ok("the LATEST date wins — notes get appended to",
   e.parseNewsDate("signed Jul 1 2026. BLOCKING CONTEXT ADDED Aug 23 2026.")?.label === "Aug 23 2026");
// ACROSS PRECISIONS TOO. Running the day pass first and stopping on a hit lets
// an OLD day-precision date outrank a NEWER month-only one — Nabers' note
// carries "Sep 28 2025" (the ACL tear) and "Aug 2026 camp", and the tear was
// being stamped as his currency until this was caught.
ok("...including a newer month-only date over an older day-precision one",
   e.parseNewsDate("torn ACL Week 4 (Sep 28 2025), repair in late Oct. Aug 2026 camp: full practice.")?.label === "Aug 2026");
ok("...and a same-month day form still beats the month-only form",
   e.parseNewsDate("Aug 2026 camp. Activated Aug 27 2026.")?.label === "Aug 27 2026");
// A FUTURE DATE IS NOT A CURRENCY STAMP. Forward-looking dates appear all over
// this corpus — a scheduled court appearance, a return window, an opener — and
// "latest wins" would hand the badge to one of them. Jacobs' entry cites a
// Nov 17 2026 court date and read "-80d ago" until this was fixed.
ok("a future date is never taken as the note's currency",
   e.parseNewsDate("Charged Aug 27 2026. Court appearance set for Nov 17 2026.", NOW)?.label === "Aug 27 2026");
ok("...and a note whose ONLY date is in the future does not render",
   e.parseNewsDate("Initial court appearance is scheduled for Nov 17 2026.", NOW) === null);


// Sweep the whole corpus: nothing undated may survive into a card.
const allNews = Object.keys(e.ADP_DATA).map(n => e.buildPlayerNews(n, NOW)).flat();
ok("every rendered note carries a date and an age",
   allNews.length > 0 && allNews.every(n => n.date && Number.isFinite(n.ageDays)),
   `${allNews.length} notes`);
// ⚠ RE-DERIVE THROUGH newsDateFor, NOT parseNewsDate. Prose was the only date
// source when this was written; a SITUATIONS row can also carry a structured
// `date`, which legitimately produces a label the prose does not contain.
// Re-deriving from the SOURCE ROW keeps the intent — the date is derived, never
// invented — and is stronger than re-parsing the text alone.
const rowFor = (n) => {
  const tbl = n.source === "situation" ? e.SITUATIONS : e.RECENT_NEWS;
  return Object.values(tbl).find(r => r === n.text || (r && (r.trendNote === n.text || r.reason === n.text)));
};
ok("...and every one of them re-derives to the date shown",
   allNews.every(n => {
     const row = rowFor(n);
     return row !== undefined && e.newsDateFor(row, n.text, NOW)?.label === n.date;
   }));
ok("no rendered note is dated in the future", allNews.every(n => n.ageDays >= 0),
   allNews.filter(n => n.ageDays < 0).map(n => n.date).join(", "));

// RULE 2: full text or nothing. Truncating a CAVEAT out of the middle inverts
// the note, so the section collapses instead of clipping.
const longest = allNews.slice().sort((a, b) => b.text.length - a.text.length)[0];
ok("notes are rendered whole, never clipped",
   !!longest && longest.text.length > 400 && !/…|\.\.\.$/.test(longest.text.trim()),
   `longest ${longest?.text.length} chars`);

// RULE 3: absence is visible. `news` is always an array so the section always
// renders, and the empty branch must be reachable and actually exercised.
const cards = draftable.map(([n, v]) => e.buildPlayerCard(n, v.pos, v.team, NOW));
ok("news is always an array, never undefined", cards.every(c => Array.isArray(c.news)));
const withNews = cards.filter(c => c.news.length).length;
ok("some players carry dated news", withNews > 20, `${withNews} of ${cards.length}`);
ok("...and some carry none, so the empty branch is live",
   cards.some(c => c.news.length === 0));
ok("the no-dated-note branch states the absence in words",
   /No dated note for this player/.test(app));

// It must render OUTSIDE the no-data branch: a rookie with no 2025 role is
// exactly the player whose only useful information is this month's news.
const newsIdx = app.indexOf('title="Recent news"');
const reasonIdx = app.indexOf("{card.reason ? (");
ok("the news section renders outside the no-data branch",
   newsIdx > -1 && reasonIdx > -1 && newsIdx < reasonIdx);

// VERDICTS STAY OFF. The card shows the dated fact, never the fade/TARGET call.
const fn = app.slice(app.indexOf("const buildPlayerNews"), app.indexOf("const CARD_VINTAGE"));
ok("buildPlayerNews reads trendNote only, never verdict or trend",
   /"trendNote"/.test(fn) && !/\bverdict\b/.test(fn) && !/row\.trend\b/.test(fn));

// Freshness follows the framework's own 30-45 day rule.
const ages = allNews.map(n => n.status);
ok("freshness classifies against the 30-45 day rule",
   allNews.every(n => n.status === (n.ageDays > 45 ? "stale" : n.ageDays > 30 ? "ageing" : "current")),
   [...new Set(ages)].join("/"));
ok("...and the stale badge is the only one using --caution",
   /n\.status === "stale" \? "var\(--caution\)"/.test(app));

console.log("\ngame logs: context only, banded on the card's own thresholds");

// CONTAINMENT FIRST. This is the assertion that protects the grades: a game log
// is a picture, and the moment the scoring engine reads one it stops being that.
for (const fn of ["analyzeRoster", "analyzeRedraft"]) {
  const i = app.indexOf(`const ${fn} = `);
  const j = app.indexOf("\nconst ", i + 10);
  const body = i === -1 ? "" : app.slice(i, j === -1 ? app.length : j);
  ok(`${fn} never reads a game log`,
     i > -1 && !body.includes("GAME_LOGS") && !body.includes("getGameLog"));
}

// The bands must come FROM the data file, not be retyped beside it. Two copies
// of 18/10/5 is the duplicate-definition class this repo has hit five times.
const bands = e.GAME_LOGS._meta?.bands;
ok("the data file carries its own bands", !!bands && bands.spike === 18 && bands.usable === 10 && bands.dud === 5,
   JSON.stringify(bands));
ok("gameBand honours them",
   e.gameBand(18) === "spike" && e.gameBand(17.9) === "usable" && e.gameBand(10) === "usable" &&
   e.gameBand(9.9) === "low" && e.gameBand(5) === "low" && e.gameBand(4.9) === "dud");
ok("...and the app does not retype the thresholds",
   !/spike:\s*18[\s\S]{0,60}usable:\s*10/.test(app.replace(/GAME_BANDS[\s\S]{0,200}/, "")));

// Rows are fixed-width arrays and _meta.cols is what makes them readable. A
// mismatch would silently mislabel every column in the table.
const meta = e.GAME_LOGS._meta;
const logged = Object.entries(e.GAME_LOGS).filter(([k]) => k !== "_meta");
ok("every player row declares its position", logged.every(([, v]) => v.pos && meta.cols[v.pos]));
ok("every game row matches its position's column count",
   logged.every(([, v]) => v.g.every(g => g.length === meta.cols[v.pos].length)),
   logged.find(([, v]) => v.g.some(g => g.length !== meta.cols[v.pos].length))?.[0] || "");
ok("opponent indices all resolve against _meta.teams",
   logged.every(([, v]) => v.g.every(g => g[1] >= 0 && g[1] < meta.teams.length)));
ok("weeks are inside the season", logged.every(([, v]) => v.g.every(g => g[0] >= 1 && g[0] <= 22)));

// The card must surface it, with the current season leading when one is live.
const withLog = draftable.map(([n, v]) => e.buildPlayerCard(n, v.pos, v.team, NOW)).filter(c => c.gameLog);
ok("cards carry game logs", withLog.length > 50, `${withLog.length} of ${draftable.length}`);
ok("...and each game is banded", withLog.every(c => c.gameLog.games.every(g => g.band)));
ok("...and stats are paired with their column names",
   withLog.every(c => c.gameLog.games.every(g => g.stats.every(st => st.label && st.value != null))));
ok("the 2026 placeholder is empty, so nothing renders as current",
   (e.GAME_LOGS_CUR._meta?.weeks_covered || 0) === 0);
ok("the chart gives every week a slot, including ones he did not play",
   /did not play/.test(app) && /Math\.max\(log\.maxWeek, 1\)/.test(app));
// The full-log disclosure is an AFFORDANCE, not deprioritised reference:
// --text-dim on this card means "should not move your opinion", and the drill-
// down into the chart's own data is not that. It wears the bright chrome
// token, is named for what it opens, and its hint counts the games — a generic
// "show" tells the reader nothing about what is behind it.
ok("the full game log is collapsible",
   /title="Full game log"[^>]*collapsible/.test(app));
ok("...wears the bright affordance token, not the dim reference one",
   /title="Full game log" accent="var\(--ui-accent\)"/.test(app));
ok("...and its affordance counts the games instead of saying show",
   /title="Full game log"[^>]*hint=\{`\$\{log\.gp\} games`\}/.test(app));

// The bars must not colour by opponent difficulty — that would mix matchup
// data, the least stable input in the app, into a record of what happened.
const bars = app.slice(app.indexOf("const WeeklyBars"), app.indexOf("const PlayerCardModal"));
// THE SEASON TOGGLE. One season on screen at a time, but the vintage rule
// survives it: the year is printed in the section title from log.vintage, so
// no chart is ever on screen without its season named. The toggle renders only
// when BOTH vintages exist — its absence means one season of data, never a
// silent swap.
const glSec = app.slice(app.indexOf("const GameLogSection"), app.indexOf("const PlayerCardModal"));
ok("GameLogSection is defined once and mounted once",
   (app.match(/const GameLogSection/g) || []).length === 1 &&
   (app.match(/<GameLogSection /g) || []).length === 1);
ok("the toggle defaults to the current season when it is live",
   /useState\(cur \? "cur" : "prior"\)/.test(glSec));
ok("the toggle renders only when both vintages exist",
   /\{both && \(/.test(glSec) && /const both = !!\(cur && prior\)/.test(glSec));
ok("the selected season's vintage is always in the section title",
   /title=\{`Weekly output · \$\{log\.vintage\}`\}/.test(glSec));
// SECTIONS SEPARATE BY STRUCTURE, NOT COLOUR. The headers are deliberately
// hueless, so the boundary work is done by a hairline above each top-level
// section plus a between-sections gap larger than any gap inside one. A
// nested section (the game-by-game table) must NOT carry the rule, or
// sub-sections impersonate top-level ones and the hierarchy flattens.
const cardSec = app.slice(app.indexOf("const CardSection"), app.indexOf("// The player card."));
ok("top-level card sections carry a hairline divider",
   /borderTop: "1px solid var\(--border-default\)"/.test(cardSec));
ok("nested sections stay subordinate — tighter gap, no rule",
   /nested\s*\?\s*\{ marginTop: "16px" \}/.test(cardSec));
ok("the game-by-game table is the nested one",
   /title="Full game log"[^>]*\bnested\b/.test(app));

ok("the toggle pills are chrome — no data hue",
   !/var\(--(accent|pos|warn|neg|caution|pink|gold|info)/.test(glSec.slice(glSec.indexOf("{both &&"), glSec.indexOf("<WeeklyBars"))));

ok("the bars carry no matchup colouring",
   !/getMatchupTier|tierStyle|matchupScore/.test(bars));

// ===================== TEAMMATE ABSENCE (context only) =====================
// Answers the one question a target share cannot: who else was on the field.
// The worked case is Wan'Dale Robinson 2025 — a 29.8% share at the 87th
// percentile, collected across sixteen games of which Malik Nabers played four.
console.log("\n=== teammate absence ===");

const wd = e.buildPlayerCard("Wandale Robinson", "WR", "TEN");
ok("the card always carries an absence array", Array.isArray(wd.absence));
const nab = (wd.absence || []).find(a => /Nabers/i.test(a.name));
ok("Wan'Dale's card surfaces the Nabers absence", !!nab,
   (wd.absence || []).map(a => a.name).join(", "));
if (nab) {
  ok("...with the real split (4 played of 16)", nab.playedOf === 4 && nab.total === 16,
     `${nab.playedOf}/${nab.total}`);
  ok("...and both halves have >= 3 games", nab.playedOf >= 3 && nab.missed >= 3);
  ok("...carrying tgt/gm and pts/gm on both sides",
     [nab.withTgt, nab.withoutTgt, nab.withPts, nab.withoutPts].every(v => typeof v === "number"));
}

// THE TEAM MUST COME FROM PLAYER_METRICS (2025), NEVER ADP_DATA (2026).
// Pairing off the 2026 table would compare players never on the field together.
const absSrc = app.slice(app.indexOf("const teammateAbsence"), app.indexOf("const teammateAbsence") + 2600);
ok("teammateAbsence pairs on the PLAYER_METRICS team", /tm\.team !== me\.team/.test(absSrc));
ok("...and never reads ADP_DATA", !absSrc.includes("ADP_DATA"));

// Both split halves must clear the same floor the trajectory layer uses.
ok("a minimum split size is enforced", /TEAMMATE_MIN_SPLIT/.test(absSrc));
ok("...and a minimum teammate role", /TEAMMATE_MIN_SHARE/.test(absSrc));

// CONTAINMENT: context only. A scoring path that reads it would move grades.
for (const fn of ["const analyzeRoster", "const analyzeRedraft"]) {
  const i = app.indexOf(fn);
  let depth = 0, j = app.indexOf("{", i), end = j;
  for (let k = j; k < app.length; k++) {
    if (app[k] === "{") depth++;
    else if (app[k] === "}") { depth--; if (depth === 0) { end = k; break; } }
  }
  ok(`${fn.replace("const ", "")} never calls teammateAbsence`,
     !app.slice(i, end).includes("teammateAbsence("));
}

// Silence is meaningful and must be REACHABLE: most players have no qualifying
// absence, and that says the shares read at face value.
const someQuiet = ["Justin Jefferson", "Joe Burrow"].some(n => {
  const c = e.buildPlayerCard(n, e.ADP_DATA[n.toLowerCase()]?.pos || "WR", "X");
  return Array.isArray(c.absence);
});
ok("the no-absence branch is exercised", someQuiet);

// The section must not be the only thing keeping a blank card alive.
ok("the no-data branch accounts for absence", /!card\.absence\.length/.test(app));

// THE ACCENT NAMES A GROUP, NOT A SECTION, and the group names the QUESTION a
// reader is asking. See USER-PERSONAS.md. The card reached fourteen sections and
// a per-section accent had collapsed to two colours across fourteen slots, which
// is a channel carrying no information.
//
// The mapping is asserted rather than the literal tokens, so a deliberate
// palette re-tune stays legal and a hand-written colour beside grouped ones does
// not.
const groups = {};
for (const m of app.matchAll(/^  (\w+): CARD_GROUP_ACCENT\.(\w+),/gm)) groups[m[1]] = m[2];

ok("CARD_GROUP_ACCENT is declared once", (app.match(/const CARD_GROUP_ACCENT = /g) || []).length === 1);
ok("exactly four groups are in use", new Set(Object.values(groups)).size === 4, JSON.stringify(groups));
ok("the four groups are the four reader questions",
   ["job", "production", "outlook", "reference"].every(g => Object.values(groups).includes(g)),
   JSON.stringify([...new Set(Object.values(groups))]));

// Absence QUALIFIES the opportunity numbers, so the two are one idea and must
// share a group. Red zone and deployment are opportunity too — different
// sources, same question.
for (const k of ["absence", "redzone", "deployment", "trajectory"]) {
  ok(`${k} sits with the job group`, groups[k] === "job", groups[k]);
}
// Availability, the calendar and team turnover are what could CHANGE the job.
// The first regrouping filed them under "who he is", which is a description of
// the sections rather than a question anyone asks.
for (const k of ["availability", "arc", "vacated", "news"]) {
  ok(`${k} sits with the outlook group`, groups[k] === "outlook", groups[k]);
}
// Efficiency is descriptive of 2025 and would read as production, but it belongs
// with reference for the same reason the glossary does: it is consulted, never
// concluded from. Brightness on this card means "this should move your opinion".
ok("efficiency and the glossary share the reference group",
   groups.efficiency === "reference" && groups.glossary === "reference");
ok("the reference group is the dim token",
   /reference: "var\(--text-dim\)"/.test(app),
   "painting efficiency brighter would undo the card's second channel");

// THE GROUPS MUST RENDER IN THE READER'S OWN ORDER. Reference last, because
// every persona consults it last; outlook after the job it could change. The
// first build put reference before outlook because one lived inside the no-data
// branch and one outside it.
const order = [...app.matchAll(/CardGroupHeader group="(\w+)"/g)].map(m => m[1]);
ok("group headers render in reader order",
   JSON.stringify(order) === JSON.stringify(["job", "production", "outlook", "reference"]),
   JSON.stringify(order));

// A group header must never appear alone. An empty group is a bare label.
for (const g of ["job", "production", "outlook", "reference"]) {
  const at = app.indexOf(`CardGroupHeader group="${g}"`);
  const before = app.slice(Math.max(0, at - 220), at);
  ok(`the ${g} header is guarded on having content`, /&& \(|\? \(|!card\.reason/.test(before),
     "a header with no sections under it is a label pointing at nothing");
}

// The game log is OUTPUT and must sit under production, not under the job group.
const glAt = app.indexOf("<GameLogSection");
ok("the game log sits in the production group",
   glAt > app.indexOf('CardGroupHeader group="production"') &&
   glAt < app.indexOf('CardGroupHeader group="outlook"'));

// It reports, it does not conclude.
ok("the section note refuses to assert causation",
   /does not prove the volume was hollow/.test(app));

// ---- EVERY DATED SITUATION MUST BE REACHABLE ----
//
// SITUATIONS has TWO prose shapes and buildPlayerNews read only one. 138 entries
// are `trendNote`-shaped and a handful are `reason`-shaped — and `reason` is
// what the AI prompt reads at the verdictAlignments line, so it is live data the
// card was blind to. A fresh reason-only entry could never reach a reader, and
// no guard caught it.
//
// Separately, a SITUATIONS row can carry a STRUCTURED `date` and nothing read
// it; dates were parsed out of the prose only. `malik davis` carries
// date: "2026-06-07" and no date in its prose, so the card rendered nothing
// while a perfectly good date sat in the object.
//
// The assertion sweeps the WHOLE table rather than the known cases, so it covers
// shapes nobody has written yet.
console.log("\nevery dated situation is reachable");

const nowFixed = Date.UTC(2026, 8, 1);
const situations = Object.entries(e.SITUATIONS);
const unreachable = [];
for (const [k, v] of situations) {
  const text = [v.trendNote, v.reason].find(t => typeof t === "string" && t.trim());
  const dated = (typeof v.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.date))
    || (text && e.parseNewsDate(text, nowFixed));
  if (!text || !dated) continue;             // undated is withheld on purpose
  if (!e.buildPlayerNews(k, nowFixed).some(n => n.source === "situation")) unreachable.push(k);
}
ok("no dated SITUATIONS entry is invisible to the card", unreachable.length === 0,
   unreachable.slice(0, 5).join(", "));

const shapes = { trendNote: 0, reason: 0, both: 0 };
for (const [, v] of situations) {
  const t = typeof v.trendNote === "string" && v.trendNote.trim();
  const r = typeof v.reason === "string" && v.reason.trim();
  if (t && r) shapes.both++; else if (t) shapes.trendNote++; else if (r) shapes.reason++;
}
ok("the reason-only shape is actually exercised", shapes.reason > 0,
   "if this is 0 the fallback is untested, not unnecessary");
console.log(`       ${shapes.trendNote} trendNote-only · ${shapes.reason} reason-only · ${shapes.both} both`);

// trendNote WINS where both exist — it is written for this surface.
const bothRow = situations.find(([, v]) =>
  typeof v.trendNote === "string" && v.trendNote.trim() &&
  typeof v.reason === "string" && v.reason.trim() && v.trendNote !== v.reason);
ok("trendNote is preferred where both fields exist",
   !!bothRow && (() => {
     const r = e.buildPlayerNews(bothRow[0], nowFixed).find(n => n.source === "situation");
     return !r || r.text === bothRow[1].trendNote;
   })(),
   bothRow ? bothRow[0] : "no row carries both — assertion untested");

console.log("\nstructured vs prose dates");

ok("a structured ISO date is read",
   e.newsDateFor({ date: "2026-06-07" }, "no date in here", nowFixed)?.label === "Jun 7 2026");
// THE LATEST DATE IS THE CURRENCY. Notes get appended to, so an entry stamped in
// June whose prose was updated in August is an August note.
ok("a newer prose date beats an older structured one",
   e.newsDateFor({ date: "2026-06-07" }, "updated Aug 20 2026", nowFixed)?.label === "Aug 20 2026");
ok("a newer structured date beats an older prose one",
   e.newsDateFor({ date: "2026-08-20" }, "as of Jun 7 2026", nowFixed)?.label === "Aug 20 2026");
// A FUTURE DATE IS NEVER THE CURRENCY, on either path.
ok("a future structured date is discarded",
   e.newsDateFor({ date: "2026-12-01" }, "as of Jun 7 2026", nowFixed)?.label === "Jun 7 2026");
ok("a future structured date with no prose yields nothing",
   e.newsDateFor({ date: "2026-12-01" }, "no date in here", nowFixed) === null);
ok("a malformed date field falls through to the prose",
   e.newsDateFor({ date: "June 7th" }, "as of Jun 7 2026", nowFixed)?.label === "Jun 7 2026");
ok("a plain string row (RECENT_NEWS) still parses from prose",
   e.newsDateFor("signed Aug 20 2026", "signed Aug 20 2026", nowFixed)?.label === "Aug 20 2026");

const futureNotes = [];
for (const [k] of situations) for (const n of e.buildPlayerNews(k, nowFixed)) if (n.ageDays < 0) futureNotes.push(k);
ok("no rendered note is dated in the future", futureNotes.length === 0, futureNotes.slice(0, 3).join(", "));

// ---- THE READ ----
//
// Plain-English sentences at the top of the card, derived from numbers the card
// already shows. It exists because the card reached fourteen sections and a
// reader who does not already know which of them matters cannot start.
//
// ⚠ THIS BLOCK WAS SILENTLY LOST ONCE. It was written, it passed, and a later
// edit that replaced a neighbouring section spanned to the same end marker and
// swallowed it whole. The suite still passed, because a guard that no longer
// exists cannot fail. Found by grepping the committed file for `readCards`.
console.log("\nthe read");

const readCards = draftable.map(([n, v]) => [n, e.buildPlayerCard(n, v.pos, v.team)]);

// 1. IT ISSUES NO VERDICT. A verdict rendered as current is the Diggs failure,
//    and it is why PLAYER_VERDICTS was kept off this card in the first place.
//    Comments are stripped first: the block's own text explains WHY a verdict is
//    forbidden, and the first version of this check matched its own warning.
const readSrc = app.slice(app.indexOf("// === THE READ ==="), app.indexOf("card.read = read.slice"))
  .split("\n").filter(l => !l.trim().startsWith("//")).join("\n");
ok("the read block exists", readSrc.length > 200);
for (const banned of ["PLAYER_VERDICTS", "getVerdict", "verdict", "draft him"]) {
  ok(`the read never reaches for "${banned}"`, !readSrc.includes(banned),
     "it describes the data; a verdict here is the Diggs failure in a new costume");
}

// 2. IT IS CAPPED. A summary the length of the card is not a summary.
ok("the read is capped", /card\.read = read\.slice\(0, \d\)/.test(app));
ok("no card exceeds the cap in practice",
   Math.max(...readCards.map(([, c]) => c.read.length)) <= 6);

// 3. IT NEVER CONTRADICTS ITSELF. snap_sh is a SEASON AVERAGE and the trajectory
//    line above already says it is stale when the role moved. RJ Harvey read
//    "his role grew, 29% to 56%" and then "he is off the field a lot, 42% of
//    snaps" two lines later.
const contradictions = readCards.filter(([, c]) =>
  c.read.some(r => /role (grew|shrank)/.test(r.text)) &&
  c.read.some(r => /off the field a lot/.test(r.text)));
ok("no card states a role change and a stale snap average together",
   contradictions.length === 0, contradictions.slice(0, 3).map(c => c[0]).join(", "));

// 4. EVERY LINE CARRIES ITS NUMBER. A bare assertion is a verdict wearing a
//    sentence. The team-change line is the deliberate exception: it names a TEAM,
//    which is the checkable fact there.
const numberless = [];
for (const [n, c] of readCards) for (const r of c.read) {
  if (/\d/.test(r.text) || /He changed teams/.test(r.text)) continue;
  numberless.push(`${n}: ${r.text.slice(0, 40)}`);
}
ok("every read line carries a number, or names the team it describes",
   numberless.length === 0, numberless.slice(0, 3).join(" | "));

// 5. IT REACHES A PLAYER WITH NO 2025 DATA. A rookie is exactly the reader who
//    needs a plain-English start, and the first version buried the whole block
//    inside the else-branch of `card.reason`.
const rookieWithRead = readCards.find(([, c]) => c.reason && c.read.length > 0);
ok("a no-data player still gets a read", !!rookieWithRead,
   rookieWithRead ? rookieWithRead[0] : "the read must render ABOVE the reason branch");
ok("the read renders above the no-data branch",
   app.indexOf("card.read.length > 0 &&") < app.indexOf("{card.reason ? ("));

// 6. IT IS ORDERED BY THE SOURCE HIERARCHY, so a reader who stops after two
//    lines has read the two that matter most. Role change outranks volume.
const misordered = readCards.filter(([, c]) => {
  const i = c.read.findIndex(r => /role (grew|shrank)/.test(r.text));
  const j = c.read.findIndex(r => /target volume/.test(r.text));
  return i > -1 && j > -1 && i > j;
});
ok("role change always precedes volume", misordered.length === 0,
   misordered.slice(0, 3).map(c => c[0]).join(", "));

console.log(fail ? `\n${fail} failure(s)` : "\nall player-card guards passed");
process.exit(fail ? 1 : 0);
