const Api = require('../models/Api');

class ApiRepository {
  async create(data) {
    return Api.create(data);
  }

  async findById(id) {
    return Api.findById(id).populate('ownerId', 'name email');
  }

  async findByIdAndTenant(id, tenantId) {
    return Api.findOne({ _id: id, tenantId });
  }

  async findByOwner(ownerId, options = {}) {
    const { page = 1, limit = 20, status, search } = options;
    const skip = (page - 1) * limit;

    const filter = { ownerId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [apis, total] = await Promise.all([
      Api.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Api.countDocuments(filter),
    ]);

    return { apis, total };
  }

  async findByTenant(tenantId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const skip = (page - 1) * limit;
    const filter = { tenantId };
    if (status) filter.status = status;

    const [apis, total] = await Promise.all([
      Api.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Api.countDocuments(filter),
    ]);

    return { apis, total };
  }

  async findPublic(options = {}) {
    const { page = 1, limit = 20, category, search } = options;
    const skip = (page - 1) * limit;

    const filter = { visibility: 'public', status: 'active' };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [apis, total] = await Promise.all([
      Api.find(filter).populate('ownerId', 'name').sort({ totalRequests: -1 }).skip(skip).limit(limit),
      Api.countDocuments(filter),
    ]);

    return { apis, total };
  }

  async updateById(id, updates) {
    return Api.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  }

  async incrementStats(id, requests = 1, errors = 0, latency = 0) {
    const update = {
      $inc: { totalRequests: requests, totalErrors: errors },
    };
    if (latency > 0) {
      // Running average approximation
      update.$set = {};
    }
    return Api.findByIdAndUpdate(id, update);
  }

  async deleteById(id) {
    return Api.findByIdAndDelete(id);
  }

  async countByOwner(ownerId) {
    return Api.countDocuments({ ownerId });
  }
}

module.exports = new ApiRepository();
