const Billing = require('../models/Billing');
const Invoice = require('../models/Invoice');
const Plan = require('../models/Plan');
const usageRepository = require('../repositories/usageRepository');
const userRepository = require('../repositories/userRepository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Default plan configurations
const PLAN_CONFIG = {
  free: {
    includedRequests: 1000,
    basePrice: 0,
    overageEnabled: false,
    overagePer100: 0,
  },
  pro: {
    includedRequests: 10000,
    basePrice: 29,
    overageEnabled: true,
    overagePer100: 0.5,
  },
  enterprise: {
    includedRequests: 100000,
    basePrice: 199,
    overageEnabled: true,
    overagePer100: 0.1,
  },
};

class BillingService {
  /**
   * Calculate billing for a user for a specific month
   */
  async calculateMonthlyBilling(userId, billingMonth) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const plan = user.subscriptionPlan || 'free';
    const planConfig = PLAN_CONFIG[plan];

    // Parse billing month
    const [year, month] = billingMonth.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    // Count total requests for the month
    const totalRequests = await usageRepository.countForBilling(userId, billingMonth);

    // Get per-API breakdown
    const apiBreakdown = await usageRepository.getMonthlyBreakdown(userId, billingMonth);

    // Calculate costs
    const includedRequests = planConfig.includedRequests;
    const overageRequests = Math.max(0, totalRequests - includedRequests);
    const baseAmount = planConfig.basePrice;
    const overageAmount = planConfig.overageEnabled
      ? (overageRequests / 100) * planConfig.overagePer100
      : 0;
    const totalAmount = baseAmount + overageAmount;

    // Upsert billing record
    const billing = await Billing.findOneAndUpdate(
      { userId, billingMonth },
      {
        userId,
        tenantId: user.tenantId,
        billingMonth,
        billingYear: year,
        plan,
        totalRequests,
        includedRequests,
        overageRequests,
        baseAmount,
        overageAmount,
        totalAmount,
        currency: 'USD',
        status: 'calculated',
        periodStart,
        periodEnd,
        calculatedAt: new Date(),
        apiBreakdown: apiBreakdown.map((item) => ({
          apiId: item._id,
          apiName: item.api?.name || 'Unknown API',
          requests: item.requests,
          errors: item.errors,
          avgLatency: Math.round(item.avgLatency || 0),
        })),
      },
      { upsert: true, new: true }
    );

    logger.info(`Billing calculated for user ${userId}, month ${billingMonth}: $${totalAmount}`);
    return billing;
  }

  /**
   * Generate invoice from billing record
   */
  async generateInvoice(billingId) {
    const billing = await Billing.findById(billingId).populate('userId');
    if (!billing) throw new AppError('Billing record not found', 404);

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ billingId });
    if (existingInvoice) return existingInvoice;

    const lineItems = [];

    // Base plan fee
    if (billing.baseAmount > 0) {
      lineItems.push({
        description: `${billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)} Plan - ${billing.billingMonth}`,
        quantity: 1,
        unitPrice: billing.baseAmount,
        amount: billing.baseAmount,
      });
    }

    // Overage charges
    if (billing.overageRequests > 0 && billing.overageAmount > 0) {
      const planConfig = PLAN_CONFIG[billing.plan];
      lineItems.push({
        description: `Overage: ${billing.overageRequests.toLocaleString()} requests @ $${planConfig.overagePer100}/100`,
        quantity: billing.overageRequests,
        unitPrice: planConfig.overagePer100 / 100,
        amount: billing.overageAmount,
      });
    }

    // Free plan with no charges
    if (lineItems.length === 0) {
      lineItems.push({
        description: `Free Plan - ${billing.billingMonth}`,
        quantity: billing.totalRequests,
        unitPrice: 0,
        amount: 0,
      });
    }

    const invoice = await Invoice.create({
      userId: billing.userId._id || billing.userId,
      tenantId: billing.tenantId,
      billingId: billing._id,
      billingMonth: billing.billingMonth,
      lineItems,
      subtotal: billing.totalAmount,
      tax: 0,
      total: billing.totalAmount,
      currency: billing.currency,
      status: billing.totalAmount > 0 ? 'open' : 'paid',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      paidAt: billing.totalAmount === 0 ? new Date() : null,
    });

    // Update billing with invoice reference
    await Billing.findByIdAndUpdate(billingId, {
      invoiceId: invoice._id,
      status: 'invoiced',
    });

    logger.info(`Invoice generated: ${invoice.invoiceNumber} for billing ${billingId}`);
    return invoice;
  }

  /**
   * Get billing history for a user
   */
  async getBillingHistory(userId, options = {}) {
    const { page = 1, limit = 12 } = options;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Billing.find({ userId })
        .sort({ billingMonth: -1 })
        .skip(skip)
        .limit(limit)
        .populate('invoiceId'),
      Billing.countDocuments({ userId }),
    ]);

    return { records, total };
  }

  /**
   * Get invoices for a user
   */
  async getInvoices(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Invoice.countDocuments({ userId }),
    ]);

    return { invoices, total };
  }

  /**
   * Get current month usage summary
   */
  async getCurrentUsageSummary(userId) {
    const now = new Date();
    const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const user = await userRepository.findById(userId);
    const plan = user.subscriptionPlan || 'free';
    const planConfig = PLAN_CONFIG[plan];

    const totalRequests = await usageRepository.countForBilling(userId, billingMonth);
    const includedRequests = planConfig.includedRequests;
    const usagePercent = Math.min(100, (totalRequests / includedRequests) * 100);
    const overageRequests = Math.max(0, totalRequests - includedRequests);
    const estimatedOverage = planConfig.overageEnabled
      ? (overageRequests / 100) * planConfig.overagePer100
      : 0;

    return {
      billingMonth,
      plan,
      totalRequests,
      includedRequests,
      overageRequests,
      usagePercent: parseFloat(usagePercent.toFixed(1)),
      estimatedTotal: planConfig.basePrice + estimatedOverage,
      basePrice: planConfig.basePrice,
      estimatedOverage,
      currency: 'USD',
    };
  }

  /**
   * Get all available plans
   */
  async getPlans() {
    return Object.entries(PLAN_CONFIG).map(([name, config]) => ({
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      price: { monthly: config.basePrice, currency: 'USD' },
      limits: {
        requestsPerMonth: config.includedRequests,
        requestsPerMinute: name === 'free' ? 10 : name === 'pro' ? 100 : 1000,
      },
      overage: {
        enabled: config.overageEnabled,
        pricePerHundredRequests: config.overagePer100,
      },
      features: this.getPlanFeatures(name),
    }));
  }

  getPlanFeatures(plan) {
    const features = {
      free: [
        '1,000 requests/month',
        '10 req/min rate limit',
        '2 APIs',
        '3 API keys',
        'Basic analytics',
        'Community support',
      ],
      pro: [
        '10,000 requests/month',
        '100 req/min rate limit',
        'Unlimited APIs',
        'Unlimited API keys',
        'Advanced analytics',
        'Webhook support',
        'Priority support',
        '$0.50 per 100 overage requests',
      ],
      enterprise: [
        '100,000 requests/month',
        '1,000 req/min rate limit',
        'Unlimited everything',
        'Custom rate limits',
        'SLA guarantee',
        'Dedicated support',
        'Custom integrations',
        '$0.10 per 100 overage requests',
      ],
    };
    return features[plan] || [];
  }
}

module.exports = new BillingService();
