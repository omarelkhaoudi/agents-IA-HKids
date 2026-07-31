export type WorkflowStatus = 'draft' | 'published' | 'archived' | 'deprecated' | string;

export interface WorkflowApprovalLevel {
  levelIndex?: number;
  levelName?: string;
  approverType?: string;
  approvers?: string[];
  required?: boolean;
  strategy?: string;
  timeoutMinutes?: number;
}

export interface WorkflowDefinitionShape {
  name?: string;
  code?: string;
  category?: string;
  description?: string;
  priority?: string;
  executionMode?: string;
  approvalStrategy?: string;
  approvalChain?: WorkflowApprovalLevel[];
  conditions?: Array<Record<string, unknown>>;
  sla?: {
    expectedDurationMinutes?: number;
    maximumDurationMinutes?: number;
    businessHours?: boolean;
    escalationMinutes?: number;
  };
  escalationRules?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

export interface WorkflowDefinition extends WorkflowDefinitionShape {
  id: string;
  name: string;
  code: string;
  category: string;
  status: WorkflowStatus;
  tags: string[];
  owner?: string;
  currentVersion: number;
  publishedVersion?: number | null;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  tags: string[];
  owner?: string;
  status: WorkflowStatus;
  definition: WorkflowDefinitionShape;
}

export interface WorkflowDashboard {
  generatedAt: string;
  metrics: {
    running: number;
    pendingApprovals: number;
    rejected: number;
    approved: number;
    overdue: number;
    escalated: number;
    delegated: number;
    averageDurationMinutes: number;
    approvalRate: number;
    slaCompliance: number;
    workflowHealth: number;
  };
  states: Array<{ state: string; total: number }>;
  approvalTasks: Array<{ status: string; total: number }>;
  escalations: Array<{ status: string; total: number }>;
  delegations: Array<{ status: string; total: number }>;
  bottlenecks: Array<{ label: string; total: number }>;
  topWorkflows: Array<{ workflow: string; total: number }>;
  topApprovers: Array<{ reviewer: string; total: number }>;
  approvalHistory: Array<{
    id: string;
    workflow_instance_id?: string;
    workflowInstanceId?: string;
    actor?: string;
    previous_state?: string | null;
    previousState?: string | null;
    new_state?: string | null;
    newState?: string | null;
    comment?: string;
    created_at?: string;
    createdAt?: string;
  }>;
  trends: {
    daily: Array<{ bucket: string; total: number }>;
    weekly: Array<{ bucket: string; total: number }>;
    monthly: Array<{ bucket: string; total: number }>;
  };
}

export interface WorkflowAnalytics {
  generatedAt: string;
  approvalKpis: {
    pending: number;
    approvalRate: number;
    averageApprovalTimeMinutes: number;
  };
  slaKpis: {
    overdue: number;
    compliance: number;
  };
  workflowUsage: Array<{ workflow: string; total: number }>;
  workflowSuccess: number;
  failureCauses: Array<{ state: string; total: number }>;
  escalations: Array<{ status: string; total: number }>;
  delegations: Array<{ status: string; total: number }>;
  trends: WorkflowDashboard['trends'];
}

export interface WorkflowApprovalTask {
  id: string;
  workflowInstanceId: string;
  levelIndex: number;
  levelName: string;
  reviewer: string;
  reviewerRole?: string;
  reviewerDepartment?: string;
  status: string;
  required: boolean;
  dueAt?: string;
  decidedAt?: string;
  metadata: Record<string, unknown>;
}

export interface WorkflowSimulation {
  simulation: boolean;
  executionPath: string[];
  approvalChain: WorkflowApprovalLevel[];
  conditions: Array<Record<string, unknown>>;
  estimatedDurationMinutes: number;
  slaPrediction: {
    maximumDurationMinutes: number;
    likelyBreach: boolean;
  };
  possibleBottlenecks: Array<{ levelName: string; approver: string }>;
  warnings: string[];
}
