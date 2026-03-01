import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./App.css";

const categoryPalette = {
  Food: "#ff8a5b",
  Transport: "#f5c76b",
  Lifestyle: "#7dd3fc",
  Bills: "#a78bfa",
  Investment: "#34d399",
  Income: "#22c55e",
  Other: "#94a3b8",
};

const defaultDate = new Date().toISOString().slice(0, 10);

const formatCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "/api" : "https://expense-tracker-77f6.onrender.com/api");
const TRANSACTIONS_URL = `${API_BASE}/transactions`;

const goalGroups = [
  { label: "Essentials", categories: ["Food", "Bills", "Transport"] },
  { label: "Lifestyle", categories: ["Lifestyle", "Other"] },
  { label: "Investment", categories: ["Investment"] },
  { label: "Travel", categories: ["Travel"] },
];

const landingFeatures = [
  {
    title: "Smart cash flow",
    body: "Auto-sort income, expenses, and investments with clear category stories.",
    tag: "Automation",
    stat: "+38% clarity",
    icon: "⚡",
  },
  {
    title: "Goal snapshots",
    body: "Track monthly targets with instant progress feedback you can trust.",
    tag: "Planning",
    stat: "90% on‑track",
    icon: "🎯",
  },
  {
    title: "Daily burn map",
    body: "See spikes and dips with a clean daily heat line to stay aware.",
    tag: "Insights",
    stat: "30‑day view",
    icon: "📊",
  },
  {
    title: "Export to PDF",
    body: "Download a professional, print-ready financial report with one click — anytime.",
    tag: "Export",
    stat: "One click",
    icon: "📄",
  },
  {
    title: "Investment focus",
    body: "Separate investing from spending so your wealth story stays clear.",
    tag: "Wealth",
    stat: "Track growth",
    icon: "📈",
  },
  {
    title: "Secure by default",
    body: "JWT auth, httpOnly cookies, and per-user data isolation built in.",
    tag: "Security",
    stat: "Private by design",
    icon: "🔐",
  },
];

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return response;
};

function AuthModal({ mode, onClose, onSuccess }) {
  const [authMode, setAuthMode] = useState(mode || "login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    const trimmedEmail = authEmail.trim();
    const trimmedPassword = authPassword.trim();
    const trimmedName = authName.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setAuthError("Email and password are required.");
      return;
    }
    if (authMode === "signup" && !trimmedName) {
      setAuthError("Name is required for signup.");
      return;
    }
    const payload =
      authMode === "signup"
        ? { name: trimmedName, email: trimmedEmail, password: trimmedPassword }
        : { email: trimmedEmail, password: trimmedPassword };
    try {
      setAuthLoading(true);
      const response = await apiRequest(
        authMode === "signup" ? "/auth/register" : "/auth/login",
        { method: "POST", body: JSON.stringify(payload) }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAuthError(data.error || "Authentication failed.");
        return;
      }
      onSuccess(data.user || null);
    } catch {
      setAuthError("Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-brand">
            <span className="brand-mark sm">Ex</span>
            <span className="modal-brand-name">Expnse</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="auth-toggle">
          <button
            type="button"
            className={authMode === "login" ? "pill active" : "pill"}
            onClick={() => setAuthMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={authMode === "signup" ? "pill active" : "pill"}
            onClick={() => setAuthMode("signup")}
          >
            Sign up
          </button>
        </div>
        <p className="modal-subtitle">
          {authMode === "login"
            ? "Welcome back. Sign in to your account."
            : "Create your free account. Takes 30 seconds."}
        </p>
        <form className="expense-form" onSubmit={handleAuthSubmit}>
          {authMode === "signup" && (
            <label>
              Full Name
              <input
                type="text"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                placeholder="Your full name"
              />
            </label>
          )}
          <label>
            Email Address
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          {authError && <p className="error-text">{authError}</p>}
          <button className="primary form-submit" type="submit" disabled={authLoading}>
            {authLoading ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="fine-print">🔒 Secure sign-in · Your data stays private</p>
      </div>
    </div>
  );
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const [formState, setFormState] = useState({
    title: "",
    category: "Food",
    amount: "",
    type: "expense",
    date: defaultDate,
  });
  const isAuthenticated = Boolean(user);

  const openAuth = (mode) => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  useEffect(() => {
    const initAuth = async () => {
      setAuthLoading(true);
      try {
        const response = await apiRequest("/auth/me", { method: "GET" });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user || null);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user) { setTransactions([]); return; }
      try {
        const response = await fetch(TRANSACTIONS_URL, { credentials: "include" });
        if (!response.ok) throw new Error("Failed to load transactions");
        const data = await response.json();
        setTransactions(Array.isArray(data) ? data : []);
      } catch {
        setTransactions([]);
      }
    };
    loadTransactions();
  }, [user]);

  const normalizedTransactions = useMemo(
    () =>
      transactions.map((entry) => {
        const inferredType =
          entry.type ??
          (entry.category === "Investment" ? "investment" : entry.amount >= 0 ? "income" : "expense");
        const safeAmount = inferredType === "expense" ? -Math.abs(entry.amount) : Math.abs(entry.amount);
        return { ...entry, type: inferredType, amount: safeAmount };
      }),
    [transactions]
  );

  const totals = useMemo(() => {
    const balance = normalizedTransactions.reduce((sum, e) => sum + e.amount, 0);
    const spend = normalizedTransactions
      .filter((e) => e.amount < 0 && e.type !== "investment")
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const income = normalizedTransactions
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const investment = normalizedTransactions
      .filter((e) => e.type === "investment")
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);
    return { balance, spend, income, investment };
  }, [normalizedTransactions]);

  const categoryBreakdown = useMemo(() => {
    const totalsByCategory = {};
    normalizedTransactions.forEach((entry) => {
      if (entry.amount >= 0 || entry.type === "investment") return;
      const label = entry.category || "Other";
      totalsByCategory[label] = (totalsByCategory[label] || 0) + Math.abs(entry.amount);
    });
    return Object.entries(totalsByCategory)
      .map(([label, value]) => ({ label, value, color: categoryPalette[label] || categoryPalette.Other }))
      .sort((a, b) => b.value - a.value);
  }, [normalizedTransactions]);

  const totalSpend = useMemo(
    () => categoryBreakdown.reduce((sum, item) => sum + item.value, 0),
    [categoryBreakdown]
  );

  const dailySpend = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    if (!year || !month) return [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const arr = Array.from({ length: daysInMonth }, () => 0);
    normalizedTransactions.forEach((entry) => {
      if (entry.amount >= 0 || entry.type === "investment") return;
      const d = new Date(entry.date);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        arr[d.getDate() - 1] += Math.abs(entry.amount);
      }
    });
    return arr;
  }, [normalizedTransactions, selectedMonth]);

  const maxDailySpend = useMemo(() => (dailySpend.length ? Math.max(...dailySpend) : 0), [dailySpend]);

  const spendingGoals = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    if (!year || !month) return [];
    const currentKey = `${year}-${String(month).padStart(2, "0")}`;
    const lastKey = getMonthKey(new Date(year, month - 2, 1));
    const map = {};
    normalizedTransactions.forEach((entry) => {
      if (entry.amount >= 0 || entry.type === "investment") return;
      const d = new Date(entry.date);
      if (Number.isNaN(d.getTime())) return;
      const ek = getMonthKey(d);
      goalGroups.forEach((g) => {
        if (!g.categories.includes(entry.category)) return;
        const k = `${ek}-${g.label}`;
        map[k] = (map[k] || 0) + Math.abs(entry.amount);
      });
    });
    return goalGroups.map((g) => {
      const lastSpend = map[`${lastKey}-${g.label}`] || 0;
      const currentSpend = map[`${currentKey}-${g.label}`] || 0;
      const target = lastSpend ? Math.round(lastSpend * 0.9) : 0;
      const progress = target ? Math.min((currentSpend / target) * 100, 100) : 0;
      return { label: g.label, currentSpend, target, progress };
    });
  }, [normalizedTransactions, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return normalizedTransactions;
    return normalizedTransactions.filter((item) => {
      const amt = formatCurrency.format(Math.abs(item.amount)).toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        formatDate(item.date).toLowerCase().includes(query) ||
        amt.includes(query)
      );
    });
  }, [normalizedTransactions, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));

  const pagedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage]);

  const investmentTransactions = useMemo(
    () => normalizedTransactions.filter((item) => item.type === "investment"),
    [normalizedTransactions]
  );

  const totalInvestment = useMemo(
    () => investmentTransactions.reduce((sum, e) => sum + Math.abs(e.amount), 0),
    [investmentTransactions]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  };

  const formatPlainAmount = (value) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const handleExport = () => {
    if (!normalizedTransactions.length) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;

    doc.setFillColor(20, 24, 36);
    doc.rect(0, 0, pageWidth, 56, "F");
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, 5, 56, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Expnse", marginX + 8, 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 200);
    doc.text("Financial Summary Report", marginX + 8, 42);
    const reportDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    doc.text(`Generated: ${reportDate}`, pageWidth - marginX, 42, { align: "right" });

    let cursorY = 80;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Account: ${user?.name || "User"}`, marginX, cursorY);

    cursorY += 20;
    const summaryCards = [
      { label: "Total Income", value: `+INR ${formatPlainAmount(totals.income)}`, color: [34, 197, 94] },
      { label: "Total Investment", value: `INR ${formatPlainAmount(totals.investment)}`, color: [167, 139, 250] },
      { label: "Total Spend", value: `-INR ${formatPlainAmount(totals.spend)}`, color: [252, 165, 165] },
      { label: "Net Balance", value: `INR ${formatPlainAmount(totals.balance)}`, color: [56, 189, 248] },
    ];
    const cardWidth = (pageWidth - marginX * 2 - 30) / 4;
    summaryCards.forEach((card, i) => {
      const x = marginX + i * (cardWidth + 10);
      doc.setFillColor(245, 247, 252);
      doc.roundedRect(x, cursorY, cardWidth, 50, 4, 4, "F");
      doc.setFillColor(...card.color);
      doc.roundedRect(x, cursorY, cardWidth, 4, 2, 2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(card.label, x + 8, cursorY + 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20);
      doc.text(card.value, x + 8, cursorY + 36);
    });

    cursorY += 70;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 24, 36);
    doc.text("Transaction History", marginX, cursorY);
    cursorY += 8;

    const tableBody = normalizedTransactions.map((entry) => [
      formatDate(entry.date),
      entry.title,
      entry.category,
      entry.type.charAt(0).toUpperCase() + entry.type.slice(1),
      entry.amount >= 0
        ? `+INR ${formatPlainAmount(entry.amount)}`
        : `-INR ${formatPlainAmount(Math.abs(entry.amount))}`,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [["Date", "Title", "Category", "Type", "Amount"]],
      body: tableBody,
      styles: { fontSize: 9, cellPadding: 7, textColor: 40 },
      headStyles: { fillColor: [20, 24, 36], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 252] },
      columnStyles: { 4: { halign: "right", fontStyle: "bold" } },
      margin: { left: marginX, right: marginX },
      didDrawPage: () => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text("Powered by Expnse · Confidential", marginX, pageHeight - 20);
        doc.text(
          `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
          pageWidth - marginX, pageHeight - 20, { align: "right" }
        );
      },
    });

    doc.save("expnse-report.pdf");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formState.title.trim() || !formState.amount) return;
    const parsedAmount = Number(formState.amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return;
    const payload = {
      title: formState.title.trim(),
      category: formState.category,
      amount: parsedAmount,
      type: formState.type,
      date: formState.date,
    };
    try {
      const response = await fetch(TRANSACTIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed");
      const saved = await response.json();
      setTransactions((prev) => [saved, ...prev]);
    } catch {
      const signedAmount = formState.type === "expense" ? -parsedAmount : parsedAmount;
      setTransactions((prev) => [
        { id: Date.now(), title: payload.title, category: payload.category, date: payload.date, amount: signedAmount },
        ...prev,
      ]);
    }
    setFormState((prev) => ({ ...prev, title: "", amount: "", type: "expense", date: defaultDate }));
    setShowForm(false);
  };

  return (
    <div className="app">
      {showAuthModal && (
        <AuthModal
          mode={authModalMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(userData) => {
            setUser(userData);
            setShowAuthModal(false);
          }}
        />
      )}

      {!isAuthenticated ? (
        <div className="landing-shell">

          {/* ── NAVBAR ── */}
          <nav className={`landing-nav ${showNavMenu ? "open" : ""}`}>
            <div className="brand">
              <span className="brand-mark">Ex</span>
              <div>
                <p className="eyebrow">Expense tracker</p>
                <strong>Expnse</strong>
              </div>
            </div>
            <button
              className="nav-toggle"
              type="button"
              onClick={() => setShowNavMenu((p) => !p)}
              aria-expanded={showNavMenu}
              aria-label="Toggle navigation"
            >
              <span /><span /><span />
            </button>
            <div className="nav-menu">
              <div className="nav-links">
                <a href="#features">Features</a>
                <a href="#export">Export</a>
                <a href="#insights">Insights</a>
                <a href="#download">Download</a>
              </div>
              <div className="nav-actions">
                <button className="ghost" onClick={() => openAuth("login")}>Login</button>
                <button className="primary" onClick={() => openAuth("signup")}>Get started free</button>
              </div>
            </div>
          </nav>

          {/* ── HERO ── */}
          <header className="hero-section">
            <div className="hero-left">
              <div className="hero-badge">
                <span className="badge-dot" />
                New · Personal finance studio
              </div>
              <h1 className="hero-title">
                Track money with
                <br />
                <span className="hero-title-accent">clarity, not chaos.</span>
              </h1>
              <p className="lead">
                Expnse gives you a calm, real-time view of where money moves,
                how it grows, and what needs attention next.
              </p>
              <div className="hero-actions">
                <button className="primary hero-cta" onClick={() => openAuth("signup")}>
                  Start for free →
                </button>
                <button className="ghost" onClick={() => openAuth("login")}>
                  Sign in
                </button>
              </div>
              <div className="stat-row">
                <div className="stat-item">
                  <p>Avg. setup</p>
                  <strong>2 minutes</strong>
                </div>
                <div className="stat-item">
                  <p>Monthly clarity</p>
                  <strong>+38%</strong>
                </div>
                <div className="stat-item">
                  <p>Privacy first</p>
                  <strong>Always</strong>
                </div>
              </div>
            </div>

            {/* Mock Dashboard Preview */}
            <div className="hero-right">
              <div className="dashboard-preview">
                <div className="dp-topbar">
                  <div className="dp-dots">
                    <span className="dp-dot red" />
                    <span className="dp-dot yellow" />
                    <span className="dp-dot green" />
                  </div>
                  <span className="dp-title">Expnse · Dashboard</span>
                  <span className="dp-badge-live">● Live</span>
                </div>

                <div className="dp-stats">
                  <div className="dp-stat-card dp-accent-card">
                    <span className="dp-stat-label">Net Balance</span>
                    <span className="dp-stat-value">₹58,240</span>
                    <span className="dp-stat-delta dp-up">↑ 12.4%</span>
                  </div>
                  <div className="dp-stat-card">
                    <span className="dp-stat-label">Income</span>
                    <span className="dp-stat-value dp-green">₹82,000</span>
                    <span className="dp-stat-delta dp-up">↑ 8%</span>
                  </div>
                  <div className="dp-stat-card">
                    <span className="dp-stat-label">Spent</span>
                    <span className="dp-stat-value dp-red">₹23,760</span>
                    <span className="dp-stat-delta dp-down">↓ 3%</span>
                  </div>
                </div>

                <div className="dp-chart-section">
                  <div className="dp-chart-label">Monthly Burn · March 2026</div>
                  <div className="dp-bars">
                    {[22, 45, 18, 80, 35, 60, 25, 90, 42, 55, 30, 70, 15, 88, 40, 62, 28, 74, 50, 38].map((h, i) => (
                      <div
                        key={i}
                        className={`dp-bar ${h > 70 ? "dp-bar-hot" : ""}`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="dp-transactions">
                  <div className="dp-section-label">Recent Activity</div>
                  {[
                    { name: "Salary credit", cat: "Income", amount: "+₹82,000", pos: true },
                    { name: "Zomato order", cat: "Food", amount: "-₹450", pos: false },
                    { name: "SIP Investment", cat: "Investment", amount: "+₹5,000", pos: true },
                    { name: "Electricity bill", cat: "Bills", amount: "-₹1,240", pos: false },
                  ].map((tx, i) => (
                    <div className="dp-tx" key={i}>
                      <div className="dp-tx-dot" style={{ background: categoryPalette[tx.cat] || "#94a3b8" }} />
                      <span className="dp-tx-name">{tx.name}</span>
                      <span className={`dp-tx-amount ${tx.pos ? "dp-green" : "dp-red"}`}>{tx.amount}</span>
                    </div>
                  ))}
                </div>

                <div className="dp-footer-row">
                  <div className="dp-goal-row">
                    <span className="dp-goal-label">Essentials goal · 82%</span>
                    <span className="dp-green dp-goal-pct">On track</span>
                  </div>
                  <div className="dp-progress-bar">
                    <div className="dp-progress-fill" style={{ width: "82%" }} />
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ── FEATURES ── */}
          <section id="features" className="feature-section">
            <div className="section-head">
              <p className="eyebrow">Features</p>
              <h2>Everything you need to run money like a product.</h2>
              <p className="section-sub muted">
                Expnse is designed for clarity first — clean visuals, fast data entry, and effortless insights.
              </p>
            </div>
            <div className="feature-grid">
              {landingFeatures.map((item) => (
                <article className="feature-card" key={item.title}>
                  <div className="feature-icon-wrap">{item.icon}</div>
                  <div className="feature-top">
                    <span className="feature-tag">{item.tag}</span>
                    <span className="feature-stat">{item.stat}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="muted">{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ── PDF EXPORT SECTION ── */}
          <section id="export" className="export-section">
            <div className="export-left">
              <p className="eyebrow">PDF Export</p>
              <h2>Your finances, beautifully printed.</h2>
              <p className="muted export-desc">
                Download a professional, print-ready PDF report of all your transactions,
                totals, and spending breakdown — in one click. Perfect for tax season,
                financial reviews, or just staying organized.
              </p>
              <ul className="export-features-list">
                <li><span className="export-check">✓</span> Full transaction history</li>
                <li><span className="export-check">✓</span> Income, spend &amp; investment totals</li>
                <li><span className="export-check">✓</span> Category-wise breakdown</li>
                <li><span className="export-check">✓</span> Branded, paginated report</li>
              </ul>
              <button className="primary" onClick={() => openAuth("signup")}>
                Get started to export →
              </button>
            </div>
            <div className="export-right">
              <div className="pdf-preview">
                <div className="pdf-header-bar">
                  <div className="pdf-logo-row">
                    <span className="pdf-logo-mark">Ex</span>
                    <div>
                      <div className="pdf-logo-name">Expnse</div>
                      <div className="pdf-logo-sub">Financial Summary Report</div>
                    </div>
                  </div>
                  <div className="pdf-date-label">01 Mar 2026</div>
                </div>
                <div className="pdf-stat-cards">
                  {[
                    { label: "Income", val: "₹82,000", color: "#22c55e" },
                    { label: "Spent", val: "₹23,760", color: "#fca5a5" },
                    { label: "Invested", val: "₹10,000", color: "#a78bfa" },
                    { label: "Balance", val: "₹58,240", color: "#38bdf8" },
                  ].map((c) => (
                    <div className="pdf-stat-card" key={c.label} style={{ borderTopColor: c.color }}>
                      <div className="pdf-stat-label">{c.label}</div>
                      <div className="pdf-stat-val" style={{ color: c.color }}>{c.val}</div>
                    </div>
                  ))}
                </div>
                <div className="pdf-table-head">
                  <span>Date</span><span>Description</span><span>Category</span><span>Amount</span>
                </div>
                {[
                  ["01 Mar", "Salary", "Income", "+₹82,000", true],
                  ["03 Mar", "Zomato", "Food", "-₹450", false],
                  ["05 Mar", "SIP", "Investment", "+₹5,000", true],
                  ["08 Mar", "Electricity", "Bills", "-₹1,240", false],
                ].map(([d, n, c, a, pos], i) => (
                  <div className={`pdf-table-row ${i % 2 === 1 ? "pdf-row-alt" : ""}`} key={i}>
                    <span>{d}</span><span>{n}</span><span>{c}</span>
                    <span style={{ color: pos ? "#22c55e" : "#fca5a5", fontWeight: 600 }}>{a}</span>
                  </div>
                ))}
                <div className="pdf-footer-bar">Powered by Expnse · Confidential · Page 1</div>
              </div>
            </div>
          </section>

          {/* ── INSIGHTS ── */}
          <section id="insights" className="insights-section">
            <div className="section-head centered">
              <p className="eyebrow">Built different</p>
              <h2>Built for people who want answers fast.</h2>
              <p className="section-sub muted">
                Surface what matters, reduce the noise, and keep momentum with intelligent summaries.
              </p>
            </div>
            <div className="insights-grid">
              <div className="insight-card">
                <div className="insight-icon">💡</div>
                <h3>Instant overview</h3>
                <p className="muted">See balance, savings rate, and spend at a glance the moment you log in.</p>
              </div>
              <div className="insight-card">
                <div className="insight-icon">⚡</div>
                <h3>12-second capture</h3>
                <p className="muted">Capture every transaction in 12 seconds or less with our streamlined form.</p>
              </div>
              <div className="insight-card">
                <div className="insight-icon">📱</div>
                <h3>Works everywhere</h3>
                <p className="muted">Fully responsive on every device — mobile, tablet, or desktop.</p>
              </div>
            </div>
          </section>

          {/* ── CTA / DOWNLOAD ── */}
          <section id="download" className="cta-section">
            <div className="cta-inner">
              <p className="eyebrow">Get started</p>
              <h2>Take control of your finances today.</h2>
              <p className="muted cta-sub">Free to use. No credit card. No setup fees. Just clarity.</p>
              <div className="cta-actions">
                <button className="primary cta-main-btn" onClick={() => openAuth("signup")}>
                  Create free account →
                </button>
                <button className="ghost" onClick={() => openAuth("login")}>
                  Already have an account
                </button>
              </div>
              <div className="cta-platform-cards">
                <div className="platform-card">
                  <div className="platform-icon">🌐</div>
                  <strong>Web app</strong>
                  <p className="muted">Available now</p>
                  <button className="primary platform-btn" onClick={() => openAuth("signup")}>
                    Start on web
                  </button>
                </div>
                <div className="platform-card dim">
                  <div className="platform-icon">💻</div>
                  <strong>Desktop app</strong>
                  <p className="muted">Coming soon</p>
                  <button className="ghost platform-btn" disabled>Join waitlist</button>
                </div>
              </div>
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer className="site-footer">
            <div className="footer-top">
              <div className="footer-brand">
                <div className="brand">
                  <span className="brand-mark">Ex</span>
                  <div>
                    <p className="eyebrow">Expense tracker</p>
                    <strong>Expnse</strong>
                  </div>
                </div>
                <p className="footer-tagline muted">
                  A calm, real-time view of your financial life.<br />
                  Built for clarity. Designed for humans.
                </p>
              </div>
              <div className="footer-links-grid">
                <div className="footer-col">
                  <strong>Product</strong>
                  <a href="#features">Features</a>
                  <a href="#export">PDF Export</a>
                  <a href="#download">Download</a>
                </div>
                <div className="footer-col">
                  <strong>Company</strong>
                  <a href="#about">About</a>
                  <a href="#privacy">Privacy</a>
                  <a href="#terms">Terms</a>
                </div>
                <div className="footer-col">
                  <strong>Account</strong>
                  <button className="footer-link-btn" onClick={() => openAuth("login")}>Sign in</button>
                  <button className="footer-link-btn" onClick={() => openAuth("signup")}>Sign up free</button>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <p className="muted">© 2026 Expnse. All rights reserved.</p>
              <p className="muted">Built with ❤️ by Aniket</p>
            </div>
          </footer>

        </div>
      ) : (
        <>
          <header className="top-bar">
            <div>
              <p className="eyebrow">Expense tracker</p>
              <h1>Welcome{user?.name ? `, ${user.name}` : ""}.</h1>
            </div>
            <div className="top-actions">
              <button className="ghost" onClick={handleLogout}>Logout</button>
              <button className="ghost export-btn" onClick={handleExport}>
                📄 Export PDF
              </button>
              <button className="primary" onClick={() => setShowForm(true)}>+ Add expense</button>
            </div>
          </header>

          {showForm && (
            <section className="content-grid">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Add expense</h3>
                    <p className="muted">Log income or spending</p>
                  </div>
                  <button className="ghost small" onClick={() => setShowForm(false)}>Close</button>
                </div>
                <form className="expense-form" onSubmit={handleSubmit}>
                  <label>
                    Title
                    <input type="text" name="title" placeholder="e.g. Grocery run"
                      value={formState.title} onChange={handleChange} />
                  </label>
                  <label>
                    Category
                    <select name="category" value={formState.category} onChange={handleChange}>
                      <option>Food</option>
                      <option>Transport</option>
                      <option>Lifestyle</option>
                      <option>Bills</option>
                      <option>Investment</option>
                      <option>Income</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label>
                    Amount
                    <input type="number" name="amount" min="0" step="0.01" placeholder="0.00"
                      value={formState.amount} onChange={handleChange} />
                  </label>
                  <label>
                    Type
                    <div className="pill-group">
                      {["expense", "income", "investment"].map((t) => (
                        <button key={t} type="button"
                          className={formState.type === t ? "pill active" : "pill"}
                          onClick={() => setFormState((prev) => ({ ...prev, type: t }))}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label>
                    Date
                    <input type="date" name="date" value={formState.date} onChange={handleChange} />
                  </label>
                  <button className="primary form-submit" type="submit">Save entry</button>
                </form>
              </article>
            </section>
          )}

          <section className="summary-grid">
            <article className="summary-card">
              <div>
                <p className="card-label">Total balance</p>
                <h2>{formatCurrency.format(totals.balance)}</h2>
              </div>
              <div className="summary-detail"><span>Income</span><strong>{formatCurrency.format(totals.income)}</strong></div>
              <div className="summary-detail"><span>Invested</span><strong>{formatCurrency.format(totals.investment)}</strong></div>
              <div className="summary-detail"><span>Spend</span><strong>-{formatCurrency.format(totals.spend)}</strong></div>
            </article>
            <article className="summary-card">
              <div>
                <p className="card-label">Total income</p>
                <h2>{formatCurrency.format(totals.income)}</h2>
              </div>
              <div className="summary-detail">
                <span>Avg per entry</span>
                <strong>
                  {formatCurrency.format(
                    normalizedTransactions.filter((e) => e.type === "income").length
                      ? totals.income / normalizedTransactions.filter((e) => e.type === "income").length
                      : 0
                  )}
                </strong>
              </div>
            </article>
            <article className="summary-card">
              <div>
                <p className="card-label">Total investment</p>
                <h2>{formatCurrency.format(totals.investment)}</h2>
              </div>
              <div className="summary-detail">
                <span>Savings rate</span>
                <strong>
                  {totals.income
                    ? `${Math.round(((totals.income - totals.spend) / totals.income) * 100)}%`
                    : "0%"}
                </strong>
              </div>
            </article>
            <article className="summary-card">
              <div>
                <p className="card-label">Total spend</p>
                <h2>{formatCurrency.format(totals.spend)}</h2>
              </div>
              <div className="summary-detail"><span>Net</span><strong>{formatCurrency.format(totals.balance)}</strong></div>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h3>Monthly burn</h3>
                  <p className="muted">Daily spend for the selected month</p>
                </div>
                <input className="month-picker" type="month" value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)} />
              </div>
              <div className="bar-chart">
                {dailySpend.length === 0 ? (
                  <p className="empty-state">No transactions for this month.</p>
                ) : (
                  dailySpend.map((value, index) => (
                    <div className="bar" key={`day-${index}`}
                      style={{ "--bar-height": maxDailySpend ? `${(value / maxDailySpend) * 100}%` : "0%" }}
                      data-amount={formatCurrency.format(value)}
                      title={formatCurrency.format(value)} tabIndex={0}>
                      <span className={value > 0 ? "active" : ""} />
                      <em>{index + 1}</em>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h3>Category split</h3>
                  <p className="muted">Where your money goes</p>
                </div>
                <button className="ghost small">Edit</button>
              </div>
              <div className="donut-wrap">
                <div className="donut" style={{
                  background: totalSpend
                    ? `conic-gradient(${categoryBreakdown.map((item, index) => {
                        const start = categoryBreakdown.slice(0, index).reduce((sum, e) => sum + e.value, 0) / totalSpend;
                        const end = (start + item.value / totalSpend) * 360;
                        return `${item.color} ${start * 360}deg ${end}deg`;
                      }).join(",")})`
                    : "conic-gradient(#1f2937 0deg 360deg)",
                }}>
                  <div className="donut-center">
                    <p>Total spend</p>
                    <strong>{formatCurrency.format(totalSpend)}</strong>
                  </div>
                </div>
                <div className="legend">
                  {categoryBreakdown.length === 0 ? (
                    <p className="empty-state">No expense categories yet.</p>
                  ) : (
                    categoryBreakdown.map((item) => (
                      <div className="legend-item" key={item.label}>
                        <span style={{ background: item.color }} />
                        <div>
                          <p>{item.label}</p>
                          <strong>{formatCurrency.format(item.value)}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel wide">
              <div className="panel-header">
                <div>
                  <h3>Recent activity</h3>
                  <p className="muted">Latest transactions</p>
                </div>
                <button className="ghost small">View all</button>
              </div>
              <div className="transaction-toolbar">
                <input className="search-input" type="search"
                  placeholder="Search by title, category, date, amount"
                  value={searchQuery} onChange={handleSearchChange} />
                <div className="pagination">
                  <button className="ghost small"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}>Prev</button>
                  <span className="page-indicator">Page {currentPage} / {totalPages}</span>
                  <button className="ghost small"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}>Next</button>
                </div>
              </div>
              <div className="transaction-list">
                {filteredTransactions.length === 0 ? (
                  <p className="empty-state">No transactions yet. Add your first expense.</p>
                ) : (
                  pagedTransactions.map((item) => (
                    <div className="transaction" key={item._id ?? item.id}>
                      <div>
                        <p className="transaction-title">{item.title}</p>
                        <p className="muted">{item.category} · {formatDate(item.date)}</p>
                      </div>
                      <span className={`amount ${item.amount >= 0 ? "positive" : "negative"}`}>
                        {item.amount >= 0 ? "+" : "-"}{formatCurrency.format(Math.abs(item.amount))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div><h3>Investments</h3><p className="muted">Latest investment entries</p></div>
              </div>
              <div className="investment-summary">
                <div>
                  <p className="card-label">Total invested</p>
                  <strong>{formatCurrency.format(totalInvestment)}</strong>
                </div>
              </div>
              <div className="transaction-list compact">
                {investmentTransactions.length === 0 ? (
                  <p className="empty-state">No investments yet.</p>
                ) : (
                  investmentTransactions.slice(0, 5).map((item) => (
                    <div className="transaction" key={item._id ?? item.id}>
                      <div>
                        <p className="transaction-title">{item.title}</p>
                        <p className="muted">{formatDate(item.date)}</p>
                      </div>
                      <span className="amount positive">+{formatCurrency.format(Math.abs(item.amount))}</span>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div><h3>Spending goals</h3><p className="muted">Targets based on last month (-10%)</p></div>
                <button className="ghost small">Adjust</button>
              </div>
              {spendingGoals.every((g) => g.target === 0) ? (
                <p className="empty-state">No spend data from last month.</p>
              ) : (
                spendingGoals.map((goal) => (
                  <div className="goal" key={goal.label}>
                    <div className="goal-head">
                      <span>{goal.label}</span>
                      <strong>{formatCurrency.format(goal.currentSpend)} / {formatCurrency.format(goal.target)}</strong>
                    </div>
                    <div className="progress">
                      <span style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                ))
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}

export default App;
