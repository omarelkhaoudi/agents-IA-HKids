import type { UsageGranularity, UsageReport } from '../../types/observability';
import Button from '../ui/Button';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import TrendChart from './TrendChart';
import {
  formatCost,
  formatDuration,
  formatNumber,
  formatPercent,
} from '../../utils/observabilityFormat';

const granularities: { id: UsageGranularity; label: string }[] = [
  { id: 'hourly', label: 'Hourly' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

interface UsagePanelProps {
  usage: UsageReport;
  granularity: UsageGranularity;
  onGranularityChange: (granularity: UsageGranularity) => void;
  onExport: (dataset: 'usage' | 'agents' | 'models') => void;
  busy?: boolean;
}

export default function UsagePanel({
  usage,
  granularity,
  onGranularityChange,
  onExport,
  busy = false,
}: UsagePanelProps) {
  const requestPoints = usage.series.map((bucket) => ({
    label: bucket.bucket,
    value: bucket.requests,
    secondaryValue: bucket.failedRequests,
    hint: `${bucket.bucket}: ${bucket.requests} requests, ${bucket.failedRequests} failed, ${formatDuration(
      bucket.averageDurationMs
    )} average`,
  }));

  const tokenPoints = usage.series.map((bucket) => ({
    label: bucket.bucket,
    value: bucket.totalTokens,
    hint: `${bucket.bucket}: ${formatNumber(bucket.totalTokens)} tokens, ${formatCost(
      bucket.estimatedCost
    )}`,
  }));

  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">AI usage over time</h2>
            <p className="mt-1 text-sm text-slate-400">
              Requests, tokens and cost across the last {usage.windowDays} days.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {granularities.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onGranularityChange(item.id)}
                className={[
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                  granularity === item.id
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
            <Button size="sm" variant="secondary" onClick={() => onExport('usage')} disabled={busy}>
              Export CSV
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <TrendChart points={requestPoints} />
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requests"
          value={formatNumber(usage.summary.requests)}
          hint={`${usage.summary.failedRequests} failed`}
          accent="cyan"
        />
        <MetricCard
          label="Tokens in / out"
          value={`${formatNumber(usage.summary.promptTokens)} / ${formatNumber(
            usage.summary.completionTokens
          )}`}
          hint={`${formatNumber(usage.summary.totalTokens)} total`}
          accent="blue"
        />
        <MetricCard
          label="Estimated cost"
          value={formatCost(usage.summary.estimatedCost)}
          hint="Derived from AI Gateway pricing"
          accent="purple"
        />
        <MetricCard
          label="Average latency"
          value={formatDuration(usage.summary.averageLatencyMs)}
          hint={`Error rate ${formatPercent(usage.summary.errorRatePercent)}`}
          accent="emerald"
        />
      </div>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Token consumption</h2>
        <p className="mt-1 text-sm text-slate-400">
          Total tokens consumed per {granularity.replace('ly', '')} bucket.
        </p>
        <div className="mt-6">
          <TrendChart points={tokenPoints} accent="violet" height={140} />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Requests per agent</h2>
              <p className="mt-1 text-sm text-slate-400">Cost and latency attributed per agent.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onExport('agents')} disabled={busy}>
              Export
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Agent</th>
                  <th className="px-5 py-3 font-medium">Requests</th>
                  <th className="px-5 py-3 font-medium">Tokens</th>
                  <th className="px-5 py-3 font-medium">Cost</th>
                  <th className="px-5 py-3 font-medium">Avg latency</th>
                </tr>
              </thead>
              <tbody>
                {usage.byAgent.map((agent) => (
                  <tr key={agent.agentCode} className="border-t border-white/6 hover:bg-white/4">
                    <td className="px-5 py-3">
                      <p className="text-white">{agent.agentName}</p>
                      <p className="text-xs text-slate-500">{agent.agentCode}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{formatNumber(agent.requests)}</td>
                    <td className="px-5 py-3 text-slate-300">{formatNumber(agent.totalTokens)}</td>
                    <td className="px-5 py-3 text-slate-300">{formatCost(agent.estimatedCost)}</td>
                    <td className="px-5 py-3 text-slate-300">
                      {formatDuration(agent.averageDurationMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {usage.byAgent.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No agent activity recorded for this window.
            </div>
          ) : null}
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Model and provider usage</h2>
            <Button size="sm" variant="ghost" onClick={() => onExport('models')} disabled={busy}>
              Export
            </Button>
          </div>

          <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Models
          </h3>
          <ul className="mt-3 space-y-3">
            {usage.byModel.length === 0 ? (
              <li className="text-sm text-slate-400">No model usage recorded.</li>
            ) : (
              usage.byModel.map((model) => (
                <li key={model.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate text-slate-200">{model.key}</span>
                    <span className="ml-3 shrink-0 text-slate-400">
                      {formatNumber(model.requests)} · {formatCost(model.estimatedCost)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-cyan-400 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (model.requests / Math.max(1, usage.summary.requests)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>

          <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Providers
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {usage.byProvider.length === 0 ? (
              <li className="text-slate-400">No provider usage recorded.</li>
            ) : (
              usage.byProvider.map((provider) => (
                <li key={provider.key} className="flex items-center justify-between">
                  <span className="text-slate-200">{provider.key}</span>
                  <span className="text-slate-400">
                    {formatNumber(provider.requests)} requests ·{' '}
                    {formatDuration(provider.averageDurationMs)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
