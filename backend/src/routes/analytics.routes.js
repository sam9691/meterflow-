const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { tenantIsolation } = require('../middleware/tenantIsolation');

const router = express.Router();

router.use(protect);
router.use(tenantIsolation);

router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/requests-over-time', analyticsController.getRequestsOverTime);
router.get('/top-endpoints', analyticsController.getTopEndpoints);
router.get('/status-codes', analyticsController.getStatusCodeDistribution);
router.get('/latency', analyticsController.getLatencyStats);
router.get('/activity', analyticsController.getRecentActivity);
router.get('/api/:apiId', analyticsController.getApiAnalytics);

module.exports = router;
