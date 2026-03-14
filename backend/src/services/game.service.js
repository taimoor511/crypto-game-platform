const GameMatch = require('../models/GameMatch');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

class GameService {
  // Initialize a new game round
  initializeRound() {
    const liveRounds = Math.floor(Math.random() * 3) + 2; // 2-4 live rounds
    const blankRounds = Math.floor(Math.random() * 3) + 2; // 2-4 blank rounds
    const totalRounds = liveRounds + blankRounds;

    // Create shuffled chamber
    const chamber = [];
    for (let i = 0; i < liveRounds; i++) chamber.push(true);
    for (let i = 0; i < blankRounds; i++) chamber.push(false);
    
    // Shuffle
    for (let i = chamber.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chamber[i], chamber[j]] = [chamber[j], chamber[i]];
    }

    return {
      bulletCount: totalRounds,
      liveRounds,
      blankRounds,
      chamber,
      roundNumber: 1
    };
  }

  // Create a new match
  async createMatch(player1Id, player2Id, entryCost = 1) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get both players
      const player1 = await User.findById(player1Id).session(session);
      const player2 = await User.findById(player2Id).session(session);

      // Check balances
      if (player1.balance < entryCost || player2.balance < entryCost) {
        await session.abortTransaction();
        throw new Error('Insufficient balance');
      }

      // Deduct entry cost from both players
      player1.balance -= entryCost;
      player2.balance -= entryCost;
      await player1.save({ session });
      await player2.save({ session });

      // Create entry transactions
      await Transaction.create([
        {
          user: player1Id,
          type: 'match_entry',
          amount: entryCost,
          status: 'completed'
        },
        {
          user: player2Id,
          type: 'match_entry',
          amount: entryCost,
          status: 'completed'
        }
      ], { session });

      // Create match
      const totalPool = entryCost * 2;
      const gameState = this.initializeRound();

      const match = await GameMatch.create([{
        players: [
          {
            user: player1Id,
            username: player1.username,
            health: 3,
            isAlive: true
          },
          {
            user: player2Id,
            username: player2.username,
            health: 3,
            isAlive: true
          }
        ],
        entryCost,
        totalPool,
        status: 'in_progress',
        currentTurn: Math.floor(Math.random() * 2), // Random starting player
        gameState,
        startedAt: new Date()
      }], { session });

      await session.commitTransaction();
      return match[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Process a player's move
  async processMove(matchId, playerId, action) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const match = await GameMatch.findById(matchId).session(session);

      if (!match || match.status !== 'in_progress') {
        throw new Error('Match not found or not in progress');
      }

      // Verify it's player's turn
      const currentPlayerIndex = match.currentTurn;
      const currentPlayer = match.players[currentPlayerIndex];
      
      if (currentPlayer.user.toString() !== playerId.toString()) {
        throw new Error('Not your turn');
      }

      // Get current bullet
      const chamber = match.gameState.chamber;
      if (chamber.length === 0) {
        // Round over, initialize new round
        match.gameState = this.initializeRound();
      }

      const isLive = chamber.shift();
      match.gameState.bulletCount--;

      let targetPlayerIndex;
      if (action === 'shoot_self') {
        targetPlayerIndex = currentPlayerIndex;
      } else if (action === 'shoot_opponent') {
        targetPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
      } else {
        throw new Error('Invalid action');
      }

      const targetPlayer = match.players[targetPlayerIndex];

      // Record move
      match.moves.push({
        player: playerId,
        action,
        result: isLive ? 'live' : 'blank',
        timestamp: new Date()
      });

      // Apply damage if live
      if (isLive) {
        targetPlayer.health--;
        if (targetPlayer.health <= 0) {
          targetPlayer.isAlive = false;
          
          // Game over
          const winnerId = targetPlayerIndex === currentPlayerIndex 
            ? match.players[currentPlayerIndex === 0 ? 1 : 0].user
            : currentPlayer.user;

          match.winner = winnerId;
          match.status = 'completed';
          match.completedAt = new Date();

          // Calculate reward (1.8x entry cost)
          const reward = match.entryCost * 1.8;
          match.winnerReward = reward;

          // Credit winner
          const winner = await User.findById(winnerId).session(session);
          winner.balance += reward;
          winner.gamesWon++;
          winner.gamesPlayed++;
          await winner.save({ session });

          // Update loser stats
          const loserId = winnerId.toString() === match.players[0].user.toString()
            ? match.players[1].user
            : match.players[0].user;
          const loser = await User.findById(loserId).session(session);
          loser.gamesPlayed++;
          await loser.save({ session });

          // Create reward transaction
          await Transaction.create([{
            user: winnerId,
            type: 'match_reward',
            amount: reward,
            status: 'completed',
            matchId: match._id,
            completedAt: new Date()
          }], { session });

          await match.save({ session });
          await session.commitTransaction();

          return {
            match,
            gameOver: true,
            winner: winnerId,
            result: isLive ? 'live' : 'blank'
          };
        }
      }

      // Switch turns if shot opponent or if shot self and it was live
      if (action === 'shoot_opponent' || (action === 'shoot_self' && isLive)) {
        match.currentTurn = match.currentTurn === 0 ? 1 : 0;
      }
      // If shot self with blank, same player goes again (currentTurn stays same)

      await match.save({ session });
      await session.commitTransaction();

      return {
        match,
        gameOver: false,
        result: isLive ? 'live' : 'blank'
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get match by ID
  async getMatch(matchId) {
    return await GameMatch.findById(matchId).populate('players.user', 'username');
  }

  // Get player's active match
  async getActiveMatch(playerId) {
    return await GameMatch.findOne({
      'players.user': playerId,
      status: 'in_progress'
    }).populate('players.user', 'username');
  }

  // Get match history for a player
  async getMatchHistory(playerId, limit = 10) {
    return await GameMatch.find({
      'players.user': playerId,
      status: 'completed'
    })
    .sort({ completedAt: -1 })
    .limit(limit)
    .populate('players.user', 'username')
    .populate('winner', 'username');
  }
}

module.exports = new GameService();
