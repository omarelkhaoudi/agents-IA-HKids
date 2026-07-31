import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acknowledgeAlert,
  downloadObservabilityExport,
  evaluateAlerts,
  getAuditTimeline,
  getConversationLog,
  getConversationLogs,
  getObservabilityOverview,
  getPlatformAlerts,
  getRealtimeSnapshot,
  getUsageReport,
  resolveAlert,
} from '../../api/observability';
import type {
  AlertList,
  AlertStatus,
  AnalyticsReport,
  ConversationLogDetail,
  ConversationLogList,
  ObservabilityOverview,
  RealtimeSnapshot,
  SystemHealth,
  TimelineReport,
  UsageGranularity,
  UsageReport,
} from '../../types/observability';
import { useAuth } from '../../context/AuthContext';
import AlertsPanel from '../../components/observability/AlertsPanel';
import AnalyticsPanel from '../../components/observability/AnalyticsPanel';
import AuditTimelinePanel from '../../components/observability/AuditTimelinePanel';
import ConversationLogsPanel from '../../components/observability/ConversationLogsPanel';
import RealtimePanel from '../../components/observability/RealtimePanel';
import SystemHealthPanel from '../../components/observability/SystemHealthPanel';
import UsagePanel from '../../components/observability/UsagePanel';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import MetricCard from '../../components/ui/MetricCard';
import Panel from '../../components/ui/Panel';
import Skeleton from '../../components/ui/Skeleton';
import {
  formatCost,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatUptime,
  healthTone,
} from '../../utils/observabilityFormat';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'realtime', label: 'Real-time AI' },
  { id: 'usage', label: 'AI Usage' },
  { id: 'logs', label: 'Conversation Logs' },
  { id: 'health', label: 'System Health' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'audit', label: 'Audit Timeline' },
];

const REALTIME_REFRESH_MS = 15_000;

export default function AdminObservabilityPage() {
  const { hasMinimumRole } = useAuth();
  const canManage = hasMinimumRole('administrator');

  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [overview, setOverview] = useState<ObservabilityOverview | null>(null);
  const [realtime, setRealtime] = useState<RealtimeSnapshot | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [usage, setUsage] = useState<UsageReport | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null);
  const [alerts, setAlerts] = useState<AlertList | null>(null);
  const [logs, setLogs] = useState<ConversationLogList | null>(null);
  const [timeline, setTimeline] = useState<TimelineReport | null>(null);

  const [granularity, setGranularity] = useState<UsageGranularity>('daily');
  const [alertStatus, setAlertStatus] = useState<AlertStatus | 'all'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logDetail, setLogDetail] = useState<ConversationLogDetail | null>(null);
  const [logDetailLoading, setLogDetailLoading] = useState(false);
  const [timelineCategory, setTimelineCategory] = useState('');

  const sectionRef = useRef(section);
  sectionRef.current = section;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');

      try {
        const data = await getObservabilityOverview();
        setOverview(data);
        setRealtime(data.realtime);
        setHealth(data.health);
        setUsage(data.usage);
        setAnalytics(data.analytics);
        setAlerts(data.alerts);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : 'Unable to load observability data.'
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (sectionRef.current !== 'overview' && sectionRef.current !== 'realtime') {
        return;
      }

      void getRealtimeSnapshot()
        .then(setRealtime)
        .catch(() => undefined);
    }, REALTIME_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!overview) {
      return;
    }

    void getUsageReport({ granularity })
      .then(setUsage)
      .catch((usageError: unknown) => {
        setError(usageError instanceof Error ? usageError.message : 'Unable to load AI usage.');
      });
  }, [granularity, overview]);

  useEffect(() => {
    if (section !== 'logs') {
      return;
    }

    const timer = window.setTimeout(() => {
      void getConversationLogs({ search: logSearch || undefined, limit: 25 })
        .then(setLogs)
        .catch((logsError: unknown) => {
          setError(
            logsError instanceof Error ? logsError.message : 'Unable to load conversation logs.'
          );
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [section, logSearch]);

  useEffect(() => {
    if (section !== 'audit') {
      return;
    }

    void getAuditTimeline({ category: timelineCategory || undefined, days: 30, limit: 200 })
      .then(setTimeline)
      .catch((timelineError: unknown) => {
        setError(
          timelineError instanceof Error ? timelineError.message : 'Unable to load audit timeline.'
        );
      });
  }, [section, timelineCategory]);

  useEffect(() => {
    if (!overview) {
      return;
    }

    void getPlatformAlerts({ status: alertStatus === 'all' ? undefined : alertStatus, limit: 50 })
      .then(setAlerts)
      .catch((alertsError: unknown) => {
        setError(alertsError instanceof Error ? alertsError.message : 'Unable to load alerts.');
      });
  }, [alertStatus, overview]);

  const selectLog = useCallback(async (id: string) => {
    setSelectedLogId(id);
    setLogDetailLoading(true);

    try {
      setLogDetail(await getConversationLog(id));
    } catch (detailError) {
      setError(
        detailError instanceof Error ? detailError.message : 'Unable to load conversation detail.'
      );
    } finally {
      setLogDetailLoading(false);
    }
  }, []);

  const runExport = useCallback(
    async (dataset: 'usage' | 'agents' | 'models' | 'alerts' | 'timeline' | 'conversations') => {
      setBusy(true);
      setNotice('');

      try {
        await downloadObservabilityExport(dataset, 'csv');
        setNotice(`Exported ${dataset} as CSV.`);
      } catch (exportError) {
        setError(exportError instanceof Error ? exportError.message : 'Unable to export data.');
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const refreshAlerts = useCallback(async () => {
    setAlerts(
      await getPlatformAlerts({
        status: alertStatus === 'all' ? undefined : alertStatus,
        limit: 50,
      })
    );
  }, [alertStatus]);

  const handleEvaluate = useCallback(async () => {
    setBusy(true);
    setNotice('');

    try {
      const evaluation = await evaluateAlerts();
      await refreshAlerts();
      setNotice(
        `Evaluated alert rules: ${evaluation.triggered} triggered, ${evaluation.autoResolved} auto-resolved.`
      );
    } catch (evaluateError) {
      setError(
        evaluateError instanceof Error ? evaluateError.message : 'Unable to evaluate alert rules.'
      );
    } finally {
      setBusy(false);
    }
  }, [refreshAlerts]);

  const handleAlertAction = useCallback(
    async (id: string, action: 'acknowledge' | 'resolve') => {
      setBusy(true);

      try {
        if (action === 'acknowledge') {
          await acknowledgeAlert(id);
        } else {
          await resolveAlert(id);
        }

        await refreshAlerts();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Unable to update alert.');
      } finally {
        setBusy(false);
      }
    },
    [refreshAlerts]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-[1.25rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[1.25rem]" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-72 rounded-[1.25rem]" />
          <Skeleton className="h-72 rounded-[1.25rem]" />
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return <Panel className="p-10 text-center text-sm text-rose-300">{error}</Panel>;
  }

  if (!overview || !realtime || !health || !usage || !analytics || !alerts) {
    return (
      <Panel className="p-10 text-center text-sm text-slate-400">
        Observability data is unavailable.
      </Panel>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <Panel className="p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Observability
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              AI Observability Platform
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Live visibility over AI usage, conversation execution, module health, cost and
              governance events — sourced from the existing gateway, workflow, knowledge, prompt and
              document systems.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={healthTone(health.status)}>{health.status}</Badge>
            <Badge tone="neutral">{overview.environment}</Badge>
            <Badge tone={alerts.counts.open > 0 ? 'warning' : 'success'}>
              {alerts.counts.open} open alerts
            </Badge>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={[
                'rounded-full px-4 py-2 text-sm transition',
                section === item.id
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Panel>

      {notice ? (
        <Panel className="border-cyan-400/20 p-4 text-sm text-cyan-200">{notice}</Panel>
      ) : null}
      {error ? <Panel className="p-4 text-sm text-rose-300">{error}</Panel> : null}

      {section === 'overview' ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Requests (1 h)"
              value={formatNumber(realtime.lastHour.requests)}
              hint={`${realtime.activeRequestCount} active now`}
              accent="cyan"
            />
            <MetricCard
              label="Success rate"
              value={formatPercent(realtime.lastHour.successRatePercent ?? 100)}
              hint={`${realtime.lastHour.failedRequests} failures in the last hour`}
              accent="emerald"
            />
            <MetricCard
              label="Average latency"
              value={formatDuration(realtime.lastHour.averageLatencyMs)}
              hint={`Queue ${realtime.queue.state}`}
              accent="purple"
            />
            <MetricCard
              label="Cost (30 d)"
              value={formatCost(usage.summary.estimatedCost)}
              hint={`${formatNumber(usage.summary.totalTokens)} tokens`}
              accent="blue"
            />
            <MetricCard
              label="Uptime"
              value={formatUptime(health.uptime.processUptimeSeconds)}
              hint={`Version ${health.version}`}
              accent="cyan"
            />
            <MetricCard
              label="Open alerts"
              value={String(alerts.counts.open)}
              hint={`${alerts.counts.critical} critical`}
              accent="orange"
            />
            <MetricCard
              label="Pending approvals"
              value={String(analytics.approvals.pendingDocuments)}
              hint={`Approval rate ${formatPercent(analytics.approvals.approvalRate)}`}
              accent="orange"
            />
            <MetricCard
              label="Storage"
              value={formatPercent(health.modules.storage.usedPercent)}
              hint={`${health.modules.storage.usedMegabytes} MB of ${health.modules.storage.quotaMegabytes} MB`}
              accent="emerald"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-white">Module status</h2>
              <ul className="mt-5 space-y-2 text-sm">
                {Object.entries(health.modules).map(([name, module]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-2.5"
                  >
                    <span className="capitalize text-slate-300">
                      {name.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                    <Badge tone={healthTone(module.status)}>{module.status}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Latest alerts</h2>
                <Button size="sm" variant="ghost" onClick={() => setSection('alerts')}>
                  Open alerts
                </Button>
              </div>

              {alerts.items.length === 0 ? (
                <p className="mt-6 text-sm text-emerald-300">
                  No alert is currently active on the platform.
                </p>
              ) : (
                <ul className="mt-5 space-y-3 text-sm">
                  {alerts.items.slice(0, 5).map((alert) => (
                    <li
                      key={alert.id}
                      className="rounded-xl border border-white/8 bg-white/4 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-white">{alert.title}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {formatRelativeTime(alert.last_seen_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{alert.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      ) : null}

      {section === 'realtime' ? <RealtimePanel realtime={realtime} /> : null}

      {section === 'usage' ? (
        <UsagePanel
          usage={usage}
          granularity={granularity}
          onGranularityChange={setGranularity}
          onExport={runExport}
          busy={busy}
        />
      ) : null}

      {section === 'logs' ? (
        <ConversationLogsPanel
          items={logs?.items || []}
          total={logs?.total || 0}
          search={logSearch}
          onSearchChange={setLogSearch}
          selectedId={selectedLogId}
          onSelect={(id) => void selectLog(id)}
          detail={logDetail}
          detailLoading={logDetailLoading}
          onExport={() => void runExport('conversations')}
          busy={busy}
        />
      ) : null}

      {section === 'health' ? <SystemHealthPanel health={health} /> : null}

      {section === 'alerts' ? (
        <AlertsPanel
          alerts={alerts}
          status={alertStatus}
          onStatusChange={setAlertStatus}
          onEvaluate={() => void handleEvaluate()}
          onAcknowledge={(id) => void handleAlertAction(id, 'acknowledge')}
          onResolve={(id) => void handleAlertAction(id, 'resolve')}
          canManage={canManage}
          busy={busy}
        />
      ) : null}

      {section === 'analytics' ? <AnalyticsPanel analytics={analytics} /> : null}

      {section === 'audit' ? (
        timeline ? (
          <AuditTimelinePanel
            timeline={timeline}
            category={timelineCategory}
            onCategoryChange={setTimelineCategory}
            onExport={() => void runExport('timeline')}
            busy={busy}
          />
        ) : (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-[1.25rem]" />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
