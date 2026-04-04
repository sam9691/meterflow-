require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/database');
const { getRedisClient } = require('./config/redis');
const { startBillingWorker } = require('./queues/billingQueue');
const { initCronJobs } = require('./jobs/cronJobs');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Redis (non-blocking)
    try {
      getRedisClient();
    } catch (err) {
      logger.warn(`Redis connection failed: ${err.message}. Rate limiting will use memory.`);
    }

    // Start BullMQ worker (non-blocking)
    try {
      startBillingWorker();
    } catch (err) {
      logger.warn(`BullMQ worker failed to start: ${err.message}`);
    }

    // Initialize cron jobs
    initCronJobs();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════╗
║          MeterFlow API Server             ║
║  Port: ${PORT}                               ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
║  Gateway: http://localhost:${PORT}/gateway   ║
╚═══════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          const mongoose = require('mongoose');
          await mongoose.connection.close();
          logger.info('MongoDB connection closed');
        } catch (err) {
          logger.error(`Error closing MongoDB: ${err.message}`);
        }

        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
