const test = require("node:test");
const assert = require("node:assert/strict");
const { addMoney, fromMinorUnits, toMinorUnits } = require("../lib/money");
const {
  accountDeltaForValues,
  transactionAmount,
} = require("../lib/finance");

test("converts decimal currency values to integer minor units", () => {
  assert.equal(toMinorUnits(10.235), 1024);
  assert.equal(toMinorUnits("-4.50"), -450);
});

test("adds monetary values without binary floating point drift", () => {
  assert.equal(addMoney(0.1, 0.2), 0.3);
  assert.equal(addMoney(10.01, -0.01), 10);
});

test("converts safe integer minor units back to display values", () => {
  assert.equal(fromMinorUnits(12345), 123.45);
  assert.throws(() => fromMinorUnits(1.5), TypeError);
});

test("applies transaction sign and account delta rules", () => {
  assert.equal(transactionAmount(999.99, "income"), 999.99);
  assert.equal(transactionAmount(0.1, "expense"), -0.1);
  assert.equal(transactionAmount(0.01, "investment"), 0.01);
  assert.equal(accountDeltaForValues(999.99, "income"), 99999);
  assert.equal(accountDeltaForValues(-0.1, "expense"), -10);
  assert.equal(accountDeltaForValues(0.01, "investment"), -1);
});
