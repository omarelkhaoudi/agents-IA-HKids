import { applyRuntimeSecretsToEnv } from './services/setup/InstallationService.js';
import { assertProductionConfig } from './config/env.js';
import { initializeAuthRuntime } from './runtime/auth-runtime.js';
import { initializeContentRuntime } from './runtime/content-runtime.js';
import { initializeAdminRuntime } from './runtime/admin-runtime.js';
import { initializeSetupRuntime } from './runtime/setup-runtime.js';
import { initializeCommunityManagerRuntime } from './runtime/community-manager-runtime.js';
import { initializeSalesAgentRuntime } from './runtime/sales-agent-runtime.js';
import { initializeHrAgentRuntime } from './runtime/hr-agent-runtime.js';
import { initializeObservabilityRuntime } from './runtime/observability-runtime.js';
import { healthService } from './runtime/health-runtime.js';
import { workflowEngine } from './runtime/workflow-runtime.js';
import { startServer } from './server.js';
import { logger } from './utils/logger.js';

applyRuntimeSecretsToEnv();
assertProductionConfig();

logger.info('startup_begin', { nodeEnv: process.env.NODE_ENV || 'development' });

await initializeAuthRuntime();
await initializeContentRuntime();
await workflowEngine.initialize();
await initializeAdminRuntime();
await initializeSetupRuntime();
await initializeCommunityManagerRuntime();
await initializeSalesAgentRuntime();
await initializeHrAgentRuntime();
await initializeObservabilityRuntime();

const readiness = await healthService.getReadiness();
logger.info('startup_diagnostics', {
  ready: readiness.ready,
  version: readiness.version,
  database: readiness.checks.database.status,
  aiGateway: readiness.checks.aiGateway.status,
  retrieval: readiness.checks.retrieval.status,
  workflow: readiness.checks.workflow.status,
});

startServer();
