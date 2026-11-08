const test = require("node:test");
const assert = require("node:assert/strict");
const { toMinorUnits, fromMinorUnits, addMoney } = require("../lib/money");
const {
  accountDeltaForTransaction,
  accountDeltaForValues,
  transactionAmount,
} = require("../lib/finance");

test("money calculations use integer paise and round consistently", () => {
  assert.equal(toMinorUnits(0.1 + 0.2), 30);
  assert.equal(fromMinorUnits(12345), 123.45);
  assert.equal(addMoney(0.1, 0.2), 0.3);
  assert.throws(() => toMinorUnits(Number.NaN), TypeError);
});

test("income increases an account and expense reduces it", () => {
  assert.equal(transactionAmount(100, "income"), 100);
  assert.equal(transactionAmount(100, "expense"), -100);
  assert.equal(accountDeltaForValues(100, "income"), 10000);
  assert.equal(accountDeltaForValues(-100, "expense"), -10000);
});

test("investments reduce cash but remain a separate reporting type", () => {
  const investment = { amount: transactionAmount(250.5, "investment"), type: "investment" };
  assert.equal(investment.amount,  -250.5);
  assert.equal(accountDeltaForTransaction(investment), -25050);
});

test("negative and positive legacy transaction signs are normalized for account deltas", () => {
  assert.equal(accountDeltaForTransaction({ amount: 80, type: "income" }), 8000);
  assert.equal(accountDeltaForTransaction({ amount: -80, type: "expense" }), -8000);
});
