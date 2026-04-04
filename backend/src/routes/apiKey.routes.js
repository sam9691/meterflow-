const express = require('express');
const apiKeyController = require('../controllers/apiKeyController');
const { protect } = require('../middleware/auth');
const { tenantIsolation } = require('../middleware/tenantIsolation');

const router = express.Router();

router.use(protect);
router.use(tenantIsolation);

router.get('/', apiKeyController.getMyKeys);
router.patch('/:keyId', apiKeyController.updateKey);
router.post('/:keyId/revoke', apiKeyController.revokeKey);
router.post('/:keyId/rotate', apiKeyController.rotateKey);

module.exports = router;
