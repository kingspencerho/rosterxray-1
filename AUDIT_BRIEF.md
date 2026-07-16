# RosterXRay — Audit Brief

Read this together with `HANDOFF.md` (same directory) before starting. HANDOFF.md has the full project state; this file scopes the audit itself.

## What this app is
RosterXRay (rosterxray.com) — a fantasy football best ball roster grader. Stack:
- **Frontend:** single-component React SPA (`App.jsx` / `App.jsx.jsx`, ~530KB each, built with Vite, deployed on Vercel)
- **Backend:** Vercel serverless functions in `api/` (no framework)
  - `api/analyze.js` — the core endpoint; calls the Anthropic API (model-locked to `claude-sonnet-4-6`, never change)
  - `api/grade-save.js` / `api/grade-get.js` — save/load shared grade snapshots in Upstash KV
  - `api/card.js` + `middleware.mjs` — dynamic OG share-preview images (KV-backed, fail-open)
  - `api/og-image.js` — static fallback image
  - `api/news-get.js` / `api/news-set.js` — news/situations data
- **State:** production = `main`, fully deployed, no open PRs, no known broken features.

## Audit scope — in priority order

1. **Security of the public API surface (highest value).** Every `api/*.js` function is publicly callable. Specifically assess:
   - `api/analyze.js`: can an outsider drain the Anthropic API budget by hammering it? Rate limiting? Input size caps? Is the API key handled strictly server-side?
   - `api/grade-save.js`: can it be abused to fill the KV store (no auth, arbitrary writes)? Size/shape validation on saved payloads?
   - `api/news-set.js`: what stops arbitrary writes? Check for any auth/secret gate.
   - `middleware.mjs` / `api/card.js`: injection via the `g`/`id` params into HTML meta tags or the rendered image (there is an `escapeHtml` in middleware — verify it's applied everywhere user data lands).
   - Secrets hygiene: confirm no keys/tokens committed anywhere in the repo or exposed to the client bundle.
2. **Correctness/robustness:** unhandled promise rejections in the API functions, missing input validation, KV failure paths, CORS posture.
3. **Performance:** `App.jsx` is one ~530KB component. Assess real-world impact (bundle size, parse time) and whether cheap wins exist WITHOUT restructuring (see constraints).
4. **Dependency audit:** `npm audit` plus a sanity check that dependencies are current-ish (`@vercel/og`, `@vercel/analytics`, `@vercel/functions`, React, Vite).
5. **Dead code / cruft:** unused exports, unreachable branches, leftover experiment code.

## Hard constraints — the audit must respect these
- **Report-only by default.** Produce findings with severity + file:line + concrete fix suggestions. Do NOT change code unless the user explicitly approves specific fixes afterward.
- **Dual-file rule:** `App.jsx` and `App.jsx.jsx` are intentionally byte-identical (source + deploy copies). Not a bug. Any approved fix must be mirrored to both.
- **Model lock:** `api/analyze.js` uses `claude-sonnet-4-6`. Never flag "upgrade the model" as a fix; it is locked by design.
- **`main.jsx` importing `./App.jsx.jsx`** is intentional. Not a bug.
- **Do not propose splitting App.jsx into modules** as an audit outcome — the single-file layout is a deliberate workflow choice. Performance findings should work within it.

## Known items (don't re-discover, already tracked)
- Live Discord embed check of the OG share card is still pending (preview SSO blocked automated verification). Treat as known-open, not a finding.
- Two stale bot PRs (#1, #2) were closed as superseded. Historical, ignore.
- No test suite exists. A finding recommending a minimal smoke-test set for `api/*` is welcome; a finding demanding full coverage is not actionable.

## Suggested deliverable format
One report, findings ranked by severity (Critical / High / Medium / Low), each with: file:line, the risk in one sentence, a concrete minimal fix. End with a short "top 3 things to fix first" summary.
