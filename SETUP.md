# 🚀 Setup Guide - Crypto Game Platform

## Prerequisites

- Node.js v16+ installed
- MongoDB installed and running
- MetaMask or BSC wallet
- BSC Testnet setup (BNB + test USDT)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/taimoor511/crypto-game-platform.git
cd crypto-game-platform
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/crypto-game

# JWT
JWT_SECRET=your_super_secret_key_here_change_in_production

# BSC Testnet
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
USDT_CONTRACT_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# Generate 3 new wallets and add private keys here:
DEPOSIT_WALLET_PRIVATE_KEY=your_private_key_1
POOL_WALLET_PRIVATE_KEY=your_private_key_2
REWARD_WALLET_PRIVATE_KEY=your_private_key_3

# Optional: Email for withdrawal confirmations
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Withdrawal limits
MAX_WITHDRAWAL_AMOUNT=10
MAX_DAILY_WITHDRAWAL=50
WITHDRAWAL_COOLDOWN_HOURS=24

# CORS
CORS_ORIGIN=http://localhost:3000
```

**Generate Wallets:**

```bash
node -e "const ethers = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private Key:', wallet.privateKey);"
```

Run this 3 times to generate 3 wallets.

**Fund Reward Wallet:**
- Get testnet BNB: https://testnet.bnbchain.org/faucet-smart
- Get test USDT: Send some test BNB to swap for USDT on PancakeSwap testnet

Start backend:

```bash
npm run dev
```

Backend running on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `.env` file:

```bash
cp .env.example .env
```

Should contain:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

Start frontend:

```bash
npm start
```

Frontend running on `http://localhost:3000`

### 4. MongoDB

Make sure MongoDB is running:

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or run manually
mongod
```

---

## 🎮 How to Play

1. **Sign Up** at `http://localhost:3000/signup`
2. **Get Test USDT:**
   - Add BSC Testnet to MetaMask
   - Get test BNB from faucet
   - Get test USDT (contract: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`)
3. **Deposit:**
   - Go to Wallet → Deposit tab
   - Copy deposit address
   - Send test USDT from MetaMask
   - Verify transaction with txHash
4. **Play:**
   - Click "Play Now"
   - Join queue
   - Get matched with opponent
   - Play Buckshot Roulette!
5. **Withdraw:**
   - Go to Wallet → Withdraw tab
   - Enter amount and your BSC address
   - Confirm

---

## 🔐 Security Notes

- **Never commit `.env` files**
- **Use strong JWT_SECRET**
- **Fund reward wallet with enough test USDT for payouts**
- **For production:** Use real USDT, enable SSL, add rate limiting
- **24h withdrawal cooldown** for new accounts

---

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB is running: `mongo` or `mongosh`
- Check `.env` file exists with correct values
- Check port 5000 is not in use

### Frontend can't connect
- Check backend is running on port 5000
- Check `.env` in frontend has correct API_URL
- Check CORS_ORIGIN in backend `.env` matches frontend URL

### Deposits not working
- Check you have test BNB for gas
- Check USDT contract address is correct for BSC testnet
- Check deposit wallet has correct address
- Use "Verify Deposit" with transaction hash

### Withdrawals failing
- Check reward wallet has enough USDT
- Check reward wallet has BNB for gas
- Check withdrawal limits in backend `.env`
- Check 24h cooldown hasn't blocked new accounts

---

## 📦 Production Deployment

For production:

1. **Use real USDT on BSC Mainnet**
2. **Get SSL certificate** (Let's Encrypt)
3. **Set NODE_ENV=production**
4. **Use MongoDB Atlas** or hosted MongoDB
5. **Deploy backend** on VPS / Railway / Render
6. **Deploy frontend** on Vercel / Netlify
7. **Update CORS_ORIGIN** to production frontend URL
8. **Enable email notifications** for withdrawals
9. **Add monitoring** (Sentry, LogRocket)
10. **Test thoroughly** on testnet first!

---

## 🎯 What's Built

✅ User auth (signup/login with JWT)  
✅ Wallet system (deposit/withdraw USDT ↔ coins)  
✅ BSC blockchain integration  
✅ Real-time matchmaking (Socket.io)  
✅ Buckshot Roulette game logic  
✅ Winner rewards (1.8x entry cost)  
✅ Transaction history  
✅ Mobile responsive UI  
✅ Withdrawal security (limits, cooldowns)  

---

**Need help?** Check the README or open an issue on GitHub.

**Ready to play?** Start MongoDB, start backend, start frontend, and go! 🎮
