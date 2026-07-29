import { aiGateway, retrievalService } from './assistant-runtime.js';
import { databasePool } from './database-runtime.js';
import { workflowEngine } from './workflow-runtime.js';
import { HealthService } from '../services/health/HealthService.js';

export const healthService = new HealthService({
  pool: databasePool,
  aiGateway,
  retrievalService,
  workflowEngine,
});
