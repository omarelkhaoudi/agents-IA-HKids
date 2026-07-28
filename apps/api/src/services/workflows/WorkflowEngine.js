import { workflowStates } from './WorkflowRules.js';

export class WorkflowEngine {
  constructor({
    workflowRepository,
    workflowRules,
    workflowHistory,
    approvalService,
    notificationService,
  }) {
    this.workflowRepository = workflowRepository;
    this.workflowRules = workflowRules;
    this.workflowHistory = workflowHistory;
    this.approvalService = approvalService;
    this.notificationService = notificationService;
  }

  async initialize() {
    await this.workflowRepository.ensureRules(this.workflowRules.listRules());
  }

  async createWorkflow({
    conversationId,
    documentId,
    reviewers = ['Administrator'],
    approverMode = 'single',
    requiredApprovals,
  }) {
    const normalizedReviewers = reviewers.length ? reviewers : ['Administrator'];
    const workflow = await this.workflowRepository.createInstance({
      id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conversationId,
      documentId,
      currentState: workflowStates.draft,
      approverMode,
      requiredApprovals:
        requiredApprovals || (approverMode === 'multiple' ? normalizedReviewers.length : 1),
    });

    await this.workflowHistory.logTransition({
      workflowInstanceId: workflow.id,
      actor: 'system',
      previousState: null,
      newState: workflowStates.draft,
      comment: 'Workflow created.',
    });

    for (const reviewer of normalizedReviewers) {
      await this.workflowRepository.assignReviewer({
        id: `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workflowInstanceId: workflow.id,
        reviewer,
      });
    }

    return this.workflowRepository.getByDocumentId(documentId);
  }

  getWorkflowByDocumentId(documentId) {
    return this.workflowRepository.getByDocumentId(documentId);
  }

  async transition({ documentId, actor, nextState, comment }) {
    const workflow = await this.workflowRepository.getByDocumentId(documentId);

    if (!workflow) {
      throw new Error('Workflow instance not found.');
    }

    if (!this.workflowRules.canTransition(workflow.currentState, nextState)) {
      throw new Error(`Transition from "${workflow.currentState}" to "${nextState}" is not allowed.`);
    }

    if (nextState === workflowStates.archived && !this.approvalService.canArchive(workflow.currentState)) {
      throw new Error('Archive is only allowed after export.');
    }

    await this.workflowRepository.updateState(workflow.id, nextState);
    await this.workflowHistory.logTransition({
      workflowInstanceId: workflow.id,
      actor,
      previousState: workflow.currentState,
      newState: nextState,
      comment,
    });

    if (comment) {
      await this.workflowRepository.addComment({
        id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        workflowInstanceId: workflow.id,
        actor,
        comment,
      });
    }

    this.notificationService.notify({
      workflowId: workflow.id,
      state: nextState,
      actor,
    });

    return this.workflowRepository.getByDocumentId(documentId);
  }
}
