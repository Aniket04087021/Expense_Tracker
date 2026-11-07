const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
require("dotenv").config();
const { fromMinorUnits, toMinorUnits } = require("./lib/money");
const {
  accountDeltaForTransaction,
  accountDeltaForValues,
  transactionAmount,
} = require("./lib/finance");
const {
  sendSecurityEmail,
  securityEmailHtml,
  smtpConfigured,
  smtpConfigSummary,
} = require("./lib/email");

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
const CLIENT_APP_URL = CLIENT_URLS[0] || CLIENT_URL;
const SECURITY_TOKEN_TTL_MS = 60 * 60 * 1000;
const IS_PRODUCTION_LIKE =
  IS_PRODUCTION ||
  CLIENT_URLS.some((url) => !url.includes("localhost"));
const COOKIE_SAME_SITE =
  process.env.COOKIE_SAME_SITE ||
  (IS_PRODUCTION_LIKE ? "none" : "lax");
const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === "true"
  : IS_PRODUCTION_LIKE;

console.log("SMTP configuration:", smtpConfigSummary);

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
    emailVerified: { type: Boolean, default: true },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    idempotencyKey: { type: String, trim: true, maxlength: 120 },
    type: {
      type: String,
      enum: ["expense", "income", "investment"],
      required: true,
    },
  },
  { timestamps: true },
);
transactionSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

const accountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: ["bank", "credit_card", "cash", "wallet", "other"], required: true },
    balance: { type: Number, required: true, default: 0 },
    creditLimit: { type: Number, min: 0, default: null },
    billingCycleDay: { type: Number, min: 1, max: 31, default: null },
    statementDay: { type: Number, min: 1, max: 31, default: null },
    paymentDueDay: { type: Number, min: 1, max: 31, default: null },
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

const transferSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sourceAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    destinationAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 240, default: "" },
    idempotencyKey: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);
transferSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, required: true, trim: true, maxlength: 50 },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);
budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

const recurringTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 50 },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["expense", "income", "investment"], required: true },
    frequency: { type: String, enum: ["weekly", "monthly"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    nextOccurrence: { type: Date, required: true },
    paused: { type: Boolean, default: false },
    lastProcessedOccurrence: { type: Date, default: null },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
const Account = mongoose.model("Account", accountSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);
const Goal = mongoose.model("Goal", goalSchema);
const GoalContribution = mongoose.model("GoalContribution", goalContributionSchema);
const Transfer = mongoose.model("Transfer", transferSchema);
const Budget = mongoose.model("Budget", budgetSchema);
const RecurringTransaction = mongoose.model("RecurringTransaction", recurringTransactionSchema);
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 300 },
  kind: { type: String, enum: ["account", "transaction", "goal", "transfer", "budget", "recurring", "system"], default: "system" },
  read: { type: Boolean, default: false },
}, { timestamps: true });
const Notification = mongoose.model("Notification", notificationSchema);
const createNotification = (userId, title, message, kind = "system") =>
  Notification.create({ user: userId, title, message, kind });

const createSecurityToken = () => crypto.randomBytes(32).toString("hex");
const hashSecurityToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  provider: user.provider,
  emailVerified: user.emailVerified !== false,
});
const sendVerificationEmail = async (user) => {
  const token = createSecurityToken();
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerificationTokenHash: hashSecurityToken(token),
        emailVerificationExpiresAt: new Date(Date.now() + SECURITY_TOKEN_TTL_MS),
      },
    },
  );
  const link = `${CLIENT_APP_URL}/?verify_email=${encodeURIComponent(token)}`;
  return sendSecurityEmail({
    to: user.email,
    subject: "Verify your Expnse email",
    text: `Verify your Expnse email by opening this link: ${link}\n\nThis link expires in one hour.`,
    html: securityEmailHtml({
      preheader: "Verify your Expnse email address.",
      heading: "Verify your email",
      message: "Thanks for joining Expnse. Confirm your email address to keep your account protected.",
      actionLabel: "Verify email",
      actionUrl: link,
    }),
  });
};

const applyAccountDelta = async (accountId, userId, deltaMinorUnits) => {
  if (!deltaMinorUnits) return true;
  const result = await Account.updateOne(
    { _id: accountId, user: userId },
    { $inc: { balance: fromMinorUnits(deltaMinorUnits) } },
  );
  return result.matchedCount === 1;
};

const validateAccountPayload = (body) => {
  const { name, type, balance, creditLimit, billingCycleDay, statementDay, paymentDueDay } = body || {};
  const parsedBalance = Number(balance);
  const parsedCreditLimit = creditLimit === "" || creditLimit === undefined || creditLimit === null
    ? null
    : Number(creditLimit);
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 80 ||
    !["bank", "credit_card", "cash", "wallet", "other"].includes(type) ||
    !Number.isFinite(parsedBalance) ||
    (parsedCreditLimit !== null && (!Number.isFinite(parsedCreditLimit) || parsedCreditLimit < 0))
  ) {
    return null;
  }
  const dayFields = { billingCycleDay, statementDay, paymentDueDay };
  for (const value of Object.values(dayFields)) {
    if (value !== null && value !== undefined && value !== "" && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 31)) return null;
  }
  return {
    name: name.trim(),
    type,
    balance: fromMinorUnits(toMinorUnits(parsedBalance)),
    creditLimit: parsedCreditLimit === null ? null : fromMinorUnits(toMinorUnits(parsedCreditLimit)),
    billingCycleDay: billingCycleDay === "" || billingCycleDay === undefined ? null : Number(billingCycleDay),
    statementDay: statementDay === "" || statementDay === undefined ? null : Number(statementDay),
    paymentDueDay: paymentDueDay === "" || paymentDueDay === undefined ? null : Number(paymentDueDay),
  };
};


const signToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), sv: user.sessionVersion || 0 },
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
  // 1. Accept a legacy bearer token for older clients.
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
    const user = await User.findById(payload.sub).select("_id name email provider emailVerified sessionVersion");
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if ((payload.sv || 0) !== (user.sessionVersion || 0)) {
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
  if (IS_PRODUCTION) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
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
      emailVerified: !smtpConfigured,
    });

    const token = signToken(user);
    setAuthCookie(res, token);
    if (smtpConfigured) {
      try {
        await sendVerificationEmail(user);
      } catch (error) {
        console.error("Verification delivery failed:", error.message);
      }
    }
    await createNotification(user._id, "Welcome to Expnse", "Your personal finance space is ready.", "account");

    return res.status(201).json({
      user: publicUser(user),
      emailDeliveryConfigured: smtpConfigured,
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
      user: publicUser(user),
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

app.post("/api/auth/forgot-password", authRateLimit, async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  try {
    const user = await User.findOne({ email }).select("+passwordResetTokenHash +passwordResetExpiresAt");
    if (!user || !user.passwordHash) {
      return res.status(404).json({ error: "No account found with this email address." });
    }

    const token = createSecurityToken();
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetTokenHash: hashSecurityToken(token),
          passwordResetExpiresAt: new Date(Date.now() + SECURITY_TOKEN_TTL_MS),
        },
      },
    );
    const link = `${CLIENT_APP_URL}/?reset_password=${encodeURIComponent(token)}`;
    await sendSecurityEmail({
      to: user.email,
      subject: "Reset your Expnse password",
      text: `Reset your Expnse password by opening this link: ${link}\n\nThis link expires in one hour and can only be used once.`,
      html: securityEmailHtml({
        preheader: "Reset your Expnse password securely.",
        heading: "Reset your password",
        message: "We received a request to reset your Expnse password. Use the button below to choose a new one.",
        actionLabel: "Reset password",
        actionUrl: link,
      }),
    });
  } catch (error) {
    console.error("Password recovery delivery failed:", error.message);
    return res.status(500).json({ error: "Could not send the recovery email. Please try again." });
  }
  return res.json({ message: "Recovery instructions have been sent to your email." });
});

app.post("/api/auth/reset-password", authRateLimit, async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!token || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "Password must be 8–128 characters." });
  }
  try {
    const user = await User.findOne({
      passwordResetTokenHash: hashSecurityToken(token),
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");
    if (!user) return res.status(400).json({ error: "This reset link is invalid or expired." });
    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();
    clearAuthCookie(res);
    return res.json({ message: "Password reset successfully. Please sign in again." });
  } catch (error) {
    console.error("Password reset error:", error.message);
    return res.status(500).json({ error: "Could not reset password." });
  }
});

app.post("/api/auth/verify-email", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!token) return res.status(400).json({ error: "Verification token is required." });
  try {
    const user = await User.findOne({
      emailVerificationTokenHash: hashSecurityToken(token),
      emailVerificationExpiresAt: { $gt: new Date() },
    }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");
    if (!user) return res.status(400).json({ error: "This verification link is invalid or expired." });
    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    return res.json({ message: "Email verified successfully." });
  } catch (error) {
    console.error("Email verification error:", error.message);
    return res.status(500).json({ error: "Could not verify email." });
  }
});

app.post("/api/auth/resend-verification", requireAuth, async (req, res) => {
  if (req.user.emailVerified) return res.json({ message: "Email is already verified." });
  try {
    const user = await User.findById(req.user._id);
    if (user) await sendVerificationEmail(user);
    return res.json({ message: "If verification is available, a new link will be sent shortly." });
  } catch (error) {
    console.error("Verification delivery failed:", error.message);
    return res.status(500).json({ error: "Could not send verification email." });
  }
});

app.get("/api/profile", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.put("/api/profile", requireAuth, async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name || name.length > 80) return res.status(400).json({ error: "Enter a valid name." });
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name },
      { new: true, runValidators: true },
    );
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return res.status(500).json({ error: "Could not update profile." });
  }
});

app.post("/api/profile/change-password", requireAuth, async (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ error: "New password must be 8–128 characters." });
  }
  try {
    const user = await User.findById(req.user._id);
    if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();
    clearAuthCookie(res);
    return res.json({ message: "Password changed. Please sign in again." });
  } catch (error) {
    return res.status(500).json({ error: "Could not change password." });
  }
});

app.get("/api/profile/export", requireAuth, async (req, res) => {
  try {
    const [accounts, transactions, goals, contributions] = await Promise.all([
      Account.find({ user: req.user._id }).lean(),
      Transaction.find({ user: req.user._id }).lean(),
      Goal.find({ user: req.user._id }).lean(),
      GoalContribution.find({ user: req.user._id }).lean(),
    ]);
    res.json({
      exportedAt: new Date().toISOString(),
      user: publicUser(req.user),
      accounts,
      transactions,
      goals,
      contributions,
    });
  } catch (error) {
    res.status(500).json({ error: "Could not export personal data." });
  }
});

app.delete("/api/profile", requireAuth, async (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!password) return res.status(400).json({ error: "Password is required." });
  try {
    const user = await User.findById(req.user._id);
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Password is incorrect." });
    }
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const filter = { user: req.user._id };
      await Transaction.deleteMany(filter, { session });
      await Account.deleteMany(filter, { session });
      await Goal.deleteMany(filter, { session });
      await GoalContribution.deleteMany(filter, { session });
      await Notification.deleteMany(filter, { session });
      await User.deleteOne({ _id: req.user._id }, { session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      return res.status(503).json({ error: "Account deletion requires a transactional database connection." });
    } finally {
      await session.endSession();
    }
    clearAuthCookie(res);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Could not delete account." });
  }
});

app.get("/api/accounts", requireAuth, async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: "Failed to load accounts" });
  }
});

app.post("/api/accounts", requireAuth, async (req, res) => {
  try {
    const payload = validateAccountPayload(req.body);
    if (!payload) return res.status(400).json({ error: "Invalid account details" });
    const account = await Account.create({ user: req.user._id, ...payload });
    await createNotification(req.user._id, "Account added", `${account.name} is ready for transactions.`, "account");
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: "Failed to create account" });
  }
});

app.put("/api/accounts/:id", requireAuth, async (req, res) => {
  try {
    const payload = validateAccountPayload(req.body);
    if (!payload) return res.status(400).json({ error: "Invalid account details" });
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      payload,
      { new: true, runValidators: true },
    );
    if (!account) return res.status(404).json({ error: "Account not found" });
    await createNotification(req.user._id, "Account updated", `${account.name} was updated.`, "account");
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: "Failed to update account" });
  }
});

app.delete("/api/accounts/:id", requireAuth, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!account) return res.status(404).json({ error: "Account not found" });
    await Transaction.updateMany({ user: req.user._id, account: account._id }, { $unset: { account: 1 } });
    await createNotification(req.user._id, "Account removed", `${account.name} was removed.`, "account");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete account" });
  }
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
    const { title, category, amount, type, date, accountId, notes } = req.body || {};
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

    if (notes !== undefined && typeof notes !== "string") return res.status(400).json({ error: "Invalid notes" });
    const signedAmount = transactionAmount(parsedAmount, type);
    const idempotencyKey = typeof req.get("Idempotency-Key") === "string"
      ? req.get("Idempotency-Key").trim().slice(0, 120)
      : "";
    if (idempotencyKey) {
      const existing = await Transaction.findOne({ user: req.user._id, idempotencyKey });
      if (existing) return res.status(200).json(existing);
    }
    let account = null;
    if (accountId) {
      account = await Account.findOne({ _id: accountId, user: req.user._id });
      if (!account) return res.status(404).json({ error: "Account not found" });
    }

    const deltaMinorUnits = account ? accountDeltaForValues(signedAmount, type) : 0;
    if (account && !(await applyAccountDelta(account._id, req.user._id, deltaMinorUnits))) {
      return res.status(409).json({ error: "Account changed while saving transaction" });
    }
    let created;
    try {
      created = await Transaction.create({
        user: req.user._id,
        account: account?._id,
        title: title.trim(),
        category: category.trim(),
        date: dateObj,
        amount: signedAmount,
        type,
        notes: typeof notes === "string" ? notes.trim().slice(0, 500) : "",
        idempotencyKey: idempotencyKey || undefined,
      });
    } catch (error) {
      if (account) await applyAccountDelta(account._id, req.user._id, -deltaMinorUnits);
      if (error.code === 11000 && idempotencyKey) {
        const existing = await Transaction.findOne({ user: req.user._id, idempotencyKey });
        if (existing) return res.status(200).json(existing);
      }
      throw error;
    }
    await createNotification(req.user._id, "Transaction added", `${created.title} was added successfully.`, "transaction");
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: "Failed to save transaction" });
  }
});

app.put("/api/transactions/:id", requireAuth, async (req, res) => {
  try {
    const { title, category, amount, type, date, accountId, notes } = req.body || {};
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
    if (notes !== undefined && typeof notes !== "string") return res.status(400).json({ error: "Invalid notes" });
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) return res.status(400).json({ error: "Invalid date" });

    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });
    const oldAccount = transaction.account
      ? await Account.findOne({ _id: transaction.account, user: req.user._id })
      : null;
    let newAccount = null;
    if (accountId) {
      newAccount = await Account.findOne({ _id: accountId, user: req.user._id });
      if (!newAccount) return res.status(404).json({ error: "Account not found" });
    }
    const newAmount = transactionAmount(parsedAmount, type);
    const newDeltaMinorUnits = accountDeltaForValues(newAmount, type);
    const oldDeltaMinorUnits = oldAccount ? accountDeltaForTransaction(transaction) : 0;
    const sameAccount = oldAccount && newAccount && oldAccount._id.equals(newAccount._id);
    const accountChanges = sameAccount
      ? [{ account: oldAccount, delta: newDeltaMinorUnits - oldDeltaMinorUnits }]
      : [
        ...(oldAccount ? [{ account: oldAccount, delta: -oldDeltaMinorUnits }] : []),
        ...(newAccount ? [{ account: newAccount, delta: newDeltaMinorUnits }] : []),
      ];
    const appliedChanges = [];
    for (const change of accountChanges) {
      if (change.delta && !(await applyAccountDelta(change.account._id, req.user._id, change.delta))) {
        for (const applied of appliedChanges.reverse()) {
          await applyAccountDelta(applied.account._id, req.user._id, -applied.delta);
        }
        return res.status(409).json({ error: "Account changed while updating transaction" });
      }
      if (change.delta) appliedChanges.push(change);
    }
    transaction.title = title.trim();
    transaction.category = category.trim();
    transaction.amount = newAmount;
    transaction.type = type;
    transaction.date = dateObj;
    transaction.account = newAccount?._id;
    transaction.notes = typeof notes === "string" ? notes.trim().slice(0, 500) : "";
    try {
      await transaction.save();
    } catch (error) {
      for (const applied of appliedChanges.reverse()) {
        await applyAccountDelta(applied.account._id, req.user._id, -applied.delta);
      }
      throw error;
    }
    await createNotification(req.user._id, "Transaction updated", `${transaction.title} was updated successfully.`, "transaction");
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findOne({ _id: id, user: req.user._id });
    if (!transaction) {
      return res.status(404).json({ error: "Not found" });
    }
    const accountDelta = transaction.account
      ? -accountDeltaForTransaction(transaction)
      : 0;
    if (
      transaction.account &&
      !(await applyAccountDelta(transaction.account, req.user._id, accountDelta))
    ) {
      return res.status(409).json({ error: "Account changed while deleting transaction" });
    }
    const deleted = await Transaction.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });
    if (!deleted) {
      if (transaction.account) {
        await applyAccountDelta(transaction.account, req.user._id, -accountDelta);
      }
      return res.status(404).json({ error: "Not found" });
    }
    await createNotification(req.user._id, "Transaction deleted", `${deleted.title} was removed.`, "transaction");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

const parseDateValue = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const nextOccurrenceFor = (date, frequency) => {
  const next = new Date(date);
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next;
};

const validateTransferPayload = (body) => {
  const amount = Number(body?.amount);
  const date = parseDateValue(body?.date);
  if (
    !body?.sourceAccount ||
    !body?.destinationAccount ||
    body.sourceAccount === body.destinationAccount ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !date ||
    (body.note !== undefined && typeof body.note !== "string")
  ) return null;
  return {
    amount: fromMinorUnits(toMinorUnits(amount)),
    date,
    note: typeof body.note === "string" ? body.note.trim().slice(0, 240) : "",
  };
};

app.get("/api/transfers", requireAuth, async (req, res) => {
  try {
    const transfers = await Transfer.find({ user: req.user._id })
      .populate("sourceAccount", "name type")
      .populate("destinationAccount", "name type")
      .sort({ date: -1, createdAt: -1 });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: "Failed to load transfers" });
  }
});

app.post("/api/transfers", requireAuth, async (req, res) => {
  try {
    const payload = validateTransferPayload(req.body);
    if (!payload) return res.status(400).json({ error: "Invalid transfer details" });
    const idempotencyKey = String(req.get("Idempotency-Key") || "").trim().slice(0, 120);
    if (idempotencyKey) {
      const existing = await Transfer.findOne({ user: req.user._id, idempotencyKey });
      if (existing) return res.status(200).json(existing);
    }
    const [source, destination] = await Promise.all([
      Account.findOne({ _id: req.body.sourceAccount, user: req.user._id }),
      Account.findOne({ _id: req.body.destinationAccount, user: req.user._id }),
    ]);
    if (!source || !destination) return res.status(404).json({ error: "Account not found" });
    const delta = toMinorUnits(payload.amount);
    if (!(await applyAccountDelta(source._id, req.user._id, -delta))) {
      return res.status(409).json({ error: "Source account changed while transferring" });
    }
    if (!(await applyAccountDelta(destination._id, req.user._id, delta))) {
      await applyAccountDelta(source._id, req.user._id, delta);
      return res.status(409).json({ error: "Destination account changed while transferring" });
    }
    try {
      const transfer = await Transfer.create({
        user: req.user._id,
        sourceAccount: source._id,
        destinationAccount: destination._id,
        ...payload,
        idempotencyKey: idempotencyKey || undefined,
      });
      await createNotification(req.user._id, "Transfer completed", `${source.name} to ${destination.name}`, "transfer");
      return res.status(201).json(transfer);
    } catch (error) {
      await applyAccountDelta(source._id, req.user._id, delta);
      await applyAccountDelta(destination._id, req.user._id, -delta);
      if (error.code === 11000 && idempotencyKey) {
        const existing = await Transfer.findOne({ user: req.user._id, idempotencyKey });
        if (existing) return res.status(200).json(existing);
      }
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to create transfer" });
  }
});

app.delete("/api/transfers/:id", requireAuth, async (req, res) => {
  try {
    const transfer = await Transfer.findOne({ _id: req.params.id, user: req.user._id });
    if (!transfer) return res.status(404).json({ error: "Transfer not found" });
    const delta = toMinorUnits(transfer.amount);
    const sourceRestored = await applyAccountDelta(transfer.sourceAccount, req.user._id, delta);
    if (!sourceRestored) {
      return res.status(409).json({ error: "Account changed while deleting transfer" });
    }
    const destinationRestored = await applyAccountDelta(transfer.destinationAccount, req.user._id, -delta);
    if (!destinationRestored) {
      await applyAccountDelta(transfer.sourceAccount, req.user._id, -delta);
      return res.status(409).json({ error: "Account changed while deleting transfer" });
    }
    const deleted = await Transfer.findOneAndDelete({ _id: transfer._id, user: req.user._id });
    if (!deleted) {
      await applyAccountDelta(transfer.sourceAccount, req.user._id, -delta);
      await applyAccountDelta(transfer.destinationAccount, req.user._id, delta);
      return res.status(404).json({ error: "Transfer not found" });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete transfer" });
  }
});

app.get("/api/budgets", requireAuth, async (req, res) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : new Date().toISOString().slice(0, 7);
    const [budgets, transactions] = await Promise.all([
      Budget.find({ user: req.user._id, month }).sort({ category: 1 }),
      Transaction.find({ user: req.user._id, type: "expense" }).lean(),
    ]);
    const [year, monthNumber] = month.split("-").map(Number);
    const start = new Date(year, monthNumber - 1, 1);
    const end = new Date(year, monthNumber, 1);
    const spending = transactions.reduce((map, transaction) => {
      const date = new Date(transaction.date);
      if (date >= start && date < end) {
        const category = transaction.category || "Other";
        map[category] = (map[category] || 0) + Math.abs(transaction.amount);
      }
      return map;
    }, {});
    res.json(budgets.map((budget) => ({
      ...budget.toObject(),
      actual: fromMinorUnits(toMinorUnits(spending[budget.category] || 0)),
      remaining: fromMinorUnits(toMinorUnits(budget.amount) - toMinorUnits(spending[budget.category] || 0)),
      percentageUsed: budget.amount ? Math.round((spending[budget.category] || 0) / budget.amount * 100) : 0,
    })));
  } catch (error) {
    res.status(500).json({ error: "Failed to load budgets" });
  }
});

app.post("/api/budgets", requireAuth, async (req, res) => {
  try {
    const category = typeof req.body?.category === "string" ? req.body.category.trim() : "";
    const month = typeof req.body?.month === "string" ? req.body.month : "";
    const amount = Number(req.body?.amount);
    if (!category || category.length > 50 || !/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid budget details" });
    }
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category, month },
      { $set: { amount: fromMinorUnits(toMinorUnits(amount)) } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    await createNotification(req.user._id, "Budget updated", `${category} budget is ready for ${month}.`, "budget");
    res.status(201).json(budget);
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({ error: "Failed to save budget" });
  }
});

app.delete("/api/budgets/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) return res.status(404).json({ error: "Budget not found" });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

app.get("/api/recurring-transactions", requireAuth, async (req, res) => {
  try {
    res.json(await RecurringTransaction.find({ user: req.user._id }).populate("account", "name type").sort({ nextOccurrence: 1 }));
  } catch (error) {
    res.status(500).json({ error: "Failed to load recurring transactions" });
  }
});

app.post("/api/recurring-transactions", requireAuth, async (req, res) => {
  try {
    const { title, category, type, frequency, accountId } = req.body || {};
    const amount = Number(req.body?.amount);
    const startDate = parseDateValue(req.body?.startDate);
    const endDate = req.body?.endDate ? parseDateValue(req.body.endDate) : null;
    if (!title?.trim() || !category?.trim() || !["expense", "income", "investment"].includes(type) || !["weekly", "monthly"].includes(frequency) || !Number.isFinite(amount) || amount <= 0 || !startDate || (req.body?.endDate && !endDate)) {
      return res.status(400).json({ error: "Invalid recurring transaction details" });
    }
    if (accountId && !(await Account.exists({ _id: accountId, user: req.user._id }))) return res.status(404).json({ error: "Account not found" });
    const recurring = await RecurringTransaction.create({
      user: req.user._id,
      account: accountId || undefined,
      title: title.trim().slice(0, 120),
      category: category.trim().slice(0, 50),
      type,
      frequency,
      amount: fromMinorUnits(toMinorUnits(amount)),
      startDate,
      endDate,
      nextOccurrence: startDate,
    });
    res.status(201).json(recurring);
  } catch (error) {
    res.status(500).json({ error: "Failed to create recurring transaction" });
  }
});

app.patch("/api/recurring-transactions/:id", requireAuth, async (req, res) => {
  try {
    const update = {};
    if (typeof req.body?.paused === "boolean") update.paused = req.body.paused;
    const recurring = await RecurringTransaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      update,
      { new: true, runValidators: true },
    );
    if (!recurring) return res.status(404).json({ error: "Recurring transaction not found" });
    res.json(recurring);
  } catch (error) {
    res.status(500).json({ error: "Failed to update recurring transaction" });
  }
});

app.post("/api/recurring-transactions/process", requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const due = await RecurringTransaction.find({
      user: req.user._id,
      paused: false,
      nextOccurrence: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
    });
    let processed = 0;
    for (const recurring of due) {
      const occurrenceKey = `recurring:${recurring._id}:${recurring.nextOccurrence.toISOString()}`;
      const account = recurring.account
        ? await Account.findOne({ _id: recurring.account, user: req.user._id })
        : null;
      const amount = transactionAmount(recurring.amount, recurring.type);
      const delta = account ? accountDeltaForValues(amount, recurring.type) : 0;
      if (account && !(await applyAccountDelta(account._id, req.user._id, delta))) continue;
      try {
        await Transaction.create({
          user: req.user._id,
          account: account?._id,
          title: recurring.title,
          category: recurring.category,
          date: recurring.nextOccurrence,
          amount,
          type: recurring.type,
          idempotencyKey: occurrenceKey,
        });
        recurring.lastProcessedOccurrence = recurring.nextOccurrence;
        recurring.nextOccurrence = nextOccurrenceFor(recurring.nextOccurrence, recurring.frequency);
        if (recurring.endDate && recurring.nextOccurrence > recurring.endDate) recurring.paused = true;
        await recurring.save();
        processed += 1;
      } catch (error) {
        if (account) await applyAccountDelta(account._id, req.user._id, -delta);
        if (error.code !== 11000) throw error;
      }
    }
    res.json({ processed });
  } catch (error) {
    res.status(500).json({ error: "Failed to process recurring transactions" });
  }
});

app.delete("/api/recurring-transactions/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) return res.status(404).json({ error: "Recurring transaction not found" });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete recurring transaction" });
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
    if (typeof name !== "string" || typeof category !== "string" || !name.trim() || name.trim().length > 80 || !category.trim() || category.trim().length > 50 || !period || amount === undefined) {
      return res.status(400).json({ error: "Missing or invalid required fields" });
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
      category: category.trim(),
      period,
      amount: fromMinorUnits(toMinorUnits(parsedAmount)),
    });
    await createNotification(req.user._id, "Goal created", `${goal.name} is now ready to track.`, "goal");
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
      { name: name.trim(), category, period, amount: fromMinorUnits(toMinorUnits(parsedAmount)) },
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
      amount: fromMinorUnits(toMinorUnits(parsedAmount)),
      note: typeof note === "string" ? note.trim().slice(0, 240) : "",
    });
    await createNotification(req.user._id, "Goal contribution added", `${goal.name} received a new contribution.`, "goal");
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

// ── Notifications ────────────────────────────────────────────────────────
app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to load notifications" });
  }
});
app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true }, { new: true }
    );
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});
app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notifications" });
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
