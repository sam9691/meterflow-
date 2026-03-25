const authService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class AuthController {
  async register(req, res) {
    const { name, email, password, role } = req.body;
    const { user, accessToken, refreshToken } = await authService.register({
      name, email, password, role,
    });

    authService.setAuthCookies(res, accessToken, refreshToken);

    return ApiResponse.created(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        tenantId: user.tenantId,
      },
      accessToken,
    }, 'Registration successful');
  }

  async login(req, res) {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(email, password);

    authService.setAuthCookies(res, accessToken, refreshToken);

    return ApiResponse.success(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        tenantId: user.tenantId,
        lastLoginAt: user.lastLoginAt,
      },
      accessToken,
    }, 'Login successful');
  }

  async logout(req, res) {
    const refreshToken = req.cookies?.refreshToken;
    await authService.logout(req.user._id, refreshToken);
    authService.clearAuthCookies(res);
    return ApiResponse.success(res, null, 'Logged out successfully');
  }

  async refreshToken(req, res) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const { user, accessToken, refreshToken: newRefreshToken } =
      await authService.refreshToken(refreshToken);

    authService.setAuthCookies(res, accessToken, newRefreshToken);

    return ApiResponse.success(res, { accessToken }, 'Token refreshed');
  }

  async getMe(req, res) {
    return ApiResponse.success(res, { user: req.user }, 'User profile retrieved');
  }

  async updateProfile(req, res) {
    const { name, company, website, avatar } = req.body;
    const userRepository = require('../repositories/userRepository');
    const user = await userRepository.updateById(req.user._id, {
      name, company, website, avatar,
    });
    return ApiResponse.success(res, { user }, 'Profile updated');
  }

  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user._id, currentPassword, newPassword);
    authService.clearAuthCookies(res);
    return ApiResponse.success(res, null, 'Password changed. Please login again.');
  }

  async forgotPassword(req, res) {
    const { email } = req.body;
    await authService.forgotPassword(email);
    // Always return success to prevent email enumeration
    return ApiResponse.success(
      res,
      null,
      'If that email exists, a reset link has been sent'
    );
  }
}

module.exports = new AuthController();
