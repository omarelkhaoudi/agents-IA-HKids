import type { EvaluationAlertList } from '../../types/aiEvaluation';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import { formatRelativeTime, severityTone } from '../../utils/observabilityFormat';

interface EvaluationAlertsPanelProps {
  alerts: EvaluationAlertList;
  onEvaluate: () => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  canManage: boolean;
  busy?: boolean;
}

export default function EvaluationAlertsPanel({
  alerts,
  onEvaluate,
  onAcknowledge,
  onResolve,
  canManage,
  busy = false,
}: EvaluationAlertsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Open alerts"
          value={String(alerts.counts.open)}
          hint="Evaluation rules currently firing"
          accent={alerts.counts.open > 0 ? 'orange' : 'emerald'}
        />
        <MetricCard
          label="Critical"
          value={String(alerts.counts.critical)}
          hint="Unresolved critical alerts"
          accent={alerts.counts.critical > 0 ? 'orange' : 'emerald'}
        />
        <MetricCard
          label="Acknowledged"
          value={String(alerts.counts.acknowledged)}
          hint="Taken over by an administrator"
          accent="cyan"
        />
        <MetricCard
          label="Resolved"
          value={String(alerts.counts.resolved)}
          hint="Closed automatically or manually"
          accent="emerald"
        />
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Evaluation alerts</h2>
            <p className="mt-1 text-sm text-slate-400">
              Quality drops, approval decline, hallucination risk, prompt regressions, outdated
              knowledge, evaluation failures and cost overruns.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={onEvaluate} disabled={busy}>
            {busy ? 'Evaluating…' : 'Evaluate rules'}
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {alerts.items.map((alert) => (
            <div
              key={alert.id}
              className={[
                'rounded-xl border px-4 py-3',
                alert.severity === 'critical'
                  ? 'border-rose-400/25 bg-rose-500/8'
                  : 'border-white/8 bg-white/4',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white">{alert.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{alert.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={severityTone(alert.severity)}>{alert.severity}</Badge>
                  <Badge tone={alert.status === 'resolved' ? 'success' : 'neutral'}>
                    {alert.status}
                  </Badge>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Observed {alert.observed_value} against threshold {alert.threshold_value} ·{' '}
                  {alert.occurrences} occurrences · last seen{' '}
                  {formatRelativeTime(alert.last_seen_at)}
                </p>

                {canManage && alert.status !== 'resolved' ? (
                  <div className="flex gap-2">
                    {alert.status === 'open' ? (
                      <Button size="sm" variant="ghost" onClick={() => onAcknowledge(alert.id)}>
                        Acknowledge
                      </Button>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={() => onResolve(alert.id)}>
                      Resolve
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {alerts.items.length === 0 ? (
          <p className="mt-6 text-sm text-emerald-300">
            No evaluation alert is currently firing. AI quality is within the configured thresholds.
          </p>
        ) : null}
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Active thresholds</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(alerts.thresholds).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
