# 🚀 Railway Deployment Guide

## Quick Deploy (5 minutes)

### Step 1: Go to Railway
Visit: **https://railway.app/new**

### Step 2: Sign In
- Click "Login with GitHub"
- Authorize Railway to access your repositories

### Step 3: Deploy Backend
1. Click **"Deploy from GitHub repo"**
2. Select: **`taimoor511/crypto-game-platform`**
3. Railway will auto-detect Node.js
4. Click **"Deploy Now"**
5. Wait 2-3 minutes for build to complete

### Step 4: Configure Backend
1. Click on your deployed service
2. Go to **"Variables"** tab
3. Add these environment variables:
   ```
   PORT=5000
   NODE_ENV=production
   JWT_SECRET=your_secret_key_here_change_this
   ```

### Step 5: Generate Domain
1. Go to **"Settings"** tab
2. Under **"Networking"** → Click **"Generate Domain"**
3. You'll get a URL like: `https://crypto-game-production.up.railway.app`

### Step 6: Test Backend
Visit: `https://your-railway-url.up.railway.app/health`

You should see:
```json
{
  "success": true,
  "message": "Demo server running (no database)",
  "mode": "demo"
}
```

### Step 7: Deploy Frontend (Optional)
If you want the frontend on Railway too:

1. Create **New Service** in same project
2. Deploy from GitHub repo again (same repo)
3. In **Settings** → **Root Directory** → Set to: `frontend`
4. In **Settings** → **Build Command** → Set to: `npm install && npm run build`
5. In **Settings** → **Start Command** → Set to: `npx serve -s build -l $PORT`
6. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-backend-url.up.railway.app
   REACT_APP_SOCKET_URL=https://your-backend-url.up.railway.app
   ```
7. Generate Domain for frontend too

---

## ✅ What You'll Have

**Backend API:** `https://crypto-game-backend-production.up.railway.app`
- Health check: `/health`
- Auth endpoints: `/api/auth/signup`, `/api/auth/login`
- Wallet endpoints: `/api/wallet/*`

**Frontend (if deployed):** `https://crypto-game-frontend-production.up.railway.app`
- Full React app
- Login, signup, dashboard, game, wallet

---

## 🆓 Free Tier Limits

Railway free tier includes:
- $5 free credit per month
- Enough for testing/demo
- No credit card required initially

---

## 📝 Notes

- Demo mode = in-memory data (resets on restart)
- For production: add MongoDB plugin in Railway
- Update backend env to use Railway's MongoDB URL
- Fund reward wallet with real USDT for withdrawals

---

**Need help?** Check Railway docs: https://docs.railway.app
