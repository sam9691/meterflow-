const apiKeyRepository = require('../repositories/apiKeyRepository');
const apiRepository = require('../repositories/apiRepository');
const {
  generateApiKey,
  hashApiKey,
  maskApiKey,
  generateKeyLookupHash,
} = require('../utils/apiKeyGenerator');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class ApiKeyService {
  /**
   * Generate and store a new API key
   * Returns the raw key ONCE - never stored in plain text
   */
  async createApiKey(apiId, ownerId, tenantId, data) {
    // Verify API exists and belongs to owner
    const api = await apiRepository.findByIdAndTenant(apiId, tenantId);
    if (!api) {
      throw new AppError('API not found', 404);
    }

    const { name, environment = 'live', expiresAt, rateLimit, scopes } = data;

    // Generate the raw key
    const rawKey = generateApiKey(environment);

    // Create lookup hash (SHA-256, fast)
    const keyHash = generateKeyLookupHash(rawKey);

    // Create secure hash (bcrypt, slow - for verification)
    const hashedKey = await hashApiKey(rawKey);

    // Create masked version for display
    const maskedKey = maskApiKey(rawKey);

    // Extract prefix for identification
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey = await apiKeyRepository.create({
      apiId,
      ownerId,
      tenantId,
      name,
      keyHash,
      hashedKey,
      maskedKey,
      keyPrefix,
      environment,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      rateLimit: rateLimit || {},
      scopes: scopes || ['read', 'write'],
    });

    logger.info(`API key created for API ${apiId} by owner ${ownerId}`);

    // Return the raw key ONLY at creation time
    return {
      ...apiKey.toObject(),
      rawKey, // This is the only time the raw key is returned
    };
  }

  /**
   * Validate an API key and return associated data
   */
  async validateApiKey(rawKey) {
    if (!rawKey) {
      throw new AppError('API key required', 401);
    }

    // Fast lookup using SHA-256 hash
    const keyHash = generateKeyLookupHash(rawKey);
    const apiKey = await apiKeyRepository.findByKeyHash(keyHash);

    if (!apiKey) {
      throw new AppError('Invalid API key', 401);
    }

    // Check status
    if (apiKey.status !== 'active') {
      throw new AppError(`API key is ${apiKey.status}`, 401);
    }

    // Check expiry
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      await apiKeyRepository.updateById(apiKey._id, { status: 'expired' });
      throw new AppError('API key has expired', 401);
    }

    // Check if associated API is active
    if (!apiKey.apiId || apiKey.apiId.status !== 'active') {
      throw new AppError('Associated API is not active', 403);
    }

    return apiKey;
  }

  /**
   * Get all keys for an API
   */
  async getApiKeys(apiId, ownerId, tenantId, options = {}) {
    const api = await apiRepository.findByIdAndTenant(apiId, tenantId);
    if (!api) {
      throw new AppError('API not found', 404);
    }

    return apiKeyRepository.findByApiId(apiId, options);
  }

  /**
   * Get all keys for an owner
   */
  async getOwnerKeys(ownerId, options = {}) {
    return apiKeyRepository.findByOwner(ownerId, options);
  }

  /**
   * Revoke an API key
   */
  async revokeKey(keyId, ownerId, tenantId) {
    const key = await apiKeyRepository.findById(keyId);
    if (!key) {
      throw new AppError('API key not found', 404);
    }

    if (key.tenantId !== tenantId) {
      throw new AppError('Access denied', 403);
    }

    const revokedKey = await apiKeyRepository.revokeKey(keyId);
    logger.info(`API key revoked: ${keyId}`);
    return revokedKey;
  }

  /**
   * Rotate an API key (revoke old, create new)
   */
  async rotateKey(keyId, ownerId, tenantId) {
    const oldKey = await apiKeyRepository.findById(keyId);
    if (!oldKey) {
      throw new AppError('API key not found', 404);
    }

    if (oldKey.tenantId !== tenantId) {
      throw new AppError('Access denied', 403);
    }

    // Revoke old key
    await apiKeyRepository.revokeKey(keyId);

    // Create new key with same settings
    const newKeyData = await this.createApiKey(
      oldKey.apiId._id || oldKey.apiId,
      ownerId,
      tenantId,
      {
        name: `${oldKey.name} (rotated)`,
        environment: oldKey.environment,
        expiresAt: oldKey.expiresAt,
        rateLimit: oldKey.rateLimit,
        scopes: oldKey.scopes,
      }
    );

    logger.info(`API key rotated: ${keyId} -> ${newKeyData._id}`);
    return newKeyData;
  }

  /**
   * Update key metadata
   */
  async updateKey(keyId, tenantId, updates) {
    const key = await apiKeyRepository.findById(keyId);
    if (!key) {
      throw new AppError('API key not found', 404);
    }

    if (key.tenantId !== tenantId) {
      throw new AppError('Access denied', 403);
    }

    const allowedUpdates = ['name', 'status', 'expiresAt', 'rateLimit', 'allowedIPs', 'scopes'];
    const filteredUpdates = {};
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) filteredUpdates[field] = updates[field];
    });

    return apiKeyRepository.updateById(keyId, filteredUpdates);
  }
}

module.exports = new ApiKeyService();
