const UsageLog = require('../models/UsageLog');

class UsageRepository {
  async create(data) {
    return UsageLog.create(data);
  }

  async insertMany(logs) {
    return UsageLog.insertMany(logs, { ordered: false });
  }

  /**
   * Get usage stats for a specific API
   */
  async getApiStats(apiId, startDate, endDate) {
    return UsageLog.aggregate([
      {
        $match: {
          apiId: apiId,
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalErrors: { $sum: { $cond: ['$isError', 1, 0] } },
          avgLatency: { $avg: '$latency' },
          minLatency: { $min: '$latency' },
          maxLatency: { $max: '$latency' },
          totalRequestSize: { $sum: '$requestSize' },
          totalResponseSize: { $sum: '$responseSize' },
        },
      },
    ]);
  }

  /**
   * Get requests per hour for a time range
   */
  async getRequestsOverTime(filter, groupBy = 'hour') {
    const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m-%dT%H:00';

    return UsageLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$timestamp' } },
          requests: { $sum: 1 },
          errors: { $sum: { $cond: ['$isError', 1, 0] } },
          avgLatency: { $avg: '$latency' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  /**
   * Get top endpoints by request count
   */
  async getTopEndpoints(filter, limit = 10) {
    return UsageLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { endpoint: '$endpoint', method: '$method' },
          requests: { $sum: 1 },
          errors: { $sum: { $cond: ['$isError', 1, 0] } },
          avgLatency: { $avg: '$latency' },
        },
      },
      { $sort: { requests: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Get status code distribution
   */
  async getStatusCodeDistribution(filter) {
    return UsageLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$statusCode',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /**
   * Count requests for billing
   */
  async countForBilling(userId, billingMonth) {
    return UsageLog.countDocuments({ ownerId: userId, billingMonth });
  }

  /**
   * Get monthly usage breakdown per API
   */
  async getMonthlyBreakdown(userId, billingMonth) {
    return UsageLog.aggregate([
      { $match: { ownerId: userId, billingMonth } },
      {
        $group: {
          _id: '$apiId',
          requests: { $sum: 1 },
          errors: { $sum: { $cond: ['$isError', 1, 0] } },
          avgLatency: { $avg: '$latency' },
        },
      },
      {
        $lookup: {
          from: 'apis',
          localField: '_id',
          foreignField: '_id',
          as: 'api',
        },
      },
      { $unwind: { path: '$api', preserveNullAndEmpty: true } },
    ]);
  }

  /**
   * Get recent logs with pagination
   */
  async getRecentLogs(filter, options = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      UsageLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('apiId', 'name')
        .populate('apiKeyId', 'name maskedKey'),
      UsageLog.countDocuments(filter),
    ]);

    return { logs, total };
  }

  /**
   * Get latency percentiles
   */
  async getLatencyPercentiles(filter) {
    const logs = await UsageLog.find(filter, 'latency').sort({ latency: 1 });
    if (!logs.length) return { p50: 0, p95: 0, p99: 0 };

    const latencies = logs.map((l) => l.latency);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    return { p50, p95, p99 };
  }
}

module.exports = new UsageRepository();
