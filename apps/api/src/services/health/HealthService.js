import { env } from '../../config/env.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const startedAt = Date.now();

function readAppVersion() {
  try {
    const packagePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../../package.json'
    );
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

export class HealthService {
  constructor({ pool, aiGateway, retrievalService, workflowEngine }) {
    this.pool = pool;
    this.aiGateway = aiGateway;
    this.retrievalService = retrievalService;
    this.workflowEngine = workflowEngine;
    this.version = readAppVersion();
  }

  getUptimeSeconds() {
    return Math.round((Date.now() - startedAt) / 1000);
  }

  async checkDatabase() {
    const started = Date.now();
    try {
      await this.pool.query('SELECT 1 AS ok');
      return {
        status: 'ok',
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        status: 'error',
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : 'Database check failed',
      };
    }
  }

  checkAiGateway() {
    try {
      const providers = this.aiGateway.listProviders();
      const hasAnthropic = providers.some((provider) => provider.id === 'anthropic' || provider === 'anthropic');
      return {
        status: 'ok',
        providers: providers.map((provider) => (typeof provider === 'string' ? provider : provider.id)),
        defaultProvider: env.defaultProvider,
        defaultModel: env.defaultModel,
        anthropicConfigured: Boolean(env.anthropicApiKey),
        claudeReady: hasAnthropic,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'AI Gateway check failed',
      };
    }
  }

  checkRetrieval() {
    try {
      const result = this.retrievalService.retrieveRelevantContext('health check');
      return {
        status: 'ok',
        chunks: Array.isArray(result?.rankedChunks) ? result.rankedChunks.length : 0,
        hasContext: Boolean(result?.contextText || result?.context),
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Retrieval check failed',
      };
    }
  }

  checkWorkflow() {
    try {
      const rules = this.workflowEngine?.workflowRules;
      const hasRules = Boolean(rules?.canTransition || rules?.getAllowedTransitions);
      return {
        status: hasRules || Boolean(this.workflowEngine) ? 'ok' : 'error',
        engine: 'WorkflowEngine',
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Workflow check failed',
      };
    }
  }

  async getHealth() {
    const [database, aiGateway, retrieval, workflow] = await Promise.all([
      this.checkDatabase(),
      Promise.resolve(this.checkAiGateway()),
      Promise.resolve(this.checkRetrieval()),
      Promise.resolve(this.checkWorkflow()),
    ]);

    const checks = { database, aiGateway, retrieval, workflow };
    const healthy = Object.values(checks).every((check) => check.status === 'ok');

    return {
      status: healthy ? 'ok' : 'degraded',
      version: this.version,
      uptimeSeconds: this.getUptimeSeconds(),
      checks,
    };
  }

  async getReadiness() {
    const health = await this.getHealth();
    const ready = health.checks.database.status === 'ok' && health.checks.workflow.status === 'ok';

    return {
      ready,
      status: ready ? 'ready' : 'not_ready',
      version: this.version,
      checks: health.checks,
    };
  }
}
