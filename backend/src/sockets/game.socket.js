const jwt = require('jsonwebtoken');
const User = require('../models/User');
const gameService = require('../services/game.service');

// Matchmaking queue
const matchmakingQueue = [];

module.exports = (io) => {
  // Socket.io middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);

    // Join matchmaking queue
    socket.on('join_queue', async (data) => {
      try {
        const { entryCost = 1 } = data;

        // Check if user has enough balance
        const user = await User.findById(socket.userId);
        if (user.balance < entryCost) {
          socket.emit('queue_error', { message: 'Insufficient balance' });
          return;
        }

        // Check if already in queue
        const inQueue = matchmakingQueue.find(p => p.userId === socket.userId);
        if (inQueue) {
          socket.emit('queue_error', { message: 'Already in queue' });
          return;
        }

        // Add to queue
        matchmakingQueue.push({
          userId: socket.userId,
          username: socket.username,
          socketId: socket.id,
          entryCost
        });

        socket.emit('queue_joined', {
          message: 'Searching for opponent...',
          queuePosition: matchmakingQueue.length
        });

        // Try to find a match
        if (matchmakingQueue.length >= 2) {
          const player1 = matchmakingQueue.shift();
          const player2 = matchmakingQueue.shift();

          try {
            // Create match
            const match = await gameService.createMatch(
              player1.userId,
              player2.userId,
              entryCost
            );

            // Notify both players
            const player1Socket = io.sockets.sockets.get(player1.socketId);
            const player2Socket = io.sockets.sockets.get(player2.socketId);

            if (player1Socket && player2Socket) {
              // Join both to a match room
              const roomId = match._id.toString();
              player1Socket.join(roomId);
              player2Socket.join(roomId);

              // Send match start event
              io.to(roomId).emit('match_start', {
                matchId: match._id,
                players: match.players,
                currentTurn: match.currentTurn,
                gameState: {
                  liveRounds: match.gameState.liveRounds,
                  blankRounds: match.gameState.blankRounds,
                  bulletCount: match.gameState.bulletCount
                  // Don't send chamber array (that's hidden info)
                }
              });

              console.log(`Match created: ${match._id}`);
            } else {
              console.error('One or both sockets disconnected during matchmaking');
            }
          } catch (error) {
            console.error('Error creating match:', error);
            // Refund both players by putting them back in queue
            matchmakingQueue.unshift(player1, player2);
          }
        }
      } catch (error) {
        console.error('Queue join error:', error);
        socket.emit('queue_error', { message: error.message });
      }
    });

    // Leave matchmaking queue
    socket.on('leave_queue', () => {
      const index = matchmakingQueue.findIndex(p => p.userId === socket.userId);
      if (index !== -1) {
        matchmakingQueue.splice(index, 1);
        socket.emit('queue_left', { message: 'Left queue' });
      }
    });

    // Player action (shoot self or opponent)
    socket.on('player_action', async (data) => {
      try {
        const { matchId, action } = data;

        if (!['shoot_self', 'shoot_opponent'].includes(action)) {
          socket.emit('action_error', { message: 'Invalid action' });
          return;
        }

        const result = await gameService.processMove(matchId, socket.userId, action);

        // Emit to all players in the match room
        const roomId = matchId;
        io.to(roomId).emit('action_result', {
          matchId,
          action,
          result: result.result,
          players: result.match.players,
          currentTurn: result.match.currentTurn,
          gameState: {
            bulletCount: result.match.gameState.bulletCount,
            liveRounds: result.match.gameState.liveRounds,
            blankRounds: result.match.gameState.blankRounds
          },
          gameOver: result.gameOver,
          winner: result.winner,
          winnerReward: result.match.winnerReward
        });

        if (result.gameOver) {
          console.log(`Match ${matchId} completed. Winner: ${result.winner}`);
        }
      } catch (error) {
        console.error('Action error:', error);
        socket.emit('action_error', { message: error.message });
      }
    });

    // Rejoin active match (in case of disconnect)
    socket.on('rejoin_match', async () => {
      try {
        const match = await gameService.getActiveMatch(socket.userId);
        
        if (match) {
          const roomId = match._id.toString();
          socket.join(roomId);
          
          socket.emit('match_rejoined', {
            matchId: match._id,
            players: match.players,
            currentTurn: match.currentTurn,
            gameState: {
              liveRounds: match.gameState.liveRounds,
              blankRounds: match.gameState.blankRounds,
              bulletCount: match.gameState.bulletCount
            },
            moves: match.moves
          });
        } else {
          socket.emit('no_active_match');
        }
      } catch (error) {
        console.error('Rejoin error:', error);
        socket.emit('rejoin_error', { message: error.message });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.username}`);
      
      // Remove from queue if present
      const index = matchmakingQueue.findIndex(p => p.userId === socket.userId);
      if (index !== -1) {
        matchmakingQueue.splice(index, 1);
      }
    });
  });
};
