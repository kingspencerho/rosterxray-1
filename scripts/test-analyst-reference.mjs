#!/usr/bin/env node
// test-analyst-reference.mjs — guard 23. The structure of ANALYST-REFERENCE.md.
//
// WHY A REFERENCE DOCUMENT NEEDS A GUARD AT ALL.
//
// CLAUDE.md is 2,000+ lines in date order. That is the right shape for a build
// log and the wrong shape for a reference: the thing you need is wherever it
// happened to be written, and volume buries it. ANALYST-REFERENCE.md is
// organised by INPUT instead, which only stays true if four properties hold —
// and a property nobody enforces decays. That lesson is already recorded in
// this repo: esbuild warned about eleven duplicate keys on every single build
// and nobody read the warnings, which is exactly how eleven accumulated.
//
// So the four rules in the file's own §0 are asserted here rather than trusted:
//
// 1. THE INDEX IS COMPLETE IN BOTH DIRECTIONS. Every index row has an entry and
//    every entry has an index row. One constraint, and it is what stops the file
//    drifting into two half-maintained lists — the way every reference doc dies.
//
// 2. EVERY ENTRY USES THE SAME TEMPLATE. The template is what makes entries
//    comparable and keeps "where does this live" in the same place every time.
//    A free-form entry that buries its file path in paragraph three is the
//    volume problem the file exists to avoid.
//
// 3. EVERY `r` MATCHES THE CANONICAL TABLE. An entry heading may restate its r
//    for readability, but two copies of a number is one copy and one future lie.
//    This is the duplicate-definition class that has already shipped five times
//    in code (tier/score, competitive balance, posColor, position palettes,
//    playoff boosts). Prose is not immune.
//
// 4. SECTIONS KEEP THEIR DECLARED GROWTH BEHAVIOUR. Standing rules are
//    append-only and numbered contiguously because they get cited by number;
//    the changelog is capped because an unbounded one is just git with worse
//    search.
//
// Run: node scripts/test-analyst-reference.mjs   (exits non-zero on failure)

import { readFileSync } from "fs";
import path from "path";

const doc = readFileSync(path.join(process.cwd(), "ANALYST-REFERENCE.md"), "utf8");
const lines = doc.split("\n");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${cond || !detail ? "" : `  (${detail})`}`);
  if (!cond) fail++;
};

// GitHub's anchor slug, so index links actually resolve.
// ⚠️ GitHub replaces each space ONE-FOR-ONE after stripping punctuation, so a
// heading like "Foo · Bar" leaves two spaces and slugs to "foo--bar". Collapsing
// runs of whitespace here produced the wrong anchor for every heading carrying a
// separator, which is all of them.
const slug = (s) => s.toLowerCase()
  .replace(/[^\w\s-]/g, "")
  .trim()
  .replace(/ /g, "-");

// ---- 0. the contract is present ----
console.log("the maintenance contract");
ok("§0 exists and is the first numbered section", /^## §0 · How to update this file$/m.test(doc));
for (const r of ["Rule 1", "Rule 2", "Rule 3", "Rule 4"]) {
  ok(`${r} is stated`, doc.includes(`### ${r} —`));
}
ok("the growth-behaviour table names every section", /\| Section \| Grows\? \| On update \|/.test(doc));

// ---- 1. the index is complete in BOTH directions ----
console.log("\nindex completeness");

const idxStart = doc.indexOf("## §1 · Index");
const idxEnd = doc.indexOf("## §2 ·");
ok("§1 and §2 both present", idxStart >= 0 && idxEnd > idxStart);
const indexBlock = doc.slice(idxStart, idxEnd);

// Rows look like: | [Name](#anchor) | r | rank | tier | status | scored |
const indexRows = [...indexBlock.matchAll(/^\|\s*\[([^\]]+)\]\(#([^)]+)\)\s*\|([^|]*)\|([^|]*)\|\s*([ABC])\s*\|\s*(live|proposed|rejected)\s*\|/gm)]
  .map(m => ({ name: m[1].trim(), anchor: m[2], r: m[3].trim(), rank: m[4].trim(), tier: m[5], status: m[6] }));
ok("index has rows", indexRows.length >= 20, `${indexRows.length} found`);

// Entries are `### <Name> · r = <v> · <rank>` inside §4/§5/§6.
const tierBounds = {
  A: [doc.indexOf("## §5 ·"), doc.indexOf("## §6 ·")],
  B: [doc.indexOf("## §6 ·"), doc.indexOf("## §7 ·")],
  C: [doc.indexOf("## §7 ·"), doc.indexOf("## §8 ·")],
};
ok("§5, §6, §7 and §8 are all present and in order",
  Object.values(tierBounds).every(([a, b]) => a > 0 && b > a));

const entries = [];
for (const [tier, [a, b]] of Object.entries(tierBounds)) {
  for (const m of doc.slice(a, b).matchAll(/^### (.+?) · r = (.+?) · (.*)$/gm)) {
    entries.push({ tier, name: m[1].trim(), r: m[2].trim(), rank: m[3].trim(), heading: m[0] });
  }
}
ok("entries found", entries.length >= 20, `${entries.length} found`);

// Both directions. An index row with no entry is a dead link the reader can
// click; an entry with no row is invisible to anyone scanning the index.
const entryNames = new Set(entries.map(e => e.name));
const indexNames = new Set(indexRows.map(r => r.name));
for (const r of indexRows) {
  ok(`index row "${r.name}" has an entry`, entryNames.has(r.name));
}
for (const e of entries) {
  ok(`entry "${e.name}" has an index row`, indexNames.has(e.name));
}

// Anchors must resolve, or the index is decorative.
for (const r of indexRows) {
  const e = entries.find(x => x.name === r.name);
  if (!e) continue;
  const want = slug(e.heading.replace(/^### /, ""));
  ok(`"${r.name}" anchor resolves`, r.anchor === want, `row says #${r.anchor}, heading slugs to #${want}`);
}

// One input, one tier. The same name in two tiers means a Tier B item was
// COPIED into Tier A on graduation rather than moved.
const seen = new Map();
for (const e of entries) {
  ok(`"${e.name}" appears in exactly one tier`, !seen.has(e.name), `also in tier ${seen.get(e.name)}`);
  seen.set(e.name, e.tier);
}
for (const r of indexRows) {
  const e = entries.find(x => x.name === r.name);
  if (e) ok(`"${r.name}" tier agrees between index and entry`, r.tier === e.tier, `index ${r.tier}, entry ${e.tier}`);
}

// ---- 2. every entry uses the template ----
console.log("\nentry template");

const REQUIRED_TABLE = ["**File**", "**Field**", "**Surfaces**", "**Status**"];
const REQUIRED_PROSE = ["**Plain English.**", "**Why it matters.**"];

const bodyOfEntry = (e) => {
  const at = doc.indexOf(e.heading);
  const rest = doc.slice(at + e.heading.length);
  const next = rest.search(/^(### |## )/m);
  return next < 0 ? rest : rest.slice(0, next);
};

for (const e of entries) {
  const body = bodyOfEntry(e);
  for (const f of REQUIRED_TABLE) ok(`"${e.name}" carries ${f}`, body.includes(f));
  for (const f of REQUIRED_PROSE) ok(`"${e.name}" carries ${f}`, body.includes(f));
  // Status must be one of the three, and must agree with the index.
  const st = body.match(/\|\s*\*\*Status\*\*\s*\|\s*([a-z]+)/);
  ok(`"${e.name}" has a valid Status`, !!st && ["live", "proposed", "rejected"].includes(st[1]), st ? st[1] : "missing");
  const row = indexRows.find(r => r.name === e.name);
  if (st && row) ok(`"${e.name}" status agrees with the index`, st[1] === row.status, `entry ${st[1]}, index ${row.status}`);
}

// ---- 3. every r matches the canonical table ----
console.log("\ncanonical r values");

const canonStart = doc.indexOf("## §2 ·");
const canonEnd = doc.indexOf("## §3 ·");
const canon = new Map();
for (const m of doc.slice(canonStart, canonEnd).matchAll(/^\|\s*\**([^|*]+?)\**\s*\|\s*\**(−?-?[\d.]+)\**\s*\|/gm)) {
  const name = m[1].trim();
  const val = parseFloat(m[2].replace("−", "-"));
  if (!Number.isNaN(val)) canon.set(name.toLowerCase(), val);
}
ok("canonical table parsed", canon.size >= 20, `${canon.size} values`);
ok("the table is labelled as the single source of truth",
  /SINGLE SOURCE OF TRUTH FOR EVERY `r`/.test(doc));

// An entry heading that restates its r must agree with §2 at its own precision.
// This is what stops a number drifting between the table and the prose.
for (const e of entries) {
  if (e.r === "—") continue;
  const stated = parseFloat(e.r);
  ok(`"${e.name}" states a numeric r`, !Number.isNaN(stated), e.r);
  if (Number.isNaN(stated)) continue;
  // Match on the entry name, or on the name minus a parenthetical qualifier.
  // An entry can legitimately span several canonical rows — snap share is
  // measured separately for RB and for WR/TE. Collect every candidate and accept
  // a match against any of them, rather than whichever the map happened to yield
  // first, which silently compared the entry to the wrong position.
  const key = e.name.toLowerCase();
  const cands = canon.has(key)
    ? [canon.get(key)]
    : [...canon].filter(([k]) => k.startsWith(key) || key.startsWith(k)).map(([, v]) => v);
  ok(`"${e.name}" is in the canonical table`, cands.length > 0);
  if (!cands.length) continue;
  const dp = (e.r.split(".")[1] || "").length;
  // ⚠️ NOT toFixed. (0.815).toFixed(2) is "0.81" because 0.815 is stored as
  // 0.81499…, so a correctly-stated 0.82 failed against its own canonical value.
  const round = (v) => Math.round(v * 10 ** dp) / 10 ** dp;
  const hit = cands.some(v => Math.abs(round(v) - stated) < 1e-9);
  ok(`"${e.name}" r=${e.r} matches §2 (${cands.join(" or ")})`, hit,
    "edit §2 first, then the entry — two copies of a number is one copy and one future lie");
}

// ---- 4. declared growth behaviour ----
console.log("\nsection growth behaviour");

// Standing rules: contiguous from R1, never reused. They are cited by number,
// so a renumber silently rewrites every citation elsewhere.
const rulesStart = doc.indexOf("## §10 ·");
const rulesEnd = doc.indexOf("## §11 ·");
ok("§10 and §11 present", rulesStart > 0 && rulesEnd > rulesStart);
const ruleNums = [...doc.slice(rulesStart, rulesEnd).matchAll(/^\*\*R(\d+)\.\*\*/gm)].map(m => +m[1]);
ok("standing rules exist", ruleNums.length >= 15, `${ruleNums.length} found`);
ok("standing rules are unique", new Set(ruleNums).size === ruleNums.length);
ok("standing rules start at R1", ruleNums[0] === 1);
ok("standing rules are contiguous and ascending",
  ruleNums.every((n, i) => n === i + 1),
  `got ${ruleNums.join(",")} — never renumber, rules are cited by number`);
ok("§10 declares itself append-only", /Append-only\. Never renumber/.test(doc));

// Changelog: capped, so it cannot grow into a worse version of git log.
const clStart = doc.indexOf("## §12 ·");
const clRows = [...doc.slice(clStart).matchAll(/^\|\s*[A-Z][a-z]{2} \d{1,2} \d{4}\s*\|/gm)].length;
ok("changelog is capped at 12", clRows <= 12, `${clRows} entries — drop the oldest, git has the rest`);
ok("changelog declares its cap", /Capped at 12 entries/.test(doc));

// Build queue: prunable, and every linked item must still exist. A shipped item
// left here is worse than no queue — the reader cannot tell what is still true.
const bqStart = doc.indexOf("## §11 ·");
const bqEnd = doc.indexOf("## §12 ·");
const bq = doc.slice(bqStart, bqEnd);
ok("build queue declares itself prunable", /Prunable\. Delete a line the moment it ships/.test(bq));
for (const m of bq.matchAll(/\[([^\]]+)\]\(#([^)]+)\)/g)) {
  const row = indexRows.find(r => r.anchor === m[2]);
  ok(`build-queue link "${m[1]}" resolves to an indexed input`, !!row);
  // A queued item pointing at a `live` entry means it shipped and was never pruned.
  if (row) ok(`build-queue item "${m[1]}" is not already live`, row.status !== "live",
    "it shipped — delete the queue line, the entry in §4 is the record now");
}

// Every section the contract names must actually exist, in order.
const wanted = ["§0", "§1", "§2", "§3", "§4", "§5", "§6", "§7", "§8", "§9", "§10", "§11", "§12"];
let last = -1, ordered = true;
for (const w of wanted) {
  const at = doc.indexOf(`## ${w} ·`);
  if (at < 0 || at < last) ordered = false;
  last = at;
}
ok("all thirteen sections exist and are in order", ordered);

// ---- 5. THE SOURCE HIERARCHY DEFINES A FIELD THE REST OF THE FILE USES ----
// `rank` appears on every §5 entry and in the §1 index legend, and until §3
// existed it was never defined anywhere. A field used 28 times with no
// definition is the silent-drop failure in prose form: the reader sees "rank 2"
// and has no way to act on it.
console.log("\nthe source hierarchy");

const hStart = doc.indexOf("## §3 ·");
const hEnd = doc.indexOf("## §4 ·");
const hier = doc.slice(hStart, hEnd);
for (const n of [1, 2, 3, 4, 5]) {
  ok(`rank ${n} is defined`, new RegExp(`^### Rank ${n} — `, "m").test(hier));
}
ok("all five ranks and no more", (hier.match(/^### Rank \d/gm) || []).length === 5);

// TWO SCALES LIVE IN THIS FILE and confusing them is the obvious failure: rank
// 1-5 is trust, Tier A/B/C is build status. An input can be rank 1 and Tier B.
ok("the rank-vs-tier collision is called out explicitly",
   /TWO DIFFERENT SCALES LIVE IN THIS FILE/.test(hier),
   "a reader meeting 'rank 2' and 'Tier B' needs to be told they are different scales");

// The generator/sorter rule is the whole reason the hierarchy is ordered.
ok("the generate-versus-sort rule is stated",
   /Ranks 1-4 GENERATE the list\. Rank 5 SORTS it\./.test(hier));
ok("...and says a schedule never makes or misses a list",
   /never makes or misses a target list because of his December/.test(hier));

// Rank 1 is the part that is NOT sticky, which reads as a contradiction against
// §2 unless the file resolves it. It must.
ok("the rank-1 versus stickiness tension is resolved in the text",
   /invalidates the sticky baseline/.test(hier));

// ⚠ THE INDEX RANK MUST MATCH ITS ENTRY HEADING, not merely be a legal value.
// The first version of this only checked the value was 1-5, and passed over FOUR
// rows whose index rank was one lower than the heading they linked to. A rank
// that is legal and wrong is worse than one that is out of range, because
// nothing looks off. Same both-directions check already applied to tier and
// status.
const idxRanks = [...indexBlock.matchAll(/^\|\s*\[([^\]]+)\]\([^)]+\)\s*\|[^|]*\|\s*([^|]*?)\s*\|/gm)]
  .map(m => ({ name: m[1].trim(), rank: m[2].trim() }));
ok("index rows expose a rank", idxRanks.length >= 20, `${idxRanks.length}`);
ok("every rank used in the index is one §3 defines",
   idxRanks.every(r => r.rank === "—" || /^[1-5]$/.test(r.rank)),
   [...new Set(idxRanks.map(r => r.rank))].join(", "));

const rankMismatch = [];
for (const row of idxRanks) {
  const ent = entries.find(x => x.name === row.name);
  if (!ent) continue;
  const want = (ent.rank.match(/rank (\d|—)/) || [])[1] ?? "—";
  if (row.rank !== want) rankMismatch.push(`${row.name}: index ${row.rank}, entry ${want}`);
}
ok("every index rank matches its entry heading", rankMismatch.length === 0,
   rankMismatch.slice(0, 4).join(" | "));

// The §1 legend must point at the definition rather than re-glossing it — two
// copies of a definition is one copy and one future lie.
ok("the index legend links to §3 rather than re-defining rank",
   /\[Source Hierarchy\]\(#3--the-source-hierarchy/.test(indexBlock));

// The two documents must point at each other, or one of them gets forgotten.
const claude = readFileSync(path.join(process.cwd(), "CLAUDE.md"), "utf8");
ok("CLAUDE.md links here", claude.includes("ANALYST-REFERENCE.md"));
ok("this file links back to CLAUDE.md", doc.includes("CLAUDE.md"));

console.log(fail ? `\n${fail} FAILED` : `\nall passed — ${entries.length} entries, ${indexRows.length} index rows, ${ruleNums.length} rules`);
process.exit(fail ? 1 : 0);
