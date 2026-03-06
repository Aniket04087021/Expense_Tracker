import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./App.css";
import logo from "./assets/logo.png";

const categoryPalette = {
  Food: "#ff8a5b",
  Transport: "#f5c76b",
  Lifestyle: "#7dd3fc",
  Bills: "#a78bfa",
  Investment: "#34d399",
  Income: "#22c55e",
  Home: "#60a5fa",
  Bike: "#f97316",
  Car: "#fb7185",
  Travel: "#38bdf8",
  Education: "#fbbf24",
  Health: "#22c55e",
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
  (import.meta.env.DEV ? "/api" : "https://expense-tracker-1-vb9x.onrender.com/api");
const TRANSACTIONS_URL = `${API_BASE}/transactions`;

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

const getQuarterKey = (date) => {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
};

const goalPeriods = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const goalCategoryOptions = [
  "Home",
  "Bike",
  "Car",
  "Travel",
  "Education",
  "Health",
  "Bills",
  "Food",
  "Transport",
  "Lifestyle",
  "Other",
];

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
          <div className="brand">
            <img src={logo} alt="Expnse Logo" className="logo" />
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

function InstallHelpModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="brand">
            <img src={logo} alt="Expnse" className="logo" />
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="modal-subtitle">
          Install Expnse on your phone like an app.
        </p>
        <div className="expense-form" style={{ gap: 12 }}>
          <div>
            <strong>Android (Chrome)</strong>
            <p className="muted" style={{ marginTop: 6 }}>
              Tap the browser menu (⋮) → <strong>Install app</strong> / <strong>Add to Home screen</strong>.
            </p>
          </div>
          <div>
            <strong>iPhone / iPad (Safari)</strong>
            <p className="muted" style={{ marginTop: 6 }}>
              Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.
            </p>
          </div>
          <button className="primary form-submit" type="button" onClick={onClose}>
            Got it
          </button>
        </div>
        <p className="fine-print">Tip: the install option appears after a few seconds and a reload sometimes.</p>
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
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [installingPwa, setInstallingPwa] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [goals, setGoals] = useState([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [goalForm, setGoalForm] = useState({
    name: "",
    category: "Home",
    period: "monthly",
    amount: "",
  });
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

  const goalsStorageKey = useMemo(() => {
    const uid = user?._id || user?.id || user?.email || "anon";
    return `expnse:goals:v1:${uid}`;
  }, [user]);

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
    try {
      const raw = localStorage.getItem(goalsStorageKey);
      if (!raw) {
        setGoals([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setGoals(Array.isArray(parsed) ? parsed : []);
    } catch {
      setGoals([]);
    }
  }, [goalsStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(goalsStorageKey, JSON.stringify(goals));
    } catch {
      // ignore storage failures (private mode / quota)
    }
  }, [goals, goalsStorageKey]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsAppInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const detectInstalled = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.matchMedia?.("(display-mode: fullscreen)")?.matches;
      const iosStandalone = window.navigator.standalone === true;
      setIsAppInstalled(Boolean(standalone || iosStandalone));
    };
    detectInstalled();
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

  const dailySeries = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    if (!year || !month) return { income: [], expense: [], daysInMonth: 0 };
    const daysInMonth = new Date(year, month, 0).getDate();
    const income = Array.from({ length: daysInMonth }, () => 0);
    const expense = Array.from({ length: daysInMonth }, () => 0);
    normalizedTransactions.forEach((entry) => {
      const d = new Date(entry.date);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        const idx = d.getDate() - 1;
        if (entry.type === "income" && entry.amount > 0) {
          income[idx] += Math.abs(entry.amount);
        } else if (entry.type !== "investment" && entry.amount < 0) {
          expense[idx] += Math.abs(entry.amount);
        }
      }
    });
    return { income, expense, daysInMonth };
  }, [normalizedTransactions, selectedMonth]);

  const maxDailyMagnitude = useMemo(() => {
    const maxIncome = dailySeries.income.length ? Math.max(...dailySeries.income) : 0;
    const maxExpense = dailySeries.expense.length ? Math.max(...dailySeries.expense) : 0;
    return Math.max(maxIncome, maxExpense, 0);
  }, [dailySeries]);

  const goalProgress = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    if (!year || !month) return [];
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const quarter = Math.floor((month - 1) / 3) + 1;
    const qStartMonth = (quarter - 1) * 3;
    const quarterStart = new Date(year, qStartMonth, 1);
    const quarterEnd = new Date(year, qStartMonth + 3, 0, 23, 59, 59, 999);

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 12, 0, 23, 59, 59, 999);

    const sumSpendForCategory = (category, start, end) =>
      normalizedTransactions
        .filter((t) => t.type !== "investment" && t.amount < 0 && (t.category || "Other") === category)
        .reduce((sum, t) => {
          const d = new Date(t.date);
          if (Number.isNaN(d.getTime())) return sum;
          if (d < start || d > end) return sum;
          return sum + Math.abs(t.amount);
        }, 0);

    const periodRange = (period) => {
      if (period === "yearly") return { start: yearStart, end: yearEnd, label: String(year) };
      if (period === "quarterly")
        return { start: quarterStart, end: quarterEnd, label: getQuarterKey(monthStart) };
      return { start: monthStart, end: monthEnd, label: getMonthKey(monthStart) };
    };

    return goals.map((g) => {
      const { start, end, label } = periodRange(g.period);
      const spent = sumSpendForCategory(g.category, start, end);
      const target = Number(g.amount) || 0;
      const progress = target ? Math.min((spent / target) * 100, 100) : 0;
      return { ...g, spent, target, progress, periodLabel: label };
    });
  }, [goals, normalizedTransactions, selectedMonth]);

  const handleGoalFormChange = (event) => {
    const { name, value } = event.target;
    setGoalForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetGoalForm = () => {
    setGoalForm({ name: "", category: "Home", period: "monthly", amount: "" });
    setEditingGoalId(null);
  };

  const handleSaveGoal = () => {
    const name = goalForm.name.trim();
    const amount = Number(goalForm.amount);
    if (!name || !goalForm.category || !goalForm.period) return;
    if (Number.isNaN(amount) || amount <= 0) return;

    if (editingGoalId) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === editingGoalId
            ? {
                ...g,
                name,
                category: goalForm.category,
                period: goalForm.period,
                amount,
                updatedAt: new Date().toISOString(),
              }
            : g
        )
      );
    } else {
      const newGoal = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        category: goalForm.category,
        period: goalForm.period,
        amount,
        createdAt: new Date().toISOString(),
      };
      setGoals((prev) => [newGoal, ...prev]);
    }

    resetGoalForm();
    setShowGoalForm(false);
  };

  const handleRemoveGoal = (goalId) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleEditGoal = (goal) => {
    setEditingGoalId(goal.id);
    setGoalForm({
      name: goal.name || "",
      category: goal.category || "Home",
      period: goal.period || "monthly",
      amount: String(goal.amount ?? ""),
    });
    setShowGoalForm(true);
  };

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    if (!year || !month) return selectedMonth;
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [selectedMonth]);

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

  const handleInstallApp = async () => {
    if (isAppInstalled) return;
    if (!deferredInstallPrompt) {
      setShowInstallHelp(true);
      return;
    }
    setInstallingPwa(true);
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
    setInstallingPwa(false);
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
      {showInstallHelp && <InstallHelpModal onClose={() => setShowInstallHelp(false)} />}

      {!isAuthenticated ? (
        <>
          {/* ── NAVBAR ── */}
          <nav className={`landing-nav ${showNavMenu ? "open" : ""}`}>
            <div className="brand">
              <img src={logo} alt="Expnse Logo" className="logo" />
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

          <div className="landing-shell">

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
                <button
                  className="ghost"
                  onClick={handleInstallApp}
                  disabled={installingPwa || isAppInstalled}
                >
                  {isAppInstalled ? "App installed" : installingPwa ? "Installing..." : "Install on mobile"}
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
                  <img src={logo} alt="Expnse Logo" className="logo" />
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

          </div>{/* landing-shell */}
        </>
      ) : (
        <>
          <header className="top-bar">
            <div>
              <img src={logo} alt="Expnse Logo" className="top-logo" />
              <h1>Welcome{user?.name ? `, ${user.name}` : ""}.</h1>
            </div>
            <div className="top-actions">
              <button className="ghost" onClick={handleLogout}>Logout</button>
              <button className="ghost" onClick={handleInstallApp} disabled={installingPwa || isAppInstalled}>
                {isAppInstalled ? "App installed" : installingPwa ? "Installing..." : "Install app"}
              </button>
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
                      <option>Home</option>
                      <option>Bike</option>
                      <option>Car</option>
                      <option>Travel</option>
                      <option>Education</option>
                      <option>Health</option>
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
            <article className="panel panel-chart">
              <div className="panel-header">
                <div>
                  <h3>Monthly burn</h3>
                  <p className="muted">Daily income vs expense — income up, expense down</p>
                </div>
                <input className="month-picker" type="month" value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)} />
              </div>
              <div className="burn-chart">
                <div className="burn-legend">
                  <span className="burn-pill income"><i /> Income</span>
                  <span className="burn-pill expense"><i /> Expense</span>
                  <span className="burn-meta muted">{monthLabel}</span>
                </div>
                {dailySeries.daysInMonth === 0 ? (
                  <p className="empty-state">Pick a month to see trends.</p>
                ) : maxDailyMagnitude === 0 ? (
                  <p className="empty-state">No income/expense activity for this month.</p>
                ) : (
                  (() => {
                    const width = 720;
                    const height = 220;
                    const padX = 18;
                    const padTop = 16;
                    const padBottom = 18;
                    const midY = Math.round((padTop + (height - padBottom)) / 2);
                    const amp = Math.max(10, Math.floor(((height - padTop - padBottom) / 2) - 10));
                    const days = dailySeries.daysInMonth;
                    const denom = Math.max(1, days - 1);
                    const plotW = width - padX * 2;
                    const mkPoints = (arr, dir) =>
                      arr
                        .map((v, idx) => {
                          const x = Math.round(padX + (idx / denom) * plotW);
                          const y =
                            dir === "up"
                              ? Math.round(midY - (v / maxDailyMagnitude) * amp)
                              : Math.round(midY + (v / maxDailyMagnitude) * amp);
                          return `${x},${y}`;
                        })
                        .join(" ");

                    const incomePoints = mkPoints(dailySeries.income, "up");
                    const expensePoints = mkPoints(dailySeries.expense, "down");

                    return (
                      <svg
                        className="burn-svg"
                        viewBox={`0 0 ${width} ${height}`}
                        role="img"
                        aria-label="Income and expense trend lines for the selected month"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="rgba(52,211,153,0.30)" />
                            <stop offset="1" stopColor="rgba(52,211,153,0.00)" />
                          </linearGradient>
                          <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="rgba(252,165,165,0.00)" />
                            <stop offset="1" stopColor="rgba(252,165,165,0.26)" />
                          </linearGradient>
                        </defs>

                        {/* grid */}
                        {[0.25, 0.5, 0.75].map((t) => {
                          const y = Math.round(padTop + (height - padTop - padBottom) * t);
                          return (
                            <line
                              key={t}
                              x1={padX}
                              y1={y}
                              x2={width - padX}
                              y2={y}
                              stroke="rgba(255,255,255,0.08)"
                              strokeWidth="1"
                            />
                          );
                        })}
                        <line
                          x1={padX}
                          y1={midY}
                          x2={width - padX}
                          y2={midY}
                          stroke="rgba(255,255,255,0.14)"
                          strokeWidth="1"
                        />

                        {/* income area */}
                        <path
                          d={`M ${incomePoints} L ${width - padX},${midY} L ${padX},${midY} Z`}
                          fill="url(#incomeFill)"
                        />
                        {/* expense area */}
                        <path
                          d={`M ${expensePoints} L ${width - padX},${midY} L ${padX},${midY} Z`}
                          fill="url(#expenseFill)"
                        />

                        <polyline className="burn-line income" points={incomePoints} fill="none" />
                        <polyline className="burn-line expense" points={expensePoints} fill="none" />
                      </svg>
                    );
                  })()
                )}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h3>Category split</h3>
                  <p className="muted">Where your money goes</p>
                </div>
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
                <div>
                  <h3>Spending goals</h3>
                  <p className="muted">Set budgets by category for monthly / quarterly / yearly</p>
                </div>
                <button className="ghost small" type="button" onClick={() => setShowGoalForm((p) => !p)}>
                  {showGoalForm ? "Close" : "Add goal"}
                </button>
              </div>
              {showGoalForm && (
                <div className="goal-form">
                  <label>
                    Goal name
                    <input
                      type="text"
                      name="name"
                      value={goalForm.name}
                      onChange={handleGoalFormChange}
                      placeholder="e.g. Home EMI, Bike fuel, Car service"
                    />
                  </label>
                  <label>
                    Category
                    <select name="category" value={goalForm.category} onChange={handleGoalFormChange}>
                      {goalCategoryOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Period
                    <select name="period" value={goalForm.period} onChange={handleGoalFormChange}>
                      {goalPeriods.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Target amount (INR)
                    <input
                      type="number"
                      name="amount"
                      min="0"
                      step="0.01"
                      value={goalForm.amount}
                      onChange={handleGoalFormChange}
                      placeholder="0.00"
                    />
                  </label>
                  <div className="goal-form-actions">
                    <button className="primary form-submit" type="button" onClick={handleSaveGoal}>
                      {editingGoalId ? "Save changes" : "Save goal"}
                    </button>
                    {editingGoalId && (
                      <button
                        className="ghost form-submit"
                        type="button"
                        onClick={() => {
                          resetGoalForm();
                          setShowGoalForm(false);
                        }}
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                </div>
              )}

              {goalProgress.length === 0 ? (
                <p className="empty-state">No goals yet. Add one to track budgets.</p>
              ) : (
                goalProgress.map((goal) => (
                  <div className="goal" key={goal.id}>
                    <div className="goal-head">
                      <span>
                        {goal.name}{" "}
                        <span className="muted" style={{ fontSize: "0.76rem" }}>
                          · {goal.category} · {goal.periodLabel}
                        </span>
                      </span>
                      <strong>
                        {formatCurrency.format(goal.spent)} / {formatCurrency.format(goal.target)}
                      </strong>
                    </div>
                    <div className="progress">
                      <span style={{ width: `${goal.progress}%` }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
                      <span className="muted" style={{ fontSize: "0.78rem" }}>
                        {goal.progress >= 100 ? "Limit reached" : `${Math.round(goal.progress)}% used`}
                      </span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button className="ghost small" type="button" onClick={() => handleEditGoal(goal)}>
                          Edit
                        </button>
                        <button
                          className="ghost small"
                          type="button"
                          onClick={() => handleRemoveGoal(goal.id)}
                          aria-label={`Remove goal ${goal.name}`}
                        >
                          Remove
                        </button>
                      </div>
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
