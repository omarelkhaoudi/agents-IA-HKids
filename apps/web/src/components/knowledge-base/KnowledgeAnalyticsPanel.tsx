import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import type { KnowledgeAnalytics } from '../../types/knowledge-base';

interface KnowledgeAnalyticsPanelProps {
  analytics: KnowledgeAnalytics;
}

export default function KnowledgeAnalyticsPanel({ analytics }: KnowledgeAnalyticsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Avg quality"
          value={String(analytics.documentQuality.average)}
          accent="cyan"
        />
        <MetricCard
          label="Incomplete metadata"
          value={String(analytics.documentQuality.incomplete)}
          accent="orange"
        />
        <MetricCard label="Review backlog" value={String(analytics.reviewBacklog)} accent="purple" />
        <MetricCard
          label="Fresh / stale"
          value={`${analytics.knowledgeFreshness.fresh}/${analytics.knowledgeFreshness.stale}`}
          accent="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Most viewed</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {analytics.mostViewed.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.title}</span>
                <span className="text-slate-500">{item.viewCount || 0}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Most retrieved by AI</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {analytics.mostRetrievedByAi.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.title}</span>
                <span className="text-slate-500">{item.aiUsageCount || 0}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Unused documents</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {analytics.unusedDocuments.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
            {analytics.unusedDocuments.length === 0 ? (
              <li className="text-slate-500">No unused documents.</li>
            ) : null}
          </ul>
        </Panel>
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Collections growth</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {analytics.collectionsGrowth.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span className="text-slate-500">{item.documents}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Tag statistics</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {analytics.tagStatistics.map((tag) => (
              <span
                key={tag.name}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300"
              >
                {tag.name} · {tag.count}
              </span>
            ))}
            {analytics.tagStatistics.length === 0 ? (
              <p className="text-sm text-slate-500">Tag usage appears as documents are tagged.</p>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
