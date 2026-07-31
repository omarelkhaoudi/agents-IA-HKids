import { useEffect, useState } from 'react';
import {
  cancelAdminVectorJob,
  clearAdminVectorCache,
  getAdminVectorJobs,
  getAdminVectorStats,
  getSystemStatus,
  reindexAdminVector,
  retryFailedAdminVectorJobs,
} from '../../api/admin';
import type { SystemStatus } from '../../types/admin';
import type { VectorIndexJob, VectorKnowledgeStats } from '../../types/knowledge-base';
import VectorKnowledgeHealthPanel from '../../components/knowledge-base/VectorKnowledgeHealthPanel';
import Panel from '../../components/ui/Panel';

export default function AdminSystemStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [vectorStats, setVectorStats] = useState<VectorKnowledgeStats | null>(null);
  const [vectorJobs, setVectorJobs] = useState<VectorIndexJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [systemStatus, stats, jobs] = await Promise.all([
          getSystemStatus(),
          getAdminVectorStats().catch(() => null),
          getAdminVectorJobs({ limit: 20 }).catch(() => ({ items: [] })),
        ]);
        setStatus(systemStatus);
        setVectorStats(stats);
        setVectorJobs(jobs.items);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load system status.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function refreshVector() {
    const [stats, jobs] = await Promise.all([
      getAdminVectorStats().catch(() => null),
      getAdminVectorJobs({ limit: 20 }).catch(() => ({ items: [] })),
    ]);
    setVectorStats(stats);
    setVectorJobs(jobs.items);
  }

  async function runVectorAction(action: 'reindex' | 'retry' | 'clear' | 'cancel', jobId = '') {
    setBusy(true);
    setNotice('');
    try {
      if (action === 'reindex') {
        await reindexAdminVector({ scope: 'all', force: true, background: true });
        setNotice('Vector re-index queued for the full knowledge corpus.');
      }
      if (action === 'retry') {
        const result = await retryFailedAdminVectorJobs({ background: true });
        setNotice(`${result.retried} failed vector job(s) queued for retry.`);
      }
      if (action === 'clear') {
        await clearAdminVectorCache();
        setNotice('Vector cache cleared.');
      }
      if (action === 'cancel' && jobId) {
        await cancelAdminVectorJob(jobId);
        setNotice('Indexing job cancellation requested.');
      }
      await refreshVector();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Panel className="p-10 text-center text-sm text-slate-400">Loading system status...</Panel>;
  }

  if (error || !status) {
    return <Panel className="p-10 text-center text-sm text-rose-300">{error || 'Unavailable'}</Panel>;
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <Panel className="border-cyan-400/20 p-4 text-sm text-cyan-200">{notice}</Panel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="System" value={status.system.status} />
        <MetricCard label="Database" value={status.database.status} />
        <MetricCard label="Claude API" value={status.claudeApi.status} />
        <MetricCard label="Environment" value={status.environment.valid ? 'valid' : 'issues'} />
        <MetricCard label="Version" value={status.version} />
        <MetricCard label="Migration" value={status.migrationVersion} />
        <MetricCard label="Current model" value={status.currentModel} />
        <MetricCard label="Provider" value={status.currentProvider} />
        <MetricCard label="Pending workflows" value={String(status.pendingWorkflows)} />
        <MetricCard label="Pending approvals" value={String(status.pendingApprovals)} />
        <MetricCard label="Pending feedback" value={String(status.pendingFeedback)} />
        <MetricCard label="Storage (MB)" value={String(status.storage.approximateMegabytes)} />
        <MetricCard
          label="Vector coverage"
          value={`${Number(status.vector?.coveragePercent || 0).toFixed(1)}%`}
        />
        <MetricCard label="Index queue" value={String(status.vector?.queueSize || 0)} />
      </div>

      <VectorKnowledgeHealthPanel
        stats={vectorStats}
        jobs={vectorJobs}
        busy={busy}
        onReindexAll={() => void runVectorAction('reindex')}
        onRetryFailed={() => void runVectorAction('retry')}
        onClearCache={() => void runVectorAction('clear')}
        onCancelJob={(jobId) => void runVectorAction('cancel', jobId)}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">AI usage</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Requests: {status.aiUsage.totalRequests}</li>
            <li>Tokens: {status.aiUsage.totalTokens}</li>
            <li>Cost: ${status.aiUsage.totalCost.toFixed(4)}</li>
            <li>Average latency: {Math.round(status.aiUsage.averageResponseMs)} ms</li>
          </ul>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Environment validation</h2>
          {status.environment.issues.length ? (
            <ul className="mt-4 space-y-2 text-sm text-amber-300">
              {status.environment.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-emerald-300">All required production checks passed.</p>
          )}
          <p className="mt-4 text-xs text-slate-500">{status.storage.note}</p>
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white break-all">{value}</p>
    </Panel>
  );
}
