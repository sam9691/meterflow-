const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  if (status >= 500) {
    logger.error(`${req.method} ${req.path} — ${status}: ${message}`, { stack: err.stack });
  } else {
    logger.warn(`${req.method} ${req.path} — ${status}: ${message}`);
  }

  // mongoose validation
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // bad objectid
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  }

  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  }

  const body = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) body.errors = errors;
  if (process.env.NODE_ENV === 'development') body.stack = err.stack;

  res.status(status).json(body);
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, notFoundHandler, AppError };
