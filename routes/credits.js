const express = require("express");
const router = express.Router();

// Middleware: require authentication for all credit operations
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Login required." });
  }
  next();
}

router.use(requireAuth);

// ── GET /api/credits/balance ─────────────────────────────────
// Returns the authenticated user's current balance.
// TODO: read balance from database instead of session
router.get("/balance", (req, res) => {
  res.json({ balance: req.session.user.balance });
});

// ── POST /api/credits/bet ────────────────────────────────────
// Deducts a bet from the user's balance (server-authoritative).
router.post("/bet", (req, res) => {
  const { amount } = req.body;
  const bet = Number(amount);

  if (!bet || bet <= 0) {
    return res.status(400).json({ error: "Invalid bet amount." });
  }
  if (bet > req.session.user.balance) {
    return res.status(400).json({ error: "Insufficient balance." });
  }

  // TODO: persist to database
  req.session.user.balance -= bet;
  res.json({ ok: true, balance: req.session.user.balance });
});

// ── POST /api/credits/win ────────────────────────────────────
// Credits a win to the user's balance (server-authoritative).
// In production, game outcome must be verified server-side before crediting.
router.post("/win", (req, res) => {
  const { amount } = req.body;
  const win = Number(amount);

  if (!win || win <= 0) {
    return res.status(400).json({ error: "Invalid win amount." });
  }

  // TODO: verify game result server-side before crediting
  // TODO: persist to database
  req.session.user.balance += win;
  res.json({ ok: true, balance: req.session.user.balance });
});

// ── POST /api/credits/reset ──────────────────────────────────
// Resets the user's balance to the default starting amount.
router.post("/reset", (req, res) => {
  // TODO: persist to database
  req.session.user.balance = 1000;
  res.json({ ok: true, balance: 1000 });
});

module.exports = router;
