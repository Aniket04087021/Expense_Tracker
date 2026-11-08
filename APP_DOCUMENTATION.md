# Expnse Application Documentation

Expnse is a personal finance tracker for recording income, expenses, investments, accounts, savings goals, and goal contributions. It provides a public product landing page, email/password authentication, a responsive dashboard, REST APIs, persistent MongoDB storage, toast feedback, and installable PWA behavior.

## 1. Product Overview

### Primary purpose

Expnse helps a user:

- Understand current financial balance.
- Record money coming in and going out.
- Separate expenses from investments.
- Associate transactions with a bank account, credit card, cash balance, digital wallet, or other account.
- Maintain account balances as transactions change.
- Transfer money between owned accounts without affecting income or spending totals.
- Set monthly category budgets and review actual spending against each limit.
- Schedule weekly or monthly recurring transactions with pause/resume controls.
- Review account-available balance separately from transaction-derived cash flow.
- Filter, sort, search, duplicate, edit, and annotate transactions.
- Create savings or spending goals.
- Allocate money toward goals.
- Review recent activity, trends, categories, and monthly burn.
- Export transaction data as a PDF report.
- Install the application on a mobile or desktop device when the browser supports PWA installation.

### Main user roles

The application currently has one role:

- **Authenticated user**: owns and can manage their own transactions, accounts, goals, contributions, and notifications.

There is no administrator interface or multi-user sharing workflow in the current application.

## 2. Technology and Repository Structure

### Frontend

- React 19
- Vite
- JavaScript/JSX
- `jspdf` 4.2.x and `jspdf-autotable` 5.0.x for PDF export
- CSS files for responsive and mobile-specific styling
- Browser `beforeinstallprompt` and service worker APIs for PWA installation

Important frontend files:

- [`client/src/App.jsx`](./client/src/App.jsx): main application component, authentication modal, dashboard, state, API calls, forms, navigation, calculations, and rendering.
- [`client/src/App.css`](./client/src/App.css): global, landing page, dashboard, account, transaction, form, toast, navigation, and responsive styles.
- [`client/src/mobile-fixes.css`](./client/src/mobile-fixes.css): mobile layout corrections and touch-screen behavior.
- [`client/src/main.jsx`](./client/src/main.jsx): React entry point and production service worker registration.
- [`client/index.html`](./client/index.html): document metadata, icons, manifest link, and application title.
- [`client/public/manifest.webmanifest`](./client/public/manifest.webmanifest): PWA name, icons, colors, scope, and standalone display settings.

### Backend

- Node.js
- Express
- MongoDB through Mongoose
- `bcryptjs` for password hashing
- `jsonwebtoken` for authentication tokens
- `cookie-parser` for HTTP-only cookies
- `cors` for allowed frontend origins
- `dotenv` for environment configuration

Important backend file:

- [`server/index.js`](./server/index.js): server configuration, schemas, authentication middleware, validation, API routes, account synchronization, and notifications.

Planning and automation APIs:

- `GET/POST /api/transfers`, `DELETE /api/transfers/:id`: owner-scoped account transfers.
- `GET/POST /api/budgets`, `DELETE /api/budgets/:id`: monthly category budgets with calculated actual, remaining, and percentage used values.
- `GET/POST /api/recurring-transactions`: recurring definitions.
- `PATCH/DELETE /api/recurring-transactions/:id`: pause/resume or remove a definition.
- `POST /api/recurring-transactions/process`: idempotently process due occurrences. A deployment scheduler may invoke this endpoint periodically.

### Day 5 dashboard and transaction experience

The authenticated dashboard includes:

- Account-available balance and transaction cash-flow summary.
- Upcoming recurring expense payments.
- Monthly income/expense chart, category breakdown, savings rate, investment
  total, goals, and budget progress.
- Transaction search plus account, category, type, date-range, amount-range, and
  sorting filters with pagination.
- Transaction notes and a duplicate action that opens a new editable entry.
- Credit-card credit limit, utilization, billing day, statement day, and payment
  due day metadata. Credit-card utilization is display metadata; card payments
  are not separately modeled and are not double-counted by the existing totals.

### Package commands

Frontend commands from [`client/package.json`](./client/package.json):

```powershell
Set-Location client
npm run dev
npm run build
npm run lint
npm run preview
```

Backend command from [`server/package.json`](./server/package.json):

```powershell
Set-Location server
npm start
npm test
```

Dependency health checks:

```powershell
Set-Location client
npm audit --omit=dev

Set-Location ..\server
npm audit --omit=dev
```

The current dependency trees report no known production vulnerabilities. PDF export
uses the maintained jsPDF 4.x and AutoTable 5.x lines; the existing export contract
and user-facing PDF flow remain unchanged.

## 3. Public Landing Page

Unauthenticated visitors see the public landing experience instead of the dashboard.

### Landing navigation

The public navigation includes:

- Expnse logo.
- Features link.
- Export link.
- Insights link.
- Download link.
- Login button.
- Install app button.
- Get started free button.
- Responsive mobile menu toggle.

Navigation links smoothly scroll to their corresponding page sections.

The public install action is gated. If the visitor is not authenticated, selecting **Install app**:

1. Shows an informational toast.
2. Explains that an account is required.
3. Opens the signup authentication modal.

The browser installation prompt is not started for an unauthenticated visitor.

### Hero section

The hero introduces Expnse as a personal finance studio and includes:

- Product positioning statement.
- Primary call to action.
- Secondary authentication action.
- Financial clarity messaging.
- Dashboard preview artwork/data visualization.
- Summary statistics and supporting product copy.

### Feature section

The landing page presents product capabilities such as:

- Smart cash flow.
- Goal snapshots.
- Daily spending/burn visibility.
- PDF export.
- Investment tracking.
- Secure-by-default account isolation.

### Export section

The export section explains that users can produce a print-ready financial report. The authenticated dashboard performs the actual export.

### Insights section

The insights section describes:

- Category-based spending analysis.
- Income and expense comparisons.
- Trend awareness.
- Goal and investment context.

### Money Story section

The landing page presents the Money Story concept: a readable summary of financial behavior over a selected time period.

### Download section

The download area presents:

- Web app availability.
- Mobile/PWA availability.
- Install action for authenticated users.

After the application is installed, install controls are removed from the interface.

### Footer

The footer contains:

- Product links.
- Company links.
- Account links.
- Sign-in and sign-up actions.
- Copyright text.
- Product tagline.

## 4. Authentication

### Supported flows

- Register with name, email, and password.
- Login with email and password.
- Logout.
- Session restoration on application startup.
- Authentication modal switching between Login and Sign up.

### Registration behavior

Registration requires:

- A non-empty name.
- A valid email address.
- Password length between 8 and 128 characters.

The server:

1. Normalizes the email to lowercase.
2. Rejects duplicate email addresses.
3. Hashes the password with bcrypt.
4. Creates the user.
5. Creates a welcome notification.
6. Issues a seven-day JWT.
7. Stores the token in an HTTP-only cookie.
8. Returns the user summary and token response.

### Login behavior

Login:

1. Normalizes the email.
2. Finds the matching user.
3. Compares the supplied password with the stored bcrypt hash.
4. Sets the authenticated cookie.
5. Returns the authenticated user summary.

Invalid credentials return an authentication error without revealing whether the email exists.

### Logout behavior

Logout:

- Calls the server logout endpoint.
- Clears the browser token storage.
- Clears the current user state.
- Returns the application to the public landing page.

### Password recovery and email verification

The backend provides password recovery with clear account-not-found feedback,
one-hour hashed reset tokens, single-use password reset, email verification, and resend verification
endpoints. SMTP delivery is configured through `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`; tokens are never
returned to clients or written to logs. Existing users remain usable because the
verification field defaults to verified for legacy records.

Authenticated users can update their profile name, change their password,
download a JSON personal-data export, and request account deletion. Password
changes increment the session version and invalidate existing JWT sessions.
Account deletion requires the current password and a MongoDB transactional
connection; it fails safely rather than partially deleting data when transactions
are unavailable.

### Session verification

On startup, the frontend calls `/api/auth/me`. A valid session loads the dashboard. An invalid or expired session clears the user and shows the public experience.

### Rate limiting

Registration and login share an in-memory IP-based rate limiter:

- Maximum of 12 attempts in a 15-minute window.
- Returns HTTP 429 after the limit.
- Sends a `Retry-After` header of 900 seconds.
- Cleans stale entries when the in-memory map grows.

### Authentication errors

Authentication errors appear in:

- The modal error area.
- Toast notifications.

Network and server failures are surfaced to the user rather than silently ignored.

## 5. Authenticated Dashboard

After authentication, the user sees the dashboard application.

### Dashboard header

The dashboard header includes:

- Expnse branding.
- Desktop welcome text.
- Mobile current-view title.
- Mobile drawer button.
- Notifications button and unread count.
- Profile button and profile/application menu.
- Install app button when the app is not installed.

The dashboard install control is only rendered for authenticated users. After installation, it is removed.

### Profile/application menu

The profile menu includes:

- User initials.
- User name and email.
- Account status chip.
- Add transaction shortcut.
- Manage accounts shortcut.
- Export report shortcut.
- Install app shortcut while the app is not installed.
- Logout action.

### Mobile drawer

The mobile drawer contains:

#### Main

- Home.
- Transactions.
- Statistics.
- Manage accounts.
- Notifications.

#### Planning

- Budget/analytics shortcut.
- Add transaction.
- Install app while the app is not installed.

The drawer uses SVG icons, active states, unread notification badges, focus states, and a backdrop overlay.

### Bottom navigation

On mobile, the dashboard includes a fixed bottom navigation with:

- Home.
- Transactions.
- Add.
- Analytics.
- Accounts.

The navigation includes:

- Equal-width destination slots.
- Animated active capsule.
- Smooth view switching.
- Safe-area support for devices with a home indicator.
- Press, hover, and focus states.
- Icon and label alignment.

Notifications are accessed from the header and drawer rather than the bottom navigation.

## 6. Financial Summary

The Home view displays summary cards for:

- Total balance.
- Total income.
- Total investment.
- Total spending.

The summary also shows supporting values such as:

- Income total.
- Invested total.
- Spending total.
- Average income per entry.
- Savings rate.
- Net balance.

The balance calculation is based on normalized transaction amounts:

- Income adds to balance.
- Expenses subtract from balance.
- Investments subtract from balance.

## 7. Transactions

### Transaction types

The application supports:

- **Expense**: money leaving the user’s finances.
- **Income**: money entering the user’s finances.
- **Investment**: money allocated toward investments and treated as an outgoing financial movement.

### Transaction fields

Each transaction contains:

- Title.
- Category.
- Amount.
- Type.
- Date.
- Optional linked account.
- Owning user.
- Creation and update timestamps.

### Adding a transaction

The Add transaction form supports:

1. Entering an amount in INR.
2. Selecting Expense, Income, or Investment.
3. Entering a title.
4. Selecting a category.
5. Selecting an account when accounts exist.
6. Selecting a date.
7. Submitting the transaction.

The form provides:

- Amount hierarchy.
- Type cards.
- Custom category/account pickers.
- Form validation.
- Loading/submission state.
- Success and error toast feedback.

### Editing a transaction

Transactions can be edited after creation. Editing updates:

- Title.
- Category.
- Amount.
- Type.
- Date.
- Linked account.

When a transaction changes account or type, the server:

1. Reverses the old account balance effect.
2. Saves the new transaction values.
3. Applies the new account balance effect.
4. Creates an update notification.

### Deleting a transaction

Deleting a transaction:

- Requires browser confirmation.
- Removes the transaction.
- Reverses the linked account balance effect.
- Creates a transaction-deleted notification.
- Refreshes the visible transaction state.

### Transaction list

The Transactions view provides:

- Activity-card layout.
- Category icon.
- Transaction title.
- Category and date.
- Signed amount styling.
- Search input.
- Edit action.
- Delete action.
- Pagination.

### Search and pagination

Search updates the visible transaction list and resets the current page. Pagination is used to keep long transaction histories manageable.

## 8. Categories and Icons

The frontend maps transaction categories to visual icons and color tones.

Supported category families include:

- Food.
- Groceries.
- Medicine.
- Health.
- Transport.
- Home.
- Rent.
- Utilities.
- Bills.
- Salary.
- Income.
- Investment.
- Education.
- Lifestyle.
- Travel.
- Bike.
- Car.
- Other.

The category icon resolver also recognizes related text such as grocery, supermarket, pharmacy, fuel, commute, vehicle, hotel, course, and personal categories.

## 9. Accounts

Accounts represent the source or destination of transaction money.

### Supported account types

- Bank account.
- Credit card.
- Cash.
- Digital wallet.
- Other.

### Account fields

Each account contains:

- Name.
- Type.
- Current balance.
- Optional credit limit.
- Owning user.
- Creation and update timestamps.

### Account management

The Accounts view supports:

- Adding an account.
- Editing an account.
- Removing an account.
- Updating starting/current balance.
- Setting a credit limit.
- Viewing account type icons.
- Viewing credit-card utilization/progress when applicable.

### Account balance synchronization

When a linked transaction is created:

- Expense subtracts from the account.
- Investment subtracts from the account.
- Income adds to the account.

When a linked transaction is edited:

- The old effect is reversed.
- The new effect is applied.

When a linked transaction is deleted:

- The original effect is reversed.

Removing an account does not remove its transactions. The server unlinks the account from those transactions.

## 10. Goals

Goals provide planned financial targets.

### Goal fields

Each goal contains:

- Name.
- Category.
- Period.
- Target amount.
- Owning user.
- Creation and update timestamps.

### Goal periods

- Monthly.
- Quarterly.
- Yearly.

### Goal categories

The UI provides:

- Home.
- Bike.
- Car.
- Travel.
- Education.
- Health.
- Bills.
- Food.
- Transport.
- Lifestyle.
- Other.

### Goal operations

Users can:

- Create a goal.
- Edit a goal.
- Delete a goal.
- View goal progress.
- View contribution totals.
- Allocate money to a selected goal.

Deleting a goal also deletes its goal contributions.

## 11. Goal Contributions

Goal contributions record money allocated toward a goal.

### Contribution fields

- Goal.
- Amount.
- Optional note.
- Owning user.
- Creation and update timestamps.

### Contribution flow

The goal contribution form supports:

1. Switching the Add transaction area into goal contribution mode.
2. Selecting a goal with the custom goal picker.
3. Viewing the goal target and current progress.
4. Entering an allocation amount.
5. Submitting the contribution.

The UI includes:

- Goal icon and description.
- Selected state and checkmark.
- Keyboard-friendly picker behavior.
- Empty-goal state.
- Contribution amount field.
- Goal progress percentage.
- Success/error toasts.

Contributions currently record goal allocation independently; they do not automatically create a standard transaction or adjust an account balance.

## 12. Analytics and Insights

The Analytics view includes financial trend and category information.

### Monthly Burn

The Monthly Burn panel compares daily income and expense for the selected month.

It includes:

- Month selector.
- Daily income series.
- Daily expense series.
- Income total.
- Expense total.
- Visual chart.

### Category breakdown

Spending categories are aggregated from expense transactions and sorted by amount.

### Financial health score

When income exists, the dashboard calculates a score using:

- Savings rate.
- Investment ratio.
- Spending control.

The resulting score is bounded between 0 and 100.

### Money Story

Money Story supports multiple reporting periods:

- Monthly.
- Weekly.
- Yearly.

Depending on the period, it calculates:

- Income.
- Spending.
- Saved amount.
- Invested amount.
- Savings rate.
- Transaction count.
- Expense count.
- Average expense.
- Top spending category.
- Largest expense.
- Largest income.
- Highest-spend day.
- Most frequent category.
- Most active weekday.
- Spending change versus the previous week where applicable.
- A descriptive spending personality where enough data exists.

## 13. Notifications and Toasts

### Persistent notifications

Notifications are stored per user and may have these kinds:

- Account.
- Transaction.
- Goal.
- System.

Users can:

- Open the Notifications view.
- View unread count.
- Mark one notification as read.
- Mark all notifications as read.
- Refresh notifications.

Notifications are created for:

- Welcome/account creation.
- Account added.
- Account updated.
- Account removed.
- Transaction added.
- Transaction updated.
- Transaction deleted.
- Goal created.
- Goal contribution added.

### Toast notifications

Toast messages provide immediate feedback for:

- Successful create/update/delete operations.
- Authentication events.
- Validation problems.
- Network/server failures.
- PWA installation guidance.

Toast variants include success, error, and informational states with:

- Status label.
- Icon/indicator.
- Message.
- Dismiss action.
- Progress animation.

## 14. PDF Export

Authenticated users can export transactions as a PDF.

The report includes:

- User/account context.
- Transaction table.
- Date.
- Title.
- Category.
- Type.
- Amount.

The export action is available from the dashboard/profile tools and is disabled when there are no transactions.

## 15. Money Story Image Export and Sharing

The Money Story card can be exported as a PNG image.

The frontend:

1. Captures the story card.
2. Renders it to a canvas.
3. Creates a downloadable PNG.

The story can also be shared through:

- X/Twitter.
- WhatsApp.
- LinkedIn.

Sharing uses generated URL parameters containing the selected story summary.

## 16. PWA Installation

### PWA metadata

The manifest defines:

- Name: Expnse – Personal Finance.
- Short name: Expnse.
- Standalone display.
- Portrait orientation.
- Theme/background colors.
- Standard and maskable icons.

### Installation lifecycle

The frontend listens for:

- `beforeinstallprompt` to capture a browser installation prompt.
- `appinstalled` to mark the application installed.
- Standalone/fullscreen display mode to detect installation after reload.
- iOS standalone mode detection.

### Installation restrictions

- Installation is only initiated for authenticated users.
- Public install clicks open signup instead of invoking installation.
- After successful installation, all install buttons are removed.
- Installed state is preserved through browser display-mode detection.

### Service worker

In production, [`client/src/main.jsx`](./client/src/main.jsx) registers `/sw.js` after page load. In development, existing service-worker registrations are unregistered to avoid stale development behavior.

## 17. Backend API

The API base URL is selected from:

1. `VITE_API_BASE_URL`, if configured.
2. `/api` during local development.
3. The configured production API URL in production builds.

All protected routes require authentication.

### Authentication endpoints

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/auth/me` | Return the current authenticated user | Required |
| POST | `/api/auth/register` | Create a user account and session | Public |
| POST | `/api/auth/login` | Authenticate a user and create a session | Public |
| POST | `/api/auth/logout` | Clear the authentication cookie | Public |

### Account endpoints

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/accounts` | List the current user’s accounts | Required |
| POST | `/api/accounts` | Create an account | Required |
| PUT | `/api/accounts/:id` | Update an owned account | Required |
| DELETE | `/api/accounts/:id` | Remove an owned account and unlink transactions | Required |

### Transaction endpoints

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/transactions` | List owned transactions, newest first | Required |
| POST | `/api/transactions` | Create a transaction and synchronize account balance | Required |
| PUT | `/api/transactions/:id` | Edit a transaction and rebalance accounts | Required |
| DELETE | `/api/transactions/:id` | Delete a transaction and reverse balance effect | Required |

### Goal endpoints

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/goals` | List owned goals | Required |
| POST | `/api/goals` | Create a goal | Required |
| PUT | `/api/goals/:id` | Update an owned goal | Required |
| DELETE | `/api/goals/:id` | Delete an owned goal and contributions | Required |

### Goal contribution endpoints

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/goals/contributions` | List owned contributions | Required |
| POST | `/api/goals/:goalId/contributions` | Add a contribution to an owned goal | Required |
| DELETE | `/api/goals/contributions/:id` | Delete an owned contribution | Required |

### Notification endpoints

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/notifications` | List recent notifications | Required |
| PATCH | `/api/notifications/:id/read` | Mark one owned notification as read | Required |
| PATCH | `/api/notifications/read-all` | Mark all owned notifications as read | Required |

## 18. Data Model

### User

| Field | Description |
|---|---|
| `name` | Display name, required, trimmed |
| `email` | Lowercase unique email |
| `passwordHash` | Bcrypt password hash |
| `provider` | Currently `local` |
| `createdAt` / `updatedAt` | Mongoose timestamps |

### Transaction

| Field | Description |
|---|---|
| `user` | Owning user |
| `account` | Optional linked account |
| `title` | Transaction title |
| `category` | Category label |
| `date` | Transaction date |
| `amount` | Signed amount in storage |
| `type` | `expense`, `income`, or `investment` |
| `createdAt` / `updatedAt` | Mongoose timestamps |

Expenses are stored as negative values. Income and investments are stored as positive values in the transaction document, while the balance effect treats investments as outgoing.

### Account

| Field | Description |
|---|---|
| `user` | Owning user |
| `name` | Account name |
| `type` | Bank, credit card, cash, wallet, or other |
| `balance` | Current stored balance |
| `creditLimit` | Optional non-negative credit limit |
| `createdAt` / `updatedAt` | Mongoose timestamps |

### Goal

| Field | Description |
|---|---|
| `user` | Owning user |
| `name` | Goal name |
| `category` | Goal category |
| `period` | Monthly, quarterly, or yearly |
| `amount` | Positive target amount |
| `createdAt` / `updatedAt` | Mongoose timestamps |

### GoalContribution

| Field | Description |
|---|---|
| `user` | Owning user |
| `goal` | Related goal |
| `amount` | Positive contribution amount |
| `note` | Optional note |
| `createdAt` / `updatedAt` | Mongoose timestamps |

### Notification

| Field | Description |
|---|---|
| `user` | Owning user |
| `title` | Short notification title |
| `message` | Notification detail |
| `kind` | Account, transaction, goal, or system |
| `read` | Read state |
| `createdAt` / `updatedAt` | Mongoose timestamps |

## 19. Validation Rules

### Server-side validation

- Names are required and trimmed.
- User names are limited to 80 characters.
- Emails must match the expected email format and are limited to 254 characters.
- Passwords must be 8–128 characters.
- Account names are limited to 80 characters.
- Account type must be one of the supported types.
- Account balances must be finite numbers.
- Credit limits must be finite and non-negative.
- Transaction titles are required and limited to 120 characters.
- Transaction categories are required and limited to 50 characters.
- Transaction amounts must be finite and positive in request payloads.
- Transaction type must be expense, income, or investment.
- Transaction dates must be valid dates.
- Goal names are limited to 80 characters.
- Goal categories are limited to 50 characters.
- Goal periods must be monthly, quarterly, or yearly.
- Goal and contribution amounts must be finite and positive.
- Contribution notes are trimmed and limited to 240 characters.

### Ownership validation

Protected resource queries include the authenticated user ID. This prevents users from reading or modifying another user’s accounts, transactions, goals, contributions, or notifications.

## 20. Security Behavior

- Passwords are never stored in plaintext.
- JWTs are signed with a server secret.
- The browser uses the HTTP-only session cookie and does not persist the JWT in `localStorage`.
- Production requires a JWT secret of at least 32 characters.
- Authentication cookies are HTTP-only.
- Production-like deployments use secure cookies and configurable SameSite behavior.
- CORS allows only configured client origins.
- The server disables the `X-Powered-By` header.
- Request JSON is limited to 32 KB.
- Authentication attempts are rate limited.
- User-owned records are scoped by authenticated user ID.
- API errors return user-safe messages.
- MongoDB connection and server configuration failures are logged.

## 21. Responsive and Accessibility Behavior

The UI adapts between desktop and mobile layouts.

Responsive behavior includes:

- Desktop landing navigation and mobile expandable navigation.
- Desktop dashboard header and mobile header controls.
- Mobile drawer navigation.
- Mobile fixed bottom navigation.
- Responsive account cards.
- Responsive transaction cards.
- Responsive add-transaction forms.
- Safe-area padding for notched devices.
- Reduced-motion support.
- Keyboard Escape handling for custom pickers.
- `aria-label`, `aria-current`, `aria-expanded`, `aria-pressed`, dialog roles, and live status regions where applicable.
- Focus-visible styling on controls.

## 22. Loading and Error States

The application provides:

- Initial authentication loading screen.
- Dashboard data loading overlay.
- Notification loading state.
- Notification retry state.
- Empty transaction state.
- Empty account state.
- Empty goal state.
- Empty contribution picker state.
- Form submission loading states.
- Install-in-progress state.
- Toast errors for failed operations.

Failed dashboard loads clear the in-memory dashboard collections and show an error toast asking the user to refresh or sign in again.

## 23. Environment Configuration

### Client

The client may use:

- `VITE_API_BASE_URL`: override the API base URL.

See [`client/.env.example`](./client/.env.example).

### Server

The server supports:

- `PORT`: server port, default 5000.
- `NODE_ENV`: production/development behavior.
- `MONGODB_URI`: MongoDB connection string.
- `CLIENT_URL`: primary allowed frontend origin.
- `CLIENT_URLS`: comma-separated allowed frontend origins.
- `JWT_SECRET`: JWT signing secret.
- `COOKIE_SAME_SITE`: cookie SameSite policy override.
- `COOKIE_SECURE`: cookie secure flag override.

See [`server/.env.example`](./server/.env.example).

## 24. Runtime Flow Summary

### New user

1. Visitor opens the public landing page.
2. Visitor selects Get started free.
3. User submits name, email, and password.
4. Server validates and creates the account.
5. Server creates the welcome notification.
6. Server issues the session.
7. Frontend loads accounts, transactions, goals, contributions, and notifications.
8. Dashboard becomes available.

### Existing user

1. Visitor selects Login.
2. Server validates credentials.
3. Server creates the session.
4. Frontend restores the user.
5. Dashboard data is loaded.

### Add transaction

1. User opens Add transaction.
2. User enters amount and transaction details.
3. Frontend submits the payload.
4. Server validates ownership of the selected account.
5. Server stores the transaction.
6. Server synchronizes account balance.
7. Server creates a notification.
8. Frontend updates the list and shows a toast.

### Edit transaction

1. User selects Edit.
2. Existing transaction values populate the form.
3. User changes one or more values.
4. Server reverses the old account effect.
5. Server saves the new data.
6. Server applies the new account effect.
7. Server creates an update notification.
8. Frontend updates the transaction and shows a toast.

### Install application

1. Authenticated user selects Install app.
2. Browser provides the deferred PWA prompt.
3. User accepts the browser install dialog.
4. Frontend marks the app installed.
5. All install controls disappear.
6. On later launches, standalone display detection keeps install controls hidden.

## 25. Current Product Boundaries

The current application does not include:

- Password reset.
- Email verification.
- Social login.
- Multiple user roles.
- Shared accounts or collaborative budgets.
- Bank API synchronization.
- Recurring transaction automation.
- Scheduled payments.
- Currency selection beyond INR.
- Server-side PDF generation.
- Automatic account balance recalculation from all historical transactions after arbitrary manual balance edits.
- Offline-first data synchronization.

## 27. Financial Sign Convention

Transactions use a consistent cash-flow convention:

- Income is positive.
- Expenses are negative.
- Investments are negative for cash-balance calculations because invested money leaves the available cash balance.

Investment totals are calculated with the absolute value of investment transactions so reporting remains positive while net balance remains financially accurate. Monetary helper tests use integer paise/cents internally to avoid binary floating-point drift at calculation boundaries.

## 28. Verification and Quality Checks

The current frontend validation commands are:

```powershell
Set-Location client
npm run build
npm run lint
```

The backend syntax check is:

```powershell
Set-Location server
node --check index.js
npm test
```

The build is expected to succeed while reporting the existing large JavaScript chunk warning. The lint command currently reports existing unused-variable warnings but no lint errors. Backend tests use Node’s built-in test runner.

## 29. Source of Truth

For behavior changes, inspect and update:

- [`client/src/App.jsx`](./client/src/App.jsx) for state, behavior, API calls, event handlers, and markup.
- [`client/src/App.css`](./client/src/App.css) for visual behavior and responsive rules.
- [`server/index.js`](./server/index.js) for schemas, authentication, validation, persistence, and API behavior.
- [`client/src/main.jsx`](./client/src/main.jsx) for application bootstrapping and service worker behavior.
- [`client/public/manifest.webmanifest`](./client/public/manifest.webmanifest) for PWA metadata.
