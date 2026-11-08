import { describe, expect, it } from "vitest";
import { calculateGoalProgress, calculateSavingsRate, calculateTotals, normalizeTransaction } from "./finance";

describe("financial calculations", () => {
  it("normalizes transaction signs", () => {
    expect(normalizeTransaction({ amount: 100, type: "expense" }).amount).toBe(-100);
    expect(normalizeTransaction({ amount: -100, type: "income" }).amount).toBe(100);
    expect(normalizeTransaction({ amount: 100, type: "investment" }).amount).toBe(-100);
  });
  it("calculates cash flow in integer minor units", () => {
    const totals = calculateTotals([{ amount: 1000.1, type: "income" }, { amount: -0.1, type: "expense" }, { amount: -200, type: "investment" }]);
    expect(totals.income).toBe(1000.1);
    expect(totals.spend).toBe(0.1);
    expect(totals.investment).toBe(200);
    expect(totals.balance).toBe(800);
  });
  it("handles savings rate with no income", () => {
    expect(calculateSavingsRate(0, 100)).toBe(0);
    expect(calculateSavingsRate(1000, 250)).toBe(75);
  });
  it("caps goal progress at 100 percent", () => {
    expect(calculateGoalProgress({ categorySpend: 60, contribution: 60, target: 100 })).toEqual({ total: 120, progress: 100 });
  });
});
