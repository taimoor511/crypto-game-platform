require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import socket handler
const gameSocket = require('./sockets/game.socket');

// Import services
const blockchainService = require('./services/blockchain.service');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date()
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize Socket.io game handlers
gameSocket(io);

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start listening for deposits
const startDepositListener = async () => {
  try {
    await blockchainService.listenForDeposits(async (deposit) => {
      console.log('📥 Deposit detected:', deposit);

      // Find user by wallet address or create transaction for manual assignment
      // For now, log it - in production you'd need to implement address mapping
      console.log(`Deposit of ${deposit.amount} USDT from ${deposit.from}`);
      console.log(`Transaction hash: ${deposit.txHash}`);

      // Note: Automatic deposit crediting would require users to register their
      // source wallet addresses. For MVP, use manual verification endpoint.
    });
  } catch (error) {
    console.error('❌ Error starting deposit listener:', error);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💰 Deposit wallet: ${blockchainService.getDepositAddress()}`);
  });

  // Start blockchain listeners
  await startDepositListener();
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
