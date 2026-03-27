const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
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
    },
    name: {
      type: String,
      required: [true, 'API key name is required'],
      trim: true,
      maxlength: [100, 'Key name cannot exceed 100 characters'],
    },
    // SHA-256 hash for fast lookup
    keyHash: {
      type: String,
      required: true,
      index: true,
    },
    // bcrypt hash for secure verification
    hashedKey: {
      type: String,
      required: true,
      select: false,
    },
    // Masked version for display (e.g., mf_live_xxxx****xxxx)
    maskedKey: {
      type: String,
      required: true,
    },
    // Key prefix for identification
    keyPrefix: {
      type: String,
      required: true,
    },
    environment: {
      type: String,
      enum: ['live', 'test'],
      default: 'live',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'revoked', 'expired'],
      default: 'active',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    totalRequests: {
      type: Number,
      default: 0,
    },
    totalErrors: {
      type: Number,
      default: 0,
    },
    rateLimit: {
      requestsPerMinute: {
        type: Number,
        default: null, // null = use plan default
      },
    },
    allowedIPs: {
      type: [String],
      default: [], // empty = all IPs allowed
    },
    allowedDomains: {
      type: [String],
      default: [],
    },
    scopes: {
      type: [String],
      default: ['read', 'write'],
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
apiKeySchema.index({ keyHash: 1 });
apiKeySchema.index({ apiId: 1, status: 1 });
apiKeySchema.index({ ownerId: 1, status: 1 });
apiKeySchema.index({ tenantId: 1 });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

// Virtual: check if key is expired
apiKeySchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual: check if key is valid
apiKeySchema.virtual('isValid').get(function () {
  return this.status === 'active' && !this.isExpired;
});

const ApiKey = mongoose.model('ApiKey', apiKeySchema);
module.exports = ApiKey;
