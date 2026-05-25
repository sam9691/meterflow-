const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;
let bullMQWarned = false;

/**
 * Shared Redis client for rate limiting / caching.
 * Uses lazyConnect — no connection attempt until first command.
 * Stops retrying after 3 failures and logs once.
 */
const createRedisClient = () => {
  let warnedOnce = false;

  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,       // don't connect until first command
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (!warnedOnce) {
        warnedOnce = true;
        logger.warn('Redis unavailable — rate limiting will use in-memory fallback');
      }
      if (times >= 3) return null; // give up
      return Math.min(times * 1000, 3000);
    },
  });

  // Suppress ioredis error events — errors are handled via retryStrategy
  client.on('error', () => {});
  client.on('ready', () => logger.info('Redis connected'));

  return client;
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

/**
 * BullMQ requires its own connection with maxRetriesPerRequest: null.
 * Also uses lazyConnect to avoid startup spam.
 */
const createBullMQConnection = () => {
  const conn = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: null, // required by BullMQ
    retryStrategy: (times) => {
      if (!bullMQWarned) {
        bullMQWarned = true;
        logger.warn('BullMQ Redis unavailable — billing jobs will run synchronously');
      }
      if (times >= 3) return null;
      return Math.min(times * 1000, 3000);
    },
  });

  conn.on('error', () => {});
  conn.on('reconnecting', () => {});

  return conn;
};

module.exports = { getRedisClient, createBullMQConnection };
