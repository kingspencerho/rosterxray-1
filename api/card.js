// api/card.js
// Renders a branded 1200x630 PNG "grade card" for a given shared grade id,
// used as the dynamic og:image / twitter:image for `/?g=<id>` links (see
// middleware.mjs). Runs on the Edge runtime, which is @vercel/og's primary
// supported target and gives us Web-standard fetch/Response everywhere.
//
// Any failure (missing/invalid id, KV miss, font fetch failure, render
// error) redirects to the existing static /api/og-image fallback — this
// endpoint must never 500, since it's embedded as an <img> by link previews.

import { ImageResponse } from "@vercel/og";
import React from "react";

export const config = { runtime: "edge" };

const h = React.createElement;
const ID_RE = /^[a-z0-9]{8}$/;

const TIER_COLORS = {
  A: "#4ade80",
  B: "#a3e635",
  C: "#facc15",
};

function tierColor(grade) {
  if (grade.startsWith("A")) return TIER_COLORS.A;
  if (grade.startsWith("B")) return TIER_COLORS.B;
  if (grade.startsWith("C")) return TIER_COLORS.C;
  return "#f87171";
}

// Official @vercel/og pattern for loading a Google Font at request time —
// only fetches the glyphs actually needed for `text`, so it stays fast.
async function loadGoogleFont(font, text) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);
  if (!match) throw new Error("font css parse failed");
  const res = await fetch(match[1]);
  if (!res.ok) throw new Error("font fetch failed");
  return res.arrayBuffer();
}

function fallbackRedirect(origin) {
  return Response.redirect(`${origin}/api/og-image`, 302);
}

export default async function handler(request) {
  const url = new URL(request.url);
  try {
    const id = url.searchParams.get("id") || "";
    if (!ID_RE.test(id)) return fallbackRedirect(url.origin);

    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    if (!kvUrl || !kvToken) return fallbackRedirect(url.origin);

    const kvRes = await fetch(`${kvUrl}/get/grade:${id}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    if (!kvRes.ok) return fallbackRedirect(url.origin);

    const kvData = await kvRes.json();
    if (!kvData.result) return fallbackRedirect(url.origin);

    const snapshot = JSON.parse(kvData.result);
    const analyzed = snapshot.analyzed;
    if (!analyzed || !analyzed.grade) return fallbackRedirect(url.origin);

    const grade = analyzed.grade;
    const mode = snapshot.analysisMode === "redraft" ? "Redraft" : "Best Ball";
    const topPlayers = (analyzed.valid || []).slice(0, 3).map((p) => p.name);
    const color = tierColor(grade);

    const displayText = `ROSTER X-RAY${grade}${mode}${topPlayers.join("")}rosterxray.com`;
    const bebasFont = await loadGoogleFont("Bebas Neue", displayText);

    return new ImageResponse(
      h(
        "div",
        {
          style: {
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#0a0a0a",
            padding: "56px 64px",
          },
        },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
          h(
            "div",
            { style: { display: "flex", fontFamily: "Bebas Neue", fontSize: 40, letterSpacing: 4, color: "#a78bfa" } },
            "ROSTER X-RAY"
          ),
          h(
            "div",
            { style: { display: "flex", fontFamily: "Bebas Neue", fontSize: 30, letterSpacing: 2, color: "#fafafa", opacity: 0.6 } },
            mode.toUpperCase()
          )
        ),
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 56 } },
          h(
            "div",
            { style: { display: "flex", fontFamily: "Bebas Neue", fontSize: 300, lineHeight: 1, color } },
            grade
          ),
          h(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 16 } },
            topPlayers.map((name, i) =>
              h(
                "div",
                { key: i, style: { display: "flex", fontFamily: "Bebas Neue", fontSize: 34, letterSpacing: 1, color: "#fafafa" } },
                name
              )
            )
          )
        ),
        h(
          "div",
          { style: { display: "flex", fontFamily: "Bebas Neue", fontSize: 26, letterSpacing: 2, color: "#666666" } },
          "ROSTERXRAY.COM"
        )
      ),
      {
        width: 1200,
        height: 630,
        fonts: [{ name: "Bebas Neue", data: bebasFont, weight: 400, style: "normal" }],
      }
    );
  } catch {
    return fallbackRedirect(url.origin);
  }
}
