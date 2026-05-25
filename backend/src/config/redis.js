const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

const createRedisClient = () => {
  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      if (times > 3) return null; // Stop retrying after 3 attempts
      return Math.min(times * 500, 2000);
    },
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on('connect', () => logger.info('Redis client connected'));
  client.on('ready', () => logger.info('Redis client ready'));
  client.on('error', () => {}); // Suppress noisy Redis errors — app works without it
  client.on('close', () => {});
  client.on('reconnecting', () => {});

  return client;
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

// Separate connection for BullMQ (requires separate connections)
const createBullMQConnection = () => {
  const conn = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 3) return null; // Stop retrying — Redis not available
      return Math.min(times * 1000, 3000);
    },
  });

  // Silence reconnect spam — server.js already warns once at startup
  conn.on('error', () => {});
  conn.on('reconnecting', () => {});

  return conn;
};

module.exports = { getRedisClient, createBullMQConnection };
