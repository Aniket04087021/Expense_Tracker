# Deploy Expnse (Render + Vercel)

## 1) Push this repo to GitHub
- Commit your latest changes.
- Push to a GitHub repository.

## 2) Deploy backend on Render
- Create a new **Web Service** from your GitHub repo.
- Set **Root Directory**: `server`
- Set **Build Command**: `npm install`
- Set **Start Command**: `npm start`
- Add environment variables:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `NODE_ENV=production`
  - `CLIENT_URL=https://<your-vercel-domain>`
  - Optional: `CLIENT_URLS` (comma-separated domains)
  - Optional email recovery/verification: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
    `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`

For Brevo SMTP, use these values:
  - `SMTP_HOST=smtp-relay.brevo.com`
  - `SMTP_PORT=2525` (use `587` if 2525 is unavailable)
  - `SMTP_SECURE=false`
  - `SMTP_USER=<your Brevo login email>`
  - `SMTP_PASSWORD=<your Brevo SMTP key>`
  - `EMAIL_FROM=Expnse <a verified Brevo sender email>`

Do not include extra quotes around Render values, and rotate any SMTP key that
has been shared or committed.

After deploy, copy your backend URL:
- Example: `https://expnse-api.onrender.com`

## 3) Deploy frontend on Vercel
- Import the same GitHub repo into Vercel.
- Set **Root Directory**: `client`
- Framework preset: **Vite**
- Add environment variable:
  - `VITE_API_BASE_URL=https://expense-tracker-1-vb9x.onrender.com/api`

Deploy and copy your frontend URL:
- Example: `https://expnse.vercel.app`

## 4) Final CORS update on Render
- Go back to Render service environment variables.
- Set:
  - `CLIENT_URL=https://expense-tracker-lyart-alpha.vercel.app`
  - (Optional) `CLIENT_URLS=https://expense-tracker-lyart-alpha.vercel.app,https://www.<your-custom-domain>`
- Redeploy Render.

## 5) Verify
- Open frontend URL.
- Sign up / login.
- Add a transaction and refresh the page.
- Confirm data persists from MongoDB and authentication remains logged in.
- After a redeploy, the Render startup log should show `SMTP configuration` with
  the Brevo host, the selected port, and all configuration flags set to `true`
  except `secure` (which should be `false` for ports 2525 and 587). It never
  prints the SMTP password.
- If recovery still fails, inspect the next `Password recovery delivery failed`
  log entry. A timeout indicates an SMTP connection/network problem; an
  authentication error indicates the Brevo login or SMTP key is wrong.

## Notes
- Production auth uses secure cookies (`SameSite=None`, `Secure=true`) when `NODE_ENV=production`.
- Local development still works with Vite proxy (`/api -> http://localhost:5000`).
- Password recovery and verification never return or log tokens. Configure the
  SMTP variables before production signup; without them, recovery requests remain
  generic and no email is delivered.
