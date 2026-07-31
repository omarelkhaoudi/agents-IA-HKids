import type { AlertList, AlertStatus } from '../../types/observability';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import {
  formatDuration,
  formatRelativeTime,
  severityTone,
} from '../../utils/observabilityFormat';

const statusFilters: { id: AlertStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'acknowledged', label: 'Acknowledged' },
  { id: 'resolved', label: 'Resolved' },
];

const ruleLabels: Record<string, string> = {
  high_latency: 'High latency',
  ai_failures: 'AI failures',
  storage_limit: 'Storage limit',
  missing_approvals: 'Missing approvals',
  failed_workflows: 'Failed workflows',
  retrieval_failures: 'Retrieval failures',
  module_unhealthy: 'Module unhealthy',
};

interface AlertsPanelProps {
  alerts: AlertList;
  status: AlertStatus | 'all';
  onStatusChange: (status: AlertStatus | 'all') => void;
  onEvaluate: () => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  canManage: boolean;
  busy?: boolean;
}

export default function AlertsPanel({
  alerts,
  status,
  onStatusChange,
  onEvaluate,
  onAcknowledge,
  onResolve,
  canManage,
  busy = false,
}: AlertsPanelProps) {
  const { thresholds } = alerts;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open" value={String(alerts.counts.open)} accent="orange" />
        <MetricCard label="Critical" value={String(alerts.counts.critical)} accent="orange" />
        <MetricCard
          label="Acknowledged"
          value={String(alerts.counts.acknowledged)}
          accent="blue"
        />
        <MetricCard label="Resolved" value={String(alerts.counts.resolved)} accent="emerald" />
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Alert rules</h2>
            <p className="mt-1 text-sm text-slate-400">
              Rules run against live gateway, workflow, storage and retrieval data.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => onStatusChange(filter.id)}
                className={[
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                  status === filter.id
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                ].join(' ')}
              >
                {filter.label}
              </button>
            ))}
            {canManage ? (
              <Button size="sm" onClick={onEvaluate} disabled={busy}>
                {busy ? 'Evaluating...' : 'Evaluate now'}
              </Button>
            ) : null}
          </div>
        </div>

        <ul className="mt-5 grid gap-3 text-xs text-slate-400 md:grid-cols-3">
          <li>Latency threshold: {formatDuration(thresholds.latencyMs)}</li>
          <li>Error rate threshold: {thresholds.errorRatePercent}%</li>
          <li>Storage threshold: {thresholds.storagePercent}%</li>
          <li>Pending approvals: {thresholds.pendingApprovals}</li>
          <li>Failed workflows: {thresholds.failedWorkflows}</li>
          <li>Retrieval failures: {thresholds.retrievalFailures}</li>
        </ul>
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Active alerts</h2>

        {alerts.items.length === 0 ? (
          <p className="mt-6 text-sm text-emerald-300">
            No alert matches this filter. The platform is operating within its thresholds.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {alerts.items.map((alert) => (
              <li
                key={alert.id}
                className={[
                  'rounded-[1.25rem] border p-4 transition',
                  alert.severity === 'critical'
                    ? 'border-rose-400/25 bg-rose-500/8'
                    : 'border-white/8 bg-white/4',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={severityTone(alert.severity)}>{alert.severity}</Badge>
                      <Badge tone="neutral">{ruleLabels[alert.rule_code] || alert.rule_code}</Badge>
                      <Badge tone={alert.status === 'resolved' ? 'success' : 'warning'}>
                        {alert.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">{alert.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{alert.description}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Observed {String(alert.observed_value)} against threshold{' '}
                      {String(alert.threshold_value)} · seen {alert.occurrences} times · last{' '}
                      {formatRelativeTime(alert.last_seen_at)}
                    </p>
                  </div>

                  {canManage && alert.status !== 'resolved' ? (
                    <div className="flex shrink-0 gap-2">
                      {alert.status === 'open' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onAcknowledge(alert.id)}
                          disabled={busy}
                        >
                          Acknowledge
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onResolve(alert.id)}
                        disabled={busy}
                      >
                        Resolve
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
