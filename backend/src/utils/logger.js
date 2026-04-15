const winston = require('winston');
const path = require('path');

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let out = `${timestamp} [${level}]: ${stack || message}`;
  if (Object.keys(meta).length > 1) out += ` ${JSON.stringify(meta)}`;
  return out;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? json()
      : combine(colorize(), devFormat)
  ),
  defaultMeta: { service: 'meterflow-api' },
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: path.join('logs', 'error.log'), level: 'error', maxsize: 5242880, maxFiles: 5 }),
          new winston.transports.File({ filename: path.join('logs', 'combined.log'), maxsize: 5242880, maxFiles: 5 }),
        ]
      : []),
  ],
});

module.exports = logger;
