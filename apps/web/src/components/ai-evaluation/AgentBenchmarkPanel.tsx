import type { AgentBenchmark, AgentScorecard } from '../../types/aiEvaluation';
import Badge from '../ui/Badge';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import {
  formatDelta,
  formatScore,
  scoreAccent,
  scoreTone,
} from '../../utils/evaluationFormat';
import { formatCost, formatDuration, formatNumber, formatPercent } from '../../utils/observabilityFormat';

interface AgentBenchmarkPanelProps {
  benchmark: AgentBenchmark;
}

const COMPONENT_LABELS: { key: keyof AgentScorecard['components']; label: string }[] = [
  { key: 'quality', label: 'Quality' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'groundedness', label: 'Groundedness' },
  { key: 'humanApproval', label: 'Human approval' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'speed', label: 'Speed' },
  { key: 'costEfficiency', label: 'Cost efficiency' },
];

export default function AgentBenchmarkPanel({ benchmark }: AgentBenchmarkPanelProps) {
  const evaluated = benchmark.agents.filter((agent) => agent.runs > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Platform score"
          value={`${formatScore(benchmark.platformScore)}/100`}
          hint={`${evaluated.length} agents evaluated`}
          accent={scoreAccent(benchmark.platformScore)}
        />
        <MetricCard
          label="Agents monitored"
          value={String(benchmark.agents.length)}
          hint="Reused from the agent registry"
          accent="cyan"
        />
        <MetricCard
          label="Best agent"
          value={evaluated[0]?.agentName || '—'}
          hint={evaluated[0] ? `${formatScore(evaluated[0].overallScore)}/100` : 'No data yet'}
          accent="emerald"
        />
        <MetricCard
          label="Window"
          value={`${benchmark.windowDays} days`}
          hint="Comparison period"
          accent="purple"
        />
      </div>

      <Panel className="overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Agent benchmark</h2>
          <p className="mt-1 text-sm text-slate-400">
            The four production agents compared on the same axes.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Quality</th>
                <th className="px-5 py-3 font-medium">Speed</th>
                <th className="px-5 py-3 font-medium">Tokens</th>
                <th className="px-5 py-3 font-medium">Cost</th>
                <th className="px-5 py-3 font-medium">Approvals</th>
                <th className="px-5 py-3 font-medium">Feedback</th>
                <th className="px-5 py-3 font-medium">Knowledge</th>
                <th className="px-5 py-3 font-medium">Risk</th>
                <th className="px-5 py-3 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {benchmark.agents.map((agent) => (
                <tr key={agent.agentCode} className="border-t border-white/6 hover:bg-white/4">
                  <td className="px-5 py-3">
                    <p className="text-white">{agent.agentName}</p>
                    <p className="text-xs text-slate-500">{agent.runs} evaluated runs</p>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={scoreTone(agent.overallScore)}>
                      {formatScore(agent.overallScore)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{formatScore(agent.averageScore)}</td>
                  <td className="px-5 py-3 text-slate-300">
                    {formatDuration(agent.averageLatencyMs)}
                  </td>
                  <td className="px-5 py-3 text-slate-300">{formatNumber(agent.averageTokens)}</td>
                  <td className="px-5 py-3 text-slate-300">{formatCost(agent.averageCost)}</td>
                  <td className="px-5 py-3 text-slate-300">{formatPercent(agent.approvalRate)}</td>
                  <td className="px-5 py-3 text-slate-300">{formatScore(agent.averageFeedback)}</td>
                  <td className="px-5 py-3 text-slate-300">
                    {formatPercent(agent.averageKnowledgeCoverage)}
                  </td>
                  <td className="px-5 py-3 text-slate-300">
                    {formatPercent(agent.averageHallucinationRisk)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        agent.trend >= 0 ? 'text-sm text-emerald-300' : 'text-sm text-rose-300'
                      }
                    >
                      {formatDelta(agent.trend)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {benchmark.agents.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            No agent has been evaluated yet.
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        {benchmark.agents.map((agent) => (
          <Panel key={agent.agentCode} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{agent.agentName}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {agent.model || 'No model configured'} · {agent.runs} runs
                </p>
              </div>
              <Badge tone={scoreTone(agent.overallScore)}>
                {formatScore(agent.overallScore)}/100
              </Badge>
            </div>

            <div className="mt-5 space-y-2.5">
              {COMPONENT_LABELS.map((component) => (
                <div key={component.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{component.label}</span>
                    <span className="text-slate-300">
                      {formatScore(agent.components[component.key])}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-cyan-400 transition-all"
                      style={{ width: `${Math.min(agent.components[component.key], 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {agent.strengths.length > 0 ? (
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Top strengths
                </p>
                <ul className="mt-2 space-y-1 text-sm text-emerald-300">
                  {agent.strengths.map((strength) => (
                    <li key={strength}>{strength}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {agent.recommendations.length > 0 ? (
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Improvement recommendations
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {agent.recommendations.map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>
        ))}
      </div>
    </div>
  );
}
