import { SalesAgentRepository } from '../repositories/SalesAgentRepository.js';
import { SalesAgentService } from '../services/sales-agent/SalesAgentService.js';
import { aiGateway, retrievalService } from './assistant-runtime.js';
import { listDocuments, listPrompts } from './content-runtime.js';
import { databasePool } from './database-runtime.js';
import { workflowEngine } from './workflow-runtime.js';

const repository = new SalesAgentRepository(databasePool);

export const salesAgentService = new SalesAgentService({
  repository,
  aiGateway,
  retrievalService,
  listDocuments,
  listPrompts,
  workflowEngine,
});

export async function initializeSalesAgentRuntime() {
  await salesAgentService.initialize();
}
