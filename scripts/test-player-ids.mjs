// Guard 47 — THE PLAYER CROSSWALK, and the failure mode it exists to make LOUD.
//
// ⛔⛔ THE BUG WAS NEVER THAT NAMES WERE USED. It was that a failed lookup
// returned null, and null renders exactly like "this player has no data". A
// back's 84th-percentile 2025 season printed as "no 2025 row" for a week, on a
// roster the user actually owns. An absence that looks like a fact is the worst
// failure this tool can have, because nothing about it invites a second look.
//
// A MIGRATION WOULD FIX THE LAYERS SOMEBODY MIGRATES. This fixes the ones
// nobody has touched yet, and fails when a new one drifts.
//
// WHAT IT PROTECTS, in descending order of cost:
//  1. RESOLUTION RATE PER LAYER. If a layer's keys stop resolving, lookups go
//     quiet rather than wrong, which is how this went unnoticed.
//  2. AMBIGUITY IS REFUSED, NOT GUESSED. Two players normalise to "antonio
//     williams" and one is on his roster. A wrong player is worse than a
//     missing one.
//  3. THE LADDER STILL RESCUES. Refusing is only acceptable because
//     name+position resolves almost all of them.
//  4. THE NICKNAME CASE. Both spellings of the back that caused this must
//     reach the same id, or the whole exercise bought nothing.
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
const rd = (f) => JSON.parse(readFileSync(path.join(repoRoot, f), "utf8"));
let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}${detail && !cond ? `  — ${detail}` : ""}`);
  if (!cond) fail++;
};

const F = "grading/data/player_ids.json";
ok("the crosswalk exists", existsSync(path.join(repoRoot, F)));
const X = rd(F);

ok("it maps a real population", Object.keys(X.by_name).length > 5000,
   `${Object.keys(X.by_name).length}`);
// pfr is named specifically because build-snap-current.py joins on it. A
// generic "some alt ids exist" assertion would pass while the one feed a
// builder actually needs had gone missing.
const altPrefixes = new Set(Object.keys(X.by_alt).map((k) => k.split(":")[0]));
ok("...and carries other feeds' ids so a builder can go id-first",
   Object.keys(X.by_alt).length > 20000 && altPrefixes.has("pfr") && altPrefixes.has("espn"),
   [...altPrefixes].join(","));

// ---- 2. ambiguity is refused -------------------------------------------
const leaked = (X.ambiguous || []).filter((n) => X.by_name[n]);
ok("no ambiguous name resolves on its own", leaked.length === 0, leaked.slice(0, 3).join(", "));
ok("...and the ambiguous list is non-empty, so the check has teeth",
   (X.ambiguous || []).length > 10, `${(X.ambiguous || []).length}`);

// ---- 3. the ladder rescues ---------------------------------------------
const rescued = (X.ambiguous || []).filter((n) =>
  Object.keys(X.by_name_pos).some((k) => k.startsWith(n + "|")));
ok("position rescues most collisions", rescued.length / (X.ambiguous.length || 1) > 0.8,
   `${rescued.length} of ${X.ambiguous.length}`);

// ---- 4. the case that started it ---------------------------------------
const a = X.by_name["kenny gainwell"], b = X.by_name["kenneth gainwell"];
ok("both spellings of the back that caused this resolve", !!a && !!b);
ok("...and they resolve to the SAME id", a === b, `${a} vs ${b}`);

// ---- 5. ⭐ RESOLUTION RATE PER LAYER — the assertion that matters -------
const nm = (n) => (n || "").toLowerCase().replace(/[.']/g, "").replace(/-/g, " ")
  .replace(/\s+(jr|sr|ii|iii|iv|v)$/, "").replace(/\s+/g, " ").trim();
const resolveRate = (rows) => {
  const keys = Object.keys(rows);
  const hit = keys.filter((k) => X.by_name[nm(k)] || rows[k]?.id).length;
  return { hit, total: keys.length, rate: keys.length ? hit / keys.length : 1 };
};
const FLOOR = 0.80;
const dataDir = path.join(repoRoot, "grading", "data");
let checked = 0;
for (const f of readdirSync(dataDir)) {
  if (!f.endsWith(".json") || f === "player_ids.json") continue;
  let d;
  try { d = rd(path.join("grading", "data", f)); } catch { continue; }
  const rows = (d.players && typeof d.players === "object") ? d.players
    : Object.fromEntries(Object.entries(d).filter(([k, v]) => !k.startsWith("_") && v && typeof v === "object"));
  const keys = Object.keys(rows);
  if (keys.length < 100) continue;                    // small layers are gated, not broken
  const { hit, rate } = resolveRate(rows);
  checked++;
  ok(`${f} keys resolve (${(rate * 100).toFixed(0)}%)`, rate >= FLOOR,
     `${hit} of ${keys.length} — below the ${FLOOR * 100}% floor`);
}
ok("several layers were actually checked", checked >= 8, `${checked}`);

// ---- 6. the must-fail case ---------------------------------------------
// TWO SABOTAGES, because the two assertions fail for different reasons and a
// guard that can only fail one way is half a guard.
const sabAmb = { ...X, by_name: { ...X.by_name, [X.ambiguous[0]]: "00-0000000" } };
ok("an ambiguous name that DID resolve would be caught",
   (sabAmb.ambiguous || []).filter((n) => sabAmb.by_name[n]).length > 0);

// ⭐ THE ONE THAT PROVES THE FLOOR: a layer keyed the way the feeds key it
// (raw, unresolved spellings) must come back BELOW the floor. If this passes,
// the floor is decorative and the silent-absence bug is back.
const sabLayer = Object.fromEntries(
  ["J.Smith", "zz nobody at all", "A.Player", "qqq unknown", "M.Evans"].map((k) => [k, {}]));
ok("a layer of unresolved feed spellings falls below the floor",
   resolveRate(sabLayer).rate < FLOOR, `${(resolveRate(sabLayer).rate * 100).toFixed(0)}%`);

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall passed");
process.exit(fail ? 1 : 0);
