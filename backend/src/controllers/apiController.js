const apiService = require('../services/apiService');
const ApiResponse = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

class ApiController {
  async createApi(req, res) {
    const api = await apiService.createApi(req.user._id, req.tenantId, req.body);
    return ApiResponse.created(res, { api }, 'API created successfully');
  }

  async getMyApis(req, res) {
    const { page, limit, skip } = getPagination(req.query);
    const { status, search } = req.query;

    const { apis, total } = await apiService.getUserApis(req.user._id, {
      page, limit, status, search,
    });

    return ApiResponse.paginated(
      res,
      { apis },
      buildPaginationMeta(total, page, limit)
    );
  }

  async getPublicApis(req, res) {
    const { page, limit } = getPagination(req.query);
    const { category, search } = req.query;

    const { apis, total } = await apiService.getPublicApis({ page, limit, category, search });

    return ApiResponse.paginated(
      res,
      { apis },
      buildPaginationMeta(total, page, limit)
    );
  }

  async getApiById(req, res) {
    const api = await apiService.getApiById(
      req.params.id,
      req.user._id,
      req.user.role
    );
    return ApiResponse.success(res, { api });
  }

  async updateApi(req, res) {
    const api = await apiService.updateApi(
      req.params.id,
      req.user._id,
      req.user.role,
      req.body
    );
    return ApiResponse.success(res, { api }, 'API updated successfully');
  }

  async deleteApi(req, res) {
    await apiService.deleteApi(req.params.id, req.user._id, req.user.role);
    return ApiResponse.success(res, null, 'API deleted successfully');
  }

  async getApiStats(req, res) {
    const stats = await apiService.getApiStats(
      req.params.id,
      req.user._id,
      req.user.role
    );
    return ApiResponse.success(res, { stats });
  }
}

module.exports = new ApiController();
