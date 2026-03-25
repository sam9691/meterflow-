const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Generate access token (short-lived)
   */
  generateAccessToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
  }

  /**
   * Set auth cookies
   */
  setAuthCookies(res, accessToken, refreshToken) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh',
    });
  }

  /**
   * Clear auth cookies
   */
  clearAuthCookies(res) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  }

  /**
   * Register a new user
   */
  async register(userData) {
    const { name, email, password, role = 'api_owner' } = userData;

    // Check if email already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // Create user
    const user = await userRepository.create({ name, email, password, role });

    // Generate tokens
    const accessToken = this.generateAccessToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    // Store refresh token
    await userRepository.updateRefreshTokens(user._id, [refreshToken]);

    logger.info(`New user registered: ${email}`);

    return { user, accessToken, refreshToken };
  }

  /**
   * Login user
   */
  async login(email, password) {
    // Find user with password
    const user = await userRepository.findByEmail(email, true);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account has been deactivated', 401);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    // Rotate refresh tokens (keep last 5)
    const existingTokens = user.refreshTokens || [];
    const updatedTokens = [...existingTokens.slice(-4), refreshToken];
    await userRepository.updateRefreshTokens(user._id, updatedTokens);

    // Update last login
    await userRepository.updateById(user._id, { lastLoginAt: new Date() });

    logger.info(`User logged in: ${email}`);

    return { user, accessToken, refreshToken };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new AppError('Refresh token required', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await userRepository.findByIdWithTokens(decoded.id);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Check if refresh token is in the stored list
    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      // Token reuse detected - clear all tokens (security measure)
      await userRepository.updateRefreshTokens(user._id, []);
      throw new AppError('Refresh token reuse detected. Please login again', 401);
    }

    // Generate new tokens (rotation)
    const newAccessToken = this.generateAccessToken(user._id);
    const newRefreshToken = this.generateRefreshToken(user._id);

    // Replace old refresh token with new one
    const updatedTokens = user.refreshTokens
      .filter((t) => t !== refreshToken)
      .concat(newRefreshToken);
    await userRepository.updateRefreshTokens(user._id, updatedTokens);

    return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout user
   */
  async logout(userId, refreshToken) {
    const user = await userRepository.findByIdWithTokens(userId);
    if (user && user.refreshTokens) {
      const updatedTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      await userRepository.updateRefreshTokens(userId, updatedTokens);
    }
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findByEmail(
      (await userRepository.findById(userId)).email,
      true
    );

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    // Invalidate all refresh tokens
    await userRepository.updateRefreshTokens(userId, []);

    logger.info(`Password changed for user: ${userId}`);
  }

  /**
   * Generate password reset token
   */
  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return null;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await userRepository.updateById(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    return { user, resetToken };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await userRepository.findByEmail(
      (
        await require('../models/User').findOne({
          passwordResetToken: hashedToken,
          passwordResetExpires: { $gt: Date.now() },
        })
      )?.email,
      true
    );

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await userRepository.updateRefreshTokens(user._id, []);
  }
}

module.exports = new AuthService();
