import MetricCard from '../ui/MetricCard';
import type { PromptDashboard } from '../../types/prompts';

interface PromptDashboardMetricsProps {
  dashboard: PromptDashboard;
}

export default function PromptDashboardMetrics({ dashboard }: PromptDashboardMetricsProps) {
  const items = [
    { label: 'Total prompts', value: String(dashboard.totalPrompts), accent: 'cyan' as const },
    { label: 'Published', value: String(dashboard.publishedPrompts), accent: 'emerald' as const },
    { label: 'Drafts', value: String(dashboard.draftPrompts), accent: 'blue' as const },
    { label: 'Archived', value: String(dashboard.archivedPrompts), accent: 'orange' as const },
    { label: 'Pending reviews', value: String(dashboard.pendingReviews), accent: 'purple' as const },
    { label: 'Avg feedback', value: String(dashboard.averageFeedback), accent: 'cyan' as const },
    {
      label: 'Avg approval rate',
      value: `${dashboard.averageApprovalRate}%`,
      accent: 'emerald' as const,
    },
    { label: 'Libraries', value: String(dashboard.libraries), accent: 'blue' as const },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <MetricCard key={item.label} label={item.label} value={item.value} accent={item.accent} />
      ))}
    </div>
  );
}
