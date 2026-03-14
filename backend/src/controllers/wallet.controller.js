const User = require('../models/User');
const Transaction = require('../models/Transaction');
const blockchainService = require('../services/blockchain.service');
const mongoose = require('mongoose');

// @desc    Get deposit address
// @route   GET /api/wallet/deposit-address
// @access  Private
exports.getDepositAddress = async (req, res, next) => {
  try {
    const depositAddress = blockchainService.getDepositAddress();
    
    res.status(200).json({
      success: true,
      data: {
        address: depositAddress,
        message: 'Send USDT (BEP20) to this address. Your balance will be credited automatically.'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request withdrawal
// @route   POST /api/wallet/withdraw
// @access  Private
exports.requestWithdrawal = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, walletAddress } = req.body;
    const userId = req.user.id;

    // Validation
    if (!amount || !walletAddress) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Please provide amount and wallet address'
      });
    }

    if (amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Get user
    const user = await User.findById(userId).session(session);

    // Check balance
    if (user.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Check cooldown period (24h after signup)
    const cooldownHours = parseInt(process.env.WITHDRAWAL_COOLDOWN_HOURS) || 24;
    const accountAge = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
    
    if (accountAge < cooldownHours) {
      await session.abortTransaction();
      const remainingHours = Math.ceil(cooldownHours - accountAge);
      return res.status(403).json({
        success: false,
        message: `Withdrawals are locked for ${cooldownHours} hours after signup. ${remainingHours} hours remaining.`
      });
    }

    // Check per-withdrawal limit
    const maxWithdrawal = parseFloat(process.env.MAX_WITHDRAWAL_AMOUNT) || 10;
    if (amount > maxWithdrawal) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Maximum withdrawal amount is ${maxWithdrawal} USDT`
      });
    }

    // Check daily limit
    user.checkDailyWithdrawalReset();
    const maxDaily = parseFloat(process.env.MAX_DAILY_WITHDRAWAL) || 50;
    
    if (user.dailyWithdrawnAmount + amount > maxDaily) {
      await session.abortTransaction();
      const remaining = maxDaily - user.dailyWithdrawnAmount;
      return res.status(400).json({
        success: false,
        message: `Daily withdrawal limit exceeded. Remaining: ${remaining.toFixed(2)} USDT`
      });
    }

    // Deduct from user balance
    user.balance -= amount;
    user.totalWithdrawn += amount;
    user.dailyWithdrawnAmount += amount;
    user.lastWithdrawal = new Date();
    await user.save({ session });

    // Create transaction record
    const transaction = await Transaction.create([{
      user: userId,
      type: 'withdrawal',
      amount,
      status: 'pending',
      toAddress: walletAddress
    }], { session });

    // Process withdrawal on blockchain
    try {
      const result = await blockchainService.sendUSDT(walletAddress, amount);
      
      transaction[0].status = 'completed';
      transaction[0].txHash = result.txHash;
      transaction[0].completedAt = new Date();
      await transaction[0].save({ session });

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        data: {
          message: 'Withdrawal successful',
          amount,
          txHash: result.txHash,
          transaction: transaction[0]
        }
      });
    } catch (blockchainError) {
      // Blockchain transaction failed - refund user
      user.balance += amount;
      user.totalWithdrawn -= amount;
      user.dailyWithdrawnAmount -= amount;
      await user.save({ session });

      transaction[0].status = 'failed';
      transaction[0].notes = blockchainError.message;
      await transaction[0].save({ session });

      await session.commitTransaction();

      return res.status(500).json({
        success: false,
        message: 'Withdrawal failed. Your balance has been refunded.',
        error: blockchainError.message
      });
    }
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get transaction history
// @route   GET /api/wallet/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const { type, limit = 20, page = 1 } = req.query;
    const userId = req.user.id;

    const query = { user: userId };
    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manual deposit verification (for testing)
// @route   POST /api/wallet/verify-deposit
// @access  Private
exports.verifyDeposit = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { txHash } = req.body;
    const userId = req.user.id;

    if (!txHash) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Please provide transaction hash'
      });
    }

    // Check if already processed
    const existingTx = await Transaction.findOne({ txHash });
    if (existingTx) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Transaction already processed'
      });
    }

    // Verify on blockchain
    const verification = await blockchainService.verifyDeposit(txHash, 0); // 0 means any amount

    if (!verification.valid) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid deposit transaction',
        reason: verification.reason
      });
    }

    // Credit user balance
    const user = await User.findById(userId).session(session);
    user.balance += verification.amount;
    user.totalDeposited += verification.amount;
    await user.save({ session });

    // Create transaction record
    const transaction = await Transaction.create([{
      user: userId,
      type: 'deposit',
      amount: verification.amount,
      status: 'completed',
      txHash,
      fromAddress: verification.from,
      toAddress: blockchainService.getDepositAddress(),
      completedAt: new Date()
    }], { session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: {
        message: 'Deposit verified and credited',
        amount: verification.amount,
        newBalance: user.balance,
        transaction: transaction[0]
      }
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

module.exports = exports;
