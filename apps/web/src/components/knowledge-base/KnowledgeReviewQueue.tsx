import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import type { KnowledgeBaseDocument } from '../../types/knowledge-base';

interface KnowledgeReviewQueueProps {
  documents: KnowledgeBaseDocument[];
  busy: boolean;
  onSelect: (document: KnowledgeBaseDocument) => void;
  onPublish: (document: KnowledgeBaseDocument) => void;
  onCorrections: (document: KnowledgeBaseDocument) => void;
  onArchive: (document: KnowledgeBaseDocument) => void;
}

export default function KnowledgeReviewQueue({
  documents,
  busy,
  onSelect,
  onPublish,
  onCorrections,
  onArchive,
}: KnowledgeReviewQueueProps) {
  return (
    <Panel className="p-5">
      <h2 className="text-lg font-semibold text-white">Knowledge review workflow</h2>
      <p className="mt-2 text-sm text-slate-400">
        Draft → Reviewer → Corrections → Publish → Archive. Approval history is tracked per document.
      </p>
      <div className="mt-5 space-y-3">
        {documents.map((document) => (
          <article
            key={document.id}
            className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button type="button" className="text-left" onClick={() => onSelect(document)}>
                <h3 className="font-medium text-white">{document.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Owner {document.owner || document.author} · Quality {document.qualityScore ?? 0}
                </p>
              </button>
              <Badge tone="warning">{document.status}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => onPublish(document)}>
                Publish
              </Button>
              <Button disabled={busy} variant="secondary" onClick={() => onCorrections(document)}>
                Request corrections
              </Button>
              <Button disabled={busy} variant="ghost" onClick={() => onArchive(document)}>
                Archive
              </Button>
            </div>
          </article>
        ))}
        {documents.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No documents pending review.</p>
        ) : null}
      </div>
    </Panel>
  );
}
