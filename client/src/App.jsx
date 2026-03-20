import { useEffect, useMemo, useRef, useState } from "react";
import { useLandingAnimations } from "./useLandingAnimations";
import "./gsap-animations.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./App.css";
const logo = "/logo expense.png";

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
const GOALS_URL = `${API_BASE}/goals`;

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

// ── Core API helper — always sends token via Authorization header if available ──
const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      // ── Save token to localStorage so mobile stays logged in ──
      if (data.token) {
        localStorage.setItem("token", data.token);
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
  const [goals, setGoals] = useState([]);
  const [goalContributions, setGoalContributions] = useState({});
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
  const [goalContribMode, setGoalContribMode] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [goalContribAmount, setGoalContribAmount] = useState("");

  const [storyPeriod, setStoryPeriod] = useState("monthly");
  const storyCardRef = useRef(null);
  const [storyDownloading, setStoryDownloading] = useState(false);

  const isAuthenticated = Boolean(user);

  const openAuth = (mode) => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const loadGoals = async () => {
    if (!user) { setGoals([]); setGoalContributions({}); return; }
    try {
      const [goalsRes, contribRes] = await Promise.all([
        apiRequest("/goals"),
        apiRequest("/goals/contributions"),
      ]);
      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(Array.isArray(data) ? data : []);
      }
      if (contribRes.ok) {
        const data = await contribRes.json();
        const map = {};
        (Array.isArray(data) ? data : []).forEach((c) => {
          const gid = c.goal?._id || c.goal;
          map[gid] = (map[gid] || 0) + c.amount;
        });
        setGoalContributions(map);
      }
    } catch {
      setGoals([]);
      setGoalContributions({});
    }
  };

  // ── On mount: verify token with /auth/me ──
  useEffect(() => {
    const initAuth = async () => {
      setAuthLoading(true);
      try {
        const response = await apiRequest("/auth/me", { method: "GET" });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user || null);
        } else {
          // Token is invalid or expired — clear it
          localStorage.removeItem("token");
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
    loadGoals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  // ── Load transactions — uses apiRequest so token is sent via header ──
  useEffect(() => {
    const loadTransactions = async () => {
      if (!user) { setTransactions([]); return; }
      try {
        const response = await apiRequest("/transactions");
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

  const healthScore = useMemo(() => {
    if (totals.income === 0) return null;
    const savingsRate = Math.max(0, (totals.income - totals.spend) / totals.income);
    const investmentRatio = Math.min(1, totals.investment / Math.max(totals.income, 1));
    const spendControl = Math.max(0, 1 - (totals.spend / Math.max(totals.income, 1)));
    const score = Math.round((savingsRate * 50) + (investmentRatio * 25) + (spendControl * 25));
    return Math.min(100, Math.max(0, score));
  }, [totals]);

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
      const contributed = goalContributions[g._id] || 0;
      const total = spent + contributed;
      const target = Number(g.amount) || 0;
      const progress = target ? Math.min((total / target) * 100, 100) : 0;
      return { ...g, spent: total, target, progress, periodLabel: label, contributed };
    });
  }, [goals, goalContributions, normalizedTransactions, selectedMonth]);

  const handleGoalFormChange = (event) => {
    const { name, value } = event.target;
    setGoalForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetGoalForm = () => {
    setGoalForm({ name: "", category: "Home", period: "monthly", amount: "" });
    setEditingGoalId(null);
  };

  const handleSaveGoal = async () => {
    const name = goalForm.name.trim();
    const amount = Number(goalForm.amount);
    if (!name || !goalForm.category || !goalForm.period) return;
    if (Number.isNaN(amount) || amount <= 0) return;

    const payload = { name, category: goalForm.category, period: goalForm.period, amount };

    try {
      if (editingGoalId) {
        const res = await apiRequest(`/goals/${editingGoalId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setGoals((prev) => prev.map((g) => (g._id === editingGoalId ? updated : g)));
        }
      } else {
        const res = await apiRequest("/goals", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setGoals((prev) => [created, ...prev]);
        }
      }
    } catch {
      // silently fail
    }

    resetGoalForm();
    setShowGoalForm(false);
  };

  const handleRemoveGoal = async (goalId) => {
    setGoals((prev) => prev.filter((g) => g._id !== goalId));
    try {
      await apiRequest(`/goals/${goalId}`, { method: "DELETE" });
    } catch { /* ignore */ }
  };

  const handleEditGoal = (goal) => {
    setEditingGoalId(goal._id);
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

  const storyData = useMemo(() => {
    const now = new Date();
    const [selYear, selMonth] = selectedMonth.split("-").map(Number);

    if (storyPeriod === "monthly") {
      const tx = normalizedTransactions.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === selYear && d.getMonth() + 1 === selMonth;
      });
      const income   = tx.filter(e=>e.type==="income").reduce((s,e)=>s+e.amount,0);
      const spend    = tx.filter(e=>e.type==="expense").reduce((s,e)=>s+Math.abs(e.amount),0);
      const invested = tx.filter(e=>e.type==="investment").reduce((s,e)=>s+Math.abs(e.amount),0);
      const saved    = Math.max(0, income - spend);
      const savRate  = income > 0 ? Math.round((saved/income)*100) : 0;
      const catMap = {};
      tx.filter(e=>e.type==="expense").forEach(e => { catMap[e.category||"Other"]=(catMap[e.category||"Other"]||0)+Math.abs(e.amount); });
      const cats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
      const expenses = tx.filter(e=>e.type==="expense").sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount));
      const incomes  = tx.filter(e=>e.type==="income").sort((a,b)=>b.amount-a.amount);
      const dayMap = {};
      tx.filter(e=>e.type==="expense").forEach(e => { const d=new Date(e.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}); dayMap[d]=(dayMap[d]||0)+Math.abs(e.amount); });
      const topDay = Object.entries(dayMap).sort((a,b)=>b[1]-a[1])[0];
      const catCount = {};
      tx.filter(e=>e.type==="expense").forEach(e => { catCount[e.category||"Other"]=(catCount[e.category||"Other"]||0)+1; });
      const topCatByCount = Object.entries(catCount).sort((a,b)=>b[1]-a[1])[0];
      const dowMap = {};
      tx.forEach(e => { const dow=new Date(e.date).toLocaleDateString("en-IN",{weekday:"long"}); dowMap[dow]=(dowMap[dow]||0)+1; });
      const topDow = Object.entries(dowMap).sort((a,b)=>b[1]-a[1])[0];
      let personality = null;
      if (income > 0) {
        const foodPct = (catMap["Food"]||0)/Math.max(spend,1)*100;
        const shopPct = ((catMap["Shopping"]||0)+(catMap["Entertainment"]||0))/Math.max(spend,1)*100;
        if      (savRate>=40)  personality={label:"Smart Saver 🧠",   desc:"You save more than you spend. Excellent discipline!"};
        else if (foodPct>=30)  personality={label:"Food Lover 🍕",     desc:"Food is your biggest passion — and expense!"};
        else if (shopPct>=25)  personality={label:"Shopaholic 🛍️",    desc:"Retail therapy is real. Consider a shopping budget."};
        else if (savRate>=20)  personality={label:"Balanced Spender ⚖️",desc:"You balance spending and saving well."};
        else                   personality={label:"High Spender 💸",   desc:"Your expenses are high. Review your budget."};
      }
      const expTx = tx.filter(e=>e.type==="expense");
      const avgTx = expTx.length > 0 ? spend/expTx.length : 0;
      return { period:"monthly", label:monthLabel, income, spend, saved, invested, savRate,
        cats, topCat:cats[0], biggestExpense:expenses[0], biggestIncome:incomes[0],
        topDay, topCatByCount, topDow, personality, txCount:tx.length, expenseTxCount:expTx.length, avgTx };
    }

    if (storyPeriod === "weekly") {
      const sow = (d) => { const dd=new Date(d); dd.setDate(dd.getDate()-dd.getDay()); dd.setHours(0,0,0,0); return dd; };
      const thisWeekStart = sow(now);
      const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate()-7);
      const lastWeekEnd   = new Date(thisWeekStart); lastWeekEnd.setMilliseconds(-1);
      const inW = (e,s,en) => { const d=new Date(e.date); return d>=s && d<=en; };
      const thisWTx = normalizedTransactions.filter(e=>inW(e,thisWeekStart,now));
      const lastWTx = normalizedTransactions.filter(e=>inW(e,lastWeekStart,lastWeekEnd));
      const wSpend  = (txs)=>txs.filter(e=>e.type==="expense").reduce((s,e)=>s+Math.abs(e.amount),0);
      const wIncome = (txs)=>txs.filter(e=>e.type==="income").reduce((s,e)=>s+e.amount,0);
      const thisSpend=wSpend(thisWTx), lastSpend=wSpend(lastWTx), thisIncome=wIncome(thisWTx);
      const catMap={};
      thisWTx.filter(e=>e.type==="expense").forEach(e=>{catMap[e.category||"Other"]=(catMap[e.category||"Other"]||0)+Math.abs(e.amount);});
      const cats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
      const dayMap={};
      thisWTx.filter(e=>e.type==="expense").forEach(e=>{const dow=new Date(e.date).toLocaleDateString("en-IN",{weekday:"long"});dayMap[dow]=(dayMap[dow]||0)+Math.abs(e.amount);});
      const topDay=Object.entries(dayMap).sort((a,b)=>b[1]-a[1])[0];
      const spendDiff=thisSpend-lastSpend;
      const spendDiffPct=lastSpend>0?Math.round(Math.abs(spendDiff)/lastSpend*100):null;
      const saved=Math.max(0,thisIncome-thisSpend);
      const savRate=thisIncome>0?Math.round((saved/thisIncome)*100):0;
      return { period:"weekly", label:"This Week", income:thisIncome, spend:thisSpend, saved, savRate,
        cats, topCat:cats[0], topDay, lastSpend, spendDiff, spendDiffPct,
        txCount:thisWTx.length, expenseTxCount:thisWTx.filter(e=>e.type==="expense").length };
    }

    if (storyPeriod === "yearly") {
      const year=selYear;
      const tx=normalizedTransactions.filter(e=>new Date(e.date).getFullYear()===year);
      const income=tx.filter(e=>e.type==="income").reduce((s,e)=>s+e.amount,0);
      const spend=tx.filter(e=>e.type==="expense").reduce((s,e)=>s+Math.abs(e.amount),0);
      const invested=tx.filter(e=>e.type==="investment").reduce((s,e)=>s+Math.abs(e.amount),0);
      const saved=Math.max(0,income-spend);
      const savRate=income>0?Math.round((saved/income)*100):0;
      const catMap={};
      tx.filter(e=>e.type==="expense").forEach(e=>{catMap[e.category||"Other"]=(catMap[e.category||"Other"]||0)+Math.abs(e.amount);});
      const cats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
      const mSpend=Array(12).fill(0), mInc=Array(12).fill(0);
      tx.forEach(e=>{const m=new Date(e.date).getMonth();if(e.type==="expense")mSpend[m]+=Math.abs(e.amount);if(e.type==="income")mInc[m]+=e.amount;});
      const MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const maxSM=mSpend.indexOf(Math.max(...mSpend));
      const savs=mInc.map((v,i)=>v-mSpend[i]);
      const bestSM=savs.indexOf(Math.max(...savs));
      return { period:"yearly", label:`${year}`, income, spend, saved, invested, savRate,
        cats, topCat:cats[0], txCount:tx.length, expenseTxCount:tx.filter(e=>e.type==="expense").length,
        mostExpensiveMonth:MN[maxSM], bestSaveMonth:MN[bestSM] };
    }
    return null;
  }, [storyPeriod, normalizedTransactions, selectedMonth, monthLabel]); // eslint-disable-line

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

  // ── Logout: clear localStorage token ──
  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  const downloadStoryCard = async () => {
    const el = storyCardRef.current;
    if (!el) return;
    setStoryDownloading(true);
    try {
      const { default: html2canvas } = await import("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.min.js");
      const canvas = await html2canvas(el, { backgroundColor: "#0d0820", scale: 2, useCORS: true, logging: false });
      const link = document.createElement("a");
      link.download = `expnse-${storyPeriod}-story.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Download failed — try screenshotting the card manually.");
    } finally {
      setStoryDownloading(false);
    }
  };

  const shareStory = (platform) => {
    if (!storyData) return;
    const { income, spend, saved, savRate, txCount, topCat, label } = storyData;
    const parts = [
      `My ${label} Money Story 📊`,
      ``,
      `💰 Income: ${formatCurrency.format(income)}`,
      `💸 Spent:  ${formatCurrency.format(spend)}`,
      `🏦 Saved:  ${formatCurrency.format(saved)}`,
      `📈 Savings Rate: ${savRate}%`,
      topCat ? `🏆 Top Category: ${topCat[0]}` : null,
      txCount ? `🧾 Transactions: ${txCount}` : null,
      ``,
      `Tracked with Expnse 🔥`,
    ].filter(Boolean).join("\n");
    const enc = encodeURIComponent(parts);
    const urls = {
      twitter:  `https://twitter.com/intent/tweet?text=${enc}`,
      whatsapp: `https://wa.me/?text=${enc}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=https://expnse.app&summary=${enc}`,
    };
    if (urls[platform]) window.open(urls[platform], "_blank");
  };

  const handleInstallApp = async () => {
    if (isAppInstalled || !deferredInstallPrompt) return;
    setInstallingPwa(true);
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
    setInstallingPwa(false);
    if (outcome === "accepted") setIsAppInstalled(true);
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

  // ── Submit transaction — uses apiRequest so token is sent via header ──
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
      const response = await apiRequest("/transactions", {
        method: "POST",
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
    setGoalContribMode(false);
    setSelectedGoalId("");
    setGoalContribAmount("");
    setShowForm(false);
  };

  const handleGoalContribSubmit = async (event) => {
    event.preventDefault();
    const amount = Number(goalContribAmount);
    if (!selectedGoalId || !amount || amount <= 0) return;
    setGoalContributions((prev) => ({
      ...prev,
      [selectedGoalId]: (prev[selectedGoalId] || 0) + amount,
    }));
    setGoalContribMode(false);
    setSelectedGoalId("");
    setGoalContribAmount("");
    setShowForm(false);
    try {
      await apiRequest(`/goals/${selectedGoalId}/contributions`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
    } catch {
      loadGoals();
    }
  };

  // ── Splash screen: shown while verifying token so landing never flashes ──
if (authLoading) {
  return (
    <div className="splash-screen">
      <div className="splash-inner">
        <img src={logo} alt="Expnse" className="splash-logo" />
        <div className="splash-dots">
          <span /><span /><span />
        </div>
        <p className="splash-text">Loading your finances…</p>
      </div>
    </div>
  );
}

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
                {[
                  { label: "Features", id: "features" },
                  { label: "Export", id: "export" },
                  { label: "Insights", id: "insights" },
                  { label: "Download", id: "download" },
                ].map(({ label, id }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(id);
                      if (!el) return;
                      const navH = 60 + 12 + 20;
                      const top = el.getBoundingClientRect().top + window.scrollY - navH;
                      window.scrollTo({ top, behavior: "smooth" });
                      setShowNavMenu(false);
                    }}
                  >
                    {label}
                  </a>
                ))}
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

          {/* ── MONEY STORY LANDING SECTION ── */}
          <section className="money-story-landing" id="moneystory">
            <div className="msl-bg-glow" />
            <div className="section-head centered">
              <p className="eyebrow">✦ New Feature</p>
              <h2>Money Story</h2>
              <p className="section-sub muted">Your finances, beautifully summarized. Generate weekly, monthly &amp; yearly stories and share your financial journey.</p>
            </div>

            <div className="msl-grid">
              <div className="msl-card-wrap">
                <div className="msl-glow-ring" />
                <div className="msl-story-card">
                  <div className="msl-card-header">
                    <div className="msl-logo-box">
                      <img src={logo} alt="Expnse" />
                    </div>
                    <div>
                      <p className="msl-brand">Expnse</p>
                      <p className="msl-period">📊 Monthly Money Story · March 2026</p>
                    </div>
                    <div className="msl-badge">LIVE</div>
                  </div>

                  <div className="msl-metrics">
                    {[
                      { icon:"↑", label:"Income",   val:"₹82,000",  cls:"inc" },
                      { icon:"↓", label:"Spent",    val:"₹23,760",  cls:"exp" },
                      { icon:"🏦", label:"Saved",   val:"₹58,240",  cls:"sav" },
                      { icon:"📈", label:"Invested", val:"₹15,000", cls:"inv" },
                    ].map(m => (
                      <div className={`msl-metric msl-${m.cls}`} key={m.label}>
                        <span className="msl-metric-icon">{m.icon}</span>
                        <p className="msl-metric-label">{m.label}</p>
                        <strong className="msl-metric-val">{m.val}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="msl-savebar-row">
                    <span className="msl-savebar-label">Savings Rate</span>
                    <div className="msl-savebar-track">
                      <div className="msl-savebar-fill" style={{width:"41%"}} />
                    </div>
                    <span className="msl-savebar-pct">41%</span>
                  </div>

                  <div className="msl-chips">
                    <span className="msl-chip">🏆 Food</span>
                    <span className="msl-chip">🧬 Smart Saver</span>
                    <span className="msl-chip">🧾 18 tx</span>
                    <span className="msl-chip">❤️ 82/100</span>
                  </div>

                  <div className="msl-msg-box">
                    <span className="msl-msg-icon">✦</span>
                    <p className="msl-msg">"Your savings improved this month. Outstanding financial discipline!"</p>
                  </div>

                  <p className="msl-card-footer">Track your money with clarity · expnse.app</p>
                </div>

                <div className="msl-share-float msl-float-1">
                  <span>𝕏</span> Shared on Twitter
                </div>
                <div className="msl-share-float msl-float-2">
                  <span>💬</span> Sent on WhatsApp
                </div>
              </div>

              <div className="msl-right">
                <div className="msl-tag">✦ Zero AI required · 100% your data</div>

                <h3 className="msl-heading">Your financial journey, <em>beautifully told.</em></h3>
                <p className="msl-subtext muted">Switch between Monthly, Weekly and Yearly views. Every insight computed instantly from your transactions — no AI key needed.</p>

                <div className="msl-features">
                  {[
                    { icon:"📊", color:"#34d399", title:"3 story modes",        desc:"Monthly, Weekly, and Yearly summaries with unique insights for each period." },
                    { icon:"🧬", color:"#a78bfa", title:"Spending Personality",  desc:"Smart Saver, Food Lover, Shopaholic — discover your financial personality." },
                    { icon:"💰", color:"#fbbf24", title:"Savings Rate + bar",    desc:"Visual progress bar showing exactly how much of your income you're keeping." },
                    { icon:"🚀", color:"#f87171", title:"One-tap share",         desc:"Share to Twitter, WhatsApp, LinkedIn or download as a PNG image instantly." },
                  ].map(f => (
                    <div className="msl-feat" key={f.title}>
                      <div className="msl-feat-icon" style={{background:`${f.color}18`, border:`1px solid ${f.color}33`, color:f.color}}>{f.icon}</div>
                      <div>
                        <strong>{f.title}</strong>
                        <p className="muted">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="msl-actions">
                  <button className="primary msl-cta-btn" onClick={() => openAuth("signup")}>
                    ✦ Generate your Money Story
                  </button>
                  <div className="msl-share-row">
                    <span className="muted" style={{fontSize:"0.76rem"}}>Share on</span>
                    {["𝕏","💬","in"].map((s,i) => (
                      <span key={i} className={`msl-share-icon ${["tw","wa","li"][i]}`}>{s}</span>
                    ))}
                  </div>
                </div>
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
                <div className="platform-card platform-card--web">
                  <div className="platform-card-top">
                    <div className="platform-icon-wrap platform-icon-wrap--web">🌐</div>
                    <span className="platform-badge platform-badge--live">Live</span>
                  </div>
                  <strong>Web app</strong>
                  <p className="muted">Available now · Works in any browser</p>
                  <button className="primary platform-btn" onClick={() => openAuth("signup")}>
                    Start on web →
                  </button>
                </div>

                <div className="platform-card platform-card--mobile">
                  <div className="platform-card-top">
                    <div className="platform-icon-wrap platform-icon-wrap--mobile">📱</div>
                    <span className="platform-badge platform-badge--live">Live</span>
                  </div>
                  <strong>Mobile app</strong>
                  <p className="muted">Install on home screen · iOS &amp; Android</p>
                  <button
                    className="primary platform-btn platform-btn--mobile"
                    onClick={handleInstallApp}
                    disabled={installingPwa || isAppInstalled}
                  >
                    {isAppInstalled ? "✓ App installed" : installingPwa ? "Installing…" : "Install on mobile →"}
                  </button>
                </div>

                <div className="platform-card platform-card--desktop dim">
                  <div className="platform-card-top">
                    <div className="platform-icon-wrap platform-icon-wrap--desktop">💻</div>
                    <span className="platform-badge platform-badge--soon">Soon</span>
                  </div>
                  <strong>Desktop app</strong>
                  <p className="muted">Native app for Mac &amp; Windows</p>
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
                  {[
                    { label: "Features", id: "features" },
                    { label: "PDF Export", id: "export" },
                    { label: "Download", id: "download" },
                  ].map(({ label, id }) => (
                    <a key={id} href={`#${id}`} onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(id);
                      if (!el) return;
                      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 92, behavior: "smooth" });
                    }}>{label}</a>
                  ))}
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
                    <p className="muted">Log income, spending, or allocate to a goal</p>
                  </div>
                  <button className="ghost small" onClick={() => { setShowForm(false); setGoalContribMode(false); setSelectedGoalId(""); setGoalContribAmount(""); }}>Close</button>
                </div>

                <div className="pill-group" style={{ marginBottom: 16 }}>
                  <button type="button"
                    className={!goalContribMode ? "pill active" : "pill"}
                    onClick={() => setGoalContribMode(false)}>
                    Transaction
                  </button>
                  <button type="button"
                    className={goalContribMode ? "pill active" : "pill"}
                    onClick={() => setGoalContribMode(true)}>
                    🎯 Allocate to Goal
                  </button>
                </div>

                {!goalContribMode ? (
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
                ) : (
                  <form className="expense-form" onSubmit={handleGoalContribSubmit}>
                    {goals.length === 0 ? (
                      <p className="empty-state" style={{ padding: "12px 0" }}>
                        No goals yet. Create a goal first in the <strong>Spending goals</strong> section below.
                      </p>
                    ) : (
                      <>
                        <label>
                          Select Goal
                          <select value={selectedGoalId} onChange={(e) => setSelectedGoalId(e.target.value)} required>
                            <option value="">-- Choose a goal --</option>
                            {goals.map((g) => (
                              <option key={g._id} value={g._id}>
                                {g.name} · {g.category} · Target: {formatCurrency.format(g.amount)}
                              </option>
                            ))}
                          </select>
                        </label>

                        {selectedGoalId && (() => {
                          const goal = goals.find((g) => g._id === selectedGoalId);
                          const contrib = goalContributions[selectedGoalId] || 0;
                          const pct = goal ? Math.min((contrib / goal.amount) * 100, 100) : 0;
                          return goal ? (
                            <div className="goal-contrib-preview">
                              <div className="goal-contrib-info">
                                <span className="goal-contrib-name">{goal.name}</span>
                                <span className="goal-contrib-target">Target: {formatCurrency.format(goal.amount)}</span>
                              </div>
                              <div className="goal-contrib-row">
                                <span className="muted" style={{ fontSize: "0.8rem" }}>Already allocated</span>
                                <strong style={{ color: "#34d399" }}>{formatCurrency.format(contrib)}</strong>
                              </div>
                              <div className="progress" style={{ margin: "6px 0" }}>
                                <span style={{ width: `${pct}%`, background: "#34d399" }} />
                              </div>
                              <span className="muted" style={{ fontSize: "0.78rem" }}>{Math.round(pct)}% of goal reached</span>
                            </div>
                          ) : null;
                        })()}

                        <label>
                          Amount to allocate (INR)
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={goalContribAmount}
                            onChange={(e) => setGoalContribAmount(e.target.value)}
                            required
                          />
                        </label>
                        <button className="primary form-submit" type="submit" disabled={!selectedGoalId}>
                          Allocate to goal
                        </button>
                      </>
                    )}
                  </form>
                )}
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
            <article className="panel panel-chart burn-panel">
              <div className="burn-panel-header">
                <div className="burn-panel-title-group">
                  <div className="burn-panel-icon">🔥</div>
                  <div>
                    <h3 className="burn-panel-title">Monthly Burn</h3>
                    <p className="burn-panel-sub">Daily income vs expense · {monthLabel}</p>
                  </div>
                </div>
                <input className="month-picker burn-month-picker" type="month" value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)} />
              </div>

              <div className="burn-chips-row">
                <div className="burn-stat-chip income-chip">
                  <span className="chip-dot" />
                  <span className="chip-label">Income</span>
                  <strong className="chip-val">{formatCurrency.format(
                    dailySeries.income.reduce((a, b) => a + b, 0)
                  )}</strong>
                </div>
                <div className="burn-stat-chip expense-chip">
                  <span className="chip-dot" />
                  <span className="chip-label">Expense</span>
                  <strong className="chip-val">{formatCurrency.format(
                    dailySeries.expense.reduce((a, b) => a + b, 0)
                  )}</strong>
                </div>
                {(() => {
                  const net = dailySeries.income.reduce((a,b)=>a+b,0) - dailySeries.expense.reduce((a,b)=>a+b,0);
                  return (
                    <div className={`burn-stat-chip net-chip ${net >= 0 ? "net-pos" : "net-neg"}`}>
                      <span className="chip-dot" />
                      <span className="chip-label">Net</span>
                      <strong className="chip-val">{net >= 0 ? "+" : ""}{formatCurrency.format(net)}</strong>
                    </div>
                  );
                })()}
              </div>

              {dailySeries.daysInMonth === 0 ? (
                <div className="burn-empty"><span>📅</span><p>Pick a month to see trends.</p></div>
              ) : maxDailyMagnitude === 0 ? (
                <div className="burn-empty"><span>📊</span><p>No activity for this month yet.</p></div>
              ) : (
                (() => {
                  const days = dailySeries.daysInMonth;
                  const BAR_MAX_H = 100;
                  return (
                    <div className="burnv2-wrap">
                      <div className="burnv2-yaxis">
                        <span className="burnv2-ylab green">{formatCurrency.format(maxDailyMagnitude)}</span>
                        <span className="burnv2-ylab mid">— 0 —</span>
                        <span className="burnv2-ylab red">{formatCurrency.format(maxDailyMagnitude)}</span>
                      </div>

                      <div className="burnv2-scroll">
                        <div className="burnv2-grid">
                          <div className="burnv2-gridline top" />
                          <div className="burnv2-gridline upper-mid" />
                          <div className="burnv2-gridline mid" />
                          <div className="burnv2-gridline lower-mid" />
                          <div className="burnv2-gridline bot" />
                          <div className="burnv2-baseline" />
                        </div>

                        <div className="burnv2-bars">
                          {Array.from({ length: days }, (_, i) => {
                            const inc = dailySeries.income[i] || 0;
                            const exp = dailySeries.expense[i] || 0;
                            const incH = maxDailyMagnitude ? Math.max(2, Math.round((inc / maxDailyMagnitude) * BAR_MAX_H)) : 0;
                            const expH = maxDailyMagnitude ? Math.max(2, Math.round((exp / maxDailyMagnitude) * BAR_MAX_H)) : 0;
                            const hasActivity = inc > 0 || exp > 0;
                            const isToday = new Date().getDate() === i + 1 &&
                              new Date().toISOString().slice(0,7) === selectedMonth;
                            return (
                              <div className={`burnv2-col${hasActivity ? " active" : ""}${isToday ? " today" : ""}`} key={i}>
                                <div className="burnv2-tooltip">
                                  <span className="tt-day">Day {i + 1}</span>
                                  {inc > 0 && <span className="tt-row inc">▲ {formatCurrency.format(inc)}</span>}
                                  {exp > 0 && <span className="tt-row exp">▼ {formatCurrency.format(exp)}</span>}
                                  {inc === 0 && exp === 0 && <span className="tt-row" style={{color:"rgba(255,255,255,0.3)"}}>No activity</span>}
                                </div>
                                <div className="burnv2-half up">
                                  {inc > 0
                                    ? <div className="burnv2-bar inc" style={{ height: incH }} />
                                    : <div className="burnv2-bar-empty" />
                                  }
                                </div>
                                <div className="burnv2-half dn">
                                  {exp > 0
                                    ? <div className="burnv2-bar exp" style={{ height: expH }} />
                                    : <div className="burnv2-bar-empty" />
                                  }
                                </div>
                                <span className="burnv2-day">{i + 1}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </article>

            <article className="panel catpanel">
              <div className="catpanel-header">
                <div className="catpanel-title-group">
                  <div className="catpanel-icon">🎯</div>
                  <div>
                    <h3 className="catpanel-title">Category Split</h3>
                    <p className="catpanel-sub">Where your money goes</p>
                  </div>
                </div>
                {categoryBreakdown.length > 0 && (
                  <div className="catpanel-total-badge">
                    <span className="ctb-label">Total Spent</span>
                    <strong className="ctb-val">{formatCurrency.format(totalSpend)}</strong>
                  </div>
                )}
              </div>

              {categoryBreakdown.length === 0 ? (
                <p className="empty-state">No expense categories yet.</p>
              ) : (
                <div className="catpanel-body">
                  <div className="catdonut-wrap">
                    <div className="catdonut" style={{
                      background: `conic-gradient(${categoryBreakdown.map((item, index) => {
                        const start = categoryBreakdown.slice(0, index).reduce((s, e) => s + e.value, 0) / totalSpend;
                        const end = (start + item.value / totalSpend) * 360;
                        return `${item.color} ${start * 360}deg ${end}deg`;
                      }).join(",")})`,
                    }}>
                      <div className="catdonut-hole">
                        <p className="catdonut-label">Total Spend</p>
                        <strong className="catdonut-amount">{formatCurrency.format(totalSpend)}</strong>
                        <span className="catdonut-count">{categoryBreakdown.length} categories</span>
                      </div>
                    </div>
                    <div className="catdonut-glow" />
                  </div>

                  <div className="catlegend">
                    {categoryBreakdown.map((item) => {
                      const pct = totalSpend ? Math.round((item.value / totalSpend) * 100) : 0;
                      return (
                        <div className="catleg-item" key={item.label}>
                          <div className="catleg-top">
                            <div className="catleg-left">
                              <span className="catleg-dot" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}88` }} />
                              <span className="catleg-name">{item.label}</span>
                            </div>
                            <div className="catleg-right">
                              <span className="catleg-pct" style={{ color: item.color }}>{pct}%</span>
                              <strong className="catleg-amt">{formatCurrency.format(item.value)}</strong>
                            </div>
                          </div>
                          <div className="catleg-bar-track">
                            <div className="catleg-bar-fill" style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${item.color}99, ${item.color})`,
                              boxShadow: `0 0 10px ${item.color}55`,
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Period
                    <select name="period" value={goalForm.period} onChange={handleGoalFormChange}>
                      {goalPeriods.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
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
                  <div className="goal" key={goal._id}>
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
                          onClick={() => handleRemoveGoal(goal._id)}
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

          {/* ══ MONEY STORY SECTION ══ */}
          <section className="content-grid">
            <article className="panel money-story-panel wide">
              <div className="ms-header">
                <div className="ai-panel-title-group">
                  <div className="ai-panel-icon story-icon"><span>✦</span></div>
                  <div>
                    <h3 className="ai-panel-title">Money Story</h3>
                    <p className="ai-panel-sub">Your financial journey · beautifully summarized</p>
                  </div>
                </div>
                <div className="story-period-tabs">
                  {[["monthly","📊 Monthly"],["weekly","⚡ Weekly"],["yearly","🎉 Yearly"]].map(([p,label]) => (
                    <button key={p} className={`story-period-tab ${storyPeriod===p?"active":""}`}
                      onClick={() => setStoryPeriod(p)}>{label}</button>
                  ))}
                </div>
              </div>

              <div className="ms-body">
                <div className="ms-stats">
                  {!storyData || storyData.income === 0 ? (
                    <div className="ms-empty">
                      <span>📊</span><p>Add transactions to generate your Money Story</p>
                    </div>
                  ) : (
                    <>
                      <div className="ms-metrics-grid">
                        <div className="ms-metric ms-income">
                          <p className="ms-mlabel">↑ Income</p>
                          <strong className="ms-mval">{formatCurrency.format(storyData.income)}</strong>
                        </div>
                        <div className="ms-metric ms-spent">
                          <p className="ms-mlabel">↓ Spent</p>
                          <strong className="ms-mval">{formatCurrency.format(storyData.spend)}</strong>
                        </div>
                        <div className="ms-metric ms-saved">
                          <p className="ms-mlabel">🏦 Saved</p>
                          <strong className="ms-mval">{formatCurrency.format(storyData.saved)}</strong>
                        </div>
                        {storyData.invested > 0 && (
                          <div className="ms-metric ms-invest">
                            <p className="ms-mlabel">📈 Invested</p>
                            <strong className="ms-mval">{formatCurrency.format(storyData.invested)}</strong>
                          </div>
                        )}
                      </div>

                      <div className="ms-section">
                        <div className="ms-section-header">
                          <span className="ms-section-icon">💰</span>
                          <strong>Savings Rate</strong>
                          <span className={`ms-rate-val ${storyData.savRate>=40?"good":storyData.savRate>=20?"ok":"low"}`}>
                            {storyData.savRate}%
                          </span>
                        </div>
                        <div className="ms-progress-track">
                          <div className="ms-progress-fill" style={{
                            width: `${Math.min(100, storyData.savRate)}%`,
                            background: storyData.savRate>=40
                              ? "linear-gradient(90deg,#34d399,#059669)"
                              : storyData.savRate>=20
                              ? "linear-gradient(90deg,#fbbf24,#d97706)"
                              : "linear-gradient(90deg,#f87171,#dc2626)"
                          }}/>
                        </div>
                        <div className="ms-progress-labels">
                          <span>0%</span><span>50%</span><span>100%</span>
                        </div>
                      </div>

                      {storyData.personality && (
                        <div className="ms-section ms-personality">
                          <p className="ms-section-label">🧬 Spending Style</p>
                          <strong className="ms-personality-label">{storyData.personality.label}</strong>
                          <p className="ms-personality-desc">{storyData.personality.desc}</p>
                        </div>
                      )}

                      {storyData.cats?.length > 0 && (
                        <div className="ms-section">
                          <p className="ms-section-label">📂 Top Categories</p>
                          <div className="ms-cats">
                            {storyData.cats.slice(0,5).map(([cat, amt]) => {
                              const pct = storyData.spend > 0 ? Math.round(amt/storyData.spend*100) : 0;
                              return (
                                <div className="ms-cat-row" key={cat}>
                                  <div className="ms-cat-label-row">
                                    <span className="ms-cat-name">{cat}</span>
                                    <span className="ms-cat-amt">{formatCurrency.format(amt)}</span>
                                  </div>
                                  <div className="ms-cat-bar-track">
                                    <div className="ms-cat-bar-fill" style={{
                                      width:`${pct}%`,
                                      background: categoryPalette[cat] || categoryPalette.Other,
                                      boxShadow: `0 0 8px ${categoryPalette[cat] || categoryPalette.Other}66`,
                                    }}/>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="ms-facts-grid">
                        {storyData.biggestExpense && (
                          <div className="ms-fact">
                            <p className="ms-fact-label">💥 Biggest Expense</p>
                            <strong>{storyData.biggestExpense.title}</strong>
                            <p className="ms-fact-val">{formatCurrency.format(Math.abs(storyData.biggestExpense.amount))}</p>
                          </div>
                        )}
                        {storyData.biggestIncome && (
                          <div className="ms-fact">
                            <p className="ms-fact-label">💰 Biggest Income</p>
                            <strong>{storyData.biggestIncome.title}</strong>
                            <p className="ms-fact-val">{formatCurrency.format(storyData.biggestIncome.amount)}</p>
                          </div>
                        )}
                        {storyData.topDay && (
                          <div className="ms-fact">
                            <p className="ms-fact-label">📅 Most Expensive Day</p>
                            <strong>{storyData.topDay[0]}</strong>
                            <p className="ms-fact-val">{formatCurrency.format(storyData.topDay[1])}</p>
                          </div>
                        )}
                        {storyData.topDow && (
                          <div className="ms-fact">
                            <p className="ms-fact-label">📆 Most Active Day</p>
                            <strong>{storyData.topDow[0]}</strong>
                            <p className="ms-fact-val">{storyData.topDow[1]} transactions</p>
                          </div>
                        )}
                        {storyData.topCatByCount && (
                          <div className="ms-fact">
                            <p className="ms-fact-label">🧾 Most Used Category</p>
                            <strong>{storyData.topCatByCount[0]}</strong>
                            <p className="ms-fact-val">{storyData.topCatByCount[1]} transactions</p>
                          </div>
                        )}
                        {storyData.avgTx > 0 && (
                          <div className="ms-fact">
                            <p className="ms-fact-label">📈 Avg per Transaction</p>
                            <strong>{formatCurrency.format(storyData.avgTx)}</strong>
                            <p className="ms-fact-val">{storyData.expenseTxCount} expense transactions</p>
                          </div>
                        )}
                        {storyData?.period==="weekly" && storyData.spendDiffPct !== null && (
                          <div className="ms-fact ms-fact-wide">
                            <p className="ms-fact-label">⚡ Week Comparison</p>
                            <strong className={storyData.spendDiff>0?"ms-val-red":"ms-val-green"}>
                              {storyData.spendDiff>0?"↑":"↓"} {storyData.spendDiffPct}% vs last week
                            </strong>
                            <p className="ms-fact-val">Last week: {formatCurrency.format(storyData.lastSpend)}</p>
                          </div>
                        )}
                        {storyData?.period==="yearly" && storyData.mostExpensiveMonth && (
                          <div className="ms-fact">
                            <p className="ms-fact-label">🔥 Biggest Spend Month</p>
                            <strong>{storyData.mostExpensiveMonth}</strong>
                          </div>
                        )}
                        {storyData?.period==="yearly" && storyData.bestSaveMonth && (
                          <div className="ms-fact">
                            <p className="ms-fact-label">⭐ Best Saving Month</p>
                            <strong>{storyData.bestSaveMonth}</strong>
                          </div>
                        )}
                        <div className="ms-fact">
                          <p className="ms-fact-label">🔢 Total Transactions</p>
                          <strong>{storyData.txCount}</strong>
                          <p className="ms-fact-val">{storyData.expenseTxCount} expenses</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="ms-card-col">
                  <div className="story-card" ref={storyCardRef}>
                    <div className="story-card-bg" />
                    <div className="story-card-inner">
                      <div className="story-card-header">
                        <div className="story-logo-wrap">
                          <img src={logo} alt="Expnse" className="story-logo" />
                        </div>
                        <div>
                          <p className="story-brand">Expnse</p>
                          <p className="story-period-label">
                            {storyPeriod==="monthly"?"📊":storyPeriod==="weekly"?"⚡":"🎉"}{" "}
                            {storyData?.label || monthLabel} Money Story
                          </p>
                        </div>
                      </div>

                      <div className="story-metrics">
                        <div className="story-metric story-metric-income">
                          <span className="story-metric-icon">↑</span>
                          <div><p className="story-metric-label">Income</p><strong className="story-metric-val">{formatCurrency.format(storyData?.income||0)}</strong></div>
                        </div>
                        <div className="story-metric story-metric-spent">
                          <span className="story-metric-icon">↓</span>
                          <div><p className="story-metric-label">Spent</p><strong className="story-metric-val">{formatCurrency.format(storyData?.spend||0)}</strong></div>
                        </div>
                        <div className="story-metric story-metric-saved">
                          <span className="story-metric-icon">🏦</span>
                          <div><p className="story-metric-label">Saved</p><strong className="story-metric-val">{formatCurrency.format(storyData?.saved||0)}</strong></div>
                        </div>
                        <div className="story-metric story-metric-invest">
                          <span className="story-metric-icon">📈</span>
                          <div><p className="story-metric-label">Savings Rate</p><strong className="story-metric-val">{storyData?.savRate||0}%</strong></div>
                        </div>
                      </div>

                      <div className="story-stats-row">
                        {storyData?.topCat && (
                          <div className="story-stat-chip"><span>🏆</span><strong>{storyData.topCat[0]}</strong></div>
                        )}
                        {storyData?.txCount > 0 && (
                          <div className="story-stat-chip"><span>🧾</span><strong>{storyData.txCount} tx</strong></div>
                        )}
                        {storyData?.personality && (
                          <div className="story-stat-chip"><span>🧬</span><strong>{storyData.personality.label.split(" ")[0]} {storyData.personality.label.split(" ")[1]}</strong></div>
                        )}
                        {healthScore !== null && (
                          <div className="story-stat-chip"><span>❤️</span><strong>{healthScore}/100</strong></div>
                        )}
                      </div>

                      {storyData?.savRate > 0 && (
                        <div className="story-card-savebar">
                          <div className="story-card-savebar-fill" style={{
                            width:`${Math.min(100, storyData.savRate)}%`,
                            background: storyData.savRate>=40?"linear-gradient(90deg,#34d399,#059669)":storyData.savRate>=20?"linear-gradient(90deg,#fbbf24,#d97706)":"linear-gradient(90deg,#f87171,#dc2626)"
                          }}/>
                        </div>
                      )}

                      <p className="story-footer">Track your money with clarity · expnse.app</p>
                    </div>
                  </div>

                  <div className="ms-actions">
                    <button className="primary ms-download-btn" onClick={downloadStoryCard} disabled={storyDownloading}>
                      {storyDownloading ? "Generating…" : "⬇ Download Image"}
                    </button>
                    <div className="story-share-row">
                      <span className="story-share-label">Share</span>
                      <button className="story-share-btn twitter"  onClick={() => shareStory("twitter")}>𝕏</button>
                      <button className="story-share-btn whatsapp" onClick={() => shareStory("whatsapp")}>💬</button>
                      <button className="story-share-btn linkedin" onClick={() => shareStory("linkedin")}>in</button>
                    </div>
                  </div>
                </div>
              </div>

            </article>
          </section>
        </>
      )}
    </div>
  );
}

export default App;
