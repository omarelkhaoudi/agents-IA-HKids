import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, '..', '..');

dotenv.config({
  path: [path.join(apiRoot, '.env.local'), path.join(apiRoot, '.env')],
});

const nodeEnv = process.env.NODE_ENV || 'development';

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 3001),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  dbSsl: process.env.DB_SSL === 'true',
  jwtSecret:
    process.env.JWT_SECRET ||
    (nodeEnv === 'development' ? 'dev-only-jwt-secret-change-in-production' : ''),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresInMs: Number(process.env.JWT_REFRESH_EXPIRES_IN_MS || 7 * 24 * 60 * 60 * 1000),
  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || 'admin@hkids.app',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!',
  defaultAdminName: process.env.DEFAULT_ADMIN_NAME || 'H-Kids Administrator',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  defaultProvider: process.env.DEFAULT_PROVIDER || 'anthropic',
  defaultModel: process.env.DEFAULT_MODEL || 'claude-3-5-sonnet-latest',
  maxTokens: Number(process.env.MAX_TOKENS || 1500),
  temperature: Number(process.env.TEMPERATURE || 0.3),
  enableStreaming: process.env.ENABLE_STREAMING === 'true',
  maxRetries: Number(process.env.MAX_RETRIES || 2),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 30000),
  enableUsageTracking: process.env.ENABLE_USAGE_TRACKING !== 'false',
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'mock',
  embeddingModel: process.env.EMBEDDING_MODEL || 'mock-hash-v1',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '1mb',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 300),
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
};

export function assertProductionConfig() {
  if (env.nodeEnv !== 'production') {
    return;
  }

  const missing = [];

  if (!env.jwtSecret) {
    missing.push('JWT_SECRET');
  }

  if (!env.databaseUrl) {
    missing.push('DATABASE_URL');
  }

  if (!env.clientUrl || env.clientUrl.includes('localhost')) {
    missing.push('CLIENT_URL');
  }

  if (env.defaultAdminPassword === 'Admin123!') {
    missing.push('DEFAULT_ADMIN_PASSWORD (must be changed in production)');
  }

  if (missing.length > 0) {
    throw new Error(`Missing or unsafe production configuration: ${missing.join(', ')}`);
  }
}
