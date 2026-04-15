const axios = require('axios');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const apiKeyService = require('../services/apiKeyService');
const usageRepository = require('../repositories/usageRepository');
const apiRepository = require('../repositories/apiRepository');
const apiKeyRepository = require('../repositories/apiKeyRepository');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

// requests per minute per plan
// TODO: make this configurable via env or db
const PLAN_LIMITS = {
  free: 10,
  pro: 100,
  enterprise: 1000,
};

// cache limiters so we're not recreating them on every request
const limiterCache = new Map();

function getLimiter(keyId, rpm) {
  const cacheKey = `${keyId}_${rpm}`;
  if (limiterCache.has(cacheKey)) return limiterCache.get(cacheKey);

  let limiter;
  try {
    limiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: `gw_${keyId}`,
      points: rpm,
      duration: 60,
      blockDuration: 60,
    });
  } catch {
    // redis not available, fall back to memory
    limiter = new RateLimiterMemory({
      keyPrefix: `gw_${keyId}`,
      points: rpm,
      duration: 60,
    });
  }

  limiterCache.set(cacheKey, limiter);
  return limiter;
}

function extractKey(req) {
  if (req.headers['x-api-key']) return req.headers['x-api-key'];
  if (req.headers.authorization) {
    const [type, token] = req.headers.authorization.split(' ');
    if (type === 'Bearer' && token) return token;
  }
  if (req.query.api_key) return req.query.api_key;
  return null;
}

// main gateway handler - this is the core of the whole thing
const gatewayHandler = async (req, res) => {
  const start = Date.now();
  const { apiId } = req.params;
  const path = req.params[0] ? `/${req.params[0]}` : '/';

  let keyDoc = null;

  try {
    // 1. get the key
    const rawKey = extractKey(req);
    if (!rawKey) {
      return res.status(401).json({
        error: 'API key required',
        hint: 'Pass your key via X-API-Key header',
      });
    }

    // 2. validate it
    keyDoc = await apiKeyService.validateApiKey(rawKey);

    // make sure the key actually belongs to this api
    const keyApiId = keyDoc.apiId._id
      ? keyDoc.apiId._id.toString()
      : keyDoc.apiId.toString();

    if (keyApiId !== apiId) {
      return res.status(403).json({ error: 'Key does not belong to this API' });
    }

    // 3. rate limiting based on plan
    const plan = keyDoc.ownerId?.subscriptionPlan || 'free';
    const planLimit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const keyLimit = keyDoc.rateLimit?.requestsPerMinute || planLimit;
    const effectiveLimit = Math.min(keyLimit, planLimit);

    try {
      await getLimiter(keyDoc._id.toString(), effectiveLimit).consume(keyDoc._id.toString());
    } catch (rl) {
      const retryAfter = rl.msBeforeNext ? Math.ceil(rl.msBeforeNext / 1000) : 60;

      // still log the blocked request
      logRequest({ keyDoc, apiId, path, req, statusCode: 429, latency: Date.now() - start, error: 'rate limited' });

      res.set('Retry-After', retryAfter);
      res.set('X-RateLimit-Limit', effectiveLimit);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter,
        plan,
        limit: `${effectiveLimit} req/min`,
      });
    }

    // 4. build the upstream request
    const api = keyDoc.apiId;
    const base = api.baseUrl.replace(/\/$/, '');
    const target = `${base}${path}`;

    // strip query params we added, forward the rest
    const query = { ...req.query };
    delete query.api_key;
    const qs = new URLSearchParams(query).toString();
    const url = qs ? `${target}?${qs}` : target;

    // clean up headers before forwarding
    const headers = { ...req.headers };
    delete headers['x-api-key'];
    delete headers['authorization'];
    delete headers['host'];
    delete headers['connection'];
    headers['X-Forwarded-By'] = 'MeterFlow';
    headers['X-Request-Id'] = `mf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 5. forward it
    const upstream = await axios({
      method: req.method,
      url,
      headers,
      data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
      timeout: 30000,
      validateStatus: () => true, // don't throw on 4xx/5xx
      maxRedirects: 5,
    });

    const latency = Date.now() - start;

    // 6. log usage async - don't await, don't block the response
    logRequest({
      keyDoc,
      apiId,
      path,
      req,
      statusCode: upstream.status,
      latency,
      responseSize: JSON.stringify(upstream.data).length,
    });

    // update last used timestamp in background
    apiKeyRepository.updateLastUsed(keyDoc._id).catch(() => {});
    apiRepository.incrementStats(apiId, 1, upstream.status >= 400 ? 1 : 0, latency).catch(() => {});

    // 7. forward the response back
    const skipHeaders = ['transfer-encoding', 'connection', 'keep-alive'];
    Object.entries(upstream.headers).forEach(([k, v]) => {
      if (!skipHeaders.includes(k.toLowerCase())) res.set(k, v);
    });

    res.set('X-MeterFlow-Latency', latency);
    res.set('X-RateLimit-Limit', effectiveLimit);
    res.set('X-RateLimit-Plan', plan);

    return res.status(upstream.status).json(upstream.data);

  } catch (err) {
    const latency = Date.now() - start;

    if (err.statusCode === 401 || err.statusCode === 403) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    // upstream connection issues
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      if (keyDoc) logRequest({ keyDoc, apiId, path, req, statusCode: 502, latency, error: 'upstream unavailable' });
      return res.status(502).json({ error: 'Upstream service unavailable' });
    }

    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Gateway timeout' });
    }

    logger.error(`Gateway error [${apiId}]: ${err.message}`);
    return res.status(500).json({ error: 'Gateway error' });
  }
};

// fire and forget - we don't want logging to slow down responses
async function logRequest({ keyDoc, apiId, path, req, statusCode, latency, responseSize = 0, error = null }) {
  try {
    const now = new Date();
    await usageRepository.create({
      apiKeyId: keyDoc._id,
      apiId,
      ownerId: keyDoc.ownerId._id || keyDoc.ownerId,
      tenantId: keyDoc.tenantId,
      endpoint: path,
      method: req.method,
      statusCode,
      latency,
      requestSize: parseInt(req.headers['content-length']) || 0,
      responseSize,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      isError: statusCode >= 400,
      errorMessage: error,
      timestamp: now,
      billingMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      billingYear: now.getFullYear(),
    });
  } catch (e) {
    logger.error(`Failed to log usage: ${e.message}`);
  }
}

module.exports = { gatewayHandler };
