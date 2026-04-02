const cron = require('node-cron');
const { scheduleMonthlyBilling } = require('../queues/billingQueue');
const billingService = require('../billing/billingService');
const usageRepository = require('../repositories/usageRepository');
const userRepository = require('../repositories/userRepository');
const webhookService = require('../webhooks/webhookService');
const logger = require('../utils/logger');

/**
 * Initialize all cron jobs
 */
const initCronJobs = () => {
  // ─── Monthly Billing (1st of every month at midnight) ─────────────────
  cron.schedule(
    process.env.BILLING_CRON_SCHEDULE || '0 0 1 * *',
    async () => {
      logger.info('Running monthly billing cron job');
      try {
        await scheduleMonthlyBilling();
      } catch (err) {
        logger.error(`Monthly billing cron failed: ${err.message}`);
      }
    },
    { timezone: 'UTC' }
  );

  // ─── Usage Threshold Check (every hour) ───────────────────────────────
  cron.schedule('0 * * * *', async () => {
    logger.info('Running usage threshold check');
    try {
      await checkUsageThresholds();
    } catch (err) {
      logger.error(`Usage threshold check failed: ${err.message}`);
    }
  });

  // ─── Expire API Keys (every day at 2 AM) ──────────────────────────────
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running API key expiry check');
    try {
      await expireApiKeys();
    } catch (err) {
      logger.error(`API key expiry check failed: ${err.message}`);
    }
  });

  logger.info('Cron jobs initialized');
};

/**
 * Check if any users have hit usage thresholds (80%, 100%)
 */
const checkUsageThresholds = async () => {
  const now = new Date();
  const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const PLAN_LIMITS = { free: 1000, pro: 10000, enterprise: 100000 };
  const THRESHOLDS = [0.8, 1.0]; // 80% and 100%

  const { users } = await userRepository.findAll({ isActive: true }, { limit: 1000 });

  for (const user of users) {
    try {
      const limit = PLAN_LIMITS[user.subscriptionPlan] || 1000;
      const usage = await usageRepository.countForBilling(user._id, billingMonth);
      const usagePercent = usage / limit;

      for (const threshold of THRESHOLDS) {
        if (usagePercent >= threshold) {
          // Check if we already notified (use Redis to prevent duplicate notifications)
          const { getRedisClient } = require('../config/redis');
          try {
            const redis = getRedisClient();
            const notifyKey = `threshold_notified:${user._id}:${billingMonth}:${threshold}`;
            const alreadyNotified = await redis.get(notifyKey);

            if (!alreadyNotified) {
              await webhookService.triggerEvent(user._id.toString(), 'usage.threshold_reached', {
                userId: user._id,
                currentUsage: usage,
                limit,
                threshold: Math.round(threshold * 100),
                billingMonth,
              });

              // Mark as notified for this month
              await redis.setex(notifyKey, 30 * 24 * 60 * 60, '1');
            }
          } catch {
            // Redis unavailable, skip dedup check
          }
        }
      }
    } catch (err) {
      logger.error(`Threshold check failed for user ${user._id}: ${err.message}`);
    }
  }
};

/**
 * Expire API keys that have passed their expiry date
 */
const expireApiKeys = async () => {
  const ApiKey = require('../models/ApiKey');
  const result = await ApiKey.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: new Date() },
    },
    { status: 'expired' }
  );

  if (result.modifiedCount > 0) {
    logger.info(`Expired ${result.modifiedCount} API keys`);
  }
};

module.exports = { initCronJobs };
