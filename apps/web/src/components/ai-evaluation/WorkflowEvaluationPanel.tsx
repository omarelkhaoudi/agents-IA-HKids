import type { WorkflowEvaluation } from '../../types/aiEvaluation';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import { formatDurationSeconds, scoreAccent } from '../../utils/evaluationFormat';
import { formatNumber, formatPercent } from '../../utils/observabilityFormat';

interface WorkflowEvaluationPanelProps {
  workflow: WorkflowEvaluation;
}

export default function WorkflowEvaluationPanel({ workflow }: WorkflowEvaluationPanelProps) {
  const maximum = workflow.states.reduce((max, state) => Math.max(max, state.total), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Completion rate"
          value={formatPercent(workflow.completionRate)}
          hint={`${workflow.totalInstances} workflow instances`}
          accent={scoreAccent(workflow.completionRate)}
        />
        <MetricCard
          label="Approval rate"
          value={formatPercent(workflow.approvalRate)}
          hint={`${workflow.rejectedDrafts} rejected drafts`}
          accent={scoreAccent(workflow.approvalRate)}
        />
        <MetricCard
          label="Average duration"
          value={formatDurationSeconds(workflow.averageDurationSeconds)}
          hint="From creation to last transition"
          accent="blue"
        />
        <MetricCard
          label="Failure rate"
          value={formatPercent(workflow.failureRate)}
          hint={`${workflow.revisions} revision requests`}
          accent={workflow.failureRate > 20 ? 'orange' : 'emerald'}
        />
        <MetricCard
          label="Export success"
          value={formatNumber(workflow.exportSuccess)}
          hint={`${workflow.archived} archived after export`}
          accent="cyan"
        />
        <MetricCard
          label="Document approvals"
          value={formatPercent(workflow.documentApprovalRate)}
          hint={`${workflow.approvedDocuments}/${workflow.totalDocuments} generated documents`}
          accent={scoreAccent(workflow.documentApprovalRate)}
        />
        <MetricCard
          label="Rejected drafts"
          value={formatNumber(workflow.rejectedDrafts)}
          hint="Transitions to the Rejected state"
          accent={workflow.rejectedDrafts > 0 ? 'orange' : 'emerald'}
        />
        <MetricCard
          label="Revisions"
          value={formatNumber(workflow.revisions)}
          hint="Transitions to Needs Changes"
          accent="purple"
        />
      </div>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Workflow state distribution</h2>
        <p className="mt-1 text-sm text-slate-400">
          Read directly from the Workflow Engine state machine.
        </p>

        <div className="mt-6 space-y-3">
          {workflow.states.map((state) => (
            <div key={state.state}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white">{state.state}</span>
                <span className="text-slate-300">{formatNumber(state.total)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{ width: `${maximum ? (state.total / maximum) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {workflow.states.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">No workflow instance has been created yet.</p>
        ) : null}
      </Panel>
    </div>
  );
}
