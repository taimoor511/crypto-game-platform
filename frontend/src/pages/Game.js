import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../services/AuthContext';
import '../styles/Game.css';

function Game() {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState('idle'); // idle, searching, in_match, game_over
  const [match, setMatch] = useState(null);
  const [message, setMessage] = useState('');
  const [lastAction, setLastAction] = useState(null);

  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('queue_joined', (data) => {
      setGameState('searching');
      setMessage(data.message);
    });

    newSocket.on('queue_error', (data) => {
      setMessage(`Error: ${data.message}`);
      setGameState('idle');
    });

    newSocket.on('match_start', (data) => {
      setGameState('in_match');
      setMatch(data);
      setMessage('Match started! Good luck!');
      setLastAction(null);
    });

    newSocket.on('action_result', (data) => {
      setMatch(data);
      setLastAction({
        action: data.action,
        result: data.result
      });

      if (data.gameOver) {
        setGameState('game_over');
        const isWinner = data.winner === user.id;
        setMessage(isWinner 
          ? `🎉 You won! +${data.winnerReward.toFixed(2)} coins`
          : '💀 You lost. Better luck next time!');
        refreshUser(); // Update balance
      } else {
        setMessage(data.result === 'live' ? '💥 LIVE ROUND!' : '⚪ Blank...');
      }
    });

    newSocket.on('action_error', (data) => {
      setMessage(`Error: ${data.message}`);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setMessage('Connection error. Please refresh.');
    });

    // Check for active match on mount
    newSocket.emit('rejoin_match');

    newSocket.on('match_rejoined', (data) => {
      setGameState('in_match');
      setMatch(data);
      setMessage('Rejoined active match');
    });

    newSocket.on('no_active_match', () => {
      setGameState('idle');
    });

    return () => {
      newSocket.close();
    };
  }, [token, user.id]);

  const joinQueue = () => {
    if (user.balance < 1) {
      setMessage('Insufficient balance. Deposit USDT to get coins.');
      return;
    }
    socket.emit('join_queue', { entryCost: 1 });
  };

  const leaveQueue = () => {
    socket.emit('leave_queue');
    setGameState('idle');
    setMessage('Left queue');
  };

  const shootSelf = () => {
    if (!isMyTurn()) return;
    socket.emit('player_action', { matchId: match.matchId, action: 'shoot_self' });
  };

  const shootOpponent = () => {
    if (!isMyTurn()) return;
    socket.emit('player_action', { matchId: match.matchId, action: 'shoot_opponent' });
  };

  const isMyTurn = () => {
    if (!match || !match.players) return false;
    return match.players[match.currentTurn]?.user === user.id;
  };

  const getMyPlayer = () => {
    if (!match) return null;
    return match.players.find(p => p.user === user.id);
  };

  const getOpponent = () => {
    if (!match) return null;
    return match.players.find(p => p.user !== user.id);
  };

  const playAgain = () => {
    setGameState('idle');
    setMatch(null);
    setMessage('');
    setLastAction(null);
  };

  const myPlayer = getMyPlayer();
  const opponent = getOpponent();

  return (
    <div className="game-container">
      <nav className="game-navbar">
        <button onClick={() => navigate('/dashboard')} className="btn-back">← Back</button>
        <div className="game-title">🎮 Buckshot Roulette</div>
        <div className="balance-display">🪙 {user.balance.toFixed(2)}</div>
      </nav>

      <div className="game-content">
        {/* Idle State */}
        {gameState === 'idle' && (
          <div className="game-idle">
            <h2>Ready to Play?</h2>
            <p>Entry cost: 1 coin | Winner reward: 1.8 coins</p>
            <button onClick={joinQueue} className="btn-primary btn-large">
              🎯 Find Match
            </button>
            {message && <div className="message">{message}</div>}
          </div>
        )}

        {/* Searching State */}
        {gameState === 'searching' && (
          <div className="game-searching">
            <div className="searching-animation">🔍</div>
            <h2>Searching for opponent...</h2>
            <button onClick={leaveQueue} className="btn-secondary">Cancel</button>
          </div>
        )}

        {/* In Match State */}
        {(gameState === 'in_match' || gameState === 'game_over') && match && (
          <div className="game-match">
            <div className="match-info">
              <div className="game-state-info">
                <div className="bullets-remaining">
                  🔫 Bullets: {match.gameState?.bulletCount || 0}
                </div>
                <div className="round-info">
                  💥 Live: {match.gameState?.liveRounds} | ⚪ Blank: {match.gameState?.blankRounds}
                </div>
              </div>
            </div>

            <div className="players-display">
              {/* Opponent */}
              <div className="player-card opponent">
                <div className="player-name">{opponent?.username || 'Opponent'}</div>
                <div className="player-health">
                  {Array(3).fill(0).map((_, i) => (
                    <span key={i} className={i < (opponent?.health || 0) ? 'heart-full' : 'heart-empty'}>
                      {i < (opponent?.health || 0) ? '❤️' : '🖤'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Message */}
              <div className="action-message">
                {message && <div className="message-bubble">{message}</div>}
                {lastAction && (
                  <div className={`last-action ${lastAction.result}`}>
                    {lastAction.result === 'live' ? '💥' : '⚪'}
                  </div>
                )}
              </div>

              {/* Current Player */}
              <div className="player-card current">
                <div className="player-name">{myPlayer?.username || 'You'}</div>
                <div className="player-health">
                  {Array(3).fill(0).map((_, i) => (
                    <span key={i} className={i < (myPlayer?.health || 0) ? 'heart-full' : 'heart-empty'}>
                      {i < (myPlayer?.health || 0) ? '❤️' : '🖤'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Game Controls */}
            {gameState === 'in_match' && (
              <div className="game-controls">
                {isMyTurn() ? (
                  <>
                    <div className="turn-indicator">🎯 Your Turn!</div>
                    <div className="action-buttons">
                      <button onClick={shootOpponent} className="btn-action btn-shoot-opponent">
                        🔫 Shoot Opponent
                      </button>
                      <button onClick={shootSelf} className="btn-action btn-shoot-self">
                        🎲 Shoot Self
                      </button>
                    </div>
                    <div className="hint">
                      💡 Shoot yourself with a blank to go again!
                    </div>
                  </>
                ) : (
                  <div className="waiting-indicator">⏳ Opponent's turn...</div>
                )}
              </div>
            )}

            {/* Game Over */}
            {gameState === 'game_over' && (
              <div className="game-over">
                <div className="game-over-message">{message}</div>
                <button onClick={playAgain} className="btn-primary">
                  Play Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Game;
