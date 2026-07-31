import type { ConversationLogDetail, ConversationLogSummary } from '../../types/observability';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import Skeleton from '../ui/Skeleton';
import {
  formatCost,
  formatDuration,
  formatNumber,
  formatTimestamp,
} from '../../utils/observabilityFormat';

const historyTone = {
  message: 'neutral',
  ai_request: 'info',
  document: 'purple',
  workflow: 'success',
  event: 'warning',
} as const;

interface ConversationLogsPanelProps {
  items: ConversationLogSummary[];
  total: number;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  detail: ConversationLogDetail | null;
  detailLoading: boolean;
  onExport: () => void;
  busy?: boolean;
}

export default function ConversationLogsPanel({
  items,
  total,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  detail,
  detailLoading,
  onExport,
  busy = false,
}: ConversationLogsPanelProps) {
  return (
    <div className="space-y-6">
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Conversation logs</h2>
            <p className="mt-1 text-sm text-slate-400">
              {formatNumber(total)} conversations with their full execution trail.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by title"
              aria-label="Search conversation logs"
              className="w-56 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/50 focus:outline-none"
            />
            <Button size="sm" variant="secondary" onClick={onExport} disabled={busy}>
              Export CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Conversation</th>
                <th className="px-5 py-3 font-medium">Messages</th>
                <th className="px-5 py-3 font-medium">AI calls</th>
                <th className="px-5 py-3 font-medium">Knowledge</th>
                <th className="px-5 py-3 font-medium">Prompts</th>
                <th className="px-5 py-3 font-medium">Workflows</th>
                <th className="px-5 py-3 font-medium">Cost</th>
                <th className="px-5 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={[
                    'cursor-pointer border-t border-white/6 transition hover:bg-white/4',
                    selectedId === item.id ? 'bg-cyan-400/6' : '',
                  ].join(' ')}
                >
                  <td className="px-5 py-3">
                    <p className="text-white">{item.title}</p>
                    <p className="text-xs text-slate-500">
                      {item.agentCode} · {item.model}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{item.messageCount}</td>
                  <td className="px-5 py-3 text-slate-300">
                    {item.aiRequests}
                    {item.failedRequests > 0 ? (
                      <span className="ml-2 text-xs text-rose-300">{item.failedRequests} failed</span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-slate-300">{item.knowledgeUsed}</td>
                  <td className="px-5 py-3 text-slate-300">{item.promptsUsed}</td>
                  <td className="px-5 py-3 text-slate-300">{item.workflows}</td>
                  <td className="px-5 py-3 text-slate-300">{formatCost(item.estimatedCost)}</td>
                  <td className="px-5 py-3 text-slate-400">{formatTimestamp(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            No conversation matches the current search.
          </div>
        ) : null}
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Execution history</h2>
        <p className="mt-1 text-sm text-slate-400">
          Prompts, retrieved knowledge, workflow transitions, approvals and exports for the selected
          conversation.
        </p>

        {detailLoading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : !detail ? (
          <p className="mt-6 text-sm text-slate-400">
            Select a conversation above to inspect its full execution trail.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailStat label="AI calls" value={String(detail.aiRequests.length)} />
              <DetailStat
                label="Knowledge retrieved"
                value={String(detail.knowledgeRetrieved.length)}
              />
              <DetailStat label="Prompts used" value={String(detail.promptsUsed.length)} />
              <DetailStat
                label="Approvals"
                value={`${detail.approvalState.approvedDocuments}/${detail.approvalState.generatedDocuments}`}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Workflow state
                </h3>
                {detail.workflowsExecuted.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">No workflow was executed.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {detail.workflowsExecuted.map((workflow) => (
                      <li
                        key={workflow.id}
                        className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-2.5"
                      >
                        <span className="truncate text-slate-300">{workflow.documentId}</span>
                        <Badge tone="success">{workflow.state}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Export events
                </h3>
                {detail.exportEvents.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">No export was produced.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {detail.exportEvents.map((event) => (
                      <li
                        key={`${event.documentId}-${event.format}`}
                        className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-2.5"
                      >
                        <span className="truncate text-slate-300">{event.reference}</span>
                        <Badge tone={event.approved ? 'success' : 'warning'}>{event.format}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <ol className="space-y-3 border-l border-white/10 pl-5">
              {detail.executionHistory.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="relative">
                  <span className="absolute -left-[1.6rem] top-2 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge tone={historyTone[entry.type]}>{entry.type.replace('_', ' ')}</Badge>
                        <span className="text-sm text-white">{entry.label}</span>
                      </div>
                      <span className="text-xs text-slate-500">{formatTimestamp(entry.at)}</span>
                    </div>
                    {entry.detail ? (
                      <p className="mt-2 text-sm leading-6 text-slate-400">{entry.detail}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-xs text-slate-500">
              Total AI time:{' '}
              {formatDuration(
                detail.aiRequests.reduce((total, request) => total + request.durationMs, 0)
              )}
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
