#!/usr/bin/env node
/**
 * weekly-content.js — RosterXRay weekly content generator (Phase 1)
 *
 * Reads grading/data/schedule.md + fpa.md, ranks the target playoff week's
 * best game environments (total x which side faces the softer WR defense),
 * and prints ready-to-post text packs for Discord / Reddit / X.
 *
 * Generate-and-review: this prints content for a human to post. It does NOT
 * post anything anywhere. No API keys, no network, no auto-blast.
 *
 * Usage:
 *   node scripts/weekly-content.js              # defaults to Week 15
 *   node scripts/weekly-content.js --week 16
 *   node scripts/weekly-content.js --week 17 --top 4
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "grading", "data");
const SITE = "https://rosterxray.com";

// ---------- arg parsing ----------
function getArg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const WEEK = parseInt(getArg("--week", "15"), 10);
const TOP_N = parseInt(getArg("--top", "5"), 10);
if (![15, 16, 17].includes(WEEK)) {
  console.error("Week must be 15, 16, or 17 (the playoff window).");
  process.exit(1);
}

// ---------- file loading ----------
function readData(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) {
    console.error(`Missing data file: ${p}`);
    process.exit(1);
  }
  return fs.readFileSync(p, "utf8");
}

// ---------- parsing helpers ----------
// Pull the "| A | B |" rows from the markdown block under a given heading,
// stopping at the next "###"/"---" boundary.
function sectionRows(md, headingRegex) {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => headingRegex.test(l));
  if (start === -1) return [];
  const rows = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith("###") || l === "---" || l.startsWith("## ")) break;
    if (!l.startsWith("|")) continue;
    const cells = l.split("|").map((c) => c.trim()).filter((c) => c !== "");
    if (!cells.length) continue;
    if (/^[-:\s]+$/.test(cells.join(""))) continue; // separator row
    if (/game|total|team|raw fpa|delta/i.test(cells[0])) continue; // header row
    rows.push(cells);
  }
  return rows;
}

// ---------- parse game totals for the week ----------
function parseWeekTotals(scheduleMd, week) {
  const rows = sectionRows(scheduleMd, new RegExp(`###\\s*Week\\s*${week}\\b`));
  const games = [];
  for (const [game, totalRaw] of rows) {
    const m = game.match(/^([A-Z]{2,3})\s*@\s*([A-Z]{2,3})$/);
    if (!m) continue;
    // totals can be ranges like "40.5-42.5" — take the midpoint
    const nums = (totalRaw.match(/[\d.]+/g) || []).map(Number);
    const total = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    games.push({ away: m[1], home: m[2], total });
  }
  return games;
}

// ---------- parse WR FPA (raw + 2026 deltas) ----------
function parseFpa(fpaMd) {
  const raw = {};
  for (const [team, val] of sectionRows(fpaMd, /###\s*WR FPA \(Raw\)/)) {
    raw[team] = parseFloat(val);
  }
  const delta = {};
  for (const cells of sectionRows(fpaMd, /OFFSEASON_ADJ_2026/)) {
    // | Team | WR Delta | RB Delta | TE Delta | Reason |
    const team = cells[0];
    const wr = parseFloat((cells[1] || "0").replace("+", ""));
    if (!isNaN(wr)) delta[team] = wr;
  }
  const projected = (team) => (raw[team] != null ? raw[team] + (delta[team] || 0) : null);
  return { raw, delta, projected };
}

// ---------- soft-side analysis ----------
// FPA = points a team's DEFENSE allows to opposing WRs. Higher = softer.
// An offense benefits from facing a high-FPA defense.
function tierLabel(fpa) {
  if (fpa == null) return "unknown";
  if (fpa >= 29) return "elite-soft";
  if (fpa >= 27) return "soft";
  if (fpa >= 24) return "mid";
  if (fpa >= 22) return "below-avg";
  return "tough";
}

function analyzeGame(g, fpa) {
  const awayFaces = fpa.projected(g.home); // away offense faces home defense
  const homeFaces = fpa.projected(g.away); // home offense faces away defense
  const sides = [
    { team: g.away, faces: awayFaces, opp: g.home, loc: "@" },
    { team: g.home, faces: homeFaces, opp: g.away, loc: "vs" },
  ].filter((s) => s.faces != null);
  sides.sort((a, b) => b.faces - a.faces);
  return { ...g, sides, attack: sides[0] || null };
}

// ---------- build ----------
const scheduleMd = readData("schedule.md");
const fpaMd = readData("fpa.md");
const fpa = parseFpa(fpaMd);

let games = parseWeekTotals(scheduleMd, WEEK)
  .map((g) => analyzeGame(g, fpa))
  .sort((a, b) => b.total - a.total);

const top = games.slice(0, TOP_N);

// ---------- formatting ----------
function sideStr(s) {
  if (!s) return "n/a";
  return `${s.team} (${s.loc} ${s.opp}) faces ${s.faces.toFixed(1)} WR FPA — ${tierLabel(s.faces)}`;
}

function ranked() {
  return top
    .map((g, i) => {
      const a = g.attack;
      const flag = g.total >= 50 ? "  ⭐ S-TIER" : g.total >= 47 ? "  ▲" : "";
      const trap = a && a.faces < 24 && g.total >= 47 ? "  ⚠ high total but no soft side (talent/total play)" : "";
      return `${i + 1}. ${g.away} @ ${g.home}  —  O/U ${g.total.toFixed(1)}${flag}\n     attack: ${sideStr(a)}${trap}`;
    })
    .join("\n");
}

const best = top[0];
const bestAtk = best && best.attack ? best.attack.team : "";
const second = top[1];

// platform packs
function discordPost() {
  return [
    `**RosterXRay — Week ${WEEK} game environments to target** 🏈`,
    ``,
    `Steepest cut of the playoffs. The two games to be in:`,
    `• **${best.away} @ ${best.home}** (O/U ${best.total.toFixed(1)}) — attack ${bestAtk}`,
    second ? `• **${second.away} @ ${second.home}** (O/U ${second.total.toFixed(1)})` : ``,
    ``,
    `Full W${WEEK}-W17 breakdown + grade your own roster: ${SITE}`,
  ].filter(Boolean).join("\n");
}

function redditPost() {
  return [
    `**Week ${WEEK} best ceiling games (totals + which side has the soft matchup)**`,
    ``,
    `Ran the W${WEEK} slate through the schedule + FPA model. Top environments:`,
    ``,
    ...top.slice(0, 3).map((g) => `- ${g.away} @ ${g.home} (${g.total.toFixed(1)}) — best side: ${g.attack ? g.attack.team : "n/a"}`),
    ``,
    `Not just chasing the total — ${bestAtk} is the call in the top game because it faces the softer WR defense.`,
    `Built a tool that grades your whole best-ball roster on exactly this (stacks, playoff windows, ADP value): ${SITE}`,
  ].join("\n");
}

function twitterPost() {
  const a = best.attack;
  return [
    `Week ${WEEK} best ball — the game to target: ${best.away} @ ${best.home} (O/U ${best.total.toFixed(1)}).`,
    a ? `${a.team} is the side — faces ${a.faces.toFixed(1)} WR FPA (${tierLabel(a.faces)}).` : ``,
    `grade your W${WEEK}-17 window: ${SITE}`,
  ].filter(Boolean).join(" ");
}

// ---------- output ----------
const bar = "=".repeat(64);
console.log(`\n${bar}\n  ROSTERXRAY — WEEK ${WEEK} CONTENT PACK  (review before posting)\n${bar}\n`);
console.log(`RANKED GAME ENVIRONMENTS (by total x soft-side FPA)\n`);
console.log(ranked());
console.log(`\n${bar}\n  DISCORD (#draft-reviews / #promos)\n${bar}\n`);
console.log(discordPost());
console.log(`\n${bar}\n  REDDIT (r/BestBall)\n${bar}\n`);
console.log(redditPost());
console.log(`\n${bar}\n  TWITTER / X\n${bar}\n`);
console.log(twitterPost());
console.log(`\n${bar}\n  Reminder: post genuine value first. Tailor the first line to the\n  actual thread. Never paste the same canned message twice. (OUTREACH.md)\n${bar}\n`);
