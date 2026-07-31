import { env } from '../../config/env.js';
import { SECRET_NAMES, secretManager } from '../security/SecretManager.js';
import { logger } from '../../utils/logger.js';

export class SystemStatusService {
  constructor({ pool, healthService, systemSettingsService, dashboardService }) {
    this.pool = pool;
    this.healthService = healthService;
    this.systemSettingsService = systemSettingsService;
    this.dashboardService = dashboardService;
  }

  async getMigrationVersion() {
    const result = await this.pool.query(
      'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
    );
    return result.rows[0]?.version || 'none';
  }

  async getPendingCounts() {
    const [pendingWorkflows, pendingApprovals, pendingFeedback] = await Promise.all([
      this.pool.query(`
        SELECT COUNT(*)::int AS total
        FROM workflow_instances
        WHERE current_state IN ('Draft', 'Pending Review', 'In Progress')
      `),
      this.pool.query(`
        SELECT COUNT(*)::int AS total
        FROM generated_documents
        WHERE approved = false
      `),
      this.pool.query(`
        SELECT COUNT(*)::int AS total
        FROM feedback_patterns
        WHERE status = 'pending'
      `),
    ]);

    return {
      pendingWorkflows: pendingWorkflows.rows[0]?.total || 0,
      pendingApprovals: pendingApprovals.rows[0]?.total || 0,
      pendingFeedback: pendingFeedback.rows[0]?.total || 0,
    };
  }

  async getStorageUsage() {
    const [knowledge, generated, prompts] = await Promise.all([
      this.pool.query('SELECT COUNT(*)::int AS count FROM knowledge_documents'),
      this.pool.query('SELECT COUNT(*)::int AS count FROM generated_documents'),
      this.pool.query('SELECT COUNT(*)::int AS count FROM prompt_definitions'),
    ]);

    let approximateBytes = 0;

    try {
      const knowledgeSizes = await this.pool.query(
        'SELECT content FROM knowledge_documents LIMIT 500'
      );
      const generatedSizes = await this.pool.query(
        'SELECT rendered_preview FROM generated_documents LIMIT 500'
      );
      approximateBytes =
        knowledgeSizes.rows.reduce((sum, row) => sum + String(row.content || '').length, 0) +
        generatedSizes.rows.reduce(
          (sum, row) => sum + String(row.rendered_preview || '').length,
          0
        );
    } catch {
      approximateBytes = 0;
    }

    return {
      knowledgeDocuments: knowledge.rows[0]?.count || 0,
      generatedDocuments: generated.rows[0]?.count || 0,
      prompts: prompts.rows[0]?.count || 0,
      approximateBytes,
      approximateMegabytes: Number((approximateBytes / (1024 * 1024)).toFixed(3)),
      note: 'Documents are stored in PostgreSQL (content and rendered previews).',
    };
  }

  async getVectorStatus() {
    const [chunks, embeddings, missing, failed, queue] = await Promise.all([
      this.pool.query(
        'SELECT COUNT(*)::int AS total, COALESCE(AVG(token_count), 0) AS average_tokens FROM knowledge_vector_chunks'
      ),
      this.pool.query(
        "SELECT COUNT(*)::int AS total FROM knowledge_vector_embeddings WHERE status = 'ready'"
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS total
         FROM knowledge_vector_chunks c
         LEFT JOIN knowledge_vector_embeddings e ON e.chunk_id = c.id AND e.status = 'ready'
         WHERE e.chunk_id IS NULL`
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS total
         FROM knowledge_documents
         WHERE processing_status = 'failed' OR embedding_status = 'failed'`
      ),
      this.pool.query(
        "SELECT COUNT(*)::int AS total FROM knowledge_index_jobs WHERE status IN ('queued', 'running')"
      ),
    ]);

    const chunkCount = chunks.rows[0]?.total || 0;
    const embeddingCount = embeddings.rows[0]?.total || 0;

    return {
      provider: env.embeddingProvider || 'mock',
      model: env.embeddingModel || 'mock-hash-v1',
      chunks: chunkCount,
      embeddings: embeddingCount,
      coveragePercent: chunkCount ? Number(((embeddingCount / chunkCount) * 100).toFixed(1)) : 0,
      averageChunkTokens: Number(Number(chunks.rows[0]?.average_tokens || 0).toFixed(1)),
      missingEmbeddings: missing.rows[0]?.total || 0,
      failedIndexing: failed.rows[0]?.total || 0,
      queueSize: queue.rows[0]?.total || 0,
    };
  }

  validateEnvironment() {
    const issues = [];

    if (!secretManager.getSecret(SECRET_NAMES.JWT_SECRET)) {
      issues.push('JWT_SECRET is missing');
    }

    if (env.nodeEnv === 'production' && !env.databaseUrl) {
      issues.push('DATABASE_URL is required in production');
    }

    if (env.nodeEnv === 'production' && env.clientUrl.includes('localhost')) {
      issues.push('CLIENT_URL must not use localhost in production');
    }

    if (!secretManager.getProviderConfiguration('anthropic').apiKey) {
      issues.push('ANTHROPIC_API_KEY is not configured');
    }

    if (env.defaultAdminPassword === 'Admin123!' && env.nodeEnv === 'production') {
      issues.push('DEFAULT_ADMIN_PASSWORD must be changed in production');
    }

    return {
      valid: issues.length === 0,
      issues,
      nodeEnv: env.nodeEnv,
      defaultProvider: env.defaultProvider,
      defaultModel: env.defaultModel,
      clientUrl: env.clientUrl,
      databaseConfigured: Boolean(env.databaseUrl),
      anthropicConfigured: Boolean(secretManager.getProviderConfiguration('anthropic').apiKey),
    };
  }

  async getSystemStatus() {
    const [health, settings, dashboard, migrationVersion, pending, storage, vector] = await Promise.all([
      this.healthService.getHealth(),
      this.systemSettingsService.getSettings(),
      this.dashboardService.getDashboard(),
      this.getMigrationVersion(),
      this.getPendingCounts(),
      this.getStorageUsage(),
      this.getVectorStatus(),
    ]);

    const environment = this.validateEnvironment();
    const anthropicConfigured = Boolean(secretManager.getProviderConfiguration('anthropic').apiKey);
    const claudeApi = {
      status: anthropicConfigured ? health.checks.aiGateway.status : 'unconfigured',
      configured: anthropicConfigured,
      provider: settings.default_provider || env.defaultProvider,
      model: settings.default_model || env.defaultModel,
    };

    logger.debug('system_status_collected', {
      migrationVersion,
      database: health.checks.database.status,
    });

    return {
      system: {
        status: health.status,
        version: health.version,
        uptimeSeconds: health.uptimeSeconds,
        nodeEnv: env.nodeEnv,
      },
      database: health.checks.database,
      claudeApi,
      storage,
      vector,
      aiUsage: {
        totalRequests: dashboard.totalRequests,
        totalCost: dashboard.totalAiCost,
        totalTokens: dashboard.totalTokens,
        averageResponseMs: dashboard.averageResponseMs,
      },
      currentModel: settings.default_model || env.defaultModel,
      currentProvider: settings.default_provider || env.defaultProvider,
      version: health.version,
      migrationVersion,
      environment,
      pendingWorkflows: pending.pendingWorkflows,
      pendingApprovals: pending.pendingApprovals,
      pendingFeedback: pending.pendingFeedback,
      checks: health.checks,
    };
  }
}
