// middleware.mjs
// Vercel Routing Middleware — rewrites the Open Graph / Twitter meta tags on
// the homepage response when a shared grade link (`/?g=<id>`) is requested,
// so Discord/Twitter/iMessage previews show the real grade instead of the
// generic static card. Runs only on the exact `/` path (see `matcher` below)
// — every other route (including all of /api/*) is completely untouched.
//
// Fails open everywhere: any missing env var, KV miss, invalid id, or thrown
// error falls straight through to `next()`, serving today's unmodified page.
// Real users are never blocked by this.

import { next } from "@vercel/functions";

export const config = { matcher: "/" };

const ID_RE = /^[a-z0-9]{8}$/;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function humanizeMode(analysisMode) {
  return analysisMode === "redraft" ? "Redraft" : "Best Ball";
}

function replaceMeta(html, property, newContent) {
  const re = new RegExp(
    `(<meta\\s+(?:property|name)="${property}"\\s+content=")[^"]*("\\s*/?>)`,
    "i"
  );
  return html.replace(re, `$1${escapeHtml(newContent)}$2`);
}

export default async function middleware(request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("g") || "";
    if (!ID_RE.test(id)) return next();

    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    if (!kvUrl || !kvToken) return next();

    const kvRes = await fetch(`${kvUrl}/get/grade:${id}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    if (!kvRes.ok) return next();

    const kvData = await kvRes.json();
    if (!kvData.result) return next();

    const snapshot = JSON.parse(kvData.result);
    const analyzed = snapshot.analyzed;
    if (!analyzed || !analyzed.grade) return next();

    const mode = humanizeMode(snapshot.analysisMode);
    const topNames = (analyzed.valid || [])
      .slice(0, 3)
      .map((p) => p.name)
      .join(", ");

    const title = `${analyzed.grade} — Roster X-Ray`;
    const description = topNames
      ? `${mode} roster graded ${analyzed.grade}. ${topNames}. See the full breakdown.`
      : `${mode} roster graded ${analyzed.grade}. See the full breakdown.`;
    const imageUrl = `${url.origin}/api/card?id=${id}`;

    const pageRes = await fetch(`${url.origin}/index.html`);
    if (!pageRes.ok) return next();
    let html = await pageRes.text();

    html = html.replace(/(<title>)[^<]*(<\/title>)/i, `$1${escapeHtml(title)}$2`);
    html = replaceMeta(html, "og:title", title);
    html = replaceMeta(html, "og:description", description);
    html = replaceMeta(html, "og:image", imageUrl);
    html = replaceMeta(html, "twitter:title", title);
    html = replaceMeta(html, "twitter:description", description);
    html = replaceMeta(html, "twitter:image", imageUrl);

    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch {
    return next();
  }
}
