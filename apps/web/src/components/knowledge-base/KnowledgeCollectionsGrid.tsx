import Badge from '../ui/Badge';
import Panel from '../ui/Panel';
import type { KnowledgeBaseDocument, KnowledgeCollection } from '../../types/knowledge-base';

interface KnowledgeCollectionsGridProps {
  collections: KnowledgeCollection[];
  documents: KnowledgeBaseDocument[];
}

export default function KnowledgeCollectionsGrid({
  collections,
  documents,
}: KnowledgeCollectionsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {collections.map((collection) => {
        const count = documents.filter((item) => item.collectionId === collection.id).length;
        return (
          <Panel key={collection.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {collection.icon} · {collection.language}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">{collection.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{collection.description}</p>
              </div>
              <Badge tone={collection.status === 'active' ? 'success' : 'neutral'}>
                {collection.status}
              </Badge>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div className="rounded-2xl border border-white/10 px-3 py-2">
                Owner
                <p className="mt-1 text-sm text-white">{collection.owner || '—'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 px-3 py-2">
                Documents
                <p className="mt-1 text-sm text-white">{count}</p>
              </div>
              <div className="rounded-2xl border border-white/10 px-3 py-2">
                Priority
                <p className="mt-1 text-sm text-white">{collection.priority}</p>
              </div>
              <div className="rounded-2xl border border-white/10 px-3 py-2">
                Color
                <p className="mt-1 text-sm text-white">{collection.color}</p>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
