const { getStripe } = require('../config/stripe');
const userRepository = require('../repositories/userRepository');
const Invoice = require('../models/Invoice');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

class StripeService {
  /**
   * Get or create Stripe customer for a user
   */
  async getOrCreateCustomer(user) {
    const stripe = getStripe();

    if (user.stripeCustomerId) {
      try {
        return await stripe.customers.retrieve(user.stripeCustomerId);
      } catch {
        // Customer not found in Stripe, create new
      }
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user._id.toString(),
        tenantId: user.tenantId,
      },
    });

    await userRepository.updateById(user._id, { stripeCustomerId: customer.id });
    return customer;
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(userId, plan, successUrl, cancelUrl) {
    const stripe = getStripe();
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const priceId = STRIPE_PRICE_IDS[plan];
    if (!priceId) throw new AppError(`No Stripe price configured for plan: ${plan}`, 400);

    const customer = await this.getOrCreateCustomer(user);

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl || `${process.env.FRONTEND_URL}/billing?success=true`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/billing?cancelled=true`,
      metadata: {
        userId: userId.toString(),
        plan,
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          plan,
        },
      },
    });

    logger.info(`Checkout session created for user ${userId}, plan ${plan}`);
    return session;
  }

  /**
   * Create billing portal session
   */
  async createPortalSession(userId, returnUrl) {
    const stripe = getStripe();
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.stripeCustomerId) throw new AppError('No Stripe customer found', 400);

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl || `${process.env.FRONTEND_URL}/billing`,
    });

    return session;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(rawBody, signature) {
    const stripe = getStripe();
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
    }

    logger.info(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;

      default:
        logger.info(`Unhandled Stripe event: ${event.type}`);
    }

    return event;
  }

  async handleCheckoutCompleted(session) {
    const { userId, plan } = session.metadata;
    if (!userId || !plan) return;

    await userRepository.updateSubscription(userId, plan, {
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
    });

    logger.info(`Subscription activated: user ${userId} -> ${plan}`);
  }

  async handleSubscriptionUpdated(subscription) {
    const { userId, plan } = subscription.metadata;
    if (!userId) return;

    const status = subscription.status;
    if (status === 'active' || status === 'trialing') {
      await userRepository.updateSubscription(userId, plan || 'free', {
        stripeSubscriptionId: subscription.id,
      });
    }
  }

  async handleSubscriptionDeleted(subscription) {
    const { userId } = subscription.metadata;
    if (!userId) return;

    await userRepository.updateSubscription(userId, 'free', {
      stripeSubscriptionId: null,
    });

    logger.info(`Subscription cancelled: user ${userId} -> free`);
  }

  async handlePaymentSucceeded(stripeInvoice) {
    const customerId = stripeInvoice.customer;
    const user = await require('../models/User').findOne({ stripeCustomerId: customerId });
    if (!user) return;

    // Update invoice status if exists
    if (stripeInvoice.metadata?.invoiceId) {
      await Invoice.findByIdAndUpdate(stripeInvoice.metadata.invoiceId, {
        status: 'paid',
        paidAt: new Date(),
        stripeInvoiceId: stripeInvoice.id,
      });
    }

    logger.info(`Payment succeeded for customer ${customerId}`);
  }

  async handlePaymentFailed(stripeInvoice) {
    const customerId = stripeInvoice.customer;
    logger.warn(`Payment failed for customer ${customerId}`);
    // Could trigger email notification here
  }

  /**
   * Get subscription details
   */
  async getSubscription(userId) {
    const stripe = getStripe();
    const user = await userRepository.findById(userId);
    if (!user || !user.stripeSubscriptionId) return null;

    try {
      return await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    } catch {
      return null;
    }
  }
}

module.exports = new StripeService();
