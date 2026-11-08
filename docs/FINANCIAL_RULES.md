# Expnse Financial Rules

This document records the financial behavior currently implemented by Expnse. It
is a source-of-truth baseline for future changes. It intentionally describes
existing semantics, including gaps and inconsistencies, rather than silently
changing them.

## 1. Amount representation

- MongoDB stores monetary values as JavaScript/Mongoose `Number` values in the
  application currency, currently INR.
- The backend rounds transaction and account values through integer minor-unit
  helpers at write and account-adjustment boundaries.
- Goal and contribution amounts are currently stored after numeric validation,
  and are now rounded through the same minor-unit helper.
- The client formats values with `Intl.NumberFormat("en-IN", { currency: "INR" })`.
- The authoritative database schema has not been migrated to a decimal or
  integer-minor-unit column type.

## 2. Transaction types and signs

Supported transaction types are `income`, `expense`, and `investment`.

| Type | API input | Persisted transaction amount | Account balance delta | Dashboard presentation |
|---|---:|---:|---:|---:|
| Income | positive | positive | positive | positive |
| Expense | positive | negative | negative | negative |
| Investment | positive | positive | negative | negative cash flow |

The investment row is intentionally called out: the backend persists an
investment amount as positive, while account synchronization treats it as an
outflow and the client normalizes it to a negative cash-flow amount for totals.
This is backward-compatible with current records but is a high-priority
consistency risk for any future server-side reporting.

Legacy records without an explicit `type` are inferred in the client from the
category `Investment` or the amount sign. This inference is not performed by
the backend.

## 3. Account balance rules

An account has:

- owner
- name
- type: bank, credit card, cash, wallet, or other
- manually entered balance
- optional credit limit

When a transaction references an account:

- income adds the absolute amount to the account balance;
- expense subtracts the absolute amount;
- investment subtracts the absolute amount.

Creating, editing, and deleting transactions attempts to apply the corresponding
delta with an atomic MongoDB `$inc`. Transactions without an account do not
change any account balance.

The current mutation path uses ordered account updates plus compensation when a
later document operation fails. MongoDB multi-document transactions are not
enabled by the current deployment configuration, so crash-level atomicity is
not yet guaranteed; a replica-set deployment and session-based transactions are
the next hardening step.

Editing an account directly replaces its stored balance. The application does
not recalculate that balance from the transaction history. Therefore, a manual
account edit can intentionally or accidentally create a difference between the
stored balance and the sum of linked transaction deltas.

## 4. Credit cards

Credit cards use the same balance arithmetic as every other account type.
There is no separate debt/available-credit model:

- expenses reduce `balance`;
- income increases `balance`;
- investments reduce `balance`;
- `creditLimit` is metadata used for display and validation only.

The application does not currently calculate available credit, statement
balances, payment transactions, interest, fees, or utilization history.

## 5. Transfers

Transfers are stored separately from ordinary transactions. A transfer debits the
source account and credits the destination account by the same positive amount.
It is excluded from income, expense, investment, savings-rate, and spending
totals. Same-account transfers are rejected. The API accepts an idempotency key
and uses ordered compensation if a later balance write fails.

## 6. Goal allocations and contributions

Goals contain a target amount, category, and monthly/quarterly/yearly period.
Goal contributions are separate records linked to a goal.

Goal progress is calculated in the client as:

```text
category spending in the selected goal period + goal contributions
```

Progress is capped at 100% for display. A contribution does not create a
transaction, does not change an account balance, and does not reduce available
cash. Deleting a goal deletes its contributions; deleting a contribution only
changes goal progress.

## 7. Budgets and recurring transactions

Budgets are monthly category limits identified by `YYYY-MM` and category. Actual
spending is the sum of expense transactions in that calendar month. Remaining
budget may be negative and percentage used may exceed 100%; budgets do not change
account balances.

Recurring definitions support weekly and monthly schedules, optional accounts,
start/end dates, pause/resume, and a next occurrence. Processing is explicit
through the authenticated due-processing endpoint because no scheduler is
configured in the current deployment. Each occurrence uses a deterministic
idempotency key and the same transaction/account rules as a manual transaction.

## 8. Refunds

Refunds have no dedicated type or relationship to an original expense. A refund
must currently be entered using one of the existing transaction types, which
means the intended refund semantics are not enforced or distinguishable in
reports.

## 9. Dashboard balance and net worth

The dashboard `Total balance` is currently calculated from transaction amounts:

```text
sum(income amounts) - sum(expense amounts) - sum(investment amounts)
```

It does not sum account balances and is not a net-worth calculation.

There is no dedicated net-worth field or calculation. Investments are treated as
cash outflows in the dashboard and are not represented as assets, so the current
dashboard balance should not be described as net worth.

## 9. Savings rate and health score

The displayed savings rate is currently:

```text
(income - non-investment spending) / income
```

Investments are excluded from spending for this calculation. Goal contributions
are also excluded because they are not transactions. The value is displayed as a
percentage and falls back to `0%` when income is zero.

The health score separately combines a bounded savings-rate component,
investment-ratio component, and spending-control component. It is a heuristic
presentation metric, not a financial statement.

## 10. Monthly analytics

Monthly burn analytics group transaction dates by the `YYYY-MM` prefix and show:

- income entries as income;
- expense entries as expenses;
- investments excluded from the burn series.

The selected month uses the browser's local `Date` construction for period
boundaries, while API dates are serialized as JavaScript dates. UTC/local
conversion around midnight can therefore place a record in a neighboring day or
month for some users.

Category breakdowns include negative non-investment transactions only.
Investment and income entries are excluded.

## 11. Date and timezone rules

- The API accepts values parseable by JavaScript `Date`.
- The server stores transaction dates as MongoDB dates.
- The client date input uses a date-only `YYYY-MM-DD` value.
- The client displays dates in the browser's locale.
- No explicit user timezone is stored.
- Date-only boundaries and UTC serialization require dedicated tests before
  changing analytics or reporting behavior.

## 12. Required invariants for future changes

1. A transaction must belong only to its authenticated owner.
2. A linked account balance must change exactly once for each committed
   transaction mutation.
3. Investment treatment must be consistent across persistence, account deltas,
   dashboard totals, exports, and analytics.
4. Transfers must not be approximated as income or expense.
5. Goal contributions must remain separate from cash-flow transactions until an
   explicit allocation rule is designed.
6. Financial mutations must not leave the transaction and account documents
   describing different committed states.
7. Any change to these rules requires migration analysis and regression tests.

## 13. Duplicate-submission rule

New transaction creates accept an `Idempotency-Key`. The key is unique per
authenticated user and is retained by the client while a submission is being
retried. Reusing the same key returns the already-created transaction instead
of applying another account delta. Updates and deletes are addressed by the
transaction identifier and are protected by the submit/delete UI state.
