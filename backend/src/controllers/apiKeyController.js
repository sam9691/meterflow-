const apiKeyService = require('../services/apiKeyService');
const ApiResponse = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

class ApiKeyController {
  async createKey(req, res) {
    const { apiId } = req.params;
    const keyData = await apiKeyService.createApiKey(
      apiId,
      req.user._id,
      req.tenantId,
      req.body
    );

    return ApiResponse.created(
      res,
      { apiKey: keyData },
      'API key created. Save the raw key — it will not be shown again.'
    );
  }

  async getApiKeys(req, res) {
    const { page, limit } = getPagination(req.query);
    const { keys, total } = await apiKeyService.getApiKeys(
      req.params.apiId,
      req.user._id,
      req.tenantId,
      { page, limit, status: req.query.status }
    );

    return ApiResponse.paginated(
      res,
      { keys },
      buildPaginationMeta(total, page, limit)
    );
  }

  async getMyKeys(req, res) {
    const { page, limit } = getPagination(req.query);
    const { keys, total } = await apiKeyService.getOwnerKeys(req.user._id, {
      page, limit, status: req.query.status,
    });

    return ApiResponse.paginated(
      res,
      { keys },
      buildPaginationMeta(total, page, limit)
    );
  }

  async revokeKey(req, res) {
    const key = await apiKeyService.revokeKey(
      req.params.keyId,
      req.user._id,
      req.tenantId
    );
    return ApiResponse.success(res, { key }, 'API key revoked');
  }

  async rotateKey(req, res) {
    const newKey = await apiKeyService.rotateKey(
      req.params.keyId,
      req.user._id,
      req.tenantId
    );
    return ApiResponse.success(
      res,
      { apiKey: newKey },
      'API key rotated. Save the new raw key — it will not be shown again.'
    );
  }

  async updateKey(req, res) {
    const key = await apiKeyService.updateKey(
      req.params.keyId,
      req.tenantId,
      req.body
    );
    return ApiResponse.success(res, { key }, 'API key updated');
  }
}

module.exports = new ApiKeyController();
