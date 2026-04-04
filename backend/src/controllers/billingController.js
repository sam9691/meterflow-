const billingService = require('../billing/billingService');
const stripeService = require('../billing/stripeService');
const ApiResponse = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

class BillingController {
  async getPlans(req, res) {
    const plans = await billingService.getPlans();
    return ApiResponse.success(res, { plans });
  }

  async getCurrentUsage(req, res) {
    const summary = await billingService.getCurrentUsageSummary(req.user._id);
    return ApiResponse.success(res, { usage: summary });
  }

  async getBillingHistory(req, res) {
    const { page, limit } = getPagination(req.query);
    const { records, total } = await billingService.getBillingHistory(req.user._id, {
      page, limit,
    });
    return ApiResponse.paginated(
      res,
      { records },
      buildPaginationMeta(total, page, limit)
    );
  }

  async getInvoices(req, res) {
    const { page, limit } = getPagination(req.query);
    const { invoices, total } = await billingService.getInvoices(req.user._id, {
      page, limit,
    });
    return ApiResponse.paginated(
      res,
      { invoices },
      buildPaginationMeta(total, page, limit)
    );
  }

  async createCheckoutSession(req, res) {
    const { plan, successUrl, cancelUrl } = req.body;
    const session = await stripeService.createCheckoutSession(
      req.user._id,
      plan,
      successUrl,
      cancelUrl
    );
    return ApiResponse.success(res, {
      sessionId: session.id,
      url: session.url,
    }, 'Checkout session created');
  }

  async createPortalSession(req, res) {
    const { returnUrl } = req.body;
    const session = await stripeService.createPortalSession(req.user._id, returnUrl);
    return ApiResponse.success(res, { url: session.url }, 'Portal session created');
  }

  async stripeWebhook(req, res) {
    const signature = req.headers['stripe-signature'];
    await stripeService.handleWebhook(req.body, signature);
    return res.json({ received: true });
  }

  async getSubscription(req, res) {
    const subscription = await stripeService.getSubscription(req.user._id);
    return ApiResponse.success(res, { subscription });
  }
}

module.exports = new BillingController();
