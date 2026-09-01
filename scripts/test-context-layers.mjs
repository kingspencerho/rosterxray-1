#!/usr/bin/env node
// test-context-layers.mjs — guard 22. The three layers added Aug 31 2026:
// NGS receiving (separation + intended air yards), career arc, vacated targets.
//
// ONE ASSERTION MATTERS MORE THAN THE REST: none of these may reach the numeric
// scoring engine. Everything added since Jul 26 2026 carries that promise, and
// the promise is the only reason a grade issued in September is still
// comparable to the same roster graded in December. A layer that starts scoring
// silently invalidates every calibration figure recorded in CLAUDE.md — nothing
// errors, the numbers just quietly stop meaning what they meant.
//
// Asserted structurally rather than by running a grade, because a leak can be
// small enough to move one roster by 0.01 and pass a spot check: the three
// accessors are enumerated, every call site is checked against an allowlist of
// reviewed consumers, and analyzeRoster / analyzeRedraft are asserted clean.
//
// The rest guards the two ways a context layer misleads instead of leaking:
//   - a percentile printed against the wrong population (NGS has its own gate,
//     40+ targets, which is NOT the card's draftable/8-game gate — merging the
//     two tables would print a rank under a label that does not describe it)
//   - an aging band quoted as a measurement when it is a borrowed prior
//
// Run: node scripts/test-context-layers.mjs   (exits non-zero on failure)

import { readFileSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
const rd = f => JSON.parse(readFileSync(path.join(repoRoot, f), "utf8"));
const NGS = rd("grading/data/ngs_receiving_2025.json");
const RZ = rd("grading/data/redzone_2025.json");
const AV = rd("grading/data/availability_2026.json");
const ARC = rd("grading/data/career_arc_2026.json");
const VAC = rd("grading/data/vacated_2026.json");
const app = readFileSync(path.join(repoRoot, "App.jsx"), "utf8");
const mirror = readFileSync(path.join(repoRoot, "App.jsx.jsx"), "utf8");

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${label}${cond || !detail ? "" : `  (${detail})`}`);
  if (!cond) fail++;
};

// Body of a top-level `const NAME = (...) => {...}` or `function NAME`, by brace
// depth from its opening brace. Same technique the other containment guards use.
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

// ---- 1. CONTEXT-ONLY CONTAINMENT (the assertion that protects the grades) ----
console.log("context-only containment");

ok("App.jsx and App.jsx.jsx are identical", app === mirror);

const ACCESSORS = ["getNgsRec", "getCareerArc", "getVacated", "getRedZone", "getAvailability",
                   "getRoutes", "getCoverage"];
// Every reviewed consumer. Adding a name here is a deliberate act; a call site
// that is not on this list fails the run whether or not it looks harmless.
const ALLOWED = [
  "buildPlayerCard",       // the player card
  "deploymentContext",     // AI prompt
  "arcContext",            // AI prompt
  "vacatedContext",        // AI prompt
  "routesContext",         // AI prompt
];
// ⚠️ getCoverage has NO prompt consumer, and that is a decision rather than an
// omission — see the man/zone assertions below.

for (const fn of ACCESSORS) {
  const defRe = new RegExp(`const ${fn} = `);
  ok(`${fn} is defined exactly once`, (app.match(new RegExp(defRe.source, "g")) || []).length === 1);
}

for (const engine of ["const analyzeRoster = ", "const analyzeRedraft = "]) {
  const body = bodyOf(app, engine);
  ok(`${engine.trim()} found`, !!body);
  if (!body) continue;
  for (const fn of ACCESSORS) {
    ok(`${engine.match(/analyze\w+/)[0]} never calls ${fn}`, !body.includes(`${fn}(`),
      "a context layer reaching the scoring engine moves grades and invalidates every recorded calibration");
  }
  for (const tbl of ["NGS_RECEIVING", "CAREER_ARC", "VACATED", "REDZONE", "AVAILABILITY",
                     "ROUTES", "COVERAGE"]) {
    // Identifier boundaries, not a substring search. "COVERAGE" and "ROUTES"
    // are ordinary English the engine uses in weakness strings ("no W17
    // coverage"), and a guard that false-fails on prose gets ignored — which is
    // exactly how eleven duplicate keys accumulated behind eleven build
    // warnings.
    const re = new RegExp(`(^|[^A-Za-z0-9_$])${tbl}[.\\[]`);
    ok(`${engine.match(/analyze\w+/)[0]} never reads ${tbl}`, !re.test(body));
  }
}

// Every call site of every accessor sits inside a reviewed consumer.
for (const fn of ACCESSORS) {
  const sites = [...app.matchAll(new RegExp(`${fn}\\(`, "g"))].map(m => m.index)
    .filter(i => !app.slice(Math.max(0, i - 40), i).includes(`const ${fn} = `));
  ok(`${fn} has at least one call site`, sites.length > 0);
  for (const i of sites) {
    // Nearest preceding declaration of an allowlisted consumer.
    const before = app.slice(0, i);
    const owner = ALLOWED
      .map(name => ({ name, at: Math.max(before.lastIndexOf(`const ${name} = `), before.lastIndexOf(`${name} = (`)) }))
      .filter(x => x.at >= 0)
      .sort((a, b) => b.at - a.at)[0];
    ok(`${fn} call site is inside a reviewed consumer`, !!owner,
      `unreviewed call site at index ${i} — add it to ALLOWED only after confirming it cannot reach a score`);
  }
}

// ---- 2. POPULATIONS STAY SEPARATE ----
console.log("\npercentile populations");

ok("NGS has its own percentile table", app.includes("const NGS_PERCENTILES"));
ok("NGS has its own percentile function", app.includes("const ngsPercentile"));
ok("the card's NGS rows use ngsPercentile, not cardPercentile",
  /ngsPercentile\(pos, "iay"/.test(app) && /ngsPercentile\(pos, "sep"/.test(app));
ok("the Deployment section prints the NGS gate, not the card gate",
  app.includes("NGS_POP_GATE") && /Percentile among \$\{NGS_POP_GATE\}/.test(app),
  "a rank under the wrong population label is a number the reader cannot act on");
ok("NGS_POP_GATE is derived from the file, not typed",
  app.includes("NGS_RECEIVING._meta.min_targets"));

// THREE populations now, three tables, three printed gates. Red zone gates on
// red-zone opportunities, NGS on 40 targets, the card on draftable/8 games.
// Merging any two prints a rank under a label that does not describe it.
ok("red zone has its own percentile table", app.includes("const RZ_PERCENTILES"));
ok("red zone has its own percentile function", app.includes("const rzPercentile"));
ok("the card's red-zone rows use rzPercentile",
  /rzPercentile\(pos, "rz_tgt_sh"/.test(app));
ok("the red-zone gate is derived from the file, not typed",
  app.includes("REDZONE._meta.gates"));
ok("the red-zone section prints its own gate",
  /Percentile among \$\{card\.redzoneGate\}/.test(app));

// ---- 3. THE AGING BANDS ARE LABELLED AS PRIORS ----
console.log("\ncareer arc honesty");

ok("the file declares the bands are priors", typeof ARC._meta.bands_are_priors === "string");
ok("the card says the band is a prior",
  /published aging prior, not a finding/i.test(app),
  "an inherited curve rendered as a measurement is the stale-data trap in a new costume");
ok("the AI prompt says the bands are priors",
  /aging bands are PUBLISHED PRIORS/.test(app));
ok("the prompt emits only the tails", app.includes('a.phase === "peak"'),
  "a peak-band line repeats what the other numbers already said");
ok("silence in the arc block is explained in the header",
  /absent from this block sits inside his position's peak band/.test(app));

// ---- 4. VACATED SAYS WHAT IT IS AND WHAT IT IS NOT ----
console.log("\nvacated targets");

ok("the file states it is not a projection", typeof VAC._meta.not_a_projection === "string");
ok("the card says it does not name the inheritor",
  /who inherits it is still a judgement/i.test(app));
ok("the prompt says it does not name the inheritor",
  /It does NOT say who inherits it/.test(app));
ok("the card prints the file's own denominator note",
  app.includes("card.vacated.denominator"),
  "the percentage is a share of the MEASURED pool, and that qualifier must travel with it");

// suffix bug: the known failure was WAS reading 82.4% because 'brian robinson jr'
// differenced as a departure. It is normalised now; assert the corrected value.
// vacated_pct is stored in PERCENT units (46.6), while gone[].tgt_sh is a
// fraction. The two live in one file and disagree on scale, so anything reading
// them must not assume — that mismatch shipped a 4660% figure on the card for
// one build and this asserts the units directly.
const was = VAC.teams.WAS;
ok("vacated_pct is in percent units, not a fraction",
  Object.values(VAC.teams).some(t => t.vacated_pct > 1));
ok("WAS is not the buggy 82.4%", was && was.vacated_pct < 60, `${was && was.vacated_pct.toFixed(1)}%`);
ok("no team exceeds 100% vacated",
  Object.values(VAC.teams).every(t => t.vacated_pct <= 100));
ok("the card renders vacated_pct without a x100",
  !/card\.vacated\.pct \* 100/.test(app));
ok("every listed departure clears the stated cutoff",
  Object.values(VAC.teams).every(t => (t.gone || []).every(g => g.tgt_sh >= 0.03)));

// ---- 4b. THE TWO LAYERS ADDED SEP 1 ----
console.log("\nred zone");

// THE COUNT MUST TRAVEL WITH THE SHARE. Red-zone volume is a fraction of total
// volume, so a bare percentage is a ratio of two small numbers. "31%" is
// unreadable; "31% of 22" is a fact.
ok("the card prints the count beside every share",
  /value: `\$\{pctOf\(rz\.rz_tgt_sh\)\} of \$\{rz\.rz_tgt\}`/.test(app));
ok("the prompt prints the count beside every share",
  /of team red-zone targets \(\$\{r\.rz_tgt\}\)/.test(app));
ok("the prompt header forbids quoting a share without its count",
  /must never be quoted without its count/.test(app));
ok("a share is emitted only above the gate",
  Object.values(RZ.players).every(p =>
    (p.rz_tgt_sh == null || p.rz_tgt >= RZ._meta.gates.min_player_rz_opp) &&
    (p.i10_tgt_sh == null || p.i10_tgt >= RZ._meta.gates.min_player_i10_opp) &&
    (p.rz_car_sh == null || p.rz_car >= RZ._meta.gates.min_player_rz_opp)),
  "a 100% share on two targets is noise wearing a percentage sign");
ok("every share is a real fraction",
  Object.values(RZ.players).every(p =>
    ["rz_tgt_sh", "i10_tgt_sh", "rz_car_sh", "i10_car_sh"]
      .every(k => p[k] == null || (p[k] > 0 && p[k] <= 1))),
  "these are FRACTIONS — vacated_pct in the sibling file is percent units, and mixing the two shipped a 4660% figure once");
ok("goal line is a count, never a share",
  Object.values(RZ.players).every(p => p.i5_tgt_sh === undefined && p.i5_car_sh === undefined));
ok("names resolved past the pbp abbreviations",
  RZ._meta.counts.dropped_no_display_name === 0 &&
  !Object.keys(RZ.players).some(k => /^[a-z]{1,2}[a-z]+$/.test(k) && !k.includes(" ")),
  "pbp prints A.St. Brown, which normalises to 'ast brown' and matches nothing in any ADP table");
ok("the file says red-zone usage is coaching-dependent", typeof RZ._meta.not_a_projection === "string");

console.log("\non-field rate");

// THE DENOMINATOR IS THE WHOLE MEASUREMENT. Counting games played against games
// played is circular; counting against 17 skips a fully lost season entirely and
// reports the player as durable.
ok("the denominator is rostered seasons, stated in the file",
  /appeared on a ROSTER/.test(AV._meta.denominator));
ok("the numerator is snaps, not stat lines",
  /snap_counts/.test(AV._meta.source) && typeof AV._meta.numerator_is_snaps === "string",
  "stat lines miss a blocking TE and a zero-target WR, and put the median at 63%");
ok("practice-squad and cut seasons are excluded",
  Array.isArray(AV._meta.gates.counted_status) && !AV._meta.gates.counted_status.includes("DEV"));
ok("the median is plausible for an NFL population",
  AV._meta.medians.all > 0.6 && AV._meta.medians.all < 0.95,
  `${AV._meta.medians.all} — a low median means the population is camp bodies, not that players are fragile`);
ok("career and recent are separate fields, never averaged",
  Object.values(AV.players).every(p => p.career != null) &&
  Object.values(AV.players).some(p => p.recent != null));
ok("every rate is a fraction",
  Object.values(AV.players).every(p => p.career >= 0 && p.career <= 1 && (p.recent == null || (p.recent >= 0 && p.recent <= 1))));
ok("gp never exceeds possible",
  Object.values(AV.players).every(p => p.gp <= p.possible));
ok("the min-seasons gate holds",
  Object.values(AV.players).every(p => p.seasons >= AV._meta.gates.min_seasons),
  "a one-season sample called a rate implies a trend");
ok("the card shows career AND recent, never one blended number",
  /Last \$\{card\.availability\.recentWindow\} seasons/.test(app));
ok("the card names a fully lost season explicitly",
  /lost entirely — invisible in either rate above/.test(app),
  "a missed season is the most useful line in the record and is invisible in both rates");
ok("both the file and the card say this is not a medical finding",
  typeof AV._meta.not_medical === "string" && /not a statement about his health/.test(app));
ok("the prompt emits only the tails", /a player absent from this block sits near his position's median/.test(app));

// ---- 5. DATA SHAPE ----
console.log("\ndata shape");

const ngsRows = Object.entries(NGS.players);
ok("NGS rows carry pos, team, tgt, sep, iay",
  ngsRows.every(([, r]) => r.pos && r.team && typeof r.tgt === "number" && typeof r.sep === "number" && typeof r.iay === "number"));
ok("every NGS row clears the stated target minimum",
  ngsRows.every(([, r]) => r.tgt >= NGS._meta.min_targets));
ok("NGS is WR/TE only", ngsRows.every(([, r]) => r.pos === "WR" || r.pos === "TE"));
ok("stability figures are recorded in _meta",
  NGS._meta.stability?.avg_separation?.r > 0.6 && NGS._meta.stability?.avg_intended_air_yards?.r > 0.8);
ok("the excluded NGS fields are recorded with their measured r",
  Object.keys(NGS._meta.not_emitted || {}).length >= 3,
  "the reason a field was left out is worth as much as the ones kept");

const arcRows = Object.values(ARC.players);
ok("arc rows carry age, exp, draft, phase",
  arcRows.every(r => typeof r.age === "number" && typeof r.exp === "number" && typeof r.draft === "number" && r.phase));
ok("every arc phase is one of three labels",
  arcRows.every(r => ["rising", "peak", "decline"].includes(r.phase)));
ok("the phase label matches the band it claims",
  arcRows.every(r => {
    const b = ARC._meta.bands[r.pos];
    if (!b) return true;
    const want = r.age >= b.decline ? "decline" : r.age <= b.rising ? "rising" : "peak";
    return r.phase === want;
  }),
  "a label that disagrees with its own number reads as confirmation");

ok("vacated covers all 32 teams", Object.keys(VAC.teams).length === 32);

// ---- 4c. ROUTES AND COVERAGE (added Sep 1 2026) ----
// Both came out of Tier C on a false premise: this repo claimed the NFL
// participation feed died after 2023 and that no free routes source existed.
// Neither was true, and the claim survived because it was CITED rather than
// re-tested. What is guarded here is the pair of decisions the measurement
// forced, because both are easy to undo by accident.
console.log("\nroutes and coverage");

const RT = rd("grading/data/routes_2025.json");
const COV = rd("grading/data/coverage_2025.json");

ok("routes has its own percentile table and function",
  app.includes("const ROUTES_PERCENTILES") && app.includes("const routesPercentile"));
ok("routes prints its own population gate", app.includes("const ROUTES_POP_GATE"));
ok("the card's TPRR row uses routesPercentile, not cardPercentile",
  /routesPercentile\(pos, "tprr"/.test(app));
ok("coverage has its own percentile table and function",
  app.includes("const COV_PERCENTILES") && app.includes("const covPercentile"));
ok("coverage prints its own population gate", app.includes("const COV_POP_GATE"));

// FIVE populations now, five gates. Same rule the NGS and red-zone blocks
// carry: a rank borrowed from another table is printed under a label that does
// not describe it.
const POP_FNS = ["cardPercentile", "ngsPercentile", "rzPercentile",
                 "routesPercentile", "covPercentile"];
for (const fn of POP_FNS) {
  ok(`${fn} is defined exactly once`,
    (app.match(new RegExp(`const ${fn} = `, "g")) || []).length === 1);
}

// ⚠️ THE LOAD-BEARING ONE. The man/zone edge measured r=0.161 year over year —
// below every number in the AI prompt including per-touch efficiency, which is
// carried only with explicit warnings. Withholding a coin flip is cheaper and
// more reliable than warning a model about it, so getCoverage has NO prompt
// consumer and must not acquire one without a fresh measurement.
ok("the man/zone edge is recorded as a coin flip", COV._meta.stability.edge.r < 0.30);
ok("coverage declares itself descriptive-only",
  COV._meta.descriptive_only === true && COV._meta.in_ai_prompt === false);
ok("there is no coverageContext prompt builder", !/const coverageContext\b/.test(app),
  "adding one puts an r=0.16 figure in front of the model — re-measure first");
for (const tmpl of ["deploymentContext ?", "routesContext ?"]) {
  ok(`prompt template mentions ${tmpl.split(" ")[0]}`, app.includes(tmpl));
}
// Assert the CONSUMER, not the absence of a string. The first version of this
// forbade "${...COVERAGE...}" anywhere and false-failed on COV_POP_GATE, which
// is the card's own gate label — a guard that fails on correct code is a guard
// someone deletes.
{
  const sites = [...app.matchAll(/getCoverage\(/g)].map(m => m.index)
    .filter(i => !app.slice(Math.max(0, i - 40), i).includes("const getCoverage = "));
  ok("getCoverage has exactly one call site", sites.length === 1, `found ${sites.length}`);
  const cardAt = app.lastIndexOf("const buildPlayerCard", sites[0] ?? 0);
  ok("getCoverage's only consumer is buildPlayerCard", sites.length === 1 && cardAt >= 0,
    "a prompt consumer would hand the model an r=0.16 figure");
}

// The edge is NOT centred on zero — man coverage suppresses yards per target
// league-wide. A reader shown a bare "-1.2" reads it as bad when it is above
// the WR median of -1.48, so the card must never print the number without a
// percentile and the position median beside it.
ok("the position medians are negative for WR and TE, so the sign is not the read",
  COV._meta.medians.WR < 0 && COV._meta.medians.TE < 0);
ok("the coverage card section prints the position median",
  /median is \$\{card\.coverage\.median\}/.test(app));
// The note tells the reader to use the percentile instead of the sign. On a
// position whose pool is under the ranking minimum there IS no percentile, and
// a note pointing at a number that is not on screen is the same defect as a
// label disagreeing with its own value. 2025 clears 89 WRs, 31 TEs and 7 RBs.
ok("the note branches on whether a percentile actually rendered",
  /card\.coverage\.ranked\s*\n?\s*\?/.test(app) && /too few to rank against/.test(app));
ok("the unranked branch names the pool size", /card\.coverage\.pool/.test(app));
ok("at least one position really is below the ranking minimum",
  Object.values(COV._meta.counts).some(n => n < 12),
  "if every pool clears the minimum the unranked branch is dead code");
ok("the man edge row carries a percentile",
  /label="Man edge"[\s\S]{0,220}card\.coverage\.edgePct/.test(app));
ok("coverage renders in the dim REFERENCE group",
  /coverage: CARD_GROUP_ACCENT\.reference/.test(app),
  "promoting a coin flip to a bright group tells the reader it should move an opinion");

// route_sh restates snap_sh at r=0.957. It is emitted as TPRR's DENOMINATOR and
// the row has to say so, or the card silently claims two signals where it has
// one — the duplicate-definition failure in data rather than in code.
ok("route share is declared a denominator, not an independent input",
  /NOT an independent input/.test(RT._meta.stability.route_sh.tier));
ok("the route share row tells the reader it restates snap share",
  /echo: "restates snap share/.test(app));
ok("the overlap with snap share is recorded", RT._meta.overlap.route_sh_vs_snap_share > 0.9);
ok("TPRR is recorded as NOT a restatement of volume",
  RT._meta.overlap.tprr_vs_targets_per_game < 0.95);

// The denominator is pass-snap participation, not charted routes, so protection
// snaps deflate blocking tight ends and backs. The card says so on their cards
// and only on theirs.
ok("the blocking caveat is gated to RB and TE",
  /blocking: pos === "RB" \|\| pos === "TE"/.test(app));
ok("the blocking caveat renders", /card\.routesMeta\.blocking \?/.test(app));

// Both files are what they claim to be.
ok("routes rows all clear the stated gate",
  Object.values(RT.players).every(r => r.routes >= RT._meta.min_routes));
ok("tprr equals targets over routes",
  Object.values(RT.players).every(r =>
    Math.abs(r.tprr - r.tgt / r.routes) < 0.0011));
ok("no route share exceeds 1.0",
  Object.values(RT.players).every(r => r.route_sh <= 1.0),
  "a season-level primary team breaks the denominator for every mid-season mover");
ok("coverage rows clear the split gate in BOTH buckets",
  Object.values(COV.players).every(r =>
    r.tgt_man >= COV._meta.min_split_targets && r.tgt_zone >= COV._meta.min_split_targets));
ok("edge equals man minus zone",
  Object.values(COV.players).every(r =>
    Math.abs(r.edge - (r.ypt_man - r.ypt_zone)) < 0.011));
ok("aDOT-by-coverage is recorded as not emitted, with its reason",
  typeof COV._meta.not_emitted.adot_man === "number" &&
  /already carried/.test(COV._meta.not_emitted.note));

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
