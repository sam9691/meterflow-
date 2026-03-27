const mongoose = require('mongoose');

const apiSchema = new mongoose.Schema(
  {
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
    name: {
      type: String,
      required: [true, 'API name is required'],
      trim: true,
      minlength: [2, 'API name must be at least 2 characters'],
      maxlength: [100, 'API name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    baseUrl: {
      type: String,
      required: [true, 'Base URL is required'],
      trim: true,
      match: [/^https?:\/\/.+/, 'Base URL must be a valid HTTP/HTTPS URL'],
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
    },
    category: {
      type: String,
      enum: [
        'finance',
        'weather',
        'social',
        'ecommerce',
        'health',
        'maps',
        'communication',
        'ai',
        'data',
        'other',
      ],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'deprecated'],
      default: 'active',
    },
    version: {
      type: String,
      default: 'v1',
    },
    tags: {
      type: [String],
      default: [],
    },
    rateLimit: {
      requestsPerMinute: {
        type: Number,
        default: 60,
      },
      requestsPerDay: {
        type: Number,
        default: 10000,
      },
    },
    totalRequests: {
      type: Number,
      default: 0,
    },
    totalErrors: {
      type: Number,
      default: 0,
    },
    avgLatency: {
      type: Number,
      default: 0,
    },
    documentation: {
      type: String,
      default: '',
    },
    endpoints: [
      {
        path: String,
        method: {
          type: String,
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        },
        description: String,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes
apiSchema.index({ ownerId: 1, status: 1 });
apiSchema.index({ tenantId: 1, status: 1 });
apiSchema.index({ visibility: 1, status: 1 });
apiSchema.index({ category: 1 });
apiSchema.index({ createdAt: -1 });

const Api = mongoose.model('Api', apiSchema);
module.exports = Api;
