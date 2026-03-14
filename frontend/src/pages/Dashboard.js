import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import '../styles/Dashboard.css';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return <div className="loading">Loading...</div>;

  const winRate = user.gamesPlayed > 0 
    ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) 
    : 0;

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <h1>🎮 Crypto Game</h1>
        <button onClick={handleLogout} className="btn-secondary">Logout</button>
      </nav>

      <div className="dashboard-content">
        <div className="user-info">
          <h2>Welcome, {user.username}!</h2>
          <div className="balance-card">
            <div className="balance-amount">
              <span className="coin-icon">🪙</span>
              <span className="balance-value">{user.balance.toFixed(2)}</span>
              <span className="balance-label">Coins</span>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{user.gamesPlayed}</div>
            <div className="stat-label">Games Played</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{user.gamesWon}</div>
            <div className="stat-label">Wins</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{winRate}%</div>
            <div className="stat-label">Win Rate</div>
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={() => navigate('/game')} className="btn-primary btn-large">
            🎯 Play Now
          </button>
          <button onClick={() => navigate('/wallet')} className="btn-secondary btn-large">
            💰 Wallet
          </button>
        </div>

        <div className="info-section">
          <h3>How to Play</h3>
          <ul>
            <li>🎲 <strong>Entry Cost:</strong> 1 coin per match</li>
            <li>🏆 <strong>Winner Reward:</strong> 1.8 coins</li>
            <li>🔫 <strong>Gameplay:</strong> Turn-based Buckshot Roulette - survive to win!</li>
            <li>💵 <strong>Deposit:</strong> Send USDT (BSC Testnet) to get coins</li>
            <li>💸 <strong>Withdraw:</strong> Cash out your coins back to USDT anytime</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
