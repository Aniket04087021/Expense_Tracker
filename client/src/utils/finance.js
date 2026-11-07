const toMinorUnits = (value) => Math.round(Number(value || 0) * 100);
const fromMinorUnits = (value) => value / 100;

export const normalizeTransaction = (entry) => {
  const inferredType =
    entry.type ??
    (entry.category === "Investment" ? "investment" : Number(entry.amount) >= 0 ? "income" : "expense");
  const absoluteMinorUnits = Math.abs(toMinorUnits(entry.amount));
  return {
    ...entry,
    type: inferredType,
    amount: fromMinorUnits(inferredType === "income" ? absoluteMinorUnits : -absoluteMinorUnits),
  };
};

export const normalizeTransactions = (transactions) =>
  transactions.map(normalizeTransaction);

export const calculateTotals = (transactions) => {
  const totals = transactions.reduce(
    (result, transaction) => {
      const amountMinorUnits = toMinorUnits(transaction.amount);
      if (transaction.type === "income") result.income += amountMinorUnits;
      if (transaction.type === "investment") result.investment += Math.abs(amountMinorUnits);
      if (transaction.type === "expense") result.spend += Math.abs(amountMinorUnits);
      result.netCashFlow += transaction.type === "income"
        ? Math.abs(amountMinorUnits)
        : -Math.abs(amountMinorUnits);
      return result;
    },
    { balance: 0, netCashFlow: 0, spend: 0, income: 0, investment: 0 },
  );
  totals.balance = totals.netCashFlow;
  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, fromMinorUnits(value)]),
  );
};

export const calculateSavingsRate = (income, spend) => {
  const incomeMinorUnits = toMinorUnits(income);
  if (!incomeMinorUnits) return 0;
  return Math.round(((incomeMinorUnits - toMinorUnits(spend)) / incomeMinorUnits) * 100);
};

export const calculateNetWorth = (accounts, investmentValue = 0) =>
  fromMinorUnits(
    accounts.reduce((sum, account) => sum + toMinorUnits(account.balance), 0) +
      toMinorUnits(investmentValue),
  );

export const calculateAccountBalances = (accounts, transactions) => {
  const balances = new Map(
    accounts.map((account) => [String(account._id || account.id), toMinorUnits(account.balance)]),
  );
  transactions.forEach((transaction) => {
    const accountId = transaction.account?._id || transaction.account;
    if (!accountId || !balances.has(String(accountId))) return;
    const amount = toMinorUnits(transaction.amount);
    const delta = transaction.type === "income" ? Math.abs(amount) : -Math.abs(amount);
    balances.set(String(accountId), balances.get(String(accountId)) + delta);
  });
  return new Map([...balances].map(([id, value]) => [id, fromMinorUnits(value)]));
};

export const calculateGoalProgress = ({ categorySpend, contribution, target }) => {
  const total = toMinorUnits(categorySpend) + toMinorUnits(contribution);
  const targetMinorUnits = toMinorUnits(target);
  return {
    total: fromMinorUnits(total),
    progress: targetMinorUnits > 0 ? Math.min((total / targetMinorUnits) * 100, 100) : 0,
  };
};

export const compareMonthlyTotals = (current, previous) => ({
  current: calculateTotals(current),
  previous: calculateTotals(previous),
  spendDelta: calculateTotals(current).spend - calculateTotals(previous).spend,
  incomeDelta: calculateTotals(current).income - calculateTotals(previous).income,
});
