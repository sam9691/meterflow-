const ApiResponse = require('../utils/apiResponse');

/**
 * Tenant isolation middleware
 * Ensures users can only access their own tenant's resources
 */
const tenantIsolation = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.unauthorized(res, 'Authentication required');
  }

  // Set tenantId from authenticated user
  req.tenantId = req.user.tenantId;

  // Admin can access all tenants
  if (req.user.role === 'admin') {
    // Allow admin to specify tenantId via header for cross-tenant operations
    if (req.headers['x-tenant-id']) {
      req.tenantId = req.headers['x-tenant-id'];
    }
  }

  next();
};

/**
 * Validate resource ownership
 * Use this to check if a resource belongs to the current tenant
 */
const validateOwnership = (resourceTenantId, req, res) => {
  if (req.user.role === 'admin') return true;
  if (resourceTenantId !== req.tenantId) {
    ApiResponse.forbidden(res, 'Access denied: resource belongs to another tenant');
    return false;
  }
  return true;
};

module.exports = { tenantIsolation, validateOwnership };
