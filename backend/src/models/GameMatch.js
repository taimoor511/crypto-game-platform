const mongoose = require('mongoose');

const gameMatchSchema = new mongoose.Schema({
  players: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: String,
    health: {
      type: Number,
      default: 3
    },
    isAlive: {
      type: Boolean,
      default: true
    }
  }],
  entryCost: {
    type: Number,
    required: true,
    default: 1
  },
  totalPool: {
    type: Number,
    required: true
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  winnerReward: Number,
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'completed', 'cancelled'],
    default: 'waiting'
  },
  currentTurn: {
    type: Number,
    default: 0 // Index of player in players array
  },
  gameState: {
    bulletCount: {
      type: Number,
      default: 6
    },
    liveRounds: {
      type: Number,
      default: 0
    },
    blankRounds: {
      type: Number,
      default: 0
    },
    chamber: [Boolean], // true = live, false = blank
    roundNumber: {
      type: Number,
      default: 1
    }
  },
  moves: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: String, // 'shoot_self', 'shoot_opponent'
    result: String, // 'live', 'blank'
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  startedAt: Date,
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for matchmaking queries
gameMatchSchema.index({ status: 1, createdAt: -1 });
gameMatchSchema.index({ 'players.user': 1 });

module.exports = mongoose.model('GameMatch', gameMatchSchema);
