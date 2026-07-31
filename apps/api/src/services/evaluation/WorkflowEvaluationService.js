function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

const COMPLETED_STATES = new Set(['Approved', 'Exported', 'Archived']);
const FAILED_STATES = new Set(['Rejected']);

/**
 * Evaluates the Workflow Engine using its own state machine and history table.
 * No workflow state is recomputed here; the service only aggregates what the
 * engine already recorded.
 */
export class WorkflowEvaluationService {
  constructor({ evaluationRepository, workflowEngine = null }) {
    this.evaluationRepository = evaluationRepository;
    this.workflowEngine = workflowEngine;
  }

  async getWorkflowQuality({ days = 30 } = {}) {
    const windowDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const data = await this.evaluationRepository.getWorkflowEvaluation({ since });

    const totalInstances = data.states.reduce((total, entry) => total + entry.total, 0);
    const completed = data.states
      .filter((entry) => COMPLETED_STATES.has(entry.state))
      .reduce((total, entry) => total + entry.total, 0);
    const failed = data.states
      .filter((entry) => FAILED_STATES.has(entry.state))
      .reduce((total, entry) => total + entry.total, 0);

    const decided = data.transitions.approved + data.transitions.rejected;

    const governance = this.workflowEngine?.getEvaluationMetrics
      ? await this.workflowEngine.getEvaluationMetrics()
      : {};

    return {
      windowDays,
      totalInstances,
      totalWorkflows: data.totalWorkflows,
      completionRate: totalInstances ? round((completed / totalInstances) * 100) : 0,
      failureRate: totalInstances ? round((failed / totalInstances) * 100) : 0,
      approvalRate: decided ? round((data.transitions.approved / decided) * 100) : 0,
      averageDurationSeconds: data.averageDurationSeconds,
      rejectedDrafts: data.transitions.rejected,
      revisions: data.transitions.needsChanges,
      exportSuccess: data.transitions.exported,
      archived: data.transitions.archived,
      totalDocuments: data.totalDocuments,
      approvedDocuments: data.approvedDocuments,
      documentApprovalRate: data.totalDocuments
        ? round((data.approvedDocuments / data.totalDocuments) * 100)
        : 0,
      states: data.states,
      workflowQualityScore: governance.workflowQualityScore ?? 0,
      approvalEfficiency: governance.approvalEfficiency ?? 0,
      slaScore: governance.slaScore ?? 0,
      governanceScore: governance.governanceScore ?? 0,
      escalationScore: governance.escalationScore ?? 0,
      delegationScore: governance.delegationScore ?? 0,
      approvalReliability: governance.approvalReliability ?? 0,
      workflowComplexity: governance.workflowComplexity ?? 0,
      workflowStability: governance.workflowStability ?? 0,
      governance,
    };
  }
}
