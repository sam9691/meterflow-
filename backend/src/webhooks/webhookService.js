const crypto = require('crypto');
const axios = require('axios');
const { Webhook, WebhookDelivery } = require('../models/Webhook');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class WebhookService {
  /**
   * Create a webhook
   */
  async createWebhook(userId, tenantId, data) {
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await Webhook.create({
      userId,
      tenantId,
      name: data.name,
      url: data.url,
      secret,
      events: data.events,
      isActive: true,
    });

    // Return with secret (only shown once)
    return { ...webhook.toObject(), secret };
  }

  /**
   * Get webhooks for a user
   */
  async getUserWebhooks(userId) {
    return Webhook.find({ userId }).select('-secret');
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId, userId, updates) {
    const webhook = await Webhook.findOne({ _id: webhookId, userId });
    if (!webhook) throw new AppError('Webhook not found', 404);

    const allowedUpdates = ['name', 'url', 'events', 'isActive'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) webhook[field] = updates[field];
    });

    return webhook.save();
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId, userId) {
    const webhook = await Webhook.findOneAndDelete({ _id: webhookId, userId });
    if (!webhook) throw new AppError('Webhook not found', 404);
    return webhook;
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerEvent(userId, event, payload) {
    const webhooks = await Webhook.find({
      userId,
      isActive: true,
      events: event,
    }).select('+secret');

    if (!webhooks.length) return;

    const deliveryPromises = webhooks.map((webhook) =>
      this.deliverWebhook(webhook, event, payload)
    );

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver a webhook with retry logic
   */
  async deliverWebhook(webhook, event, payload, attempt = 1) {
    const timestamp = Date.now();
    const body = JSON.stringify({
      event,
      timestamp: new Date(timestamp).toISOString(),
      data: payload,
    });

    // Generate HMAC signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');

    const delivery = await WebhookDelivery.create({
      webhookId: webhook._id,
      event,
      payload,
      attempt,
      status: 'pending',
    });

    try {
      const response = await axios.post(webhook.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-MeterFlow-Event': event,
          'X-MeterFlow-Signature': `sha256=${signature}`,
          'X-MeterFlow-Timestamp': timestamp,
          'X-MeterFlow-Delivery': delivery._id.toString(),
        },
        timeout: 10000,
      });

      await WebhookDelivery.findByIdAndUpdate(delivery._id, {
        statusCode: response.status,
        responseBody: JSON.stringify(response.data).substring(0, 500),
        status: 'success',
        deliveredAt: new Date(),
      });

      await Webhook.findByIdAndUpdate(webhook._id, {
        lastTriggeredAt: new Date(),
        lastSuccessAt: new Date(),
        $set: { failureCount: 0 },
      });

      logger.info(`Webhook delivered: ${event} to ${webhook.url}`);
    } catch (error) {
      const statusCode = error.response?.status || 0;

      await WebhookDelivery.findByIdAndUpdate(delivery._id, {
        statusCode,
        responseBody: error.message.substring(0, 500),
        status: 'failed',
        nextRetryAt: attempt < 3 ? new Date(Date.now() + attempt * 60000) : null,
      });

      await Webhook.findByIdAndUpdate(webhook._id, {
        lastTriggeredAt: new Date(),
        lastFailureAt: new Date(),
        $inc: { failureCount: 1 },
      });

      logger.warn(`Webhook delivery failed: ${event} to ${webhook.url} (attempt ${attempt})`);

      // Retry up to 3 times with exponential backoff
      if (attempt < 3) {
        setTimeout(
          () => this.deliverWebhook(webhook, event, payload, attempt + 1),
          attempt * 60000
        );
      }
    }
  }

  /**
   * Get delivery history for a webhook
   */
  async getDeliveries(webhookId, userId) {
    const webhook = await Webhook.findOne({ _id: webhookId, userId });
    if (!webhook) throw new AppError('Webhook not found', 404);

    return WebhookDelivery.find({ webhookId }).sort({ createdAt: -1 }).limit(50);
  }

  /**
   * Verify webhook signature (for consumers)
   */
  verifySignature(payload, signature, secret) {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expectedSig}`),
      Buffer.from(signature)
    );
  }
}

module.exports = new WebhookService();
