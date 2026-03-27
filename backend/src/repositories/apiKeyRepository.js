const ApiKey = require('../models/ApiKey');

class ApiKeyRepository {
  async create(data) {
    return ApiKey.create(data);
  }

  async findById(id) {
    return ApiKey.findById(id).populate('apiId', 'name baseUrl status');
  }

  async findByKeyHash(keyHash) {
    return ApiKey.findOne({ keyHash, status: 'active' })
      .populate('apiId', 'name baseUrl status rateLimit ownerId')
      .populate('ownerId', 'name email subscriptionPlan');
  }

  async findByKeyHashWithSecret(keyHash) {
    return ApiKey.findOne({ keyHash }).select('+hashedKey');
  }

  async findByApiId(apiId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const skip = (page - 1) * limit;
    const filter = { apiId };
    if (status) filter.status = status;

    const [keys, total] = await Promise.all([
      ApiKey.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ApiKey.countDocuments(filter),
    ]);

    return { keys, total };
  }

  async findByOwner(ownerId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const skip = (page - 1) * limit;
    const filter = { ownerId };
    if (status) filter.status = status;

    const [keys, total] = await Promise.all([
      ApiKey.find(filter)
        .populate('apiId', 'name status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ApiKey.countDocuments(filter),
    ]);

    return { keys, total };
  }

  async updateById(id, updates) {
    return ApiKey.findByIdAndUpdate(id, updates, { new: true });
  }

  async revokeKey(id) {
    return ApiKey.findByIdAndUpdate(id, { status: 'revoked' }, { new: true });
  }

  async updateLastUsed(id) {
    return ApiKey.findByIdAndUpdate(id, {
      lastUsedAt: new Date(),
      $inc: { totalRequests: 1 },
    });
  }

  async incrementErrors(id) {
    return ApiKey.findByIdAndUpdate(id, { $inc: { totalErrors: 1 } });
  }

  async countByOwner(ownerId) {
    return ApiKey.countDocuments({ ownerId, status: 'active' });
  }

  async deleteById(id) {
    return ApiKey.findByIdAndDelete(id);
  }
}

module.exports = new ApiKeyRepository();
