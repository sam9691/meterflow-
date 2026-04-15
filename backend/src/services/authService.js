const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class AuthService {
  generateAccessToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
  }

  generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
  }

  setAuthCookies(res, accessToken, refreshToken) {
    const prod = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: prod,
      sameSite: prod ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: prod,
      sameSite: prod ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
    });
  }

  clearAuthCookies(res) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  }

  async register({ name, email, password, role = 'api_owner' }) {
    const exists = await userRepository.findByEmail(email);
    if (exists) throw new AppError('Email already registered', 409);

    const user = await userRepository.create({ name, email, password, role });

    const accessToken = this.generateAccessToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);
    await userRepository.updateRefreshTokens(user._id, [refreshToken]);

    logger.info(`New user: ${email}`);
    return { user, accessToken, refreshToken };
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email, true);
    if (!user) throw new AppError('Invalid email or password', 401);
    if (!user.isActive) throw new AppError('Account deactivated', 401);

    const valid = await user.comparePassword(password);
    if (!valid) throw new AppError('Invalid email or password', 401);

    const accessToken = this.generateAccessToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    // keep last 5 refresh tokens, rotate out old ones
    const tokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    await userRepository.updateRefreshTokens(user._id, tokens);
    await userRepository.updateById(user._id, { lastLoginAt: new Date() });

    logger.info(`Login: ${email}`);
    return { user, accessToken, refreshToken };
  }

  async refreshToken(refreshToken) {
    if (!refreshToken) throw new AppError('Refresh token required', 401);

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await userRepository.findByIdWithTokens(decoded.id);
    if (!user) throw new AppError('User not found', 401);

    if (!user.refreshTokens?.includes(refreshToken)) {
      // token reuse detected - nuke all tokens as a security measure
      await userRepository.updateRefreshTokens(user._id, []);
      throw new AppError('Token reuse detected. Please login again.', 401);
    }

    const newAccess = this.generateAccessToken(user._id);
    const newRefresh = this.generateRefreshToken(user._id);

    const updated = user.refreshTokens.filter((t) => t !== refreshToken).concat(newRefresh);
    await userRepository.updateRefreshTokens(user._id, updated);

    return { user, accessToken: newAccess, refreshToken: newRefresh };
  }

  async logout(userId, refreshToken) {
    const user = await userRepository.findByIdWithTokens(userId);
    if (user?.refreshTokens) {
      await userRepository.updateRefreshTokens(
        userId,
        user.refreshTokens.filter((t) => t !== refreshToken)
      );
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findByEmail(
      (await userRepository.findById(userId)).email,
      true
    );

    const valid = await user.comparePassword(currentPassword);
    if (!valid) throw new AppError('Current password is incorrect', 400);

    user.password = newPassword;
    await user.save();

    // invalidate all sessions
    await userRepository.updateRefreshTokens(userId, []);
    logger.info(`Password changed: ${userId}`);
  }

  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) return null; // don't reveal if email exists

    const token = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    await userRepository.updateById(user._id, {
      passwordResetToken: hashed,
      passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    return { user, resetToken: token };
  }
}

module.exports = new AuthService();
