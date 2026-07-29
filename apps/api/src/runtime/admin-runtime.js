import { listDocuments } from '../data/mock-documents.js';
import { listPrompts } from '../data/mock-prompts.js';
import { env } from '../config/env.js';
import { AgentRepository } from '../repositories/AgentRepository.js';
import { AdminStatsRepository } from '../repositories/AdminStatsRepository.js';
import { SystemSettingsRepository } from '../repositories/SystemSettingsRepository.js';
import { AgentConfigurationService } from '../services/admin/AgentConfigurationService.js';
import { AgentManagementService } from '../services/admin/AgentManagementService.js';
import { DashboardService } from '../services/admin/DashboardService.js';
import { ExportService } from '../services/admin/ExportService.js';
import { SystemSettingsService } from '../services/admin/SystemSettingsService.js';
import { SystemStatusService } from '../services/admin/SystemStatusService.js';
import { healthService } from './health-runtime.js';
import { persistenceService } from './assistant-runtime.js';

const agentRepository = new AgentRepository(persistenceService.pool);
const systemSettingsRepository = new SystemSettingsRepository(persistenceService.pool);
const adminStatsRepository = new AdminStatsRepository(persistenceService.pool, {
  listDocuments,
  listPrompts,
});

export const agentManagementService = new AgentManagementService(agentRepository);
export const systemSettingsService = new SystemSettingsService(systemSettingsRepository);
export const dashboardService = new DashboardService(adminStatsRepository);
export const exportService = new ExportService({
  pool: persistenceService.pool,
  dashboardService,
});
export const systemStatusService = new SystemStatusService({
  pool: persistenceService.pool,
  healthService,
  systemSettingsService,
  dashboardService,
});
export const agentConfigurationService = new AgentConfigurationService({
  agentRepository,
  listDocuments,
  listPrompts,
});

export async function initializeAdminRuntime() {
  await systemSettingsService.initialize({
    default_provider: env.defaultProvider,
    default_model: env.defaultModel,
    enable_streaming: String(env.enableStreaming),
    max_retries: String(env.maxRetries),
    request_timeout_ms: String(env.requestTimeoutMs),
    default_language: 'French',
    timezone: 'Africa/Casablanca',
    company_name: 'H-Kids',
    company_address: '14 Avenue des Orangers, Casablanca, Morocco',
    company_phone: '+212 5 22 00 00 00',
    company_email: 'contact@h-kids.ma',
    company_logo: '',
    legal_information: 'H-Kids SARL',
    vat_number: 'VAT-HKIDS-001',
    currency: 'MAD',
    setup_completed: env.nodeEnv === 'production' ? 'false' : 'true',
  });

  const existingAgents = await agentManagementService.listAgents();
  const existingByCode = new Set(existingAgents.map((agent) => agent.code));

  for (const blueprint of agentConfigurationService.listAgentBlueprints()) {
    if (existingByCode.has(blueprint.code)) {
      continue;
    }

    await agentManagementService.createAgent({
      code: blueprint.code,
      name: blueprint.name,
      description: blueprint.description,
      status: 'active',
      defaultProvider: env.defaultProvider,
      defaultModel: env.defaultModel,
      temperature: env.temperature,
      maxTokens: env.maxTokens,
      timeout: env.requestTimeoutMs,
      retryCount: env.maxRetries,
      promptIds:
        blueprint.code === 'community-manager'
          ? [
              'prompt-cm-instagram-001',
              'prompt-cm-facebook-001',
              'prompt-cm-linkedin-001',
              'prompt-cm-story-001',
              'prompt-cm-campaign-001',
              'prompt-cm-parents-001',
              'prompt-cm-schools-001',
            ]
          : ['prompt-001'],
      documentIds: ['doc-001', 'doc-002'],
      workflowCodes: blueprint.workflowCodes,
    });
  }
}
