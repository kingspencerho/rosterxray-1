# RosterXRay — Handoff

_Last updated after PR #12 merged to `main`._

## Current state
- `main` is up to date and deployed to production (Vercel auto-deploys `main`).
- Branch `claude/github-app-file-access-o62xr3` was merged into `main` via PR #12.
- Two stale, bot-authored draft PRs (#1, #2 — old Vercel Analytics attempts) were closed as superseded by #12.
- No other branches or open PRs are pending as of this writing.

## What just shipped (PR #12)
1. **Dynamic per-grade share preview image** ("Shareable Links Phase B"). When someone shares a `?g=<id>` grade link, the Open Graph preview (Discord/Twitter/iMessage embeds) now shows the actual grade instead of a generic static image.
   - `middleware.mjs` (repo root) — Vercel Routing Middleware, matches only `/`. Reads `?g=`, looks up the grade in Upstash KV, rewrites the `og:*`/`twitter:*` meta tags in the served `index.html`. Fails open on any error (missing id, KV miss, bad data) — falls back to the normal static page, never blocks a real user.
   - `api/card.js` — generates the 1200x630 image itself via `@vercel/og`, using the Bebas Neue font (`api/assets/BebasNeue-Regular.ttf` + its `OFL.txt` license). Falls back with a 302 to the old static `api/og-image.js` on any error.
   - `vercel.json` — has `functions.api/card.js.includeFiles` so the font ships with the function bundle.
   - **Rejected approach, don't retry it:** a `vercel.json` `has`-based rewrite on `/`. Vercel gives filesystem routes precedence over rewrites, so this would likely never fire. Middleware was the validated correct approach.
2. **`ErrorBoundary.jsx`** (repo root) — class component crash boundary, wraps `<App />` in `main.jsx`. Fallback UI uses hardcoded colors (not `var(--token)`) since the app's own `<style>` tag (which defines the CSS tokens) may not have mounted if `App` itself crashed.
3. **Vercel Analytics** — `@vercel/analytics` installed, `<Analytics />` rendered in `App.jsx` (mirrored to `App.jsx.jsx`).
4. **Share-link channel attribution** — no new UI buttons (deliberately, to not undo the earlier 4-button-to-2 simplification). Instead: a small hint near the "Link Copied" state telling the user to manually append `&src=discord` / `&src=reddit` / etc. before pasting, since Vercel Analytics already captures full query strings. Convention documented in `OUTREACH.md`.
5. **Dead code removed:** `handleCopyForDiscord` in `App.jsx`/`App.jsx.jsx` (leftover from a button removed in an earlier UX pass, never called anywhere).

## Hard constraints — do not violate (from CLAUDE.md, repeated here so a cold session doesn't miss them)
1. **Dual-file rule:** `App.jsx` and `App.jsx.jsx` must stay byte-for-byte identical after every edit. Any change to one must be mirrored exactly to the other. `App.jsx.jsx` is what actually gets imported/deployed (see `main.jsx`); `App.jsx` is the source copy. This is intentional, not a bug — don't "fix" `main.jsx`'s import path.
2. **Model lock:** `api/analyze.js` uses `claude-sonnet-4-6`. Never change, upgrade, or swap this model identifier.
3. **Branch:** all development happens on `claude/github-app-file-access-o62xr3`. Don't push to another branch without explicit permission. (Branch is currently caught up with `main` post-merge — if resuming work, either continue on this branch or confirm with the user whether a fresh branch is expected.)

## Known-good file map
- `api/analyze.js` — main grading endpoint (model-locked, see above)
- `api/grade-save.js`, `api/grade-get.js` — KV read/write for shareable grade links
- `api/og-image.js` — old static fallback OG image, still used as `api/card.js`'s error fallback
- `api/card.js`, `middleware.mjs`, `api/assets/BebasNeue-Regular.ttf`, `api/assets/OFL.txt` — new dynamic share preview feature
- `api/news-get.js`, `api/news-set.js` — news/situations data endpoints
- `App.jsx` / `App.jsx.jsx` — main app component (dual-file rule applies)
- `main.jsx` — mount point, wraps `<App />` in `<ErrorBoundary>`
- `ErrorBoundary.jsx` — crash fallback (not subject to dual-file rule)
- `vercel.json` — routing/function config
- `OUTREACH.md` — outreach strategy + the `&src=` channel-tagging convention
- `grading/data/*.md` — FPA, schedule, clusters, defense reference data used by the grading persona (see main `CLAUDE.md`)

## Open follow-up (not yet done, low risk)
- **Live end-to-end check of the share card was never done against real production.** Local preview testing was blocked by Vercel preview SSO. Worth doing once, manually: grade a roster, copy the share link, paste it into an actual Discord message, and confirm the dynamic grade card renders correctly in the embed. All the underlying logic was verified via a mocked test harness and the real build succeeded, but nobody has visually confirmed the actual Discord embed yet.

## Nothing else is currently deferred or half-finished
As of this handoff, there is no other known incomplete work, no failing checks, and no open PRs against this repo.
