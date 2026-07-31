import type { EvaluationHistory, EvaluationRunDetail } from '../../types/aiEvaluation';
import Badge from '../ui/Badge';
import Panel from '../ui/Panel';
import Skeleton from '../ui/Skeleton';
import {
  formatCriterion,
  formatScore,
  scoreTone,
  verdictTone,
} from '../../utils/evaluationFormat';
import { formatCost, formatDuration, formatNumber, formatRelativeTime } from '../../utils/observabilityFormat';

interface EvaluationHistoryPanelProps {
  history: EvaluationHistory;
  detail: EvaluationRunDetail | null;
  verdict: string;
  onVerdictChange: (verdict: string) => void;
  onSelectRun: (runId: string) => void;
  busy?: boolean;
}

const VERDICT_FILTERS = [
  { id: '', label: 'All' },
  { id: 'pass', label: 'Pass' },
  { id: 'warn', label: 'Warn' },
  { id: 'fail', label: 'Fail' },
];

export default function EvaluationHistoryPanel({
  history,
  detail,
  verdict,
  onVerdictChange,
  onSelectRun,
  busy = false,
}: EvaluationHistoryPanelProps) {
  return (
    <div className="space-y-6">
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Evaluation history</h2>
            <p className="mt-1 text-sm text-slate-400">
              {formatNumber(history.total)} evaluated generations. Select a row to inspect its
              criterion scores.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {VERDICT_FILTERS.map((filter) => (
              <button
                key={filter.id || 'all'}
                type="button"
                onClick={() => onVerdictChange(filter.id)}
                className={[
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                  verdict === filter.id
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                ].join(' ')}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Prompt</th>
                <th className="px-5 py-3 font-medium">Model</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Verdict</th>
                <th className="px-5 py-3 font-medium">Latency</th>
                <th className="px-5 py-3 font-medium">Tokens</th>
                <th className="px-5 py-3 font-medium">Cost</th>
                <th className="px-5 py-3 font-medium">Reviewer</th>
              </tr>
            </thead>
            <tbody>
              {history.items.map((run) => (
                <tr
                  key={run.id}
                  onClick={() => onSelectRun(run.id)}
                  className="cursor-pointer border-t border-white/6 hover:bg-white/4"
                >
                  <td className="px-5 py-3 text-slate-300">{formatRelativeTime(run.created_at)}</td>
                  <td className="px-5 py-3">
                    <p className="text-white">{run.agent_code}</p>
                    <p className="text-xs text-slate-500">{run.source}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-300">
                    {run.prompt_id ? `v${run.prompt_version}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-300">{run.model || '—'}</td>
                  <td className="px-5 py-3">
                    <Badge tone={scoreTone(run.overall_score)}>
                      {formatScore(run.overall_score)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={verdictTone(run.verdict)}>{run.verdict}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{formatDuration(run.latency_ms)}</td>
                  <td className="px-5 py-3 text-slate-300">{formatNumber(run.total_tokens)}</td>
                  <td className="px-5 py-3 text-slate-300">
                    {formatCost(Number(run.estimated_cost))}
                  </td>
                  <td className="px-5 py-3 text-slate-300">{run.reviewer || run.approval_state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {history.items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            No evaluation matches this filter.
          </div>
        ) : null}
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Criterion breakdown</h2>
        <p className="mt-1 text-sm text-slate-400">
          {detail
            ? `Run recorded ${formatRelativeTime(detail.run.created_at)} on ${detail.run.model || 'an unknown model'}.`
            : 'Select an evaluation above to see how each criterion was scored.'}
        </p>

        {busy ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
        ) : null}

        {!busy && detail ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {detail.scores.map((score) => (
              <div key={score.id} className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-white">{formatCriterion(score.criterion)}</p>
                  <Badge tone={score.passed ? scoreTone(score.score) : 'warning'}>
                    {formatScore(score.score)}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">{score.rationale}</p>
              </div>
            ))}
          </div>
        ) : null}

        {!busy && !detail ? (
          <p className="mt-6 text-sm text-slate-400">No evaluation selected.</p>
        ) : null}
      </Panel>
    </div>
  );
}
