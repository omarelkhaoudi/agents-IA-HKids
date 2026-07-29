import { logger } from '../utils/logger.js';

export function requestLogger(request, response, next) {
  const startedAt = Date.now();
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  request.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);

  response.on('finish', () => {
    logger.info('http_request', {
      requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
      userId: request.user?.id,
    });
  });

  next();
}
