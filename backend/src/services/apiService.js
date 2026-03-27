const apiRepository = require('../repositories/apiRepository');
const apiKeyRepository = require('../repositories/apiKeyRepository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class ApiService {
  /**
   * Create a new API
   */
  async createApi(ownerId, tenantId, data) {
    const api = await apiRepository.create({
      ...data,
      ownerId,
      tenantId,
    });

    logger.info(`API created: ${api.name} by owner ${ownerId}`);
    return api;
  }

  /**
   * Get API by ID with ownership check
   */
  async getApiById(apiId, userId, role) {
    const api = await apiRepository.findById(apiId);
    if (!api) {
      throw new AppError('API not found', 404);
    }

    // Check ownership (admin can see all)
    if (role !== 'admin' && api.ownerId._id.toString() !== userId.toString()) {
      // Allow viewing public APIs
      if (api.visibility !== 'public') {
        throw new AppError('Access denied', 403);
      }
    }

    return api;
  }

  /**
   * Get all APIs for a user
   */
  async getUserApis(ownerId, options = {}) {
    return apiRepository.findByOwner(ownerId, options);
  }

  /**
   * Get public APIs (marketplace)
   */
  async getPublicApis(options = {}) {
    return apiRepository.findPublic(options);
  }

  /**
   * Update API
   */
  async updateApi(apiId, userId, role, updates) {
    const api = await apiRepository.findById(apiId);
    if (!api) {
      throw new AppError('API not found', 404);
    }

    if (role !== 'admin' && api.ownerId._id.toString() !== userId.toString()) {
      throw new AppError('Access denied', 403);
    }

    // Prevent updating sensitive fields
    const allowedUpdates = [
      'name', 'description', 'baseUrl', 'visibility',
      'category', 'status', 'version', 'tags', 'rateLimit',
      'documentation', 'endpoints',
    ];

    const filteredUpdates = {};
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    const updatedApi = await apiRepository.updateById(apiId, filteredUpdates);
    logger.info(`API updated: ${apiId}`);
    return updatedApi;
  }

  /**
   * Delete API and all associated keys
   */
  async deleteApi(apiId, userId, role) {
    const api = await apiRepository.findById(apiId);
    if (!api) {
      throw new AppError('API not found', 404);
    }

    if (role !== 'admin' && api.ownerId._id.toString() !== userId.toString()) {
      throw new AppError('Access denied', 403);
    }

    // Revoke all API keys
    const { keys } = await apiKeyRepository.findByApiId(apiId, { limit: 1000 });
    for (const key of keys) {
      await apiKeyRepository.revokeKey(key._id);
    }

    await apiRepository.deleteById(apiId);
    logger.info(`API deleted: ${apiId} by user ${userId}`);
  }

  /**
   * Get API statistics
   */
  async getApiStats(apiId, userId, role) {
    const api = await apiRepository.findById(apiId);
    if (!api) {
      throw new AppError('API not found', 404);
    }

    if (role !== 'admin' && api.ownerId._id.toString() !== userId.toString()) {
      throw new AppError('Access denied', 403);
    }

    return {
      totalRequests: api.totalRequests,
      totalErrors: api.totalErrors,
      avgLatency: api.avgLatency,
      errorRate: api.totalRequests > 0
        ? ((api.totalErrors / api.totalRequests) * 100).toFixed(2)
        : 0,
    };
  }
}

module.exports = new ApiService();
