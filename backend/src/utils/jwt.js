const jwt = require('jsonwebtoken');

exports.generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

exports.sendTokenResponse = (user, statusCode, res) => {
  const token = this.generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      walletAddress: user.walletAddress,
      balance: user.balance,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon
    }
  });
};
