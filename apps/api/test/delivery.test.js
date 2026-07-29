import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { ContentCatalogService } from '../src/services/content/ContentCatalogService.js';
import { AgentRepository } from '../src/repositories/AgentRepository.js';
import { AdminStatsRepository } from '../src/repositories/AdminStatsRepository.js';
import { SystemSettingsRepository } from '../src/repositories/SystemSettingsRepository.js';
import { DashboardService } from '../src/services/admin/DashboardService.js';
import { ExportService } from '../src/services/admin/ExportService.js';
import { SystemSettingsService } from '../src/services/admin/SystemSettingsService.js';
import { SystemStatusService } from '../src/services/admin/SystemStatusService.js';
import { HealthService } from '../src/services/health/HealthService.js';
import { InstallationService } from '../src/services/setup/InstallationService.js';
import { AuthService } from '../src/services/auth/AuthService.js';
import { UserRepository } from '../src/repositories/UserRepository.js';
import { RefreshTokenRepository } from '../src/repositories/RefreshTokenRepository.js';

async function createStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);
  const catalog = new ContentCatalogService(pool);
  await catalog.initialize();

  const systemSettingsService = new SystemSettingsService(new SystemSettingsRepository(pool));
  await systemSettingsService.initialize({ setup_completed: 'false' });

  const dashboardService = new DashboardService(
    new AdminStatsRepository(pool, {
      listDocuments: () => catalog.listDocuments(),
      listPrompts: () => catalog.listPrompts(),
    })
  );

  const healthService = new HealthService({
    pool,
    aiGateway: {
      listProviders: () => [{ id: 'anthropic' }],
    },
    retrievalService: {
      retrieveRelevantContext: () => ({ rankedChunks: [], contextText: '' }),
    },
    workflowEngine: {
      workflowRules: { canTransition: () => true },
    },
  });

  return {
    pool,
    catalog,
    systemSettingsService,
    dashboardService,
    healthService,
    exportService: new ExportService({ pool, dashboardService }),
    systemStatusService: new SystemStatusService({
      pool,
      healthService,
      systemSettingsService,
      dashboardService,
    }),
    installationService: new InstallationService({
      authService: new AuthService({
        userRepository: new UserRepository(pool),
        refreshTokenRepository: new RefreshTokenRepository(pool),
      }),
      systemSettingsService,
      userRepository: new UserRepository(pool),
    }),
  };
}

test('HealthService reports database, AI Gateway, retrieval and workflow checks', async () => {
  const { healthService } = await createStack();
  const health = await healthService.getHealth();
  assert.equal(health.status, 'ok');
  assert.equal(health.checks.database.status, 'ok');
  assert.equal(health.checks.aiGateway.status, 'ok');
  assert.equal(health.checks.retrieval.status, 'ok');
  assert.equal(health.checks.workflow.status, 'ok');
});

test('SystemStatusService returns operational admin metrics', async () => {
  const { systemStatusService } = await createStack();
  const status = await systemStatusService.getSystemStatus();
  assert.ok(status.version);
  assert.ok(status.migrationVersion);
  assert.equal(typeof status.pendingApprovals, 'number');
  assert.equal(typeof status.storage.knowledgeDocuments, 'number');
  assert.ok(Array.isArray(status.environment.issues));
});

test('ExportService exports statistics as CSV and JSON', async () => {
  const { exportService } = await createStack();
  const json = await exportService.exportAs('statistics', 'json');
  const csv = await exportService.exportAs('statistics', 'csv');
  assert.match(json.contentType, /json/);
  assert.match(csv.contentType, /csv/);
  assert.ok(csv.body.includes('metric'));
});

test('InstallationService completes first-run setup', async () => {
  const { installationService } = await createStack();
  const before = await installationService.getStatus();
  assert.equal(before.requiresSetup, true);

  const result = await installationService.completeSetup({
    companyName: 'H-Kids Delivery',
    administratorName: 'Admin',
    administratorEmail: 'setup-admin@hkids.app',
    administratorPassword: 'SecurePass123!',
    anthropicApiKey: 'test-key',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-latest',
    language: 'French',
    timezone: 'Africa/Casablanca',
    currency: 'MAD',
  });

  assert.equal(result.success, true);
  const after = await installationService.getStatus();
  assert.equal(after.requiresSetup, false);
  assert.equal(after.setupCompleted, true);
});
