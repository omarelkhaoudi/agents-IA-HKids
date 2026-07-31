import type { EvaluationAnalytics, EvaluationGranularity } from '../../types/aiEvaluation';
import TrendChart from '../observability/TrendChart';
import Badge from '../ui/Badge';
import Panel from '../ui/Panel';
import {
  formatBucketLabel,
  formatCriterion,
  formatScore,
  scoreTone,
} from '../../utils/evaluationFormat';
import { formatCost, formatDuration, formatNumber, formatPercent } from '../../utils/observabilityFormat';

interface EvaluationAnalyticsPanelProps {
  analytics: EvaluationAnalytics;
  granularity: EvaluationGranularity;
  onGranularityChange: (granularity: EvaluationGranularity) => void;
  onExport: (dataset: 'runs' | 'agents' | 'prompts' | 'criteria' | 'trend') => void;
}

const GRANULARITIES: EvaluationGranularity[] = ['daily', 'weekly', 'monthly'];

const EXPORTS: { id: 'runs' | 'agents' | 'prompts' | 'criteria' | 'trend'; label: string }[] = [
  { id: 'runs', label: 'Runs' },
  { id: 'agents', label: 'Agents' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'criteria', label: 'Criteria' },
  { id: 'trend', label: 'Trend' },
];

export default function EvaluationAnalyticsPanel({
  analytics,
  granularity,
  onGranularityChange,
  onExport,
}: EvaluationAnalyticsPanelProps) {
  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Evaluation analytics</h2>
            <p className="mt-1 text-sm text-slate-400">
              Quality, cost, latency, approval and feedback evolution over the last{' '}
              {analytics.windowDays} days.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {GRANULARITIES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onGranularityChange(option)}
                className={[
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                  granularity === option
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                ].join(' ')}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Quality evolution
            </p>
            <div className="mt-3">
              <TrendChart
                points={analytics.qualityEvolution.map((point) => ({
                  label: formatBucketLabel(point.bucket),
                  value: point.value,
                  hint: `${point.bucket}: ${formatScore(point.value)}/100`,
                }))}
                accent="emerald"
                maxValue={100}
                height={150}
                primaryLabel="Quality"
                secondaryLabel="Regressions"
                emptyLabel="No quality data for this period."
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Approval evolution
            </p>
            <div className="mt-3">
              <TrendChart
                points={analytics.approvalEvolution.map((point) => ({
                  label: formatBucketLabel(point.bucket),
                  value: point.value,
                  hint: `${point.bucket}: ${formatPercent(point.value)}`,
                }))}
                accent="cyan"
                maxValue={100}
                height={150}
                primaryLabel="Approval rate"
                secondaryLabel="Rejections"
                emptyLabel="No approval data for this period."
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Cost evolution
            </p>
            <div className="mt-3">
              <TrendChart
                points={analytics.costEvolution.map((point) => ({
                  label: formatBucketLabel(point.bucket),
                  value: point.value,
                  hint: `${point.bucket}: ${formatCost(point.value)}`,
                }))}
                accent="violet"
                height={150}
                primaryLabel="Cost"
                secondaryLabel="Overruns"
                emptyLabel="No cost data for this period."
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Latency evolution
            </p>
            <div className="mt-3">
              <TrendChart
                points={analytics.latencyEvolution.map((point) => ({
                  label: formatBucketLabel(point.bucket),
                  value: point.value,
                  hint: `${point.bucket}: ${formatDuration(point.value)}`,
                }))}
                accent="cyan"
                height={150}
                primaryLabel="Latency"
                secondaryLabel="Timeouts"
                emptyLabel="No latency data for this period."
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Feedback evolution
            </p>
            <div className="mt-3">
              <TrendChart
                points={analytics.feedbackEvolution.map((point) => ({
                  label: formatBucketLabel(point.bucket),
                  value: point.value,
                  hint: `${point.bucket}: ${formatScore(point.value)}/100`,
                }))}
                accent="violet"
                maxValue={100}
                height={150}
                primaryLabel="Feedback"
                secondaryLabel="Corrections"
                emptyLabel="No feedback data for this period."
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Workflow evolution
            </p>
            <div className="mt-3 space-y-2.5">
              {analytics.workflowEvolution.map((state) => (
                <div
                  key={state.state}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-2.5"
                >
                  <span className="text-sm text-white">{state.state}</span>
                  <span className="text-sm text-slate-300">{formatNumber(state.total)}</span>
                </div>
              ))}
              {analytics.workflowEvolution.length === 0 ? (
                <p className="text-sm text-slate-400">No workflow activity for this period.</p>
              ) : null}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Agent evolution</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Agent</th>
                  <th className="px-5 py-3 font-medium">Runs</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {analytics.agentEvolution.map((agent) => (
                  <tr key={agent.key} className="border-t border-white/6 hover:bg-white/4">
                    <td className="px-5 py-3 text-white">{agent.key}</td>
                    <td className="px-5 py-3 text-slate-300">{formatNumber(agent.runs)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={scoreTone(agent.averageScore)}>
                        {formatScore(agent.averageScore)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{formatCost(agent.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analytics.agentEvolution.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No agent activity for this period.
            </div>
          ) : null}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Criteria evolution</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Criterion</th>
                  <th className="px-5 py-3 font-medium">Samples</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Failures</th>
                </tr>
              </thead>
              <tbody>
                {analytics.criteria.map((criterion) => (
                  <tr key={criterion.criterion} className="border-t border-white/6 hover:bg-white/4">
                    <td className="px-5 py-3 text-white">
                      {formatCriterion(criterion.criterion)}
                    </td>
                    <td className="px-5 py-3 text-slate-300">{formatNumber(criterion.samples)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={scoreTone(criterion.averageScore)}>
                        {formatScore(criterion.averageScore)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{criterion.failures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analytics.criteria.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No criterion has been scored for this period.
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Export</h2>
        <p className="mt-1 text-sm text-slate-400">
          Download evaluation datasets as CSV for offline reporting.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXPORTS.map((dataset) => (
            <button
              key={dataset.id}
              type="button"
              onClick={() => onExport(dataset.id)}
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            >
              {dataset.label}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
