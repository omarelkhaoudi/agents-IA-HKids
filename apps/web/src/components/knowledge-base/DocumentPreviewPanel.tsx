import type { KnowledgeBaseDocument } from '../../types/knowledge-base';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

interface DocumentPreviewPanelProps {
  document: KnowledgeBaseDocument | null;
  onEdit: (document: KnowledgeBaseDocument) => void;
  onDelete: (document: KnowledgeBaseDocument) => void;
}

export default function DocumentPreviewPanel({
  document,
  onEdit,
  onDelete,
}: DocumentPreviewPanelProps) {
  return (
    <Panel className="flex h-full min-h-[720px] flex-col p-5">
      <div className="border-b border-white/10 pb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
          Preview Panel
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Document details</h2>
      </div>

      {!document ? (
        <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-400">
          Select a document to inspect metadata, tags, file details, and status.
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{document.fileType}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{document.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{document.description}</p>
              </div>
              <Badge tone={document.status === 'active' ? 'success' : 'neutral'}>
                {document.status}
              </Badge>
            </div>

            <div className="mt-5 grid gap-3">
              <MetadataItem label="Category" value={document.category} />
              <MetadataItem label="Author" value={document.author} />
              <MetadataItem label="Created date" value={document.createdDate} />
              <MetadataItem label="Updated date" value={document.updatedDate} />
              <MetadataItem label="Size" value={document.size} />
              <MetadataItem label="Original file" value={document.sourceFileName} />
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm font-semibold text-white">Tags</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {document.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-cyan-400/15 bg-cyan-400/8 p-5">
            <p className="text-sm font-semibold text-white">Preview summary</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              This file is currently represented through metadata-driven preview mode only. A future
              backend can attach secure file rendering, permissions, and storage lifecycle management.
            </p>
          </div>

          <div className="mt-auto flex gap-3 pt-5">
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
