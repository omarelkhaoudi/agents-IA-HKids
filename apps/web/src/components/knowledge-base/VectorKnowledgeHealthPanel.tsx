import type { VectorIndexJob, VectorKnowledgeStats } from '../../types/knowledge-base';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';

interface VectorKnowledgeHealthPanelProps {
  stats: VectorKnowledgeStats | null;
  jobs?: VectorIndexJob[];
  busy?: boolean;
  selectedDocumentTitle?: string;
  onReindexAll?: () => void;
  onReindexSelected?: () => void;
  onRetryFailed?: () => void;
  onClearCache?: () => void;
  onCancelJob?: (jobId: string) => void;
}

function formatPercent(value?: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function jobTone(status: string): 'neutral' | 'success' | 'info' | 'warning' | 'purple' {
  if (status === 'completed') return 'success';
  if (status === 'failed' || status === 'cancelled') return 'warning';
  if (status === 'running' || status === 'queued') return 'info';
  return 'neutral';
}

export default function VectorKnowledgeHealthPanel({
  stats,
  jobs = [],
  busy = false,
  selectedDocumentTitle,
  onReindexAll,
  onReindexSelected,
  onRetryFailed,
  onClearCache,
  onCancelJob,
}: VectorKnowledgeHealthPanelProps) {
  if (!stats) {
    return (
      <Panel className="p-5 text-sm text-slate-400">
        Vector knowledge health is unavailable.
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Vector coverage"
          value={formatPercent(stats.coverage)}
          hint={`${stats.embeddings}/${stats.chunks} chunks embedded`}
          accent={stats.coverage >= 95 ? 'emerald' : stats.coverage >= 70 ? 'orange' : 'purple'}
        />
        <MetricCard
          label="Chunks"
          value={String(stats.chunks)}
          hint={`Average ${stats.averageChunkSize} tokens`}
          accent="cyan"
        />
        <MetricCard
          label="Retrieval latency"
          value={`${Math.round(stats.retrievalLatency || 0)} ms`}
          hint={`Success ${formatPercent(stats.retrievalSuccess)}`}
          accent="blue"
        />
        <MetricCard
          label="Index queue"
          value={String(stats.queueSize || 0)}
          hint={`${stats.failedIndexing || 0} failed, ${stats.missingEmbeddings || 0} missing`}
          accent={stats.queueSize || stats.failedIndexing ? 'orange' : 'emerald'}
        />
      </div>

      <Panel className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Vector index</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="info">{stats.provider}</Badge>
              <Badge>{stats.model}</Badge>
              <Badge>{stats.dimensions} dimensions</Badge>
              <Badge tone={stats.duplicates ? 'warning' : 'success'}>
                {stats.duplicates || 0} duplicates
              </Badge>
              <Badge tone={stats.staleKnowledge ? 'warning' : 'success'}>
                {stats.staleKnowledge || 0} stale
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {onReindexSelected ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !selectedDocumentTitle}
                onClick={onReindexSelected}
              >
                Re-index selected
              </Button>
            ) : null}
            {onReindexAll ? (
              <Button size="sm" disabled={busy} onClick={onReindexAll}>
                Re-index all
              </Button>
            ) : null}
            {onRetryFailed ? (
              <Button size="sm" variant="secondary" disabled={busy} onClick={onRetryFailed}>
                Retry failed
              </Button>
            ) : null}
            {onClearCache ? (
              <Button size="sm" variant="ghost" disabled={busy} onClick={onClearCache}>
                Clear cache
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Cache hit ratio</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {formatPercent(stats.cacheHitRatio)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Embedding latency
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {Math.round(stats.embeddingLatency || 0)} ms
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Vector cache</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {stats.cache?.vectorIndexEntries || 0}
            </p>
          </div>
        </div>
      </Panel>

      {jobs.length ? (
        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Indexing queue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Scope</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Documents</th>
                  <th className="px-5 py-3 font-medium">Chunks</th>
                  <th className="px-5 py-3 font-medium">Provider</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-t border-white/6 hover:bg-white/4">
                    <td className="px-5 py-3 text-white">
                      {job.scope}
                      {job.targetId ? (
                        <p className="text-xs text-slate-500">{job.targetId}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={jobTone(job.status)}>{job.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {job.processedDocuments}/{job.totalDocuments}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {job.processedChunks}/{job.totalChunks}
                    </td>
                    <td className="px-5 py-3 text-slate-300">{job.provider || stats.provider}</td>
                    <td className="px-5 py-3">
                      {onCancelJob && ['queued', 'running'].includes(job.status) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => onCancelJob(job.id)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-500">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
