require('express-async-errors');
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth.routes');
const apiRoutes = require('./routes/api.routes');
const apiKeyRoutes = require('./routes/apiKey.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const billingRoutes = require('./routes/billing.routes');
const webhookRoutes = require('./routes/webhook.routes');
const gatewayRoutes = require('./routes/gateway.routes');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-Id'],
  })
);

// ─── Body Parsing ──────────────────────────────────────────────────────────
// Note: Stripe webhook needs raw body - handled in billing routes
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Sanitization ─────────────────────────────────────────────────────────
app.use(mongoSanitize()); // Prevent NoSQL injection

// ─── Compression & Logging ────────────────────────────────────────────────
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'MeterFlow API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/apis', globalRateLimiter, apiRoutes);
app.use('/api/keys', globalRateLimiter, apiKeyRoutes);
app.use('/api/analytics', globalRateLimiter, analyticsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/webhooks', globalRateLimiter, webhookRoutes);

// ─── API Gateway (Core Feature) ───────────────────────────────────────────
app.use('/gateway', gatewayRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
