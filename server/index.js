const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/expense_tracker";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_COOKIE = "token";
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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

userSchema.index({ email: 1 }, { unique: true });

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

const User = mongoose.model("User", userSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

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
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TOKEN_MAX_AGE_MS,
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(TOKEN_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
};

const getTokenFromRequest = (req) => {
  if (req.cookies && req.cookies[TOKEN_COOKIE]) {
    return req.cookies[TOKEN_COOKIE];
  }
  const authHeader = req.header("authorization");
  if (!authHeader) return null;
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7);
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
    origin: CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
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
    return res.status(500).json({ error: "Failed to create account" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
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
    if (!title || !category || !amount || !type || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
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
      category,
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
