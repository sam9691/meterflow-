const usageRepository = require('../repositories/usageRepository');
const apiRepository = require('../repositories/apiRepository');
const apiKeyRepository = require('../repositories/apiKeyRepository');
const UsageLog = require('../models/UsageLog');
const mongoose = require('mongoose');

class AnalyticsService {
  /**
   * Get dashboard overview stats for a user
   */
  async getDashboardStats(userId, tenantId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [
      totalRequestsThisMonth,
      totalRequestsLastMonth,
      totalRequestsLast24h,
      totalErrorsThisMonth,
      activeApiKeys,
      totalApis,
      requestsLast7d,
    ] = await Promise.all([
      UsageLog.countDocuments({ ownerId: userObjectId, timestamp: { $gte: startOfMonth } }),
      UsageLog.countDocuments({
        ownerId: userObjectId,
        timestamp: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      }),
      UsageLog.countDocuments({ ownerId: userObjectId, timestamp: { $gte: last24h } }),
      UsageLog.countDocuments({
        ownerId: userObjectId,
        timestamp: { $gte: startOfMonth },
        isError: true,
      }),
      apiKeyRepository.countByOwner(userId),
      apiRepository.countByOwner(userId),
      UsageLog.countDocuments({ ownerId: userObjectId, timestamp: { $gte: last7d } }),
    ]);

    const errorRate =
      totalRequestsThisMonth > 0
        ? ((totalErrorsThisMonth / totalRequestsThisMonth) * 100).toFixed(2)
        : 0;

    const monthOverMonthChange =
      totalRequestsLastMonth > 0
        ? (
            ((totalRequestsThisMonth - totalRequestsLastMonth) / totalRequestsLastMonth) *
            100
          ).toFixed(1)
        : 0;

    return {
      totalRequestsThisMonth,
      totalRequestsLastMonth,
      totalRequestsLast24h,
      requestsLast7d,
      totalErrorsThisMonth,
      errorRate: parseFloat(errorRate),
      activeApiKeys,
      totalApis,
      monthOverMonthChange: parseFloat(monthOverMonthChange),
    };
  }

  /**
   * Get requests over time (for charts)
   */
  async getRequestsOverTime(userId, options = {}) {
    const { apiId, days = 7, groupBy = 'hour' } = options;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filter = {
      ownerId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: startDate },
    };

    if (apiId) {
      filter.apiId = new mongoose.Types.ObjectId(apiId);
    }

    return usageRepository.getRequestsOverTime(filter, groupBy);
  }

  /**
   * Get top endpoints
   */
  async getTopEndpoints(userId, options = {}) {
    const { apiId, days = 30, limit = 10 } = options;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filter = {
      ownerId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: startDate },
    };

    if (apiId) {
      filter.apiId = new mongoose.Types.ObjectId(apiId);
    }

    return usageRepository.getTopEndpoints(filter, limit);
  }

  /**
   * Get status code distribution
   */
  async getStatusCodeDistribution(userId, options = {}) {
    const { apiId, days = 30 } = options;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filter = {
      ownerId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: startDate },
    };

    if (apiId) {
      filter.apiId = new mongoose.Types.ObjectId(apiId);
    }

    return usageRepository.getStatusCodeDistribution(filter);
  }

  /**
   * Get latency percentiles
   */
  async getLatencyStats(userId, options = {}) {
    const { apiId, days = 7 } = options;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filter = {
      ownerId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: startDate },
    };

    if (apiId) {
      filter.apiId = new mongoose.Types.ObjectId(apiId);
    }

    return usageRepository.getLatencyPercentiles(filter);
  }

  /**
   * Get recent activity logs
   */
  async getRecentActivity(userId, options = {}) {
    const filter = { ownerId: new mongoose.Types.ObjectId(userId) };
    if (options.apiId) filter.apiId = new mongoose.Types.ObjectId(options.apiId);
    if (options.apiKeyId) filter.apiKeyId = new mongoose.Types.ObjectId(options.apiKeyId);

    return usageRepository.getRecentLogs(filter, options);
  }

  /**
   * Get per-API analytics
   */
  async getApiAnalytics(apiId, userId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const apiObjectId = new mongoose.Types.ObjectId(apiId);

    const [stats, overTime, topEndpoints, statusDist] = await Promise.all([
      usageRepository.getApiStats(apiObjectId, startDate, new Date()),
      usageRepository.getRequestsOverTime(
        { apiId: apiObjectId, timestamp: { $gte: startDate } },
        days <= 2 ? 'hour' : 'day'
      ),
      usageRepository.getTopEndpoints({ apiId: apiObjectId, timestamp: { $gte: startDate } }),
      usageRepository.getStatusCodeDistribution({
        apiId: apiObjectId,
        timestamp: { $gte: startDate },
      }),
    ]);

    return {
      summary: stats[0] || {
        totalRequests: 0,
        totalErrors: 0,
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0,
      },
      overTime,
      topEndpoints,
      statusDistribution: statusDist,
    };
  }

  /**
   * Get admin-level platform analytics
   */
  async getPlatformStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRequests, totalErrors, requestsThisMonth] = await Promise.all([
      UsageLog.countDocuments({}),
      UsageLog.countDocuments({ isError: true }),
      UsageLog.countDocuments({ timestamp: { $gte: startOfMonth } }),
    ]);

    return {
      totalRequests,
      totalErrors,
      requestsThisMonth,
      errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : 0,
    };
  }
}

module.exports = new AnalyticsService();
