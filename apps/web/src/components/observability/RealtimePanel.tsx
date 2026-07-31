import type { RealtimeSnapshot } from '../../types/observability';
import Badge from '../ui/Badge';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import {
  formatCost,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '../../utils/observabilityFormat';

const queueTone = {
  idle: 'neutral',
  nominal: 'success',
  busy: 'warning',
  saturated: 'warning',
} as const;

interface RealtimePanelProps {
  realtime: RealtimeSnapshot;
}

export default function RealtimePanel({ realtime }: RealtimePanelProps) {
  const { lastHour, queue, latency } = realtime;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Active requests"
          value={String(realtime.activeRequestCount)}
          hint={`${queue.inFlight} in flight of ${queue.capacity} slots`}
          accent="cyan"
        />
        <MetricCard
          label="Requests per hour"
          value={formatNumber(lastHour.requestsPerHour)}
          hint={`${formatNumber(realtime.lastDay.requests)} over 24 h`}
          accent="blue"
        />
        <MetricCard
          label="Average latency"
          value={formatDuration(lastHour.averageLatencyMs)}
          hint={`p95 ${formatDuration(latency.p95Ms)} on ${latency.samples} live samples`}
          accent="purple"
        />
        <MetricCard
          label="Success rate"
          value={formatPercent(lastHour.successRatePercent ?? 100)}
          hint={`${lastHour.successRequests ?? 0} successful calls`}
          accent="emerald"
        />
        <MetricCard
          label="Error rate"
          value={formatPercent(lastHour.errorRatePercent ?? 0)}
          hint={`${lastHour.failedRequests} failed calls in the last hour`}
          accent="orange"
        />
        <MetricCard
          label="Queue status"
          value={queue.state}
          hint={`${queue.queued} queued, saturation ${formatPercent(queue.saturationPercent)}`}
          accent={queue.queued > 0 ? 'orange' : 'cyan'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Live gateway traffic</h2>
              <p className="mt-1 text-sm text-slate-400">
                In-flight AI Gateway calls, refreshed continuously.
              </p>
            </div>
            <Badge tone={queueTone[queue.state]}>{queue.state}</Badge>
          </div>

          {realtime.activeRequests.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">
              No AI request is currently executing. Peak concurrency observed: {queue.peakConcurrency}.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {realtime.activeRequests.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{request.model}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {request.provider} · {request.agentCode || 'unassigned agent'}
                      {request.streaming ? ' · streaming' : ''}
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 text-xs text-cyan-300">
                    {formatDuration(request.elapsedMs)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/8 pt-5 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Tokens (1 h)</dt>
              <dd className="mt-1 text-white">{formatNumber(lastHour.totalTokens)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Cost (1 h)</dt>
              <dd className="mt-1 text-white">{formatCost(lastHour.estimatedCost)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Oldest wait</dt>
              <dd className="mt-1 text-white">{formatDuration(queue.oldestWaitMs)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Peak latency</dt>
              <dd className="mt-1 text-white">{formatDuration(lastHour.maxLatencyMs ?? 0)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Recent failures</h2>
          <p className="mt-1 text-sm text-slate-400">
            Errors captured by the AI Gateway over the last 24 hours.
          </p>

          {realtime.recentFailures.length === 0 ? (
            <p className="mt-6 text-sm text-emerald-300">
              No AI request failed in the last 24 hours.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {realtime.recentFailures.map((failure) => (
                <li
                  key={failure.id}
                  className="rounded-xl border border-rose-400/20 bg-rose-500/8 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-rose-100">{failure.model}</p>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatRelativeTime(failure.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {failure.errorMessage || 'Unknown gateway error'}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    {failure.agentCode} · {formatDuration(failure.durationMs)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
