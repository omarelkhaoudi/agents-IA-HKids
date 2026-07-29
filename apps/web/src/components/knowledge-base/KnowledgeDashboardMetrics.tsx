import MetricCard from '../ui/MetricCard';
import type { KnowledgeDashboard } from '../../types/knowledge-base';

interface KnowledgeDashboardMetricsProps {
  dashboard: KnowledgeDashboard;
}

export default function KnowledgeDashboardMetrics({ dashboard }: KnowledgeDashboardMetricsProps) {
  const items = [
    { label: 'Total documents', value: String(dashboard.totalDocuments), accent: 'cyan' as const },
    { label: 'Collections', value: String(dashboard.collections), accent: 'blue' as const },
    { label: 'Categories', value: String(dashboard.categories), accent: 'emerald' as const },
    { label: 'Tags', value: String(dashboard.tags), accent: 'purple' as const },
    { label: 'Pending reviews', value: String(dashboard.pendingReviews), accent: 'orange' as const },
    { label: 'Published', value: String(dashboard.published), accent: 'emerald' as const },
    { label: 'Drafts', value: String(dashboard.drafts), accent: 'blue' as const },
    {
      label: 'Knowledge quality',
      value: `${dashboard.knowledgeQualityScore}`,
      hint: `${dashboard.archived} archived`,
      accent: 'cyan' as const,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <MetricCard
          key={item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
          accent={item.accent}
        />
      ))}
    </div>
  );
}
