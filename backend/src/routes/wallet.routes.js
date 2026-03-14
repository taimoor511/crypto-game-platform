const express = require('express');
const {
  getDepositAddress,
  requestWithdrawal,
  getTransactions,
  verifyDeposit
} = require('../controllers/wallet.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

router.get('/deposit-address', getDepositAddress);
router.post('/withdraw', requestWithdrawal);
router.get('/transactions', getTransactions);
router.post('/verify-deposit', verifyDeposit);

module.exports = router;
