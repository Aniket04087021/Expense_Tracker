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

After deploy, copy your backend URL:
- Example: `https://expnse-api.onrender.com`

## 3) Deploy frontend on Vercel
- Import the same GitHub repo into Vercel.
- Set **Root Directory**: `client`
- Framework preset: **Vite**
- Add environment variable:
  - `VITE_API_BASE_URL=https://expense-tracker-77f6.onrender.com/api`

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

## Notes
- Production auth uses secure cookies (`SameSite=None`, `Secure=true`) when `NODE_ENV=production`.
- Local development still works with Vite proxy (`/api -> http://localhost:5000`).
