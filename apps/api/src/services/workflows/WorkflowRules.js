export const workflowStates = {
  draft: 'Draft',
  pendingReview: 'Pending Review',
  needsChanges: 'Needs Changes',
  approved: 'Approved',
  rejected: 'Rejected',
  exported: 'Exported',
  archived: 'Archived',
};

const allowedTransitions = {
  Draft: ['Pending Review', 'Rejected'],
  'Pending Review': ['Needs Changes', 'Approved', 'Rejected'],
  'Needs Changes': ['Draft', 'Pending Review'],
  Approved: ['Exported'],
  Rejected: ['Draft'],
  Exported: ['Archived'],
  Archived: [],
};

export class WorkflowRules {
  canTransition(previousState, nextState) {
    return (allowedTransitions[previousState] || []).includes(nextState);
  }

  listRules() {
    return Object.entries(allowedTransitions).flatMap(([fromState, nextStates]) =>
      nextStates.map((toState) => ({
        fromState,
        toState,
      }))
    );
  }
}
