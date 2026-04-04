const webhookService = require('../webhooks/webhookService');
const ApiResponse = require('../utils/apiResponse');

class WebhookController {
  async createWebhook(req, res) {
    const webhook = await webhookService.createWebhook(
      req.user._id,
      req.tenantId,
      req.body
    );
    return ApiResponse.created(
      res,
      { webhook },
      'Webhook created. Save the secret — it will not be shown again.'
    );
  }

  async getWebhooks(req, res) {
    const webhooks = await webhookService.getUserWebhooks(req.user._id);
    return ApiResponse.success(res, { webhooks });
  }

  async updateWebhook(req, res) {
    const webhook = await webhookService.updateWebhook(
      req.params.id,
      req.user._id,
      req.body
    );
    return ApiResponse.success(res, { webhook }, 'Webhook updated');
  }

  async deleteWebhook(req, res) {
    await webhookService.deleteWebhook(req.params.id, req.user._id);
    return ApiResponse.success(res, null, 'Webhook deleted');
  }

  async getDeliveries(req, res) {
    const deliveries = await webhookService.getDeliveries(req.params.id, req.user._id);
    return ApiResponse.success(res, { deliveries });
  }
}

module.exports = new WebhookController();
