import { env } from '../config/env.js';

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

  if (isServerError) {
    console.error(`[error] ${request.method} ${request.originalUrl}`, error);
  }

  response.status(statusCode).json({
    message,
    ...(env.nodeEnv !== 'production' && error.stack ? { stack: error.stack } : {}),
  });
}

export function notFoundHandler(request, response) {
  response.status(404).json({
    message: `Route not found: ${request.method} ${request.originalUrl}`,
  });
}
