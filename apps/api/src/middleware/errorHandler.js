import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  const statusCode = error.statusCode || error.status || 500;
  const isServerError = statusCode >= 500;
  const message =
    isServerError && env.nodeEnv === 'production'
      ? 'An unexpected error occurred.'
      : error.message || 'An unexpected error occurred.';

  logger.error('http_error', {
    requestId: request.requestId,
    method: request.method,
    path: request.originalUrl,
    statusCode,
    message: error.message,
    stack: env.nodeEnv === 'production' ? undefined : error.stack,
  });

  response.status(statusCode).json({
    message,
    requestId: request.requestId,
    ...(env.nodeEnv !== 'production' && error.stack ? { stack: error.stack } : {}),
  });
}

export function notFoundHandler(request, response) {
  response.status(404).json({
    message: `Route not found: ${request.method} ${request.originalUrl}`,
    requestId: request.requestId,
  });
}
