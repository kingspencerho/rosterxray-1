#!/usr/bin/env node
// test-adp-delta.mjs — reach/value deltas must use the ADP the roster carried,
// not the built-in snapshot.
//
// Guards a bug reported Jul 27 2026. ADP_DATA is a dated snapshot; drafts happen
// later. Measured on a real Jul 26 Underdog roster, drift between the snapshot
// and the platform's live ADP averaged 5.1 picks and peaked at 22.7. Ryan
// Flournoy was drafted at 157 with a live ADP of 160.4 — three picks of VALUE —
// and the app called him a 26-pick REACH because it compared against a stale
// 183.1. The delta formula (pick - adp) was never wrong. The input was.
//
// Every export format the app accepts prints ADP beside the pick. The parser
// already had to identify that token to tell it apart from the pick number; it
// simply discarded it. Now it is captured and overrides the table.
//
// Run: node scripts/test-adp-delta.mjs   (exits non-zero on failure)

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";
import os from "os";

const root = process.cwd();
const tmp = path.join(os.tmpdir(), "rxr-adpt");
mkdirSync(tmp, { recursive: true });
writeFileSync(path.join(tmp, "stub.js"), "export const Analytics=()=>null;export const track=()=>{};\n");
const src = readFileSync(path.join(root, "App.jsx.jsx"), "utf8") + "\nexport { parseRoster };\n";
const outfile = path.join(tmp, "e.mjs");
await build({
  stdin: { contents: src, loader: "jsx", resolveDir: root, sourcefile: "App.jsx.jsx" },
  bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
  alias: {
    "@vercel/analytics/react": path.join(tmp, "stub.js"),
    "@vercel/analytics": path.join(tmp, "stub.js"),
  },
});
const e = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

// Underdog's own layout: value line, then the label on the NEXT line.
const block = (name, team, bye, adp, pick) =>
  `${name}\n${team}\n${bye}\nBye\n${adp}\nADP\n${pick}\nPick\n`;

const cases = [
  // name,             team, bye, platform ADP, pick, expected delta
  ["Ryan Flournoy",    "DAL", 14, 160.4, 157,  -3.4],
  ["Chris Rodriguez",  "JAX",  7, 127.7, 133,   5.3],
  ["Jaxson Dart",      "NYG",  8, 101.9,  85, -16.9],
  ["Kenny Gainwell",   "TB",  10, 107.7, 108,   0.3],
  ["Justin Jefferson", "MIN",  6,  10.0,  12,   2.0],
];

const text = cases.map(c => block(c[0], c[1], c[2], c[3], c[4])).join("");
const picks = e.parseRoster(text, "standard");

let fail = 0;
const t = (label, ok, detail = "") => {
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : "  " + detail}`);
};

console.log("=== ADP comes from the roster, not the snapshot ===");
t("parser detected pick numbers", picks.hasPickNumbers === true);
for (const [name, , , platformAdp, pick, want] of cases) {
  const p = picks.find(x => x.name && x.name.toLowerCase().startsWith(name.split(" ")[0].toLowerCase()));
  if (!p) { t(`${name} parsed`, false, "not found"); continue; }
  const got = +(p.actualPick - p.adp).toFixed(1);
  t(`${name}: pick ${pick} vs ADP ${platformAdp} -> ${want >= 0 ? "+" : ""}${want}`,
    p.adpSource === "roster" && p.adp === platformAdp && Math.abs(got - want) < 0.05,
    `got adp=${p.adp} src=${p.adpSource} delta=${got}`);
}

console.log("\n=== The specific regression: Flournoy is not a reach ===");
const fl = picks.find(p => p.name && p.name.toLowerCase().includes("flournoy"));
t("delta magnitude under the 8-pick flag threshold", Math.abs(fl.actualPick - fl.adp) < 8,
  `delta=${(fl.actualPick - fl.adp).toFixed(1)}`);
t("table ADP retained for reference", typeof fl.tableAdp === "number");
t("stale table value is NOT what drives the delta", fl.adp !== fl.tableAdp);

console.log("\n=== Falls back cleanly when the paste has no ADP ===");
const bare = e.parseRoster("Justin Jefferson 12\nJames Cook 13\nTee Higgins 36\n", "standard");
const jj = bare.find(p => p.name && p.name.toLowerCase().includes("jefferson"));
t("adpSource is 'table' when none supplied", jj.adpSource === "table", `got ${jj.adpSource}`);
t("still resolves an ADP to work from", typeof jj.adp === "number");

console.log(`\n${fail === 0 ? "ALL CHECKS PASSED" : `FAILURES: ${fail}`}`);
process.exit(fail === 0 ? 0 : 1);
