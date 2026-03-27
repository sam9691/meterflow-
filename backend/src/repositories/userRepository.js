const User = require('../models/User');

class UserRepository {
  async findById(id, selectFields = '') {
    return User.findById(id).select(selectFields);
  }

  async findByEmail(email, includePassword = false) {
    const query = User.findOne({ email: email.toLowerCase() });
    if (includePassword) query.select('+password +refreshTokens');
    return query;
  }

  async findByIdWithTokens(id) {
    return User.findById(id).select('+refreshTokens');
  }

  async create(userData) {
    return User.create(userData);
  }

  async updateById(id, updates) {
    return User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  }

  async updateRefreshTokens(id, tokens) {
    return User.findByIdAndUpdate(id, { refreshTokens: tokens });
  }

  async findAll(filter = {}, options = {}) {
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return { users, total };
  }

  async countByPlan() {
    return User.aggregate([
      { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } },
    ]);
  }

  async updateSubscription(userId, plan, stripeData = {}) {
    return User.findByIdAndUpdate(
      userId,
      {
        subscriptionPlan: plan,
        ...stripeData,
      },
      { new: true }
    );
  }

  async deleteById(id) {
    return User.findByIdAndDelete(id);
  }
}

module.exports = new UserRepository();
