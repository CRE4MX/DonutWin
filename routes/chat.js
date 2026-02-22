const express = require("express");
const router = express.Router();

// In-memory message store (replace with DB / WebSocket in production)
const messages = [];

// Track active users (username → last-seen timestamp)
const activeUsers = new Map();
const ACTIVE_WINDOW_MS = 30000; // 30 seconds

function trackUser(session) {
  if (session && session.user) {
    activeUsers.set(session.user.username, Date.now());
  }
}

function getOnlineCount() {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  let count = 0;
  for (const [user, ts] of activeUsers) {
    if (ts >= cutoff) count++;
    else activeUsers.delete(user);
  }
  return count;
}

// ── GET /api/chat/messages ───────────────────────────────────
// Returns recent chat messages. Query param ?since=<timestamp> for polling.
router.get("/messages", (req, res) => {
  trackUser(req.session);
  const since = Number(req.query.since) || 0;
  const recent = messages.filter((m) => m.timestamp > since);
  res.json({ messages: recent, onlineCount: getOnlineCount() });
});

// ── POST /api/chat/messages ──────────────────────────────────
// Send a new chat message (requires auth)
router.post("/messages", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Login required to chat." });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }

  trackUser(req.session);

  const msg = {
    id: messages.length + 1,
    username: req.session.user.username,
    text: text.trim().slice(0, 500),
    timestamp: Date.now(),
  };

  messages.push(msg);

  // Keep only the last 200 messages in memory
  if (messages.length > 200) messages.splice(0, messages.length - 200);

  res.json({ ok: true, message: msg });
});

module.exports = router;
