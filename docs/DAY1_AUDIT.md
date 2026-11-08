# Day 1 Audit: Baseline and Financial Architecture

Audit date: 2026-11-05

## Scope inspected

- Frontend application state, API helper, calculations, forms, navigation, and
  export flows in [`client/src/App.jsx`](../client/src/App.jsx)
- Global and responsive styles in [`client/src/App.css`](../client/src/App.css)
  and [`client/src/mobile-fixes.css`](../client/src/mobile-fixes.css)
- React bootstrap and service-worker lifecycle in
  [`client/src/main.jsx`](../client/src/main.jsx)
- PWA metadata in [`client/public/manifest.webmanifest`](../client/public/manifest.webmanifest)
- Service worker caching in [`client/public/sw.js`](../client/public/sw.js)
- Express middleware, authentication, schemas, validation, and all API routes in
  [`server/index.js`](../server/index.js)
- Frontend and backend manifests/lockfiles, environment example, and deployment
  instructions

## Baseline results

| Check | Result |
|---|---|
| `client:npm run build` | Passed |
| `client:npm run lint` | Passed with 6 existing unused-variable warnings |
| `server:npm test` | Passed, 3 tests |
| `server:node --check index.js` | Passed |
| Client production dependency audit | Passed, 0 vulnerabilities |
| Server production dependency audit | Passed, 0 vulnerabilities |
| `git diff --check` | Passed |

Known non-failing warnings:

- Vite reports a JavaScript chunk larger than 500 kB after minification.
- ESLint reports unused `CategoryIcon`, `AccountIcon`, `DrawerIcon`, and
  `AuthModal` declarations in the current lint configuration/output, plus two
  imports reported from `main.jsx`.

## Architecture summary

### Frontend

The application is concentrated in one React component. It owns authentication
restoration, dashboard data loading, financial normalization/calculations,
account/transaction/goal mutations, notifications, PWA installation, exports,
navigation, and rendering. This keeps the current product behavior together but
creates a large change surface and makes pure financial logic difficult to test
in isolation.

The API helper uses `credentials: "include"` and relies on the HTTP-only cookie.
The client no longer persists JWTs in `localStorage`.

### Backend

The Express entry point owns configuration, CORS, security headers, cookie
authentication, an in-memory authentication rate limiter, Mongoose schemas,
validation, all routes, notifications, and account synchronization.

The schemas are:

- `User`
- `Transaction`
- `Account`
- `Goal`
- `GoalContribution`
- `Notification`

All authenticated queries include the current user owner condition. Account
balance changes use atomic `$inc`, but multi-document transaction mutations are
not wrapped in a MongoDB session.

### API route inventory

| Area | Routes |
|---|---|
| Authentication | `GET /api/auth/me`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` |
| Accounts | `GET/POST /api/accounts`, `PUT/DELETE /api/accounts/:id` |
| Transactions | `GET/POST /api/transactions`, `PUT/DELETE /api/transactions/:id` |
| Goals | `GET/POST /api/goals`, `PUT/DELETE /api/goals/:id` |
| Contributions | `GET /api/goals/contributions`, `POST /api/goals/:goalId/contributions`, `DELETE /api/goals/contributions/:id` |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` |

### PWA

The service worker caches the application shell and same-origin GET responses,
does not intercept API requests, removes old cache versions during activation,
and falls back to the cached root page when a network GET fails. The manifest
uses standalone portrait mode and SVG icons.

## Financial behavior map

The exact rules are documented in
[`docs/FINANCIAL_RULES.md`](./FINANCIAL_RULES.md). The highest-impact findings are:

1. Investments are persisted as positive transaction amounts but represented as
   negative dashboard cash flow and negative account deltas.
2. Dashboard balance is a transaction sum, not account balance or net worth.
3. Account edits overwrite balances without reconciling linked transactions.
4. Transfers are not modeled.
5. Refunds are not modeled.
6. Goal contributions affect goal progress only; they do not move cash.
7. Savings rate excludes investments and goal contributions.
8. Monthly analytics exclude investments and rely on browser/server date
   conversion without a stored user timezone.

## Prioritized risks

### P0: transaction/account divergence during mutation failure

Transaction update saves the transaction before applying account deltas. If a
later account update fails, the API can return an error after the transaction
document has already changed. Moving a transaction between accounts can also
reverse one account before applying the other. The delete path removes the
transaction before applying the account reversal and does not act on a failed
delta. This needs an explicit rollback strategy or a MongoDB transaction design
before high-concurrency use.

### P1: inconsistent investment representation

The server, account arithmetic, client normalization, totals, exports, and
analytics do not share one canonical investment sign rule. Existing behavior is
preserved for now, but new reporting code can easily double-invert or misstate
investments.

### P1: balance and net-worth ambiguity

Users can manually replace an account balance, while the dashboard separately
calculates a transaction-derived balance. There is no reconciliation status and
no net-worth model. The UI should not imply that the current total balance is
available cash or net worth without a product decision.

### P1: missing financial event types

Transfers and refunds cannot be represented accurately. Credit-card liabilities,
payments, interest, and fees are also outside the current model.

### P2: date boundary risk

Date-only inputs, MongoDB date storage, UTC serialization, and browser-local
period calculations can disagree near midnight or month boundaries. A timezone
policy and boundary tests are required before changing analytics.

### P2: request and UI error resilience

Several handlers use broad `catch` blocks with a generic toast. Dashboard loading
clears all loaded data when any one of four requests fails. This is user-friendly
but can hide which resource failed and can make a transient partial failure look
like an empty account.

The client also duplicates account, transaction, goal, notification, and PWA
mutation state in the root component. This is functional today but makes
validation and error behavior harder to keep consistent.

### P2: maintainability and performance

The main component and stylesheet are very large, and the production bundle
contains a chunk above the Vite warning threshold. This is not a correctness
failure, but it increases regression risk and initial-load cost.

## Testing strategy and current blockers

### Established now

- Backend pure business tests use Node's built-in `node:test` runner.
- The money helper has deterministic tests for minor-unit conversion and
  floating-point-safe addition.
- Frontend build and lint are repeatable baseline gates.
- Dependency audits are repeatable for both package trees.

### Planned layers

1. Extract pure financial calculations into a dependency-free module and test
   them with a lightweight frontend-compatible runner.
2. Add request-level Express tests for authentication, ownership, validation,
   and mutation failure paths.
3. Run API tests against an isolated MongoDB instance or an explicitly configured
   disposable test database; never use a developer or production database.
4. Add Playwright smoke flows for registration/login, transaction CRUD, accounts,
   goals, export, and PWA-visible install controls.

### Current blockers and decision

Vitest, Supertest, and Playwright are not currently installed. No isolated
MongoDB test service is configured in the repository. They were not added during
this baseline pass because doing so without first extracting pure logic and
choosing a disposable MongoDB strategy would create a partially configured test
system and could risk connecting tests to the local development database.
The existing Node test layer and the build/lint/audit gates remain the safe
baseline. Day 2 adds Vitest-based pure financial tests and idempotent mutation
coverage in the domain layer; request-level database coverage and Playwright
remain follow-up work because no disposable MongoDB service is configured.

## Day 1 conclusion

The repository is buildable and dependency-clean, and no user data was modified
or deleted. Financial behavior is now explicitly mapped, with transaction/
account atomicity, investment sign consistency, and missing transfer/refund
semantics prioritized before any further financial feature work.
