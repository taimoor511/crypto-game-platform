const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  totalDeposited: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  gamesWon: {
    type: Number,
    default: 0
  },
  emailConfirmed: {
    type: Boolean,
    default: false
  },
  lastWithdrawal: {
    type: Date,
    default: null
  },
  dailyWithdrawnAmount: {
    type: Number,
    default: 0
  },
  dailyWithdrawalResetDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Reset daily withdrawal limit if date has passed
userSchema.methods.checkDailyWithdrawalReset = function() {
  const now = new Date();
  const resetDate = new Date(this.dailyWithdrawalResetDate);
  
  if (now.getDate() !== resetDate.getDate() || 
      now.getMonth() !== resetDate.getMonth() || 
      now.getFullYear() !== resetDate.getFullYear()) {
    this.dailyWithdrawnAmount = 0;
    this.dailyWithdrawalResetDate = now;
  }
};

module.exports = mongoose.model('User', userSchema);
