// Which players would the player card badge "RE-VALIDATE"?
//
// The card ages every dated note against the framework's own 30-45 day rule and
// stamps anything past 45 days in --caution. This report answers the question a
// human actually has — WHICH ONES — without opening 291 cards by hand.
//
// A player is listed only when EVERY note he has is stale. One fresh note is
// enough for the card to lead with current information, so a player carrying
// both is not a gap.
//
//   node scripts/report-stale-news.mjs            # against today
//   node scripts/report-stale-news.mjs 2026-08-28 # against a fixed date
//
// ⚠️ A DATE WITH NO YEAR DOES NOT PARSE. An entry saying "as of Aug 6" ages from
// whatever older month-only date it also mentions — that is exactly how the
// Brissett note read 58 days stale while describing early-August reporting.
// Always write the year.

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";
import os from "os";

const root = process.cwd();
const tmp = path.join(os.tmpdir(), "rxr-stale");
mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");

const src = readFileSync(path.join(root, "App.jsx"), "utf8") +
  "\nexport { buildPlayerNews, ADP_DATA, seasonNow };\n";
const outfile = path.join(tmp, "s.mjs");
await build({
  stdin: { contents: src, loader: "jsx", resolveDir: root, sourcefile: "App.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: {
    "@vercel/analytics/react": path.join(tmp, "stub.js"),
    "@vercel/analytics": path.join(tmp, "stub.js"),
  },
});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

const arg = process.argv[2];
const now = arg ? Date.parse(arg + "T00:00:00Z") : Date.now();
if (Number.isNaN(now)) { console.error("bad date, use YYYY-MM-DD"); process.exit(2); }

const stale = [];
for (const [key, v] of Object.entries(e.ADP_DATA)) {
  if (!v || v.adp == null) continue;
  const notes = e.buildPlayerNews(key, now);
  if (!notes.length) continue;
  if (notes.some(n => n.status !== "stale")) continue;   // a fresh note covers him
  const oldest = notes.reduce((a, b) => (a.ageDays >= b.ageDays ? a : b));
  stale.push({ key, adp: v.adp, pos: v.pos, team: v.team, ...oldest });
}
stale.sort((a, b) => a.adp - b.adp);

console.log(`as of ${new Date(now).toISOString().slice(0, 10)} — ${stale.length} player(s) whose every note is past the 45-day rule\n`);
if (stale.length) {
  console.log("   ADP  pos team   age  dated         player");
  for (const r of stale) {
    console.log(`${String(r.adp).padStart(6)}  ${r.pos.padEnd(3)} ${String(r.team).padEnd(4)} ${String(r.ageDays).padStart(4)}d  ${r.date.padEnd(12)} ${r.key}`);
  }
  console.log("\nRe-source these before they drive a draft decision.");
} else {
  console.log("Nothing to re-validate.");
}

// ---------------------------------------------------------------------------
// SECTION 2 — CONTRADICTED (added Sep 1 2026)
//
// THE TWO CLOCKS. Approved Sep 1 2026, and the reason is measured rather than
// assumed. Fifteen RECENT_NEWS entries were sampled at random and classified:
// 0 of 15 could be supplied by a feed on its own, 7 of 15 are pure analytical
// judgement with no feed component at all, and 8 of 15 carry a feed-supplyable
// FACT wrapped in a judgement.
//
// So the layer is carrying two things on two different clocks:
//
//   STRUCTURED STATUS   out / IR / PUP / depth-chart slot     ~7 days in season
//   ANALYTICAL PROSE    "Achilles at his age is the real      30-45 days
//                        risk, not the PUP tag itself"
//
// Section 1 above ages the PROSE against the framework's 30-45 day rule and is
// unchanged. This section is the status clock, and it never touches the first.
//
// ⛔⛔ THE CONFLICT RULE: THE FEED NEVER WINS. IT FLAGS.
//
// A fetched status can never overwrite, outrank or out-date a hand-written
// note. It raises a question a human answers. This is not caution for its own
// sake — if freshest-dated-wins applied, a same-day feed would out-date all 140
// RECENT_NEWS entries permanently, and the 7-of-15 that are pure judgement (the
// ones that are the reason the corpus is worth reading) would be demoted to
// decoration on day one. Nothing below mutates a note, a date or an age.
//
// ⚠️ WHAT THIS CAN AND CANNOT DETECT. It cannot read a note and decide it is
// wrong; no tool can. It detects one mechanical thing: the feed reports a HARD
// unavailability and the freshest note predates that report. That is a
// question, not a verdict, and it is printed as one. A depth-chart CHANGE is
// not detectable at all — the file is a snapshot with no history — so a note
// made stale by a role move will not surface here.
// ---------------------------------------------------------------------------

const STATUS_STALE_DAYS = 7;   // in season. See the two clocks above.

let STATUS = null;
try {
  STATUS = JSON.parse(readFileSync(path.join(root, "grading/data/status_2026.json"), "utf8"));
} catch { /* layer absent is not an error — the report predates it */ }

// The report reads the JSON DIRECTLY and App.jsx never does. That is what keeps
// the layer context-only by construction rather than by promise; guard 26
// asserts App.jsx has no consumer at all.
const season = e.seasonNow(new Date(now));
const players = STATUS?.players ?? {};
const HARD = new Set(STATUS?._meta?.hard_status ?? []);
const DAY = 86400000;

console.log("\n" + "-".repeat(70));
console.log(`status feed — ${Object.keys(players).length} players`);

if (!Object.keys(players).length) {
  console.log(`  empty (${STATUS ? "placeholder — run scripts/refresh-inseason.sh" : "layer not built"}).`);
  console.log("  Nothing to contradict. The prose section above is unaffected.");
} else {
  const probed = STATUS._meta.source_probed;
  const feedAge = Math.floor((now - Date.parse(probed + "T00:00:00Z")) / DAY);
  console.log(`  built ${probed} (${feedAge}d ago) from ${STATUS._meta.source}`);
  if (season.inSeason && feedAge > STATUS_STALE_DAYS) {
    console.log(`  ⚠ in season and the feed itself is ${feedAge}d old, past the ${STATUS_STALE_DAYS}d status clock — refresh before trusting it`);
  }

  const flagged = [];
  for (const [key, v] of Object.entries(e.ADP_DATA)) {
    if (!v || v.adp == null) continue;
    const row = players[key];
    if (!row || !HARD.has(row.injury_status)) continue;
    const notes = e.buildPlayerNews(key, now);
    // Freshest note wins as the thing being compared against, exactly as the
    // card treats it. A player with no dated note is a DIFFERENT finding.
    const freshest = notes.length
      ? notes.reduce((a, b) => (a.ageDays <= b.ageDays ? a : b))
      : null;
    const feedTs = row.news_updated ? Date.parse(row.news_updated + "T00:00:00Z") : null;
    const noteTs = freshest ? Date.parse(freshest.date + "T00:00:00Z") : null;
    // Only flag when the feed genuinely post-dates the note. A note written
    // AFTER the feed already knows about the status and is not contradicted.
    if (freshest && feedTs != null && noteTs != null && feedTs <= noteTs) continue;
    flagged.push({
      key, adp: v.adp, pos: v.pos, team: v.team,
      status: row.injury_status,
      part: row.injury_body_part || "",
      feed: row.news_updated || "undated",
      note: freshest ? freshest.date : "NO DATED NOTE",
      noteAge: freshest ? freshest.ageDays : null,
    });
  }
  flagged.sort((a, b) => a.adp - b.adp);

  console.log(`\n${flagged.length} player(s) where the feed reports a hard status the freshest note predates\n`);
  if (flagged.length) {
    console.log("   ADP  pos team  status  feed dated   note dated    player");
    for (const r of flagged) {
      console.log(
        `${String(r.adp).padStart(6)}  ${r.pos.padEnd(3)} ${String(r.team).padEnd(4)} ` +
        `${r.status.padEnd(7)} ${r.feed.padEnd(12)} ` +
        `${(r.noteAge == null ? r.note : `${r.note} (${r.noteAge}d)`).padEnd(13)} ${r.key}` +
        (r.part ? `  [${r.part}]` : ""));
    }
    console.log("\n⚠ THESE ARE QUESTIONS, NOT CORRECTIONS. The feed is third-party and");
    console.log("  unversioned; it can be wrong, and a note can be right about a player");
    console.log("  the feed has mislabelled. Nothing above has changed any note or date.");
    console.log("  Check each one, then edit the note by hand if it is genuinely stale.");
  } else {
    console.log("Nothing contradicted.");
  }
}
