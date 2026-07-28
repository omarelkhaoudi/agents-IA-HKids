export function requestLogger(request, response, next) {
  const startedAt = Date.now();

  response.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.info(
      `[${new Date().toISOString()}] ${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`
    );
  });

  next();
}
