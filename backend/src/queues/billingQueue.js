const { Queue, Worker, QueueEvents } = require('bullmq');
const { createBullMQConnection } = require('../config/redis');
const billingService = require('../billing/billingService');
const webhookService = require('../webhooks/webhookService');
const logger = require('../utils/logger');

const QUEUE_NAME = 'billing';

let billingQueue = null;
let billingWorker = null;

const getBillingQueue = () => {
  if (!billingQueue) {
    try {
      const connection = createBullMQConnection();
      billingQueue = new Queue(QUEUE_NAME, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });
      logger.info('Billing queue initialized');
    } catch (err) {
      logger.warn(`BullMQ unavailable: ${err.message}. Billing jobs will run synchronously.`);
    }
  }
  return billingQueue;
};

const startBillingWorker = () => {
  try {
    const connection = createBullMQConnection();
    billingWorker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const { type, data } = job.data;

        switch (type) {
          case 'calculate_monthly_billing': {
            const { userId, billingMonth } = data;
            logger.info(`Processing billing for user ${userId}, month ${billingMonth}`);

            const billing = await billingService.calculateMonthlyBilling(userId, billingMonth);

            // Generate invoice
            const invoice = await billingService.generateInvoice(billing._id);

            // Trigger webhook
            await webhookService.triggerEvent(userId, 'billing.generated', {
              billingId: billing._id,
              invoiceId: invoice._id,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.total,
              billingMonth,
            });

            return { billingId: billing._id, invoiceId: invoice._id };
          }

          case 'check_usage_threshold': {
            const { userId, currentUsage, threshold } = data;
            logger.info(`Usage threshold check for user ${userId}: ${currentUsage}/${threshold}`);

            await webhookService.triggerEvent(userId, 'usage.threshold_reached', {
              currentUsage,
              threshold,
              percentage: Math.round((currentUsage / threshold) * 100),
            });

            return { notified: true };
          }

          case 'process_all_monthly_billing': {
            const User = require('../models/User');
            const users = await User.find({ isActive: true });
            const { billingMonth } = data;

            logger.info(`Processing monthly billing for ${users.length} users`);

            for (const user of users) {
              await billingService.calculateMonthlyBilling(user._id, billingMonth);
            }

            return { processed: users.length };
          }

          default:
            logger.warn(`Unknown billing job type: ${type}`);
        }
      },
      {
        connection,
        concurrency: 5,
      }
    );

    billingWorker.on('completed', (job) => {
      logger.info(`Billing job ${job.id} completed`);
    });

    billingWorker.on('failed', (job, err) => {
      logger.error(`Billing job ${job?.id} failed: ${err.message}`);
    });

    logger.info('Billing worker started');
  } catch (err) {
    logger.warn(`Could not start billing worker: ${err.message}`);
  }
};

/**
 * Add a billing job to the queue
 */
const addBillingJob = async (type, data, options = {}) => {
  const queue = getBillingQueue();
  if (!queue) {
    // Fallback: run synchronously
    logger.warn(`Running billing job ${type} synchronously (queue unavailable)`);
    return;
  }

  return queue.add(type, { type, data }, options);
};

/**
 * Schedule monthly billing for all users
 */
const scheduleMonthlyBilling = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const billingMonth = `${year}-${month}`;

  await addBillingJob(
    'process_all_monthly_billing',
    { billingMonth },
    { jobId: `monthly_billing_${billingMonth}` }
  );

  logger.info(`Monthly billing scheduled for ${billingMonth}`);
};

module.exports = { getBillingQueue, startBillingWorker, addBillingJob, scheduleMonthlyBilling };
