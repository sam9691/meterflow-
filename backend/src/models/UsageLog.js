const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema(
  {
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiKey',
      required: true,
      index: true,
    },
    apiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Api',
      required: true,
      index: true,
    },
    ownerId: {
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
    consumerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
      index: true,
    },
    latency: {
      type: Number, // milliseconds
      required: true,
    },
    requestSize: {
      type: Number, // bytes
      default: 0,
    },
    responseSize: {
      type: Number, // bytes
      default: 0,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    isError: {
      type: Boolean,
      default: false,
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    // For time-series queries
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Billing period tracking
    billingMonth: {
      type: String, // Format: "2024-01"
      index: true,
    },
    billingYear: {
      type: Number,
      index: true,
    },
    // Request metadata
    requestHeaders: {
      type: Map,
      of: String,
      default: {},
      select: false,
    },
    queryParams: {
      type: Map,
      of: String,
      default: {},
      select: false,
    },
  },
  {
    timestamps: false, // We use custom timestamp field
    versionKey: false,
  }
);

// Compound indexes for analytics queries
usageLogSchema.index({ apiId: 1, timestamp: -1 });
usageLogSchema.index({ apiKeyId: 1, timestamp: -1 });
usageLogSchema.index({ ownerId: 1, timestamp: -1 });
usageLogSchema.index({ tenantId: 1, timestamp: -1 });
usageLogSchema.index({ ownerId: 1, billingMonth: 1 });
usageLogSchema.index({ apiId: 1, statusCode: 1, timestamp: -1 });
usageLogSchema.index({ timestamp: -1 });

// TTL index - auto-delete logs older than 90 days
usageLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Pre-save: set billing period
usageLogSchema.pre('save', function (next) {
  const now = this.timestamp || new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  this.billingMonth = `${year}-${month}`;
  this.billingYear = year;
  this.isError = this.statusCode >= 400;
  next();
});

const UsageLog = mongoose.model('UsageLog', usageLogSchema);
module.exports = UsageLog;
