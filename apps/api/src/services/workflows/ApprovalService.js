import { workflowStates } from './WorkflowRules.js';

export class ApprovalService {
  canExport(state) {
    return state === workflowStates.approved || state === workflowStates.exported;
  }

  canArchive(state) {
    return state === workflowStates.exported;
  }
}
