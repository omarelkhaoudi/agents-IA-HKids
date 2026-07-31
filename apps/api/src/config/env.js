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

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST || '';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || '';
  const password = process.env.DB_PASSWORD || '';
  const name = process.env.DB_NAME || '';

  if (!host || !user || !name) {
    return '';
  }

  const auth =
    password !== undefined && password !== null
      ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
      : encodeURIComponent(user);

  return `postgresql://${auth}@${host}:${port}/${encodeURIComponent(name)}`;
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 3001),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: resolveDatabaseUrl(),
  dbHost: process.env.DB_HOST || '',
  dbPort: process.env.DB_PORT || '5432',
  dbUser: process.env.DB_USER || '',
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME || '',
  dbSsl: process.env.DB_SSL === 'true',
  jwtSecret:
    process.env.JWT_SECRET ||
    (nodeEnv === 'development' || nodeEnv === 'test'
      ? 'dev-only-jwt-secret-change-in-production'
      : ''),
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
  embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS || 384),
  embeddingBatchSize: Number(process.env.EMBEDDING_BATCH_SIZE || 16),
  embeddingCacheTtlMs: Number(process.env.EMBEDDING_CACHE_TTL_MS || 60 * 60 * 1000),
  openAiEmbeddingBaseUrl: process.env.OPENAI_EMBEDDING_BASE_URL || 'https://api.openai.com/v1',
  anthropicEmbeddingBaseUrl: process.env.ANTHROPIC_EMBEDDING_BASE_URL || '',
  localEmbeddingEndpoint: process.env.LOCAL_EMBEDDING_ENDPOINT || '',
  vectorChunkSize: Number(process.env.VECTOR_CHUNK_SIZE || 1400),
  vectorChunkOverlap: Number(process.env.VECTOR_CHUNK_OVERLAP || 180),
  vectorTopK: Number(process.env.VECTOR_TOP_K || 6),
  vectorMaxChunksPerDocument: Number(process.env.VECTOR_MAX_CHUNKS_PER_DOCUMENT || 500),
  vectorIndexBatchSize: Number(process.env.VECTOR_INDEX_BATCH_SIZE || 8),
  vectorCacheTtlMs: Number(process.env.VECTOR_CACHE_TTL_MS || 5 * 60 * 1000),
  retrievalSemanticWeight: Number(process.env.RETRIEVAL_SEMANTIC_WEIGHT || 0.5),
  retrievalKeywordWeight: Number(process.env.RETRIEVAL_KEYWORD_WEIGHT || 0.25),
  retrievalMetadataWeight: Number(process.env.RETRIEVAL_METADATA_WEIGHT || 0.25),
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '1mb',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 300),
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  aiConcurrencyCapacity: Number(process.env.AI_CONCURRENCY_CAPACITY || 8),
  storageQuotaMegabytes: Number(process.env.STORAGE_QUOTA_MB || 2048),
  alertLatencyMs: Number(process.env.ALERT_LATENCY_MS || 8000),
  alertErrorRatePercent: Number(process.env.ALERT_ERROR_RATE_PERCENT || 10),
  alertStoragePercent: Number(process.env.ALERT_STORAGE_PERCENT || 85),
  alertPendingApprovals: Number(process.env.ALERT_PENDING_APPROVALS || 25),
  alertFailedWorkflows: Number(process.env.ALERT_FAILED_WORKFLOWS || 5),
  alertRetrievalFailures: Number(process.env.ALERT_RETRIEVAL_FAILURES || 3),
  evaluationEnabled: process.env.EVALUATION_ENABLED !== 'false',
  evaluationStaleKnowledgeDays: Number(process.env.EVALUATION_STALE_KNOWLEDGE_DAYS || 90),
  evaluationRegressionDropPercent: Number(process.env.EVALUATION_REGRESSION_DROP_PERCENT || 8),
  evaluationMinQualityScore: Number(process.env.EVALUATION_MIN_QUALITY_SCORE || 70),
  evaluationQualityDropPercent: Number(process.env.EVALUATION_QUALITY_DROP_PERCENT || 10),
  evaluationMinApprovalRate: Number(process.env.EVALUATION_MIN_APPROVAL_RATE || 60),
  evaluationMaxHallucinationRisk: Number(process.env.EVALUATION_MAX_HALLUCINATION_RISK || 45),
  evaluationMaxFailureRate: Number(process.env.EVALUATION_MAX_FAILURE_RATE || 20),
  evaluationMaxStaleDocuments: Number(process.env.EVALUATION_MAX_STALE_DOCUMENTS || 10),
  evaluationMaxDailyCost: Number(process.env.EVALUATION_MAX_DAILY_COST || 25),
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
    missing.push('DATABASE_URL (or DB_HOST + DB_USER + DB_NAME)');
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
