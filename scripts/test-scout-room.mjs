// Guard 48 - THE ROOM must print, and it must only ever print teammates.
//
// WHY IT EXISTS. Jaylen Warren is listed DC1 at RB for Pittsburgh and played
// 37% of the snaps. That got handed over as a "watch the backfield" caveat.
// Rico Dowdle, DC2, played 58%, and finding that out was ONE query nobody ran.
// A snap share printed with no room around it reads like a complete answer.
//
// ⛔ THE FAILURE MODE THIS GUARDS IS SILENCE, NOT WRONGNESS. If roomOn ever
// returns nothing - a renamed status field, a changed team code, a filter that
// over-filters - the section simply does not print, and the output looks
// exactly as finished as it does today. So the assertion is that the room IS
// there, not merely that it is correct when present.
import { execFileSync } from "child_process";
import { readFileSync } from "fs";

let fail = 0;
const ok = (label, cond, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"}   ${label}${detail && !cond ? `  — ${detail}` : ""}`);
  if (!cond) fail++;
};
const run = (name) =>
  execFileSync("node", ["scripts/scout.mjs", name], { encoding: "utf8", maxBuffer: 20e6 });

const status = (() => {
  const d = JSON.parse(readFileSync("grading/data/status_2026.json", "utf8"));
  return d.players ?? d;
})();

// the room lines are the indented "DCn  name  nn% snaps" rows under the header
const roomOf = (out) => {
  const lines = out.split(/\r?\n/);
  const i = lines.findIndex((l) => l.includes("THE ROOM at"));
  if (i < 0) return null;
  const rows = [];
  for (const l of lines.slice(i + 1)) {
    const m = l.match(/^ {4}(DC[0-9?]+)\s+(.+?)\s{2,}(\s*[0-9]+% snaps|no snap row)/);
    if (!m) break;
    rows.push({ dc: m[1], name: m[2].trim(), share: m[3].trim() });
  }
  return rows;
};

// ---- 1. it prints at all, for the case that caused it --------------------
const warren = run("Jaylen Warren");
ok("Warren's card prints a room", warren.includes("THE ROOM at RB on PIT"));
const wRoom = roomOf(warren) || [];
ok("...with at least one teammate in it", wRoom.length > 0, `${wRoom.length} rows`);

// ---- 2. ⭐ the committee that was invisible is now visible ---------------
const dowdle = wRoom.find((r) => r.name === "rico dowdle");
ok("Rico Dowdle appears in Warren's room", !!dowdle,
   wRoom.map((r) => r.name).join(", "));
ok("...carrying a real snap share, not a blank", !!dowdle && /[0-9]+% snaps/.test(dowdle.share),
   dowdle?.share);
// the whole point: the backup out-snapped the listed starter, and the page says so
const dShare = dowdle ? parseInt(dowdle.share, 10) : 0;
ok("...and that share is readable as a number", dShare > 0 && dShare <= 100, String(dShare));

// ---- 3. it may ONLY contain teammates at that position -------------------
const strays = wRoom.filter((r) => {
  const st = status[r.name];
  return !st || st.team !== "PIT" || st.pos !== "RB";
});
ok("every name in the room is a PIT RB per the feed", strays.length === 0,
   strays.map((s) => s.name).join(", "));
ok("...and the player himself is not listed in his own room",
   !wRoom.some((r) => r.name === "jaylen warren"));

// ---- 4. it works for a receiver room too, which is bigger ---------------
const pierce = run("Alec Pierce");
const pRoom = roomOf(pierce) || [];
ok("a WR card prints a room", pierce.includes("THE ROOM at WR on IND"));
ok("...and the room is capped so the names that matter stand out",
   pRoom.length > 0 && pRoom.length <= 5, `${pRoom.length} rows`);
ok("...all of them IND WRs",
   pRoom.every((r) => status[r.name]?.team === "IND" && status[r.name]?.pos === "WR"),
   pRoom.map((r) => r.name).join(", "));

// ---- 5. the must-fail case -----------------------------------------------
// The team check above is the one that can silently rot, so prove it bites.
// A fabricated row naming a player from another team must be rejected by the
// SAME expression the real check uses.
const sabotage = [{ name: "omarion hampton", dc: "DC1", share: "80% snaps" }];
ok("a non-PIT back planted in the room WOULD be caught",
   sabotage.filter((r) => status[r.name]?.team !== "PIT" || status[r.name]?.pos !== "RB").length === 1,
   `status says ${status["omarion hampton"]?.team}`);
// and prove the parser is not just returning [] for everything
ok("the row parser actually parses (not silently empty)", wRoom.length > 0 && !!wRoom[0].dc);

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall passed");
process.exit(fail ? 1 : 0);
