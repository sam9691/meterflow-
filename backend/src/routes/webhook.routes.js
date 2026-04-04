const express = require('express');
const { body } = require('express-validator');
const webhookController = require('../controllers/webhookController');
const { protect } = require('../middleware/auth');
const { tenantIsolation } = require('../middleware/tenantIsolation');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.use(tenantIsolation);

const VALID_EVENTS = [
  'usage.threshold_reached',
  'payment.success',
  'payment.failed',
  'billing.generated',
  'api.key_created',
  'api.key_revoked',
  'subscription.upgraded',
  'subscription.downgraded',
  'subscription.cancelled',
];

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name required'),
    body('url').isURL({ protocols: ['http', 'https'] }).withMessage('Valid URL required'),
    body('events').isArray({ min: 1 }).withMessage('At least one event required'),
    body('events.*').isIn(VALID_EVENTS).withMessage('Invalid event type'),
  ],
  validate,
  webhookController.createWebhook
);

router.get('/', webhookController.getWebhooks);
router.patch('/:id', webhookController.updateWebhook);
router.delete('/:id', webhookController.deleteWebhook);
router.get('/:id/deliveries', webhookController.getDeliveries);

module.exports = router;
