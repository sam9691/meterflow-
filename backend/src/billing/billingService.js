const Billing = require('../models/Billing');
const Invoice = require('../models/Invoice');
const usageRepository = require('../repositories/usageRepository');
const userRepository = require('../repositories/userRepository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// keeping this here for now, probably should move to a config file or db
const PLANS = {
  free: {
    included: 1000,
    basePrice: 0,
    overage: false,
    overagePer100: 0,
  },
  pro: {
    included: 10000,
    basePrice: 29,
    overage: true,
    overagePer100: 0.5,
  },
  enterprise: {
    included: 100000,
    basePrice: 199,
    overage: true,
    overagePer100: 0.1,
  },
};

const PLAN_FEATURES = {
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
    'Everything in Pro',
    'Custom rate limits',
    'SLA guarantee',
    'Dedicated support',
    '$0.10 per 100 overage requests',
  ],
};

class BillingService {
  async calculateMonthlyBilling(userId, billingMonth) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const plan = user.subscriptionPlan || 'free';
    const config = PLANS[plan];

    const [year, month] = billingMonth.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    const totalRequests = await usageRepository.countForBilling(userId, billingMonth);
    const breakdown = await usageRepository.getMonthlyBreakdown(userId, billingMonth);

    const overageRequests = Math.max(0, totalRequests - config.included);
    const overageAmount = config.overage ? (overageRequests / 100) * config.overagePer100 : 0;
    const totalAmount = config.basePrice + overageAmount;

    const billing = await Billing.findOneAndUpdate(
      { userId, billingMonth },
      {
        userId,
        tenantId: user.tenantId,
        billingMonth,
        billingYear: year,
        plan,
        totalRequests,
        includedRequests: config.included,
        overageRequests,
        baseAmount: config.basePrice,
        overageAmount,
        totalAmount,
        currency: 'USD',
        status: 'calculated',
        periodStart,
        periodEnd,
        calculatedAt: new Date(),
        apiBreakdown: breakdown.map((b) => ({
          apiId: b._id,
          apiName: b.api?.name || 'Unknown',
          requests: b.requests,
          errors: b.errors,
          avgLatency: Math.round(b.avgLatency || 0),
        })),
      },
      { upsert: true, new: true }
    );

    logger.info(`Billing calculated: user=${userId} month=${billingMonth} total=$${totalAmount}`);
    return billing;
  }

  async generateInvoice(billingId) {
    const billing = await Billing.findById(billingId).populate('userId');
    if (!billing) throw new AppError('Billing record not found', 404);

    // don't generate duplicates
    const existing = await Invoice.findOne({ billingId });
    if (existing) return existing;

    const lineItems = [];
    const plan = billing.plan;
    const config = PLANS[plan];

    if (billing.baseAmount > 0) {
      lineItems.push({
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — ${billing.billingMonth}`,
        quantity: 1,
        unitPrice: billing.baseAmount,
        amount: billing.baseAmount,
      });
    }

    if (billing.overageRequests > 0 && billing.overageAmount > 0) {
      lineItems.push({
        description: `Overage: ${billing.overageRequests.toLocaleString()} requests @ $${config.overagePer100}/100`,
        quantity: billing.overageRequests,
        unitPrice: config.overagePer100 / 100,
        amount: billing.overageAmount,
      });
    }

    // free plan with no charges still gets an invoice for record keeping
    if (lineItems.length === 0) {
      lineItems.push({
        description: `Free Plan — ${billing.billingMonth}`,
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
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paidAt: billing.totalAmount === 0 ? new Date() : null,
    });

    await Billing.findByIdAndUpdate(billingId, { invoiceId: invoice._id, status: 'invoiced' });

    logger.info(`Invoice generated: ${invoice.invoiceNumber}`);
    return invoice;
  }

  async getBillingHistory(userId, options = {}) {
    const { page = 1, limit = 12 } = options;
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      Billing.find({ userId }).sort({ billingMonth: -1 }).skip(skip).limit(limit).populate('invoiceId'),
      Billing.countDocuments({ userId }),
    ]);
    return { records, total };
  }

  async getInvoices(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      Invoice.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Invoice.countDocuments({ userId }),
    ]);
    return { invoices, total };
  }

  async getCurrentUsageSummary(userId) {
    const now = new Date();
    const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const user = await userRepository.findById(userId);
    const plan = user.subscriptionPlan || 'free';
    const config = PLANS[plan];

    const totalRequests = await usageRepository.countForBilling(userId, billingMonth);
    const usagePercent = Math.min(100, (totalRequests / config.included) * 100);
    const overageRequests = Math.max(0, totalRequests - config.included);
    const estimatedOverage = config.overage ? (overageRequests / 100) * config.overagePer100 : 0;

    return {
      billingMonth,
      plan,
      totalRequests,
      includedRequests: config.included,
      overageRequests,
      usagePercent: parseFloat(usagePercent.toFixed(1)),
      estimatedTotal: config.basePrice + estimatedOverage,
      basePrice: config.basePrice,
      estimatedOverage,
      currency: 'USD',
    };
  }

  async getPlans() {
    return Object.entries(PLANS).map(([name, config]) => ({
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      price: { monthly: config.basePrice, currency: 'USD' },
      limits: {
        requestsPerMonth: config.included,
        requestsPerMinute: name === 'free' ? 10 : name === 'pro' ? 100 : 1000,
      },
      overage: {
        enabled: config.overage,
        pricePerHundredRequests: config.overagePer100,
      },
      features: PLAN_FEATURES[name] || [],
    }));
  }
}

module.exports = new BillingService();
