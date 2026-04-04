const express = require('express');
const { body } = require('express-validator');
const billingController = require('../controllers/billingController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Stripe webhook - raw body needed, no auth
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  billingController.stripeWebhook
);

// Protected routes
router.use(protect);

router.get('/plans', billingController.getPlans);
router.get('/usage', billingController.getCurrentUsage);
router.get('/history', billingController.getBillingHistory);
router.get('/invoices', billingController.getInvoices);
router.get('/subscription', billingController.getSubscription);

router.post(
  '/checkout',
  [
    body('plan').isIn(['pro', 'enterprise']).withMessage('Valid plan required'),
  ],
  validate,
  billingController.createCheckoutSession
);

router.post('/portal', billingController.createPortalSession);

module.exports = router;
