import { workflowStates } from './WorkflowRules.js';

export class ApprovalService {
  canExport(state) {
    return state === workflowStates.approved || state === workflowStates.exported;
  }

  canArchive(state) {
    return state === workflowStates.exported;
  }

  normalizeChain({ reviewers = [], definition = null, policy = null } = {}) {
    const definitionChain = Array.isArray(definition?.approvalChain)
      ? definition.approvalChain
      : [];

    if (definitionChain.length) {
      return definitionChain.map((level, index) => ({
        levelIndex: Number(level.levelIndex || level.order || index + 1),
        levelName: level.levelName || level.name || `Level ${index + 1}`,
        approverType: level.approverType || level.type || 'role',
        approvers: Array.isArray(level.approvers) && level.approvers.length
          ? level.approvers
          : [level.approver || level.role || level.department || 'Administrator'],
        required: level.required !== false,
        strategy: level.strategy || definition?.approvalStrategy || 'all_required',
        timeoutMinutes: Number(level.timeoutMinutes || definition?.sla?.approvalTimeoutMinutes || 1440),
      }));
    }

    const fallbackApprovers = Array.isArray(policy?.fallbackApprovers)
      ? policy.fallbackApprovers
      : [];
    const normalizedReviewers = reviewers.length ? reviewers : fallbackApprovers;

    return (normalizedReviewers.length ? normalizedReviewers : ['Administrator']).map(
      (reviewer, index) => ({
        levelIndex: index + 1,
        levelName: index === 0 ? 'Review' : `Review ${index + 1}`,
        approverType: 'user',
        approvers: [reviewer],
        required: true,
        strategy: 'all_required',
        timeoutMinutes: Number(definition?.sla?.approvalTimeoutMinutes || 1440),
      })
    );
  }

  evaluateCompletion(tasks = [], strategy = 'all_required') {
    const activeTasks = tasks.filter((task) => task.required !== false);
    if (!activeTasks.length) {
      return { completed: true, rejected: false, reason: 'no_required_tasks' };
    }

    const approvedCount = activeTasks.filter((task) => task.status === 'approved').length;
    const rejectedCount = activeTasks.filter((task) => task.status === 'rejected').length;
    const pendingCount = activeTasks.length - approvedCount - rejectedCount;
    const counts = { approvedCount, rejectedCount, pendingCount };

    if (rejectedCount > 0 && strategy !== 'majority') {
      return { completed: true, rejected: true, reason: 'required_rejection', ...counts };
    }

    if (strategy === 'first_responder') {
      if (approvedCount > 0) {
        return { completed: true, rejected: false, reason: 'first_responder_approved', ...counts };
      }
      if (rejectedCount > 0) {
        return { completed: true, rejected: true, reason: 'first_responder_rejected', ...counts };
      }
    }

    if (strategy === 'majority') {
      const threshold = Math.floor(activeTasks.length / 2) + 1;
      if (approvedCount >= threshold) {
        return { completed: true, rejected: false, reason: 'majority_approved', ...counts };
      }
      if (rejectedCount >= threshold) {
        return { completed: true, rejected: true, reason: 'majority_rejected', ...counts };
      }
    }

    if (approvedCount >= activeTasks.length) {
      return { completed: true, rejected: false, reason: 'all_required_approved', ...counts };
    }

    return { completed: false, rejected: false, reason: 'approval_pending', ...counts };
  }
}
