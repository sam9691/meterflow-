const axios = require('axios');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const apiKeyService = require('../services/apiKeyService');
const usageRepository = require('../repositories/usageRepository');
const apiRepository = require('../repositories/apiRepository');
const apiKeyRepository = require('../repositories/apiKeyRepository');
const { getRedisClient } = require('../config/redis');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

// Plan-based rate limits (requests per minute)
const PLAN_RATE_LIMITS = {
  free: 10,
  pro: 100,
  enterprise: 1000,
};

// Cache for rate limiters per API key
const rateLimiterCache = new Map();

/**
 * Get or create a rate limiter for a specific key + plan
 */
const getRateLimiter = (keyId, requestsPerMinute) => {
  const cacheKey = `${keyId}_${requestsPerMinute}`;

  if (rateLimiterCache.has(cacheKey)) {
    return rateLimiterCache.get(cacheKey);
  }

  let limiter;
  try {
    const redisClient = getRedisClient();
    limiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: `gw_rl_${keyId}`,
      points: requestsPerMinute,
      duration: 60,
      blockDuration: 60,
    });
  } catch {
    limiter = new RateLimiterMemory({
      keyPrefix: `gw_rl_${keyId}`,
      points: requestsPerMinute,
      duration: 60,
    });
  }

  rateLimiterCache.set(cacheKey, limiter);
  return limiter;
};

/**
 * Extract API key from request
 */
const extractApiKey = (req) => {
  // Check header (preferred)
  if (req.headers['x-api-key']) return req.headers['x-api-key'];
  // Check Authorization: Bearer mf_live_xxx
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
  }
  // Check query param (less secure, for testing)
  if (req.query.api_key) return req.query.api_key;
  return null;
};

/**
 * Main API Gateway Handler
 * Route: /gateway/:apiId/*
 */
const gatewayHandler = async (req, res) => {
  const startTime = Date.now();
  const { apiId } = req.params;
  const rawPath = req.params[0] || '/';
  const endpoint = `/${rawPath}`;

  let apiKeyDoc = null;
  let statusCode = 500;
  let responseSize = 0;
  let errorMessage = null;

  try {
    // ─── Step 1: Extract API Key ───────────────────────────────────────────
    const rawApiKey = extractApiKey(req);
    if (!rawApiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
        hint: 'Provide your API key via X-API-Key header or Authorization: Bearer <key>',
      });
    }

    // ─── Step 2: Validate API Key ──────────────────────────────────────────
    apiKeyDoc = await apiKeyService.validateApiKey(rawApiKey);

    // Verify the key belongs to the requested API
    const keyApiId = apiKeyDoc.apiId._id
      ? apiKeyDoc.apiId._id.toString()
      : apiKeyDoc.apiId.toString();

    if (keyApiId !== apiId) {
      return res.status(403).json({
        success: false,
        error: 'API key does not belong to this API',
      });
    }

    // ─── Step 3: Rate Limiting ─────────────────────────────────────────────
    const ownerPlan = apiKeyDoc.ownerId?.subscriptionPlan || 'free';
    const planLimit = PLAN_RATE_LIMITS[ownerPlan] || PLAN_RATE_LIMITS.free;
    const keyLimit = apiKeyDoc.rateLimit?.requestsPerMinute || planLimit;
    const effectiveLimit = Math.min(keyLimit, planLimit);

    const rateLimiter = getRateLimiter(apiKeyDoc._id.toString(), effectiveLimit);

    try {
      await rateLimiter.consume(apiKeyDoc._id.toString());
    } catch (rejRes) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
      statusCode = 429;

      // Log the rate-limited request
      await logUsage({
        apiKeyDoc,
        apiId,
        endpoint,
        method: req.method,
        statusCode: 429,
        latency: Date.now() - startTime,
        requestSize: parseInt(req.headers['content-length']) || 0,
        responseSize: 0,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        errorMessage: 'Rate limit exceeded',
      });

      res.set('X-RateLimit-Limit', effectiveLimit);
      res.set('X-RateLimit-Remaining', 0);
      res.set('Retry-After', retryAfter);

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter,
        limit: effectiveLimit,
        plan: ownerPlan,
      });
    }

    // ─── Step 4: Build Proxy Request ──────────────────────────────────────
    const api = apiKeyDoc.apiId;
    const baseUrl = api.baseUrl.replace(/\/$/, '');
    const targetUrl = `${baseUrl}${endpoint}`;

    // Build query string (exclude our api_key param)
    const queryParams = { ...req.query };
    delete queryParams.api_key;
    const queryString = new URLSearchParams(queryParams).toString();
    const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

    // Forward headers (strip sensitive ones)
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders['x-api-key'];
    delete forwardHeaders['authorization'];
    delete forwardHeaders['host'];
    delete forwardHeaders['connection'];

    // Add gateway identification headers
    forwardHeaders['X-Forwarded-By'] = 'MeterFlow-Gateway';
    forwardHeaders['X-Gateway-Request-Id'] = `gw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ─── Step 5: Forward Request ───────────────────────────────────────────
    const axiosConfig = {
      method: req.method,
      url: fullUrl,
      headers: forwardHeaders,
      timeout: 30000, // 30 second timeout
      validateStatus: () => true, // Don't throw on any status
      maxRedirects: 5,
    };

    // Forward body for non-GET requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      axiosConfig.data = req.body;
    }

    const proxyResponse = await axios(axiosConfig);
    statusCode = proxyResponse.status;
    const responseData = proxyResponse.data;

    // Calculate sizes
    const requestSize = parseInt(req.headers['content-length']) || 0;
    responseSize = JSON.stringify(responseData).length;

    const latency = Date.now() - startTime;

    // ─── Step 6: Log Usage ─────────────────────────────────────────────────
    await logUsage({
      apiKeyDoc,
      apiId,
      endpoint,
      method: req.method,
      statusCode,
      latency,
      requestSize,
      responseSize,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Update API key last used
    apiKeyRepository.updateLastUsed(apiKeyDoc._id).catch(() => {});

    // Update API stats
    apiRepository
      .incrementStats(apiId, 1, statusCode >= 400 ? 1 : 0, latency)
      .catch(() => {});

    // ─── Step 7: Return Proxied Response ──────────────────────────────────
    // Forward response headers
    const responseHeaders = proxyResponse.headers;
    const skipHeaders = ['transfer-encoding', 'connection', 'keep-alive'];
    Object.entries(responseHeaders).forEach(([key, value]) => {
      if (!skipHeaders.includes(key.toLowerCase())) {
        res.set(key, value);
      }
    });

    // Add MeterFlow gateway headers
    res.set('X-MeterFlow-Latency', latency);
    res.set('X-MeterFlow-Request-Id', forwardHeaders['X-Gateway-Request-Id']);
    res.set('X-RateLimit-Limit', effectiveLimit);
    res.set('X-RateLimit-Plan', ownerPlan);

    return res.status(statusCode).json(responseData);
  } catch (error) {
    const latency = Date.now() - startTime;
    errorMessage = error.message;

    // Handle axios errors (upstream failures)
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      statusCode = 502;
      if (apiKeyDoc) {
        await logUsage({
          apiKeyDoc,
          apiId,
          endpoint,
          method: req.method,
          statusCode: 502,
          latency,
          requestSize: 0,
          responseSize: 0,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          errorMessage: 'Upstream service unavailable',
        });
      }
      return res.status(502).json({
        success: false,
        error: 'Upstream service unavailable',
        gateway: 'MeterFlow',
      });
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      statusCode = 504;
      return res.status(504).json({
        success: false,
        error: 'Gateway timeout',
        gateway: 'MeterFlow',
      });
    }

    // Auth errors from validateApiKey
    if (error.statusCode === 401 || error.statusCode === 403) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    logger.error(`Gateway error for API ${apiId}: ${error.message}`, { stack: error.stack });

    return res.status(500).json({
      success: false,
      error: 'Gateway internal error',
      gateway: 'MeterFlow',
    });
  }
};

/**
 * Log usage to database (non-blocking)
 */
const logUsage = async ({
  apiKeyDoc,
  apiId,
  endpoint,
  method,
  statusCode,
  latency,
  requestSize,
  responseSize,
  ipAddress,
  userAgent,
  errorMessage,
}) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    await usageRepository.create({
      apiKeyId: apiKeyDoc._id,
      apiId,
      ownerId: apiKeyDoc.ownerId._id || apiKeyDoc.ownerId,
      tenantId: apiKeyDoc.tenantId,
      endpoint,
      method,
      statusCode,
      latency,
      requestSize,
      responseSize,
      ipAddress,
      userAgent,
      isError: statusCode >= 400,
      errorMessage: errorMessage || null,
      timestamp: now,
      billingMonth: `${year}-${month}`,
      billingYear: year,
    });
  } catch (err) {
    logger.error(`Failed to log usage: ${err.message}`);
  }
};

module.exports = { gatewayHandler };
