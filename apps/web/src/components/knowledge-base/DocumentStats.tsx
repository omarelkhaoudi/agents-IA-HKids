import type { KnowledgeBaseDocument } from '../../types/knowledge-base';
import Panel from '../ui/Panel';

interface DocumentStatsProps {
  documents: KnowledgeBaseDocument[];
}

export default function DocumentStats({ documents }: DocumentStatsProps) {
  const totalDocuments = documents.length;
  const activeDocuments = documents.filter((document) => document.status === 'active').length;
  const categories = new Set(documents.map((document) => document.category)).size;
  const totalStorage = documents.reduce((total, document) => {
    const numericSize = Number.parseFloat(document.size.replace(/[^\d.]/g, ''));
    return total + (Number.isNaN(numericSize) ? 0 : numericSize);
  }, 0);

  const items = [
    { label: 'Total documents', value: totalDocuments.toString() },
    { label: 'Active documents', value: activeDocuments.toString() },
    { label: 'Categories', value: categories.toString() },
    { label: 'Total storage', value: `${totalStorage.toFixed(1)} MB` },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Panel key={item.label} className="p-5">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">{item.label}</p>
          <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
        </Panel>
      ))}
    </div>
  );
}
