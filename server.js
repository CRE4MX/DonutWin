require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const creditsRoutes = require("./routes/credits");
const paymentsRoutes = require("./routes/payments");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "donutwin-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// ── Static files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── API routes ───────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/credits", creditsRoutes);
app.use("/api/payments", paymentsRoutes);

// ── Catch-all → serve the SPA ────────────────────────────────
const indexPath = path.join(__dirname, "public", "index.html");
app.get("*", (_req, res) => {
  res.sendFile(indexPath);
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`DonutWin server running on http://localhost:${PORT}`);
});

module.exports = app;
