# 🎮 Crypto Play-to-Earn Game Platform

A mobile-responsive multiplayer web game where players compete 1v1 in Buckshot Roulette-inspired matches using cryptocurrency.

## 🎯 Features

- **Play-to-Earn**: Deposit USDT (BSC Testnet) → Convert to in-game coins → Win matches → Withdraw earnings
- **Real-time Multiplayer**: 1v1 turn-based survival game powered by Socket.io
- **Automated Economy**: Entry cost: 1 coin per player | Winner reward: 1.8 coins | Platform fee: 0.2 coins
- **Secure Withdrawals**: Automated with limits (max 10 USDT/withdrawal, 50 USDT/day, email confirmation)
- **Mobile Responsive**: Play anywhere on any device

## 🛠️ Tech Stack

- **Frontend**: React (mobile-first responsive design)
- **Backend**: Node.js + Express
- **Real-time**: Socket.io
- **Database**: MongoDB (local deployment)
- **Blockchain**: Binance Smart Chain Testnet (test USDT BEP20)
- **Authentication**: JWT

## 📦 Project Structure

```
crypto-game-platform/
├── backend/           # Node.js API + Socket.io game server
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── server.js
│   └── package.json
├── frontend/          # React web app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.js
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js v16+
- MongoDB installed locally
- MetaMask or BSC Testnet wallet
- Test BNB + test USDT (from BSC testnet faucet)

### Installation

```bash
# Clone the repository
git clone https://github.com/MuhammadTaimoorAnwar511/crypto-game-platform.git
cd crypto-game-platform

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Configuration

1. **Backend** - Create `backend/.env`:
```
MONGO_URI=mongodb://localhost:27017/crypto-game
JWT_SECRET=your_jwt_secret_here
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
DEPOSIT_WALLET_PRIVATE_KEY=your_private_key_here
POOL_WALLET_PRIVATE_KEY=your_private_key_here
REWARD_WALLET_PRIVATE_KEY=your_private_key_here
USDT_CONTRACT_ADDRESS=0x... (BSC testnet USDT address)
```

2. **Frontend** - Create `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Running Locally

```bash
# Start MongoDB
mongod

# Start backend (terminal 1)
cd backend
npm run dev

# Start frontend (terminal 2)
cd frontend
npm start
```

Frontend: http://localhost:3000  
Backend API: http://localhost:5000

## 🎮 How to Play

1. **Sign Up** - Create an account
2. **Deposit** - Send test USDT to your deposit address (converts 1:1 to in-game coins)
3. **Quick Match** - Join the matchmaking queue
4. **Play** - Turn-based Buckshot Roulette survival game
5. **Win** - Earn 1.8x your entry cost
6. **Withdraw** - Cash out your coins back to USDT

## 🔐 Security

- JWT authentication
- Server-authoritative game logic (no client-side manipulation)
- MongoDB transactions for atomic operations
- Withdrawal limits and email confirmation
- 24-hour cooldown for new accounts
- Rate limiting on sensitive endpoints

## 🌐 Blockchain Integration

- **Network**: BSC Testnet
- **Token**: Test USDT (BEP20)
- **Wallets**:
  - Deposit Wallet: Receives user deposits
  - Pool Wallet: Collects match entry fees
  - Reward Wallet: Pays out winners
- **Event Listening**: Automated deposit tracking via Web3 event listeners

## 📝 MVP Scope

✅ Signup/Login  
✅ Deposit USDT → In-game coins  
✅ Quick match (1v1 PvP)  
✅ Buckshot Roulette game logic  
✅ Winner rewards (1.8x)  
✅ Transaction history  
✅ Withdraw coins → USDT  

### Future Features (Phase 2+)
- Friends system
- Private rooms + invites
- AI opponent
- Multiple entry tiers (1, 5, 10 coins)
- Leaderboard
- Tournaments

## 📄 License

MIT

## 👥 Contributors

Built by MuhammadTaimoorAnwar511 with Joni 🐙

---

**⚠️ Disclaimer**: This is a testnet MVP for educational purposes. Not financial advice. Play responsibly.
