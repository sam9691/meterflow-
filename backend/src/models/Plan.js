const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['free', 'pro', 'enterprise'],
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    price: {
      monthly: {
        type: Number,
        default: 0,
      },
      yearly: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    limits: {
      requestsPerMonth: {
        type: Number,
        default: 1000,
      },
      requestsPerMinute: {
        type: Number,
        default: 10,
      },
      apiKeys: {
        type: Number,
        default: 3,
      },
      apis: {
        type: Number,
        default: 2,
      },
    },
    overage: {
      enabled: {
        type: Boolean,
        default: false,
      },
      pricePerHundredRequests: {
        type: Number,
        default: 0,
      },
    },
    features: {
      type: [String],
      default: [],
    },
    stripePriceId: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Plan = mongoose.model('Plan', planSchema);
module.exports = Plan;
