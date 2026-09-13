#!/usr/bin/env node
// test-no-undef.mjs — guard 40. No free identifier anywhere in the app source.
//
// WHY THIS EXISTS (Sep 13 2026)
//   The redraft reorder moved the refresh-lag banner from Lineup Confidence into
//   the Matchups block. The banner reads nfl.stale / nfl.week; the block it came
//   from declared `const nfl = seasonNow()` locally, and the move kept the JSX
//   and dropped the declaration. Production then threw ReferenceError on every
//   redraft grade and the error boundary showed "Something went wrong."
//
//   It passed EVERYTHING: `vite build` (esbuild does not check free
//   identifiers), 39 guards (all string- or engine-based; none renders the
//   results tree), a 90-grade calibration (the engine was fine; the render was
//   not), and a DOM audit - which ran while the banner sat in a panel that
//   never mounts pre-season, so the reference was never evaluated.
//
//   A free identifier is a class of bug, not an incident: any move, rename or
//   block deletion can produce one, and nothing in this suite could see it.
//   eslint's `no-undef` sees it in a second, before a browser is involved.
//
// WHAT IT CHECKS
//   `no-undef` over App.jsx.jsx (the file the dev server and the deploy build
//   serve), with ES builtins from ecmaVersion:latest and the browser globals the
//   app actually uses listed below. An identifier that is neither declared nor
//   in that list fails the run and is printed with its line.
//
//   ⚠️ THE GLOBALS LIST IS AN ALLOW-LIST, NOT A SUPPRESSION LIST. Add a name only
//   when it is a real host global the app uses. Adding an app identifier here to
//   make a red run green defeats the guard exactly as loosening an assertion
//   would.
//
// Run: node scripts/test-no-undef.mjs   (exits non-zero on failure)

import { ESLint } from "eslint";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = "App.jsx.jsx";
const src = readFileSync(path.join(repoRoot, file), "utf8");

const BROWSER_GLOBALS = [
  "window", "document", "navigator", "location", "history", "screen",
  "console", "alert", "confirm", "prompt",
  "localStorage", "sessionStorage", "indexedDB",
  "fetch", "Request", "Response", "Headers", "AbortController", "FormData",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback", "queueMicrotask",
  "performance", "matchMedia", "getComputedStyle", "scrollTo", "scrollBy",
  "innerWidth", "innerHeight", "devicePixelRatio",
  "Blob", "File", "FileReader", "URL", "URLSearchParams", "Image", "Audio",
  "HTMLElement", "HTMLInputElement", "Element", "Node", "Event", "CustomEvent", "KeyboardEvent",
  "MutationObserver", "IntersectionObserver", "ResizeObserver",
  "TextEncoder", "TextDecoder", "crypto", "structuredClone", "atob", "btoa",
  "Intl", "DOMParser", "ClipboardItem", "html2canvas",
];

const eslint = new ESLint({
  cwd: repoRoot,
  overrideConfigFile: true,
  overrideConfig: [{
    files: ["**/*.jsx", "**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: Object.fromEntries(BROWSER_GLOBALS.map(g => [g, "readonly"])),
    },
    rules: { "no-undef": "error" },
  }],
});

const [result] = await eslint.lintText(src, { filePath: path.join(repoRoot, file) });
const undef = result.messages.filter(m => m.ruleId === "no-undef");
const fatal = result.messages.filter(m => m.fatal);

if (fatal.length) {
  console.error(`FAIL  ${file} did not parse:`);
  for (const m of fatal) console.error(`  line ${m.line}: ${m.message}`);
  process.exit(1);
}
if (undef.length) {
  console.error(`FAIL  ${undef.length} free identifier${undef.length === 1 ? "" : "s"} in ${file} - a ReferenceError waiting for the branch that evaluates it:\n`);
  for (const m of undef) console.error(`  line ${m.line}:${m.column}  ${m.message}`);
  console.error("\nDeclare it in the block that reads it (see the Sep 13 2026 nfl hotfix), or, only if it is a real host global, add it to BROWSER_GLOBALS above.");
  process.exit(1);
}
console.log(`PASS  no free identifiers in ${file} (${src.split("\n").length} lines linted with no-undef)`);
