// Demo server - runs without MongoDB for sandbox preview
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// Mock data store (in-memory)
const users = new Map();
const matches = new Map();
let userIdCounter = 1;

// Mock auth endpoints
app.post('/api/auth/signup', (req, res) => {
  const { username, email, password } = req.body;
  const id = `user${userIdCounter++}`;
  const mockToken = Buffer.from(`${id}:${email}`).toString('base64');
  
  const user = {
    id,
    username,
    email,
    walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
    balance: 10, // Start with 10 coins for demo
    gamesPlayed: 0,
    gamesWon: 0
  };
  
  users.set(id, user);
  
  res.json({
    success: true,
    token: mockToken,
    user
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  // Find or create demo user
  let user = Array.from(users.values()).find(u => u.email === email);
  
  if (!user) {
    const id = `user${userIdCounter++}`;
    user = {
      id,
      username: email.split('@')[0],
      email,
      walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
      balance: 10,
      gamesPlayed: 0,
      gamesWon: 0
    };
    users.set(id, user);
  }
  
  const mockToken = Buffer.from(`${user.id}:${email}`).toString('base64');
  
  res.json({
    success: true,
    token: mockToken,
    user
  });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false });
  
  const decoded = Buffer.from(token, 'base64').toString();
  const userId = decoded.split(':')[0];
  const user = users.get(userId);
  
  if (!user) return res.status(401).json({ success: false });
  
  res.json({ success: true, data: user });
});

// Mock wallet endpoints
app.get('/api/wallet/deposit-address', (req, res) => {
  res.json({
    success: true,
    data: {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      message: 'Demo mode - deposits simulated'
    }
  });
});

app.get('/api/wallet/transactions', (req, res) => {
  res.json({
    success: true,
    data: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Demo server running (no database)', mode: 'demo' });
});

// Socket.io demo game
const matchmakingQueue = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join_queue', () => {
    matchmakingQueue.push({ socketId: socket.id });
    socket.emit('queue_joined', { message: 'Searching...' });
    
    if (matchmakingQueue.length >= 2) {
      const p1 = matchmakingQueue.shift();
      const p2 = matchmakingQueue.shift();
      
      const matchId = `match${Date.now()}`;
      const matchData = {
        matchId,
        players: [
          { user: 'player1', username: 'Player 1', health: 3, isAlive: true },
          { user: 'player2', username: 'Player 2', health: 3, isAlive: true }
        ],
        currentTurn: 0,
        gameState: { bulletCount: 6, liveRounds: 3, blankRounds: 3 }
      };
      
      matches.set(matchId, matchData);
      
      io.to(p1.socketId).emit('match_start', matchData);
      io.to(p2.socketId).emit('match_start', matchData);
    }
  });
  
  socket.on('player_action', ({ matchId, action }) => {
    const match = matches.get(matchId);
    if (!match) return;
    
    const isLive = Math.random() > 0.5;
    match.gameState.bulletCount--;
    
    if (action === 'shoot_opponent' && isLive) {
      const oppIndex = match.currentTurn === 0 ? 1 : 0;
      match.players[oppIndex].health--;
      
      if (match.players[oppIndex].health <= 0) {
        io.emit('action_result', {
          ...match,
          result: isLive ? 'live' : 'blank',
          gameOver: true,
          winner: match.players[match.currentTurn].user,
          winnerReward: 1.8
        });
        return;
      }
    }
    
    match.currentTurn = match.currentTurn === 0 ? 1 : 0;
    
    io.emit('action_result', {
      ...match,
      result: isLive ? 'live' : 'blank',
      gameOver: false
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const idx = matchmakingQueue.findIndex(p => p.socketId === socket.id);
    if (idx > -1) matchmakingQueue.splice(idx, 1);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Demo server running on port ${PORT}`);
  console.log(`🌐 Mode: DEMO (no database)`);
  console.log(`💡 All data is in-memory only`);
});
