export class WorkflowHistory {
  constructor(workflowRepository) {
    this.workflowRepository = workflowRepository;
  }

  logTransition({ workflowInstanceId, actor, previousState, newState, comment }) {
    return this.workflowRepository.addHistory({
      id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workflowInstanceId,
      actor,
      previousState,
      newState,
      comment,
    });
  }
}
