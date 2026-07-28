import { listDocuments } from '../data/mock-documents.js';
import { listPrompts } from '../data/mock-prompts.js';
import { env } from '../config/env.js';
import { AgentRepository } from '../repositories/AgentRepository.js';
import { AdminStatsRepository } from '../repositories/AdminStatsRepository.js';
import { SystemSettingsRepository } from '../repositories/SystemSettingsRepository.js';
import { AgentConfigurationService } from '../services/admin/AgentConfigurationService.js';
import { AgentManagementService } from '../services/admin/AgentManagementService.js';
import { DashboardService } from '../services/admin/DashboardService.js';
import { SystemSettingsService } from '../services/admin/SystemSettingsService.js';
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
    default_language: 'English',
    company_name: 'H-Kids',
    company_address: '14 Avenue des Orangers, Casablanca, Morocco',
    company_phone: '+212 5 22 00 00 00',
    company_email: 'contact@h-kids.ma',
    company_logo: '',
    legal_information: 'H-Kids SARL',
    vat_number: 'VAT-HKIDS-001',
    currency: 'MAD',
  });

  const agents = await agentManagementService.listAgents();

  if (!agents.length) {
    await agentManagementService.createAgent({
      code: 'administrative-assistant',
      name: 'Administrative Assistant',
      description: 'Operational administrative drafting and document generation agent.',
      status: 'active',
      defaultProvider: env.defaultProvider,
      defaultModel: env.defaultModel,
      temperature: env.temperature,
      maxTokens: env.maxTokens,
      timeout: env.requestTimeoutMs,
      retryCount: env.maxRetries,
      promptIds: ['prompt-001'],
      documentIds: ['doc-001'],
      workflowCodes: ['document-review'],
    });
  }
}
