import type { AnalyticsReport } from '../../types/observability';
import Badge from '../ui/Badge';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import {
  formatCost,
  formatDuration,
  formatNumber,
  formatPercent,
} from '../../utils/observabilityFormat';

interface AnalyticsPanelProps {
  analytics: AnalyticsReport;
}

export default function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  const maxAgentRequests = analytics.mostActiveAgents.reduce(
    (max, agent) => Math.max(max, agent.requests),
    0
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Average response time"
          value={formatDuration(analytics.responseTime.averageMs)}
          hint={`Peak ${formatDuration(analytics.responseTime.maxMs)} on ${formatNumber(
            analytics.responseTime.requests
          )} calls`}
          accent="cyan"
        />
        <MetricCard
          label="Approval rate"
          value={formatPercent(analytics.approvals.approvalRate)}
          hint={`${analytics.approvals.approvedDocuments} of ${analytics.approvals.totalDocuments} documents`}
          accent="emerald"
        />
        <MetricCard
          label="Pending approvals"
          value={String(analytics.approvals.pendingDocuments)}
          hint={`${analytics.approvals.activeWorkflows} active workflows`}
          accent="orange"
        />
        <MetricCard
          label="Knowledge in review"
          value={String(analytics.approvals.knowledgeInReview)}
          hint={`${analytics.approvals.knowledgeApproved} approved documents`}
          accent="purple"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Most active agents</h2>
          <p className="mt-1 text-sm text-slate-400">
            Ranked by AI requests over the last {analytics.windowDays} days.
          </p>

          {analytics.mostActiveAgents.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">No agent activity in this window.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {analytics.mostActiveAgents.map((agent) => (
                <li key={agent.agentCode}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate text-slate-200">{agent.agentName}</span>
                    <span className="ml-3 shrink-0 text-slate-400">
                      {formatNumber(agent.requests)} · {formatCost(agent.estimatedCost)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-cyan-400 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (agent.requests / Math.max(1, maxAgentRequests)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">User activity</h2>
          <p className="mt-1 text-sm text-slate-400">
            Platform users ranked by attributed AI requests.
          </p>

          {analytics.userActivity.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">No user activity recorded.</p>
          ) : (
            <ul className="mt-5 space-y-3 text-sm">
              {analytics.userActivity.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-white">{user.name || user.email}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <Badge tone="neutral">{user.role}</Badge>
                    <span className="text-slate-400">{formatNumber(user.requests)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Most used prompts</h2>
            <p className="mt-1 text-sm text-slate-400">
              Usage counters maintained by the Prompt Platform.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Prompt</th>
                  <th className="px-5 py-3 font-medium">Uses</th>
                  <th className="px-5 py-3 font-medium">Successes</th>
                  <th className="px-5 py-3 font-medium">Avg latency</th>
                </tr>
              </thead>
              <tbody>
                {analytics.mostUsedPrompts.map((prompt) => (
                  <tr key={prompt.id} className="border-t border-white/6 hover:bg-white/4">
                    <td className="px-5 py-3">
                      <p className="text-white">{prompt.name}</p>
                      <p className="text-xs text-slate-500">{prompt.status}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{prompt.usageCount}</td>
                    <td className="px-5 py-3 text-slate-300">{prompt.successCount}</td>
                    <td className="px-5 py-3 text-slate-300">
                      {formatDuration(prompt.averageLatencyMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analytics.mostUsedPrompts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No prompt has been used yet.
            </div>
          ) : null}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Most used documents</h2>
            <p className="mt-1 text-sm text-slate-400">
              Knowledge documents ranked by AI retrieval and views.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-5 py-3 font-medium">AI uses</th>
                  <th className="px-5 py-3 font-medium">Views</th>
                  <th className="px-5 py-3 font-medium">Downloads</th>
                </tr>
              </thead>
              <tbody>
                {analytics.mostUsedDocuments.map((document) => (
                  <tr key={document.id} className="border-t border-white/6 hover:bg-white/4">
                    <td className="px-5 py-3">
                      <p className="text-white">{document.title}</p>
                      <p className="text-xs text-slate-500">{document.category}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{document.aiUsageCount}</td>
                    <td className="px-5 py-3 text-slate-300">{document.viewCount}</td>
                    <td className="px-5 py-3 text-slate-300">{document.downloadCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analytics.mostUsedDocuments.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No knowledge document has been indexed yet.
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Approval statistics</h2>
        <p className="mt-1 text-sm text-slate-400">
          Workflow states across every governed document.
        </p>

        {analytics.approvals.workflowStates.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">No workflow has been started yet.</p>
        ) : (
          <div className="mt-5 flex flex-wrap gap-3">
            {analytics.approvals.workflowStates.map((state) => (
              <div
                key={state.state}
                className="rounded-xl border border-white/8 bg-white/4 px-4 py-3"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {state.state}
                </p>
                <p className="mt-2 text-xl font-semibold text-white">{state.count}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
