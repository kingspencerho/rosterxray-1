// /api/analyze.js
// Vercel serverless function — Anthropic API proxy
// All calls from the frontend hit this endpoint.
// The ANTHROPIC_API_KEY env var lives in Vercel dashboard, never in client code.

export const config = { maxDuration: 60 }; // allow up to 60s for vision calls

export default async function handler(req, res) {
  // CORS — allow requests from your own domain only
  const origin = req.headers.origin || "";
  const allowed = [
    "https://www.rosterxray.com",
    "https://rosterxray-1.vercel.app",
    "http://localhost:5173",  // local dev
    "http://localhost:3000",
  ];
  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const body = req.body;

    // Forward the request to Anthropic
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-opus-4-6",
        max_tokens: body.max_tokens || 2000,
        messages: body.messages,
        ...(body.system ? { system: body.system } : {}),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error("API proxy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
