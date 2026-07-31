import type {
  PromptComparison,
  PromptMetricList,
  RegressionReport,
} from '../../types/aiEvaluation';
import Badge from '../ui/Badge';
import Panel from '../ui/Panel';
import Skeleton from '../ui/Skeleton';
import { formatDelta, formatScore, scoreTone } from '../../utils/evaluationFormat';
import { formatCost, formatDuration, formatNumber, formatPercent } from '../../utils/observabilityFormat';

interface PromptEvaluationPanelProps {
  prompts: PromptMetricList;
  regressions: RegressionReport;
  comparison: PromptComparison | null;
  selectedPromptId: string;
  onSelectPrompt: (promptId: string) => void;
  busy?: boolean;
}

const WINNER_LABELS: Record<PromptComparison['winner'], string> = {
  left: 'Version A wins',
  right: 'Version B wins',
  tie: 'No clear winner',
  insufficient_data: 'Not enough evaluations',
};

export default function PromptEvaluationPanel({
  prompts,
  regressions,
  comparison,
  selectedPromptId,
  onSelectPrompt,
  busy = false,
}: PromptEvaluationPanelProps) {
  return (
    <div className="space-y-6">
      <Panel className="overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Prompt evaluation</h2>
          <p className="mt-1 text-sm text-slate-400">
            Catalog counters come from the Prompt Platform; quality comes from evaluation runs.
            Select a prompt to compare its versions.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Prompt</th>
                <th className="px-5 py-3 font-medium">Success</th>
                <th className="px-5 py-3 font-medium">Approval</th>
                <th className="px-5 py-3 font-medium">Feedback</th>
                <th className="px-5 py-3 font-medium">Quality</th>
                <th className="px-5 py-3 font-medium">Knowledge</th>
                <th className="px-5 py-3 font-medium">Latency</th>
                <th className="px-5 py-3 font-medium">Tokens</th>
                <th className="px-5 py-3 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {prompts.items.map((prompt) => (
                <tr
                  key={prompt.id}
                  onClick={() => onSelectPrompt(prompt.id)}
                  className={[
                    'cursor-pointer border-t border-white/6 hover:bg-white/4',
                    prompt.id === selectedPromptId ? 'bg-cyan-400/8' : '',
                  ].join(' ')}
                >
                  <td className="px-5 py-3">
                    <p className="text-white">{prompt.name}</p>
                    <p className="text-xs text-slate-500">
                      v{prompt.version} · {prompt.agentCode || 'unassigned'} · {prompt.evaluatedRuns}{' '}
                      evaluated runs
                    </p>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{formatPercent(prompt.successRate)}</td>
                  <td className="px-5 py-3 text-slate-300">{formatPercent(prompt.approvalRate)}</td>
                  <td className="px-5 py-3 text-slate-300">{formatScore(prompt.averageFeedback)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={scoreTone(prompt.averageQuality || prompt.catalogQuality)}>
                      {formatScore(prompt.averageQuality || prompt.catalogQuality)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-300">
                    {formatPercent(prompt.averageKnowledgeCoverage)}
                  </td>
                  <td className="px-5 py-3 text-slate-300">
                    {formatDuration(prompt.averageLatencyMs)}
                  </td>
                  <td className="px-5 py-3 text-slate-300">{formatNumber(prompt.averageTokens)}</td>
                  <td className="px-5 py-3 text-slate-300">{formatCost(prompt.averageCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {prompts.items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            No prompt is available in the Prompt Platform yet.
          </div>
        ) : null}
      </Panel>

      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Prompt version comparison</h2>
            <p className="mt-1 text-sm text-slate-400">
              {comparison
                ? `${comparison.promptName}: version ${comparison.left.version} against version ${comparison.right.version}.`
                : 'Select a prompt above to compare two versions.'}
            </p>
          </div>
          {comparison ? (
            <Badge tone={comparison.winner === 'insufficient_data' ? 'neutral' : 'info'}>
              {WINNER_LABELS[comparison.winner]}
            </Badge>
          ) : null}
        </div>

        {busy ? (
          <div className="mt-6 space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : null}

        {!busy && comparison ? (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Metric</th>
                  <th className="px-5 py-3 font-medium">Version {comparison.left.version}</th>
                  <th className="px-5 py-3 font-medium">Version {comparison.right.version}</th>
                  <th className="px-5 py-3 font-medium">Delta</th>
                  <th className="px-5 py-3 font-medium">Winner</th>
                </tr>
              </thead>
              <tbody>
                {comparison.metrics.map((metric) => (
                  <tr key={metric.key} className="border-t border-white/6 hover:bg-white/4">
                    <td className="px-5 py-3 text-white">{metric.label}</td>
                    <td className="px-5 py-3 text-slate-300">{formatScore(metric.left)}</td>
                    <td className="px-5 py-3 text-slate-300">{formatScore(metric.right)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          metric.winner === 'tie'
                            ? 'text-sm text-slate-400'
                            : metric.winner === 'right'
                              ? 'text-sm text-emerald-300'
                              : 'text-sm text-rose-300'
                        }
                      >
                        {formatDelta(metric.delta)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {metric.winner === 'tie'
                        ? 'Tie'
                        : `Version ${
                            metric.winner === 'left'
                              ? comparison.left.version
                              : comparison.right.version
                          }`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-4 text-xs text-slate-500">
              Weighted score {formatScore(comparison.leftPoints)} against{' '}
              {formatScore(comparison.rightPoints)} · {comparison.left.runs} and{' '}
              {comparison.right.runs} evaluated runs.
            </p>
          </div>
        ) : null}

        {!busy && !comparison ? (
          <p className="mt-6 text-sm text-slate-400">
            No comparison is available. Prompts need at least one evaluated generation per version.
          </p>
        ) : null}
      </Panel>

      <Panel
        className={[
          'p-5',
          regressions.items.length > 0 ? 'border-rose-400/25 bg-rose-500/8' : '',
        ].join(' ')}
      >
        <h2 className="text-lg font-semibold text-white">Regression detection</h2>
        <p className="mt-1 text-sm text-slate-400">
          A regression is raised when a new prompt version loses at least{' '}
          {regressions.thresholdPercent} points across {regressions.minimumSample} or more runs.
        </p>

        <div className="mt-6 space-y-3">
          {regressions.items.map((regression) => (
            <div
              key={regression.promptId}
              className="rounded-xl border border-white/8 bg-white/4 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-white">{regression.promptName}</p>
                <Badge tone="warning">-{formatScore(regression.drop)} points</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Version {regression.previousVersion} scored {formatScore(regression.previousScore)},
                version {regression.currentVersion} scores {formatScore(regression.currentScore)}{' '}
                over {regression.samples} runs.
              </p>
            </div>
          ))}
        </div>

        {regressions.items.length === 0 ? (
          <p className="mt-6 text-sm text-emerald-300">No prompt regression detected.</p>
        ) : null}
      </Panel>
    </div>
  );
}
