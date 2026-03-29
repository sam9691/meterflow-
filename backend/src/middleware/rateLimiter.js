const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const { getRedisClient } = require('../config/redis');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

let rateLimiterInstance = null;
let authRateLimiterInstance = null;

const getRateLimiter = () => {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiterMemory({
      keyPrefix: 'rl_global',
      points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      duration: 60,
    });
  }
  return rateLimiterInstance;
};

const getAuthRateLimiter = () => {
  if (!authRateLimiterInstance) {
    authRateLimiterInstance = new RateLimiterMemory({
      keyPrefix: 'rl_auth',
      points: 10,
      duration: 900,
    });
  }
  return authRateLimiterInstance;
};

/**
 * General API rate limiter middleware
 */
const globalRateLimiter = async (req, res, next) => {
  try {
    const key = req.user ? req.user._id.toString() : req.ip;
    await getRateLimiter().consume(key);
    next();
  } catch (rejRes) {
    const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
    return ApiResponse.tooManyRequests(
      res,
      `Too many requests. Please retry after ${retryAfter} seconds`,
      retryAfter
    );
  }
};

/**
 * Auth-specific rate limiter (stricter)
 */
const authRateLimiter = async (req, res, next) => {
  try {
    const key = req.ip;
    await getAuthRateLimiter().consume(key);
    next();
  } catch (rejRes) {
    const retryAfter = rejRes.msBeforeNext
      ? Math.ceil(rejRes.msBeforeNext / 1000)
      : 60;
    return ApiResponse.tooManyRequests(
      res,
      `Too many authentication attempts. Please retry after ${retryAfter} seconds`,
      retryAfter
    );
  }
};

/**
 * Create a per-API-key rate limiter based on subscription plan
 */
const createApiKeyRateLimiter = (requestsPerMinute) => {
  return async (req, res, next) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      if (!apiKey) return next();

      let limiter;
      try {
        const redisClient = getRedisClient();
        limiter = new RateLimiterRedis({
          storeClient: redisClient,
          keyPrefix: 'rl_apikey',
          points: requestsPerMinute,
          duration: 60,
          blockDuration: 60,
        });
      } catch {
        limiter = new RateLimiterMemory({
          keyPrefix: 'rl_apikey',
          points: requestsPerMinute,
          duration: 60,
        });
      }

      await limiter.consume(apiKey);
      next();
    } catch (rejRes) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
      return ApiResponse.tooManyRequests(
        res,
        `Rate limit exceeded. Retry after ${retryAfter} seconds`,
        retryAfter
      );
    }
  };
};

module.exports = { globalRateLimiter, authRateLimiter, createApiKeyRateLimiter };
