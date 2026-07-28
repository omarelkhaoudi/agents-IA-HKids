import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { listDocuments } from '../src/data/mock-documents.js';
import { listPrompts } from '../src/data/mock-prompts.js';
import { AgentRepository } from '../src/repositories/AgentRepository.js';
import { AdminStatsRepository } from '../src/repositories/AdminStatsRepository.js';
import { SystemSettingsRepository } from '../src/repositories/SystemSettingsRepository.js';
import { AgentConfigurationService } from '../src/services/admin/AgentConfigurationService.js';
import { AgentManagementService } from '../src/services/admin/AgentManagementService.js';
import { DashboardService } from '../src/services/admin/DashboardService.js';
import { SystemSettingsService } from '../src/services/admin/SystemSettingsService.js';

async function createAdminStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);

  const agentRepository = new AgentRepository(pool);
  const systemSettingsRepository = new SystemSettingsRepository(pool);
  const adminStatsRepository = new AdminStatsRepository(pool, {
    listDocuments,
    listPrompts,
  });

  return {
    pool,
    agentManagementService: new AgentManagementService(agentRepository),
    systemSettingsService: new SystemSettingsService(systemSettingsRepository),
    dashboardService: new DashboardService(adminStatsRepository),
    agentConfigurationService: new AgentConfigurationService({
      agentRepository,
      listDocuments,
      listPrompts,
    }),
  };
}

test('SystemSettingsService stores editable platform settings', async () => {
  const { systemSettingsService } = await createAdminStack();
  await systemSettingsService.initialize();

  const updated = await systemSettingsService.updateSettings({
    default_provider: 'anthropic',
    company_name: 'H-Kids Admin',
    currency: 'EUR',
  });

  assert.equal(updated.company_name, 'H-Kids Admin');
  assert.equal(updated.currency, 'EUR');
  assert.equal(updated.default_provider, 'anthropic');
});

test('AgentManagementService creates and configures agents', async () => {
  const { agentManagementService, agentConfigurationService } = await createAdminStack();

  const created = await agentManagementService.createAgent({
    code: 'administrative-assistant',
    name: 'Administrative Assistant',
    description: 'Core agent',
    status: 'active',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-latest',
    temperature: 0.2,
    maxTokens: 1200,
    timeout: 20000,
    retryCount: 1,
    promptIds: ['prompt-001'],
    documentIds: ['doc-001'],
    workflowCodes: ['document-review'],
  });

  assert.equal(created.code, 'administrative-assistant');
  assert.deepEqual(created.promptIds, ['prompt-001']);

  const configured = await agentConfigurationService.updateConfiguration(created.id, {
    status: 'inactive',
    temperature: 0.5,
    workflowCodes: ['document-review', 'export-approval'],
  });

  assert.equal(configured.status, 'inactive');
  assert.equal(configured.temperature, 0.5);
  assert.deepEqual(configured.workflowCodes, ['document-review', 'export-approval']);

  const resources = agentConfigurationService.getAvailableResources();
  assert.ok(resources.prompts.length > 0);
  assert.ok(resources.documents.length > 0);
});

test('DashboardService returns governance metrics', async () => {
  const { dashboardService, agentManagementService, pool } = await createAdminStack();

  await agentManagementService.createAgent({
    code: 'administrative-assistant',
    name: 'Administrative Assistant',
    description: 'Core agent',
  });

  await pool.query(
    `
      INSERT INTO conversations (id, title, provider, model, language, current_context, metadata)
      VALUES ('session-001', 'Admin Session', 'anthropic', 'claude-3-5-sonnet-latest', 'English', '{}'::jsonb, '{}'::jsonb)
    `
  );

  const dashboard = await dashboardService.getDashboard();

  assert.equal(dashboard.totalAgents, 1);
  assert.equal(dashboard.totalConversations, 1);
  assert.ok(dashboard.knowledgeBaseDocuments > 0);
  assert.ok(dashboard.totalPrompts > 0);
  assert.equal(typeof dashboard.totalAiCost, 'number');
});
