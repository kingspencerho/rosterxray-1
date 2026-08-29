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
  "\nexport { buildPlayerNews, ADP_DATA };\n";
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
