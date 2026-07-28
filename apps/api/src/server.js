import { createApp } from './app.js';
import { env } from './config/env.js';

export function startServer() {
  const app = createApp();

  app.listen(env.port, () => {
    console.info(`API listening on http://localhost:${env.port}`);
  });
}
