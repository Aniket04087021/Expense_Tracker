const CURRENCY_SCALE = 100;

const toMinorUnits = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new TypeError("Money value must be finite");
  }
  return Math.round(numericValue * CURRENCY_SCALE);
};

const fromMinorUnits = (value) => {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError("Money minor units must be a safe integer");
  }
  return value / CURRENCY_SCALE;
};

const addMoney = (left, right) =>
  fromMinorUnits(toMinorUnits(left) + toMinorUnits(right));

module.exports = { CURRENCY_SCALE, toMinorUnits, fromMinorUnits, addMoney };
