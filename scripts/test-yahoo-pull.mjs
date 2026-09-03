#!/usr/bin/env node
// test-yahoo-pull.mjs — guard 28, credential safety for the Yahoo pull.
//
// ⚠️ THIS REPO IS PUBLIC. A committed OAuth secret CANNOT BE UNDONE — git
// history keeps it, and GitHub's API and forks cache independently. So the
// assertions here are not style checks; they are the thing standing between a
// convenience script and a permanently leaked credential.
//
// Defence in depth, because one layer is not enough:
//   1. THE SCRIPT REFUSES a credentials or token path inside the repo, rather
//      than trusting .gitignore to save you.
//   2. .gitignore is the BACKSTOP for when that refusal is bypassed or a file
//      lands here by hand. Both are asserted. This is not belt-and-braces
//      theatre: while negative-testing the refusal, a sabotaged run wrote a
//      dummy token into the repo root within seconds.
//   3. NOTHING SECRET-SHAPED is committed in the script itself.
//
// It also runs the script's own --self-test, which covers the parts that need
// no network: Yahoo's two JSON quirks, and absolute token expiry.
//
// Run: node scripts/test-yahoo-pull.mjs   (exits non-zero on failure)
import { readFileSync, existsSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";

const repoRoot = process.cwd();
const script = path.join(repoRoot, "scripts", "yahoo-pull.py");
let fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  ok   " : "  FAIL ") + l + (c ? "" : `  <${x}>`)); if (!c) fail++; };

const src = existsSync(script) ? readFileSync(script, "utf8") : "";

console.log("\n1. no secret is committed");
{
  ok("the script exists", src.length > 0);
  // Yahoo client ids are long dotted base64-ish blobs; secrets are 40-char hex.
  const looksSecret = [
    /YAHOO_CLIENT_(ID|SECRET)\s*=\s*["'][^"'\s]{8,}/,   // an assigned literal
    /dj0y[A-Za-z0-9]{20,}/,                              // Yahoo consumer-key prefix
    /\b[0-9a-f]{40}\b/,                                  // 40-char hex secret
    /Bearer\s+[A-Za-z0-9._~+/-]{20,}/,                   // a pasted access token
  ].filter(re => re.test(src));
  ok("no credential-shaped literal in the script", looksSecret.length === 0, String(looksSecret));
  ok("credentials are read from a file/env, never inlined",
     /os\.environ\.get\("YAHOO_CLIENT_ID"\)/.test(src) && /load_env/.test(src));
}

console.log("\n2. the script REFUSES to put secrets inside the repo");
{
  ok("an inside_repo check exists", /def inside_repo/.test(src));
  ok("the credentials path is asserted outside the repo",
     /assert_outside_repo\(Path\(a\.env\)/.test(src));
  ok("the TOKEN path is asserted too — not just the credentials",
     /def save_token[\s\S]{0,200}assert_outside_repo/.test(src));
  ok("the default credential dir is under the user's home, not the repo",
     /DEFAULT_DIR\s*=\s*Path\.home\(\)/.test(src));
  // Behavioural, not just structural: run it and read the refusal.
  let refused = "";
  try {
    execFileSync("python3", [script, "--teams", "--env", "./yahoo.env"],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { refused = String(e.stdout || "") + String(e.stderr || ""); }
  ok("running it with an in-repo --env is REFUSED", /REFUSED/.test(refused), refused.slice(0, 80));
  ok("the refusal explains why (public repo)", /PUBLIC/.test(refused));
}

console.log("\n3. .gitignore is the backstop");
{
  const gi = readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
  for (const f of ["yahoo.env", "yahoo_token.json", "yahoo_team.json"]) {
    ok(`.gitignore covers ${f}`, gi.split("\n").some(l => l.trim() === f));
  }
  // And nothing of the sort is actually tracked, now or by accident later.
  const tracked = execFileSync("git", ["ls-files"], { cwd: repoRoot }).toString();
  const bad = tracked.split("\n").filter(f => /yahoo[_.]?(env|token|team)/i.test(f));
  ok("no credential or pulled-roster file is tracked", bad.length === 0, String(bad));
}

console.log("\n4. the script's own self-test passes (Yahoo's JSON shape, token expiry)");
{
  let out = "", code = 0;
  try {
    out = execFileSync("python3", [script, "--self-test"], { cwd: repoRoot }).toString();
  } catch (e) { code = 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  ok("--self-test exits zero", code === 0, out.slice(-200));
  ok("it actually asserted something", (out.match(/  ok   /g) || []).length >= 12,
     String((out.match(/  ok   /g) || []).length));
  ok("no assertion is short-circuited with `or True`", !/or True\)/.test(src));
}

console.log(`\n${fail === 0 ? "PASS  yahoo-pull is credential-safe" : "FAIL  " + fail + " assertion(s)"}`);
process.exit(fail ? 1 : 0);
