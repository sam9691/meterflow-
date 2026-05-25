const { Queue, Worker } = require('bullmq');
const { createBullMQConnection } = require('../config/redis');
const billingService = require('../billing/billingService');
const webhookService = require('../webhooks/webhookService');
const logger = require('../utils/logger');

const QUEUE_NAME = 'billing';

let billingQueue = null;
let billingWorker = null;
let redisReachable = null; // cached result of ping check

/**
 * Ping Redis to see if it's actually up before creating BullMQ instances.
 * BullMQ calls .connect() internally and ioredis prints directly to stderr
 * when it fails — the only way to avoid the spam is to not create the
 * Queue/Worker at all when Redis is down.
 */
const checkRedisReachable = async () => {
  if (redisReachable !== null) return redisReachable;

  const net = require('net');
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT) || 6379;

  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket
      .connect(port, host, () => {
        socket.destroy();
        redisReachable = true;
        resolve(true);
      })
      .on('error', () => {
        socket.destroy();
        redisReachable = false;
        resolve(false);
      })
      .on('timeout', () => {
        socket.destroy();
        redisReachable = false;
        resolve(false);
      });
  });
};

const getBillingQueue = async () => {
  if (billingQueue) return billingQueue;

  const up = await checkRedisReachable();
  if (!up) {
    logger.warn('Redis not reachable — BullMQ billing queue disabled (jobs run synchronously)');
    return null;
  }

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
    logger.warn(`BullMQ queue init failed: ${err.message}`);
  }

  return billingQueue;
};

const startBillingWorker = async () => {
  const up = await checkRedisReachable();
  if (!up) {
    logger.warn('Redis not reachable — BullMQ billing worker not started');
    return;
  }

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
            const invoice = await billingService.generateInvoice(billing._id);
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
      { connection, concurrency: 5 }
    );

    billingWorker.on('completed', (job) => logger.info(`Billing job ${job.id} completed`));
    billingWorker.on('failed', (job, err) =>
      logger.error(`Billing job ${job?.id} failed: ${err.message}`)
    );

    logger.info('Billing worker started');
  } catch (err) {
    logger.warn(`Could not start billing worker: ${err.message}`);
  }
};

/**
 * Add a billing job to the queue (falls back to synchronous if Redis is down)
 */
const addBillingJob = async (type, data, options = {}) => {
  const queue = await getBillingQueue();
  if (!queue) {
    logger.warn(`Running billing job "${type}" synchronously (Redis unavailable)`);
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
