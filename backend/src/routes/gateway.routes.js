const express = require('express');
const { gatewayHandler } = require('../gateways/apiGateway');

const router = express.Router();

/**
 * API Gateway - All requests to /gateway/:apiId/* are proxied
 * This is the core feature of MeterFlow
 */
router.all('/:apiId/*', gatewayHandler);
router.all('/:apiId', gatewayHandler);

module.exports = router;
