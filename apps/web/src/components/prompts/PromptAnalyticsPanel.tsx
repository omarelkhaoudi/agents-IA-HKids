import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import type { PromptAnalytics } from '../../types/prompts';

interface PromptAnalyticsPanelProps {
  analytics: PromptAnalytics;
}

export default function PromptAnalyticsPanel({ analytics }: PromptAnalyticsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Avg response time" value={`${analytics.averageResponseTime} ms`} accent="cyan" />
        <MetricCard label="Avg feedback" value={String(analytics.averageFeedback)} accent="blue" />
        <MetricCard label="Approval rate" value={`${analytics.approvalRate}%`} accent="emerald" />
        <MetricCard
          label="Growth"
          value={`${analytics.promptGrowth.published}/${analytics.promptGrowth.total}`}
          hint="published / total"
          accent="purple"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Most used</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {analytics.mostUsed.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span className="text-slate-500">{item.usageCount || 0}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Unused prompts</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {analytics.unusedPrompts.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
            {analytics.unusedPrompts.length === 0 ? (
              <li className="text-slate-500">No unused prompts.</li>
            ) : null}
          </ul>
        </Panel>
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Highest rated</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {analytics.highestRated.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span className="text-slate-500">{item.feedbackScore || 0}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Libraries usage</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {analytics.librariesUsage.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span className="text-slate-500">{item.prompts}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
