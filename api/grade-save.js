// api/grade-save.js
// Stores a roster grade snapshot in Upstash KV under a short random ID.
// Public endpoint — used by the "Copy Share Link" button.
// Returns { id } which the client turns into rosterxray.com/?g=<id>.

export const config = { maxDuration: 15 };

// Same fixed-window rate limiter pattern as api/analyze.js and api/news-set.js.
async function checkRateLimit(kvUrl, kvToken, key, limit, windowSeconds) {
  try {
    const incrRes = await fetch(`${kvUrl}/incr/ratelimit:${key}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    if (!incrRes.ok) return true;
    const count = await incrRes.json();
    if (count.result === 1) {
      await fetch(`${kvUrl}/expire/ratelimit:${key}/${windowSeconds}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
    }
    return count.result <= limit;
  } catch {
    return true;
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = [
    "https://www.rosterxray.com",
    "https://rosterxray-1.vercel.app",
  ];
  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) {
    return res.status(500).json({ error: "KV not configured" });
  }

  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const rateOk = await checkRateLimit(kvUrl, kvToken, `grade-save:${ip}`, 20, 60);
  if (!rateOk) return res.status(429).json({ error: "Too many requests — please slow down" });

  const { snapshot } = req.body || {};
  if (!snapshot || typeof snapshot !== "object" || !snapshot.analyzed) {
    return res.status(400).json({ error: "Missing or invalid snapshot" });
  }

  const payload = JSON.stringify(snapshot);
  // Size guard — prevents abuse and oversized KV writes
  if (payload.length > 200000) {
    return res.status(413).json({ error: "Grade too large to share" });
  }

  try {
    // 8-char base36 ID — ~2.8 trillion combinations, collision negligible
    const id = Math.random().toString(36).slice(2, 10);

    // Upstash REST SET with the value in the BODY (not the URL path) so large
    // grades don't overflow the URL. EX=7776000 → 90-day TTL (auto-cleanup).
    const setRes = await fetch(`${kvUrl}/set/grade:${id}?EX=7776000`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}` },
      body: payload,
    });

    if (!setRes.ok) {
      return res.status(500).json({ error: "KV write failed" });
    }

    return res.status(200).json({ id });

  } catch (err) {
    console.error("grade-save error:", err);
    return res.status(500).json({ error: "Save failed" });
  }
}
