const { fromMinorUnits, toMinorUnits } = require("./money");

const transactionAmount = (amount, type) => {
  const absoluteMinorUnits = Math.abs(toMinorUnits(amount));
  return fromMinorUnits(type === "expense" ? -absoluteMinorUnits : absoluteMinorUnits);
};

const accountDeltaForTransaction = (transaction) => {
  const amountMinorUnits = toMinorUnits(transaction.amount);
  return transaction.type === "income" ? Math.abs(amountMinorUnits) : -Math.abs(amountMinorUnits);
};

const accountDeltaForValues = (amount, type) =>
  accountDeltaForTransaction({ amount, type });

module.exports = {
  accountDeltaForTransaction,
  accountDeltaForValues,
  transactionAmount,
};
