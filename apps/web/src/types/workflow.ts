export interface WorkflowData {
  id: string;
  conversationId: string;
  documentId: string;
  currentState: string;
  approverMode: string;
  requiredApprovals: number;
  history: Array<{
    id: string;
    actor: string;
    previous_state: string | null;
    new_state: string;
    comment: string | null;
    created_at: string;
  }>;
  comments: Array<{
    id: string;
    actor: string;
    comment: string;
    created_at: string;
  }>;
  assignments: Array<{
    id: string;
    reviewer: string;
    status: string;
  }>;
}
