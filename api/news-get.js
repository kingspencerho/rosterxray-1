// api/news-get.js
// Returns the current RECENT_NEWS entries stored in Upstash KV
// Public endpoint — no auth required (read-only)

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = [
    "https://www.rosterxray.com",
    "https://rosterxray-1.vercel.app",
  ];
  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      return res.status(500).json({ error: "KV not configured" });
    }

    const response = await fetch(`${url}/get/recent_news`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      // No entries yet — return empty object, not an error
      return res.status(200).json({ news: {} });
    }

    const data = await response.json();

    // Upstash returns { result: "stringified JSON" } or { result: null }
    if (!data.result) {
      return res.status(200).json({ news: {} });
    }

    const news = JSON.parse(data.result);
    return res.status(200).json({ news });

  } catch (err) {
    console.error("news-get error:", err);
    return res.status(500).json({ error: "Failed to load news" });
  }
}
