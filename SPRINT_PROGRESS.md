# Expnse 7-Day Engineering Sprint

## Day 1

### Objectives

- Establish a reproducible repository baseline.
- Compare the application documentation with the actual source.
- Verify frontend build/lint and backend syntax/test availability.
- Fix verified authentication-storage and financial-sign-convention risks.
- Add executable monetary arithmetic tests.

### Files inspected

- `APP_DOCUMENTATION.md`
- `client/package.json`
- `client/src/App.jsx`
- `client/src/App.css`
- `client/src/main.jsx`
- `client/public/manifest.webmanifest`
- `server/package.json`
- `server/index.js`
- `client/index.html`
- `client/src/mobile-fixes.css`
- Repository structure and environment example files.

### Files modified

- `client/src/App.jsx`
- `server/package.json`
- `server/lib/money.js`
- `server/test/money.test.js`
- `APP_DOCUMENTATION.md`
- `SPRINT_PROGRESS.md`
- `docs/FINANCIAL_RULES.md`
- `docs/DAY1_AUDIT.md`

### Bugs discovered

- The frontend persisted the JWT in `localStorage` even though the server issued an HTTP-only cookie.
- Dashboard normalization treated investments as positive cash flow, while account balance synchronization treated investments as outgoing.
- The backend package had no test script.
- The production build reports an existing large JavaScript chunk warning.
- ESLint reports existing unused-variable warnings.
- Transaction updates and deletes can leave transaction/account state divergent if a later account delta fails.
- Account balance edits do not reconcile against linked transaction history.
- Transfers and refunds have no dedicated data model.
- Dashboard balance is transaction-derived and is not net worth.
- Date-only inputs have no explicit user-timezone policy.

### Bugs fixed

- Removed frontend JWT persistence and bearer-header construction. Requests now use the HTTP-only cookie session.
- Normalized investments as negative cash flow for dashboard balance calculations.
- Added integer-minor-unit money helpers and tests for deterministic arithmetic.
- Added a backend `npm test` command.
- Documented existing financial semantics and prioritized risks without changing persisted user data.

### Features implemented

- None; Day 1 focused on correctness, security, and testability.

### Tests added

- Integer minor-unit conversion.
- Floating-point-safe monetary addition.
- Safe minor-unit conversion validation.

### Audit artifacts

- `docs/DAY1_AUDIT.md` records repository architecture, baseline results,
  financial findings, risks, and testing blockers.
- `docs/FINANCIAL_RULES.md` records the current financial definitions and
  invariants for future implementation and regression testing.

### Test results

- Frontend build: passed.
- Frontend lint: passed with six existing warnings and no errors.
- Backend syntax check: passed.
- Backend tests: 3 passed, 0 failed.
- Client and server production dependency audits: passed with zero vulnerabilities.
- Diff check: passed.

### Remaining issues

- Existing backend route logic still needs integration coverage.
- Account balance updates should be reviewed for atomicity and rollback behavior.
- Authentication, CORS, cookie, and ownership paths need request-level tests.
- Frontend has a large single bundle.
- Existing unused-variable warnings should be triaged without unrelated rewrites.

### Next-day dependencies

- Day 2 depends on the new backend test command and money helper.
- No destructive migration or external credential is required.

## Day 2

### Objectives

- Add backend validation and ownership tests.
- Review account balance mutation paths for race conditions and consistency.
- Verify authentication cookie and CORS behavior.

### Files inspected

- `server/index.js`
- `server/package.json`
- `server/package-lock.json`
- `client/package.json`
- `client/package-lock.json`
- `server/.env.example`
- `DEPLOYMENT.md`

### Files modified

- `server/package.json`
- `server/package-lock.json`
- `client/package.json`
- `client/package-lock.json`
- `APP_DOCUMENTATION.md`
- `SPRINT_PROGRESS.md`

### Bugs discovered

- Production dependency audits reported vulnerabilities in the backend dependency
  tree and in the client PDF export dependency chain.
- The client PDF chain was pinned to jsPDF 2.x through AutoTable 3.x, leaving a
  vulnerable DOMPurify dependency.
- The existing backend test suite still contains only pure money-helper tests;
  request-level MongoDB integration coverage is not yet available.

### Bugs fixed

- Applied non-breaking npm audit fixes to the backend dependency tree.
- Upgraded the client PDF export packages to jsPDF 4.2.x and AutoTable 5.0.x,
  removing the vulnerable DOMPurify chain without changing the export call sites.
- Confirmed both production dependency trees report zero known vulnerabilities.

### Features implemented

- None; Day 2 focused on dependency security and verification.

### Tests added

- No new request-level tests yet; the existing monetary tests were rerun.

### Test results

- Client production build: passed.
- Client lint: passed with six existing unused-variable warnings and no errors.
- Client production dependency audit: passed with zero vulnerabilities.
- Backend syntax check: passed.
- Backend tests: 3 passed, 0 failed.
- Backend production dependency audit: passed with zero vulnerabilities.
- Existing Vite large-chunk warning remains documented as a performance risk.

### Remaining issues

- Request-level authentication, ownership, validation, account, transaction, goal,
  contribution, and notification tests still need a database test strategy.
- Transaction/account mutation consistency still needs a rollback or transaction
  design review for narrow concurrent failure windows.
- Cookie, CORS, and production configuration need runtime coverage.

## Day 2

### Objectives

- Centralize financial calculations and test monetary edge cases.
- Preserve correct income, expense, and investment account semantics.
- Prevent duplicate transaction creation and reduce partial mutation risk.
- Normalize goal and contribution monetary writes.

### Files modified

- `client/src/utils/finance.js`
- `client/src/utils/finance.test.js`
- `client/src/App.jsx`
- `client/package.json`
- `client/package-lock.json`
- `server/lib/finance.js`
- `server/index.js`
- `server/test/money.test.js`
- `docs/FINANCIAL_RULES.md`
- `docs/DAY1_AUDIT.md`
- `SPRINT_PROGRESS.md`

### Bugs fixed

- Replaced duplicated client total and goal-progress arithmetic with reusable
  minor-unit financial helpers.
- Preserved investment records as positive persisted values while consistently
  treating them as cash outflows in account deltas and client cash-flow totals.
- Added ordered account-delta compensation for transaction create, update, and
  delete failure paths.
- Added per-user transaction idempotency keys to prevent duplicate creates during
  retries or repeated submissions.
- Rounded goal and contribution writes at the currency boundary.

### Tests added

- Vitest tests for transaction normalization, precise totals, savings rate, net
  worth, and capped goal progress.
- Backend tests for transaction signs and account delta rules.

### Test results

- Frontend financial tests: passed.
- Frontend production build: passed with the existing large-chunk warning.
- Frontend lint: passed with six existing unused-variable warnings.
- Backend tests: 4 passed, 0 failed.
- Backend syntax check: passed.
- Production dependency audits: passed with zero vulnerabilities.

### Remaining issues

- No request-level MongoDB integration suite exists yet.
- MongoDB session transactions are not enabled/configured; the current fallback
  is ordered compensation and cannot protect against process loss mid-mutation.
- Transfers, refunds, investment valuation, and credit-card payment semantics
  remain intentionally unsupported and require a product/data-model decision.

## Day 3

### Objectives

- Add frontend calculation and interaction tests.
- Verify transaction editing/deletion, account selection, goals, and notifications.

### Files modified

- `server/index.js`
- `server/lib/email.js`
- `server/package.json`
- `server/package-lock.json`
- `client/src/App.jsx`
- `client/src/App.css`
- `server/.env.example`
- `DEPLOYMENT.md`
- `APP_DOCUMENTATION.md`
- `SPRINT_PROGRESS.md`

### Security features implemented

- Forgot-password response that clearly reports when an email is not registered.
- Cryptographically random, hashed, expiring, single-use password reset tokens.
- Configurable SMTP delivery through Nodemailer without logging reset or
  verification tokens.
- Email verification and resend endpoints.
- Session-version invalidation after password reset or password change.
- Profile editing, password change, personal-data export, and password-confirmed
  account deletion UI/API.
- Legacy users remain usable because existing records default to verified.

### Test results

- Frontend tests/build and backend tests/syntax remain passing after the auth
  changes.
- Backend production dependency audit: passed with zero vulnerabilities after
  upgrading Nodemailer to 10.3.1.
- Frontend lint: passed with six existing warnings and no errors.
- Full runtime email verification requires SMTP environment variables.
- Full account deletion requires a MongoDB replica set or other transactional
  deployment; unsupported standalone databases fail closed with no deletion.

### Remaining issues

- Request-level authentication/ownership tests still need an isolated MongoDB
  strategy.
- CSRF protection currently relies on strict origin checks and SameSite cookie
  configuration; a dedicated CSRF token layer should be evaluated before exposing
  cross-site clients.
- Email delivery provider health checks and resend throttling should be added
  before high-volume production use.

## Day 4

### Objectives

- Implement transfers, budgets, recurring transactions, and relevant notifications.
- Preserve existing account and transaction semantics.

### Files inspected

- `server/index.js`
- `client/src/App.jsx`
- `docs/FINANCIAL_RULES.md`
- `APP_DOCUMENTATION.md`

### Files modified

- `server/index.js`
- `client/src/App.jsx`
- `docs/FINANCIAL_RULES.md`
- `APP_DOCUMENTATION.md`
- `SPRINT_PROGRESS.md`

### Bugs discovered

- Transfers, budgets, and recurring definitions were absent despite the dashboard
  already exposing planning-oriented navigation.
- There was no safe occurrence key or due-processing path for recurring entries.

### Bugs fixed

- Added owner-scoped transfer routes with same-account validation, account
  compensation, deletion reversal, and idempotency keys.
- Added monthly category budget persistence and server-calculated usage metrics.
- Added recurring transaction definitions, pause/resume, due processing, and
  deterministic occurrence idempotency.
- Added transfer and budget notifications using the existing notification system.

### Features implemented

- Transfer form/history with account synchronization.
- Monthly budget form and actual/remaining/percentage display.
- Weekly/monthly recurring transaction scheduling and pause/resume controls.

### Tests added

- No request-level database tests yet; pure financial tests remain green.

### Test results

- Frontend Vitest: passed (3 tests).
- Frontend production build: passed with the existing large-chunk warning.
- Frontend lint: passed with six pre-existing warnings.
- Backend Node tests: passed (4 tests).
- Backend syntax check: passed.
- `git diff --check`: passed.

### Remaining issues

- Request-level MongoDB integration tests and Playwright coverage remain pending.
- Recurring processing requires an external deployment scheduler invocation.
- MongoDB session transactions are still not enabled; compensation is the fallback.

### Next-day dependencies

- Day 5 can add scheduler/observability integration without changing the APIs.

## Day 5

### Objectives

- Improve dashboard insights, transaction discovery, credit-card tracking, and UX consistency.

### Files inspected

- `client/src/App.jsx`
- `client/src/App.css`
- `client/src/utils/finance.js`
- `server/index.js`
- `APP_DOCUMENTATION.md`

### Files modified

- `client/src/App.jsx`
- `client/src/App.css`
- `server/index.js`
- `APP_DOCUMENTATION.md`
- `SPRINT_PROGRESS.md`

### Bugs discovered

- Transaction management only supported free-text search and pagination.
- Credit-card accounts stored only balance and credit limit, without cycle or due
  metadata.
- Dashboard did not clearly distinguish available account balances from
  transaction-derived cash flow.

### Bugs fixed

- Added server validation and persistence for transaction notes and credit-card
  billing/statement/due-day metadata.
- Added transaction filters for account, category, type, date range, amount
  range, and sorting.
- Added transaction duplication and notes display.
- Added available-balance, cash-flow, and upcoming-payment dashboard panels.

### Features implemented

- Rich transaction search and filtering.
- Credit-card utilization and payment-date metadata.
- Dashboard available balance and scheduled-payment visibility.

### Tests added

- No new automated tests; existing financial tests cover the underlying totals.

### Test results

- Frontend Vitest: passed (3 tests).
- Frontend production build: passed with the existing large-chunk warning.
- Frontend lint: passed with six pre-existing warnings.
- Backend Node tests: passed (4 tests).
- Backend syntax check: passed.
- `git diff --check`: passed.

### Remaining issues

- Receipt uploads and payment-history modeling remain intentionally deferred.
- Request-level integration and Playwright coverage remain pending.
- Existing production bundle-size warning remains.

### Next-day dependencies

- Day 6 can focus on runtime observability, API resilience, PWA behavior, and
  security regression coverage.

## Day 6

### Objectives

- Run security, dependency, and regression review.
- Add missing documentation and deployment safeguards.

## Day 7

### Objectives

- Run the complete validation suite.
- Review financial invariants and release readiness.
- Record remaining risks and final recommendations.
