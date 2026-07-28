import { persistenceService } from './assistant-runtime.js';
import { ApprovalService } from '../services/workflows/ApprovalService.js';
import { NotificationService } from '../services/workflows/NotificationService.js';
import { WorkflowEngine } from '../services/workflows/WorkflowEngine.js';
import { WorkflowHistory } from '../services/workflows/WorkflowHistory.js';
import { WorkflowRepository } from '../services/workflows/WorkflowRepository.js';
import { WorkflowRules } from '../services/workflows/WorkflowRules.js';

const workflowRepository = new WorkflowRepository(persistenceService.pool);
const workflowRules = new WorkflowRules();

export const workflowEngine = new WorkflowEngine({
  workflowRepository,
  workflowRules,
  workflowHistory: new WorkflowHistory(workflowRepository),
  approvalService: new ApprovalService(),
  notificationService: new NotificationService(),
});
