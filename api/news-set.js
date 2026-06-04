// api/news-set.js
// Writes RECENT_NEWS entries to Upstash KV
// Password-gated — only accessible via admin panel
// Supports: add, update, delete, verify (AI sanity check before save)

export const config = { maxDuration: 30 };

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

  const { password, action, playerName, newsText, currentNews } = req.body;

  // Auth check
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!kvUrl || !kvToken) {
    return res.status(500).json({ error: "KV not configured" });
  }

  // === ACTION: verify — AI sanity check before saving ===
  if (action === "verify") {
    if (!anthropicKey) return res.status(500).json({ error: "API key not configured" });
    if (!playerName || !newsText) return res.status(400).json({ error: "Missing playerName or newsText" });

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          system: `You are a fantasy football news verifier. Given a player name and a news update, assess:
1. Does the player name and team/situation sound plausible for NFL 2026?
2. Are there any obvious factual errors (wrong position, impossible trade, wrong team)?
3. Who else on an NFL roster might be affected by this news?

Return valid JSON only:
{
  "plausible": true or false,
  "concern": "one sentence if something seems off, or null if all good",
  "affectedPlayers": ["Player Name 1", "Player Name 2"],
  "affectedReasons": ["reason for player 1", "reason for player 2"]
}`,
          messages: [{
            role: "user",
            content: `Player: ${playerName}\nNews: ${newsText}`,
          }],
        }),
      });

      const data = await response.json();
      const raw = data?.content?.[0]?.text?.trim();
      if (!raw) return res.status(500).json({ error: "AI verification failed" });

      const clean = raw.replace(/```json|```/g, "").trim();
      const result = JSON.parse(clean);
      return res.status(200).json(result);

    } catch (err) {
      console.error("verify error:", err);
      return res.status(500).json({ error: "Verification failed" });
    }
  }

  // === ACTION: save — write to KV ===
  if (action === "save") {
    if (!playerName || !newsText) return res.status(400).json({ error: "Missing playerName or newsText" });

    try {
      // Fetch existing news first
      const getRes = await fetch(`${kvUrl}/get/recent_news`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });

      let existing = {};
      if (getRes.ok) {
        const getData = await getRes.json();
        if (getData.result) existing = JSON.parse(getData.result);
      }

      // Normalize key — lowercase, trimmed
      const key = playerName.toLowerCase().trim();
      existing[key] = newsText.trim();

      // Write back
      const setRes = await fetch(`${kvUrl}/set/recent_news`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kvToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(JSON.stringify(existing)),
      });

      if (!setRes.ok) return res.status(500).json({ error: "KV write failed" });

      return res.status(200).json({ success: true, news: existing });

    } catch (err) {
      console.error("save error:", err);
      return res.status(500).json({ error: "Save failed" });
    }
  }

  // === ACTION: delete — remove one entry ===
  if (action === "delete") {
    if (!playerName) return res.status(400).json({ error: "Missing playerName" });

    try {
      const getRes = await fetch(`${kvUrl}/get/recent_news`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });

      let existing = {};
      if (getRes.ok) {
        const getData = await getRes.json();
        if (getData.result) existing = JSON.parse(getData.result);
      }

      const key = playerName.toLowerCase().trim();
      delete existing[key];

      const setRes = await fetch(`${kvUrl}/set/recent_news`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kvToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(JSON.stringify(existing)),
      });

      if (!setRes.ok) return res.status(500).json({ error: "KV write failed" });

      return res.status(200).json({ success: true, news: existing });

    } catch (err) {
      console.error("delete error:", err);
      return res.status(500).json({ error: "Delete failed" });
    }
  }

  return res.status(400).json({ error: "Invalid action" });
}
