import { HrAgentRepository } from '../repositories/HrAgentRepository.js';
import { HrAgentService } from '../services/hr-agent/HrAgentService.js';
import { aiGateway, retrievalService } from './assistant-runtime.js';
import { listDocuments, listPrompts } from './content-runtime.js';
import { databasePool } from './database-runtime.js';

const repository = new HrAgentRepository(databasePool);

export const hrAgentService = new HrAgentService({
  repository,
  aiGateway,
  retrievalService,
  listDocuments,
  listPrompts,
});

export async function initializeHrAgentRuntime() {
  await hrAgentService.initialize();
}
