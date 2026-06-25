// api/grade-get.js
// Fetches a stored roster grade snapshot by ID from Upstash KV.
// Public endpoint — used when someone opens a shared link (rosterxray.com/?g=<id>).
// Returns { snapshot } or 404 if the grade is missing/expired.

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

  const id = req.query.id || "";
  // Strict validation — only the exact ID shape we generate. Blocks injection.
  if (!/^[a-z0-9]{8}$/.test(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) {
    return res.status(500).json({ error: "KV not configured" });
  }

  try {
    const response = await fetch(`${kvUrl}/get/grade:${id}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });

    if (!response.ok) {
      return res.status(404).json({ error: "Not found" });
    }

    const data = await response.json();
    // Upstash returns { result: "stringified JSON" } or { result: null }
    if (!data.result) {
      return res.status(404).json({ error: "Not found" });
    }

    const snapshot = JSON.parse(data.result);
    return res.status(200).json({ snapshot });

  } catch (err) {
    console.error("grade-get error:", err);
    return res.status(500).json({ error: "Failed to load grade" });
  }
}
