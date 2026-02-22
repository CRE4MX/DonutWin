const express = require("express");
const router = express.Router();

// Middleware: require authentication for all payment operations
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Login required." });
  }
  next();
}

router.use(requireAuth);

// ── POST /api/payments/deposit ───────────────────────────────
// Initiate a deposit. In production, integrate with a payment provider
// (Stripe, PayPal, crypto, etc.) and credit balance only after confirmation.
router.post("/deposit", (req, res) => {
  const { amount, method } = req.body;
  const deposit = Number(amount);

  if (!deposit || deposit <= 0) {
    return res.status(400).json({ error: "Invalid deposit amount." });
  }

  // TODO: integrate payment provider, verify transaction
  // TODO: persist transaction to database
  req.session.user.balance += deposit;

  res.json({
    ok: true,
    transaction: {
      type: "deposit",
      amount: deposit,
      method: method || "demo",
      status: "completed",
      timestamp: Date.now(),
    },
    balance: req.session.user.balance,
  });
});

// ── POST /api/payments/withdraw ──────────────────────────────
// Initiate a withdrawal. In production, verify identity (KYC),
// check wagering requirements, then process via payment provider.
router.post("/withdraw", (req, res) => {
  const { amount, method } = req.body;
  const withdraw = Number(amount);

  if (!withdraw || withdraw <= 0) {
    return res.status(400).json({ error: "Invalid withdrawal amount." });
  }
  if (withdraw > req.session.user.balance) {
    return res.status(400).json({ error: "Insufficient balance." });
  }

  // TODO: integrate payment provider, KYC checks, wagering requirements
  // TODO: persist transaction to database
  req.session.user.balance -= withdraw;

  res.json({
    ok: true,
    transaction: {
      type: "withdrawal",
      amount: withdraw,
      method: method || "demo",
      status: "pending",
      timestamp: Date.now(),
    },
    balance: req.session.user.balance,
  });
});

// ── GET /api/payments/history ────────────────────────────────
// Returns payment/transaction history for the authenticated user.
// TODO: read from database
router.get("/history", (_req, res) => {
  res.json({ transactions: [] });
});

module.exports = router;
