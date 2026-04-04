const express = require('express');
const { body, param } = require('express-validator');
const apiController = require('../controllers/apiController');
const apiKeyController = require('../controllers/apiKeyController');
const { protect } = require('../middleware/auth');
const { tenantIsolation } = require('../middleware/tenantIsolation');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(protect);
router.use(tenantIsolation);

// API CRUD
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name required (2-100 chars)'),
    body('baseUrl').isURL({ protocols: ['http', 'https'] }).withMessage('Valid base URL required'),
    body('visibility').optional().isIn(['public', 'private']),
    body('category').optional().isIn([
      'finance', 'weather', 'social', 'ecommerce', 'health',
      'maps', 'communication', 'ai', 'data', 'other',
    ]),
  ],
  validate,
  apiController.createApi
);

router.get('/', apiController.getMyApis);
router.get('/public', apiController.getPublicApis);
router.get('/:id', apiController.getApiById);
router.patch('/:id', apiController.updateApi);
router.delete('/:id', apiController.deleteApi);
router.get('/:id/stats', apiController.getApiStats);

// API Key management (nested under API)
router.post(
  '/:apiId/keys',
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Key name required'),
    body('environment').optional().isIn(['live', 'test']),
  ],
  validate,
  apiKeyController.createKey
);

router.get('/:apiId/keys', apiKeyController.getApiKeys);

module.exports = router;
