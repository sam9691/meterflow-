const analyticsService = require('../analytics/analyticsService');
const ApiResponse = require('../utils/apiResponse');

class AnalyticsController {
  async getDashboardStats(req, res) {
    const stats = await analyticsService.getDashboardStats(req.user._id, req.tenantId);
    return ApiResponse.success(res, { stats });
  }

  async getRequestsOverTime(req, res) {
    const { apiId, days, groupBy } = req.query;
    const data = await analyticsService.getRequestsOverTime(req.user._id, {
      apiId,
      days: parseInt(days) || 7,
      groupBy: groupBy || 'hour',
    });
    return ApiResponse.success(res, { data });
  }

  async getTopEndpoints(req, res) {
    const { apiId, days, limit } = req.query;
    const data = await analyticsService.getTopEndpoints(req.user._id, {
      apiId,
      days: parseInt(days) || 30,
      limit: parseInt(limit) || 10,
    });
    return ApiResponse.success(res, { data });
  }

  async getStatusCodeDistribution(req, res) {
    const { apiId, days } = req.query;
    const data = await analyticsService.getStatusCodeDistribution(req.user._id, {
      apiId,
      days: parseInt(days) || 30,
    });
    return ApiResponse.success(res, { data });
  }

  async getLatencyStats(req, res) {
    const { apiId, days } = req.query;
    const data = await analyticsService.getLatencyStats(req.user._id, {
      apiId,
      days: parseInt(days) || 7,
    });
    return ApiResponse.success(res, { data });
  }

  async getRecentActivity(req, res) {
    const { apiId, apiKeyId, page, limit } = req.query;
    const data = await analyticsService.getRecentActivity(req.user._id, {
      apiId,
      apiKeyId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });
    return ApiResponse.success(res, data);
  }

  async getApiAnalytics(req, res) {
    const { days } = req.query;
    const data = await analyticsService.getApiAnalytics(
      req.params.apiId,
      req.user._id,
      parseInt(days) || 30
    );
    return ApiResponse.success(res, { analytics: data });
  }
}

module.exports = new AnalyticsController();
