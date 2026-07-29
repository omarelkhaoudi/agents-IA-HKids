import type { KnowledgeBaseDocument, KnowledgeCollection, KnowledgeLink } from '../../types/knowledge-base';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

interface DocumentPreviewPanelProps {
  document: KnowledgeBaseDocument | null;
  collections?: KnowledgeCollection[];
  links?: KnowledgeLink[];
  onEdit: (document: KnowledgeBaseDocument) => void;
  onDelete: (document: KnowledgeBaseDocument) => void;
  onSubmitReview?: (document: KnowledgeBaseDocument) => void;
  onPublish?: (document: KnowledgeBaseDocument) => void;
}

function renderPreview(document: KnowledgeBaseDocument) {
  const content = document.content || document.description || '';
  if (document.fileType === 'HTML') {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs text-emerald-200">
        {content}
      </pre>
    );
  }
  if (document.fileType === 'MD' || document.fileType === 'TXT') {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs text-slate-200">
        {content}
      </pre>
    );
  }
  if (document.fileType === 'PDF') {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
        PDF metadata preview. Secure binary rendering can attach later without changing the KMS API.
        <p className="mt-3 whitespace-pre-wrap text-xs text-slate-400">{content.slice(0, 1200)}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-7 text-slate-300">
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Content preview</p>
      <p className="whitespace-pre-wrap">{content || 'No content body yet.'}</p>
    </div>
  );
}

export default function DocumentPreviewPanel({
  document,
  collections = [],
  links = [],
  onEdit,
  onDelete,
  onSubmitReview,
  onPublish,
}: DocumentPreviewPanelProps) {
  const collectionName =
    collections.find((item) => item.id === document?.collectionId)?.name || 'Unassigned';

  return (
    <Panel className="flex h-full min-h-[720px] flex-col p-5">
      <div className="border-b border-white/10 pb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
          Document preview
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Metadata & content</h2>
      </div>

      {!document ? (
        <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-400">
          Select a document to inspect metadata, quality, links, and preview.
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pt-5">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {document.fileType} · v{document.version || 1}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">{document.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{document.description}</p>
              </div>
              <Badge tone={document.status === 'active' ? 'success' : 'neutral'}>
                {document.status === 'active' ? 'published' : document.status}
              </Badge>
            </div>

            <div className="mt-5 grid gap-3">
              <MetadataItem label="Collection" value={collectionName} />
              <MetadataItem label="Category" value={document.category} />
              <MetadataItem label="Owner" value={document.owner || document.author} />
              <MetadataItem label="Language" value={document.language || 'fr'} />
              <MetadataItem label="Quality / completeness" value={`${document.qualityScore ?? 0} / ${document.completenessScore ?? 0}`} />
              <MetadataItem label="Views / AI usage" value={`${document.viewCount || 0} / ${document.aiUsageCount || 0}`} />
              <MetadataItem label="Review date" value={document.reviewDate || '—'} />
              <MetadataItem label="Expiration" value={document.expirationDate || '—'} />
              <MetadataItem label="Updated" value={document.updatedDate} />
            </div>
          </div>

          {document.missingMetadata && document.missingMetadata.length > 0 ? (
            <div className="rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4 text-sm text-orange-100">
              Missing metadata: {document.missingMetadata.join(', ')}
            </div>
          ) : null}

          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm font-semibold text-white">Tags</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {document.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>

          {renderPreview(document)}

          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm font-semibold text-white">Linked resources</p>
            <div className="mt-3 space-y-2">
              {links.map((link) => (
                <div key={link.id} className="flex justify-between text-xs text-slate-400">
                  <span>{link.label || link.linkedId}</span>
                  <span>{link.linkedType}</span>
                </div>
              ))}
              {links.length === 0 ? <p className="text-xs text-slate-500">No linked resources.</p> : null}
            </div>
          </div>

          {document.notes ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">Notes</p>
              <p className="mt-2 whitespace-pre-wrap">{document.notes}</p>
            </div>
          ) : null}

          <div className="mt-auto flex flex-col gap-2 pt-2">
            {onSubmitReview && document.status === 'draft' ? (
              <Button variant="secondary" onClick={() => onSubmitReview(document)} fullWidth>
                Submit for review
              </Button>
            ) : null}
            {onPublish && document.status === 'review' ? (
              <Button onClick={() => onPublish(document)} fullWidth>
                Publish
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => onEdit(document)} fullWidth>
              Edit Metadata
            </Button>
            <Button
              variant="ghost"
              onClick={() => onDelete(document)}
              className="w-full text-rose-300 hover:bg-rose-500/10"
            >
              Delete Document
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

interface MetadataItemProps {
  label: string;
  value: string;
}

function MetadataItem({ label, value }: MetadataItemProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
