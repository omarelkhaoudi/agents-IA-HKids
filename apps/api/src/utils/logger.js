function serialize(level, message, meta = {}) {
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  });
}

export const logger = {
  info(message, meta) {
    console.info(serialize('info', message, meta));
  },
  warn(message, meta) {
    console.error(serialize('warn', message, meta));
  },
  error(message, meta) {
    console.error(serialize('error', message, meta));
  },
  debug(message, meta) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(serialize('debug', message, meta));
    }
  },
};
