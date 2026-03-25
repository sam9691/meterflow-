/**
 * Standardized API response utility
 */

class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };
    if (errors) response.errors = errors;
    return res.status(statusCode).json(response);
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  static tooManyRequests(res, message = 'Too many requests', retryAfter = null) {
    if (retryAfter) {
      res.set('Retry-After', retryAfter);
    }
    return this.error(res, message, 429);
  }

  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = ApiResponse;
