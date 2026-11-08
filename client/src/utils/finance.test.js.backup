import { describe, expect, it } from "vitest";
import {
  calculateGoalProgress,
  calculateNetWorth,
  calculateSavingsRate,
  calculateTotals,
  normalizeTransactions,
} from "./finance";

describe("financial calculations", () => {
  it("normalizes legacy and typed transaction signs", () => {
    expect(normalizeTransactions([
      { amount: 10.1, type: "expense" },
      { amount: -5, type: "income" },
      { amount: 2, category: "Investment" },
    ]).map(({ type, amount }) => ({ type, amount }))).toEqual([
      { type: "expense", amount: -10.1 },
      { type: "income", amount: 5 },
      { type: "investment", amount: -2 },
    ]);
  });

  it("calculates precise cash-flow totals", () => {
    expect(calculateTotals([
      { amount: 999.99, type: "income" },
      { amount: -0.1, type: "expense" },
      { amount: -0.01, type: "investment" },
    ])).toEqual({
      balance: 999.88,
      netCashFlow: 999.88,
      income: 999.99,
      spend: 0.1,
      investment: 0.01,
    });
  });

  it("calculates savings rate, net worth, and capped goal progress", () => {
    expect(calculateSavingsRate(100, 25)).toBe(75);
    expect(calculateNetWorth([{ balance: 100.1 }, { balance: -0.1 }], 50)).toBe(150);
    expect(calculateGoalProgress({ categorySpend: 90, contribution: 20, target: 100 }))
      .toEqual({ total: 110, progress: 100 });
  });
});
