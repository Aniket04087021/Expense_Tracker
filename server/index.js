const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const MONGODB_URI =
  process.env.MONGODB_URI ||
  (IS_PRODUCTION ? "" : "mongodb://localhost:27017/expense_tracker");
const CLIENT_URL =
  process.env.CLIENT_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://expense-tracker-lyart-alpha.vercel.app"
    : "http://localhost:5173");
const CLIENT_URLS = (process.env.CLIENT_URLS || CLIENT_URL)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const JWT_SECRET = process.env.JWT_SECRET || (IS_PRODUCTION ? "" : "dev_secret_change_me");
const TOKEN_COOKIE = "token";
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const IS_PRODUCTION_LIKE =
  IS_PRODUCTION ||
  CLIENT_URLS.some((url) => !url.includes("localhost"));
const COOKIE_SAME_SITE =
  process.env.COOKIE_SAME_SITE ||
  (IS_PRODUCTION_LIKE ? "none" : "lax");
const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === "true"
  : IS_PRODUCTION_LIKE;

if (IS_PRODUCTION && (!JWT_SECRET || JWT_SECRET.length < 32)) {
  console.error("JWT_SECRET must be set to a random value of at least 32 characters in production.");
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in production environment.");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    provider: { type: String, enum: ["local"], default: "local" },
  },
  { timestamps: true },
);

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ["expense", "income", "investment"],
      required: true,
    },
  },
  { timestamps: true },
);

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    period: { type: String, enum: ["monthly", "quarterly", "yearly"], required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

const goalContributionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    goal: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);
const Goal = mongoose.model("Goal", goalSchema);
const GoalContribution = mongoose.model("GoalContribution", goalContributionSchema);

const signToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

const setAuthCookie = (res, token) => {
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: COOKIE_SAME_SITE,
    secure: COOKIE_SECURE,
    maxAge: TOKEN_MAX_AGE_MS,
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(TOKEN_COOKIE, {
    httpOnly: true,
    sameSite: COOKIE_SAME_SITE,
    secure: COOKIE_SECURE,
  });
};

const getTokenFromRequest = (req) => {
  // 1. Check Authorization header first (used by mobile/PWA with localStorage)
  const authHeader = req.header("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7);
  }
  // 2. Fall back to httpOnly cookie (used by web browsers)
  if (req.cookies && req.cookies[TOKEN_COOKIE]) {
    return req.cookies[TOKEN_COOKIE];
  }
  return null;
};

const requireAuth = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub).select("_id name email provider");
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || CLIENT_URLS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin && !CLIENT_URLS.includes(origin)) {
      return res.status(403).json({ error: "Request origin is not allowed." });
    }
  }
  next();
});
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

const authAttempts = new Map();
const authRateLimit = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  if (authAttempts.size > 5000) {
    for (const [ip, attempt] of authAttempts) {
      if (now - attempt.startedAt > 15 * 60 * 1000) authAttempts.delete(ip);
    }
  }
  const entry = authAttempts.get(key);
  if (!entry || now - entry.startedAt > 15 * 60 * 1000) {
    authAttempts.set(key, { startedAt: now, count: 1 });
    return next();
  }
  if (entry.count >= 12) {
    res.setHeader("Retry-After", "900");
    return res.status(429).json({ error: "Too many sign-in attempts. Please try again in 15 minutes." });
  }
  entry.count += 1;
  return next();
};

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/register", authRateLimit, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name.trim() || !email.trim() || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (name.trim().length > 80 || email.trim().length > 254 || password.length < 8 || password.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Enter a valid name and email. Password must be 8–128 characters." });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      provider: "local",
    });

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      user: { _id: user._id, name: user.name, email: user.email, provider: user.provider },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Failed to create account" });
  }
});

app.post("/api/auth/login", authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password || email.length > 254 || password.length > 128) {
      return res.status(400).json({ error: "Missing email or password" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signToken(user);
    setAuthCookie(res, token);

    return res.json({
      user: { _id: user._id, name: user.name, email: user.email, provider: user.provider },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Failed to log in" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});


app.get("/api/transactions", requireAuth, async (req, res) => {
  try {
    const data = await Transaction.find({ user: req.user._id }).sort({
      date: -1,
      createdAt: -1,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to load transactions" });
  }
});

app.post("/api/transactions", requireAuth, async (req, res) => {
  try {
    const { title, category, amount, type, date } = req.body || {};
    if (typeof title !== "string" || typeof category !== "string" || !title.trim() || !category.trim() || title.trim().length > 120 || category.trim().length > 50 || amount === undefined || !type || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }

    if (!["expense", "income", "investment"].includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }

    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }

    const signedAmount = type === "expense" ? -parsedAmount : parsedAmount;

    const created = await Transaction.create({
      user: req.user._id,
      title: title.trim(),
      category: category.trim(),
      date: dateObj,
      amount: signedAmount,
      type,
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: "Failed to save transaction" });
  }
});

app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Transaction.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });
    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// ── Goals ──────────────────────────────────────────────────────────────────

app.get("/api/goals", requireAuth, async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: "Failed to load goals" });
  }
});

app.post("/api/goals", requireAuth, async (req, res) => {
  try {
    const { name, category, period, amount } = req.body || {};
    if (!name || !category || !period || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }
    if (!["monthly", "quarterly", "yearly"].includes(period)) {
      return res.status(400).json({ error: "Invalid period" });
    }
    const goal = await Goal.create({
      user: req.user._id,
      name: name.trim(),
      category,
      period,
      amount: parsedAmount,
    });
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: "Failed to create goal" });
  }
});

app.put("/api/goals/:id", requireAuth, async (req, res) => {
  try {
    const { name, category, period, amount } = req.body || {};
    const parsedAmount = Number(amount);
    if (typeof name !== "string" || typeof category !== "string" || !name.trim() || name.trim().length > 80 || !category.trim() || category.length > 50 || !period || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid fields" });
    }
    if (!["monthly", "quarterly", "yearly"].includes(period)) {
      return res.status(400).json({ error: "Invalid period" });
    }
    const updated = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { name: name.trim(), category, period, amount: parsedAmount },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Goal not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update goal" });
  }
});

app.delete("/api/goals/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) return res.status(404).json({ error: "Goal not found" });
    await GoalContribution.deleteMany({ goal: req.params.id, user: req.user._id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete goal" });
  }
});

// ── Goal Contributions ─────────────────────────────────────────────────────

app.get("/api/goals/contributions", requireAuth, async (req, res) => {
  try {
    const contributions = await GoalContribution.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(contributions);
  } catch (error) {
    res.status(500).json({ error: "Failed to load contributions" });
  }
});

app.post("/api/goals/:goalId/contributions", requireAuth, async (req, res) => {
  try {
    const { amount, note } = req.body || {};
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }
    const goal = await Goal.findOne({ _id: req.params.goalId, user: req.user._id });
    if (!goal) return res.status(404).json({ error: "Goal not found" });

    const contribution = await GoalContribution.create({
      user: req.user._id,
      goal: req.params.goalId,
      amount: parsedAmount,
      note: (note || "").trim(),
    });
    res.status(201).json(contribution);
  } catch (error) {
    res.status(500).json({ error: "Failed to save contribution" });
  }
});

app.delete("/api/goals/contributions/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await GoalContribution.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!deleted) return res.status(404).json({ error: "Contribution not found" });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete contribution" });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n❌  Port ${PORT} is already in use.\n` +
      `   Stop the other process first, or set a different PORT in your .env file.\n`
    );
  } else {
    console.error("Server error:", err.message);
  }
  process.exit(1);
});
