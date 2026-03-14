import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { getDepositAddress, requestWithdrawal, getTransactions, verifyDeposit } from '../services/api';
import '../styles/Wallet.css';

function Wallet() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('deposit');
  const [depositAddress, setDepositAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepositAddress();
    fetchTransactions();
  }, []);

  const fetchDepositAddress = async () => {
    try {
      const response = await getDepositAddress();
      setDepositAddress(response.data.data.address);
    } catch (error) {
      console.error('Error fetching deposit address:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await getTransactions({ limit: 20 });
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleVerifyDeposit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const response = await verifyDeposit(txHash);
      setMessage(`✅ ${response.data.data.message}. +${response.data.data.amount} coins`);
      setTxHash('');
      await refreshUser();
      await fetchTransactions();
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.message || 'Verification failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const amount = parseFloat(withdrawAmount);
      if (amount <= 0 || amount > user.balance) {
        setMessage('❌ Invalid amount');
        setLoading(false);
        return;
      }

      const response = await requestWithdrawal(amount, withdrawAddress);
      setMessage(`✅ ${response.data.data.message}`);
      setWithdrawAmount('');
      setWithdrawAddress('');
      await refreshUser();
      await fetchTransactions();
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.message || 'Withdrawal failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage('📋 Copied to clipboard!');
    setTimeout(() => setMessage(''), 2000);
  };

  const getTransactionTypeIcon = (type) => {
    switch (type) {
      case 'deposit': return '📥';
      case 'withdrawal': return '📤';
      case 'match_entry': return '🎮';
      case 'match_reward': return '🏆';
      default: return '💰';
    }
  };

  return (
    <div className="wallet-container">
      <nav className="wallet-navbar">
        <button onClick={() => navigate('/dashboard')} className="btn-back">← Back</button>
        <div className="wallet-title">💰 Wallet</div>
        <div className="balance-display">🪙 {user.balance.toFixed(2)}</div>
      </nav>

      <div className="wallet-content">
        {message && <div className="wallet-message">{message}</div>}

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'deposit' ? 'active' : ''}`}
            onClick={() => setActiveTab('deposit')}
          >
            📥 Deposit
          </button>
          <button 
            className={`tab ${activeTab === 'withdraw' ? 'active' : ''}`}
            onClick={() => setActiveTab('withdraw')}
          >
            📤 Withdraw
          </button>
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📜 History
          </button>
        </div>

        {/* Deposit Tab */}
        {activeTab === 'deposit' && (
          <div className="tab-content">
            <h3>Deposit USDT (BSC Testnet)</h3>
            <p className="info-text">Send test USDT to this address. 1 USDT = 1 coin.</p>
            
            <div className="address-box">
              <div className="address-label">Deposit Address:</div>
              <div className="address-value">{depositAddress}</div>
              <button onClick={() => copyToClipboard(depositAddress)} className="btn-copy">
                📋 Copy
              </button>
            </div>

            <div className="verify-section">
              <h4>Verify Deposit</h4>
              <p className="small-text">After sending, paste your transaction hash here:</p>
              <form onSubmit={handleVerifyDeposit}>
                <input
                  type="text"
                  placeholder="Transaction hash (0x...)"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  required
                />
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Verifying...' : 'Verify Deposit'}
                </button>
              </form>
            </div>

            <div className="instructions">
              <h4>How to deposit:</h4>
              <ol>
                <li>Get BSC Testnet BNB from a faucet (for gas)</li>
                <li>Get test USDT from BSC testnet faucet</li>
                <li>Send USDT to the address above</li>
                <li>Copy transaction hash and verify above</li>
                <li>Your balance will be credited instantly</li>
              </ol>
            </div>
          </div>
        )}

        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <div className="tab-content">
            <h3>Withdraw to USDT</h3>
            <p className="info-text">
              Max: {Math.min(user.balance, 10).toFixed(2)} USDT per withdrawal | 50 USDT per day
            </p>

            <form onSubmit={handleWithdraw}>
              <div className="form-group">
                <label>Amount (coins)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Math.min(user.balance, 10)}
                  placeholder="Amount to withdraw"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Your BSC Wallet Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Processing...' : 'Withdraw'}
              </button>
            </form>

            <div className="withdrawal-limits">
              <h4>Withdrawal Limits:</h4>
              <ul>
                <li>✅ Max 10 USDT per withdrawal</li>
                <li>✅ Max 50 USDT per day</li>
                <li>✅ Email confirmation required</li>
                <li>✅ 24h cooldown for new accounts</li>
              </ul>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="tab-content">
            <h3>Transaction History</h3>
            
            {transactions.length === 0 ? (
              <p className="no-transactions">No transactions yet</p>
            ) : (
              <div className="transactions-list">
                {transactions.map((tx) => (
                  <div key={tx._id} className={`transaction-item ${tx.type}`}>
                    <div className="tx-icon">{getTransactionTypeIcon(tx.type)}</div>
                    <div className="tx-details">
                      <div className="tx-type">{tx.type.replace('_', ' ')}</div>
                      <div className="tx-date">
                        {new Date(tx.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className={`tx-amount ${tx.type.includes('entry') ? 'negative' : 'positive'}`}>
                      {tx.type.includes('entry') ? '-' : '+'}
                      {tx.amount.toFixed(2)}
                    </div>
                    <div className={`tx-status ${tx.status}`}>
                      {tx.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Wallet;
