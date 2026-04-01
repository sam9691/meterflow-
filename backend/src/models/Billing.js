const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    billingMonth: {
      type: String, // Format: "2024-01"
      required: true,
      index: true,
    },
    billingYear: {
      type: Number,
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      required: true,
    },
    totalRequests: {
      type: Number,
      default: 0,
    },
    includedRequests: {
      type: Number,
      default: 1000,
    },
    overageRequests: {
      type: Number,
      default: 0,
    },
    baseAmount: {
      type: Number,
      default: 0,
    },
    overageAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['pending', 'calculated', 'invoiced', 'paid', 'failed', 'waived'],
      default: 'pending',
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    calculatedAt: {
      type: Date,
      default: null,
    },
    apiBreakdown: [
      {
        apiId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Api',
        },
        apiName: String,
        requests: Number,
        errors: Number,
        avgLatency: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound unique index - one billing record per user per month
billingSchema.index({ userId: 1, billingMonth: 1 }, { unique: true });
billingSchema.index({ tenantId: 1, billingMonth: 1 });
billingSchema.index({ status: 1 });

const Billing = mongoose.model('Billing', billingSchema);
module.exports = Billing;
