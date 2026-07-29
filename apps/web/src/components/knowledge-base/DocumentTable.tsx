import type { KnowledgeBaseDocument } from '../../types/knowledge-base';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

interface DocumentTableProps {
  documents: KnowledgeBaseDocument[];
  selectedDocumentId: string | null;
  selectedIds?: string[];
  onToggleSelect?: (documentId: string) => void;
  onSelect: (document: KnowledgeBaseDocument) => void;
  onEdit: (document: KnowledgeBaseDocument) => void;
  onDelete: (document: KnowledgeBaseDocument) => void;
}

function statusTone(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'review') return 'warning' as const;
  if (status === 'draft') return 'info' as const;
  return 'neutral' as const;
}

function statusLabel(status: string) {
  if (status === 'active') return 'published';
  return status;
}

export default function DocumentTable({
  documents,
  selectedDocumentId,
  selectedIds = [],
  onToggleSelect,
  onSelect,
  onEdit,
  onDelete,
}: DocumentTableProps) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-lg font-semibold text-white">Document catalog</h2>
        <p className="mt-1 text-sm text-slate-400">
          Metadata, quality scores, lifecycle status, and bulk selection.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950/60 text-slate-400">
            <tr>
              <th className="px-5 py-4 font-medium">Select</th>
              <th className="px-5 py-4 font-medium">Title</th>
              <th className="px-5 py-4 font-medium">Category</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Quality</th>
              <th className="px-5 py-4 font-medium">Version</th>
              <th className="px-5 py-4 font-medium">Owner</th>
              <th className="px-5 py-4 font-medium">Updated</th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => {
              const isSelected = document.id === selectedDocumentId;

              return (
                <tr
                  key={document.id}
                  className={[
                    'border-t border-white/6 transition hover:bg-white/4',
                    isSelected ? 'bg-cyan-400/6' : '',
                  ].join(' ')}
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(document.id)}
                      onChange={() => onToggleSelect?.(document.id)}
                      aria-label={`Select ${document.title}`}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <button type="button" onClick={() => onSelect(document)} className="text-left">
                      <p className="font-medium text-white">{document.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{document.description}</p>
                    </button>
                  </td>
                  <td className="px-5 py-4 text-slate-300">{document.category}</td>
                  <td className="px-5 py-4">
                    <Badge tone={statusTone(document.status)}>{statusLabel(document.status)}</Badge>
                  </td>
                  <td className="px-5 py-4 text-slate-300">{document.qualityScore ?? 0}</td>
                  <td className="px-5 py-4 text-slate-300">v{document.version || 1}</td>
                  <td className="px-5 py-4 text-slate-300">{document.owner || document.author}</td>
                  <td className="px-5 py-4 text-slate-400">{document.updatedDate}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" className="px-3 py-2" onClick={() => onEdit(document)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-3 py-2 text-rose-300 hover:bg-rose-500/10"
                        onClick={() => onDelete(document)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {documents.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-400">
          No documents match the current filters.
        </div>
      ) : null}
    </Panel>
  );
}
