const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema(
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
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      match: [/^https?:\/\/.+/, 'Webhook URL must be a valid HTTP/HTTPS URL'],
    },
    secret: {
      type: String,
      required: true,
      select: false,
    },
    events: {
      type: [String],
      enum: [
        'usage.threshold_reached',
        'payment.success',
        'payment.failed',
        'billing.generated',
        'api.key_created',
        'api.key_revoked',
        'subscription.upgraded',
        'subscription.downgraded',
        'subscription.cancelled',
      ],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastTriggeredAt: {
      type: Date,
      default: null,
    },
    lastSuccessAt: {
      type: Date,
      default: null,
    },
    lastFailureAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const WebhookDeliverySchema = new mongoose.Schema(
  {
    webhookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Webhook',
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    statusCode: {
      type: Number,
    },
    responseBody: {
      type: String,
    },
    attempt: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    deliveredAt: {
      type: Date,
    },
    nextRetryAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Webhook = mongoose.model('Webhook', webhookSchema);
const WebhookDelivery = mongoose.model('WebhookDelivery', WebhookDeliverySchema);

module.exports = { Webhook, WebhookDelivery };
