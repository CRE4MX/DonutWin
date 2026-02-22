const express = require("express");
const router = express.Router();

// ── POST /api/auth/register ──────────────────────────────────
// TODO: connect to a database (e.g. PostgreSQL, MongoDB)
router.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // TODO: hash password, store user in DB, issue session
  req.session.user = { id: Date.now(), username, email, balance: 1000 };
  res.json({ ok: true, user: { username, email, balance: 1000 } });
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  // TODO: look up user in DB, verify hashed password
  req.session.user = { id: Date.now(), username, balance: 1000 };
  res.json({ ok: true, user: { username, balance: req.session.user.balance } });
});

// ── POST /api/auth/logout ────────────────────────────────────
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ── GET /api/auth/me ─────────────────────────────────────────
// Returns the currently logged-in user (or 401)
router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  res.json({ user: req.session.user });
});

module.exports = router;
