import { useEffect, useState } from 'react';
import { getSystemStatus } from '../../api/admin';
import type { SystemStatus } from '../../types/admin';
import Panel from '../../components/ui/Panel';

export default function AdminSystemStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        setStatus(await getSystemStatus());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load system status.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return <Panel className="p-10 text-center text-sm text-slate-400">Loading system status...</Panel>;
  }

  if (error || !status) {
    return <Panel className="p-10 text-center text-sm text-rose-300">{error || 'Unavailable'}</Panel>;
  }

  return (
    <div className="space-y-6">
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
      </div>

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
