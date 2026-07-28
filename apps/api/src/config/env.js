import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  dbSsl: process.env.DB_SSL === 'true',
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
};
