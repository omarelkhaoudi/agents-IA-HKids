import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import type { KnowledgeBaseDocument, KnowledgeLink } from '../../types/knowledge-base';

interface KnowledgeRelationshipsPanelProps {
  document: KnowledgeBaseDocument;
  links: KnowledgeLink[];
  linkType: KnowledgeLink['linkedType'];
  linkId: string;
  linkLabel: string;
  onLinkTypeChange: (value: KnowledgeLink['linkedType']) => void;
  onLinkIdChange: (value: string) => void;
  onLinkLabelChange: (value: string) => void;
  onAdd: () => void;
}

export default function KnowledgeRelationshipsPanel({
  document,
  links,
  linkType,
  linkId,
  linkLabel,
  onLinkTypeChange,
  onLinkIdChange,
  onLinkLabelChange,
  onAdd,
}: KnowledgeRelationshipsPanelProps) {
  return (
    <Panel className="p-5">
      <h2 className="text-lg font-semibold text-white">Knowledge relationships</h2>
      <p className="mt-2 text-sm text-slate-400">
        Link {document.title} to prompts, workflows, agents, templates, or other documents.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <select
          value={linkType}
          onChange={(event) => onLinkTypeChange(event.target.value as KnowledgeLink['linkedType'])}
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
        >
          <option value="prompt">Prompt</option>
          <option value="workflow">Workflow</option>
          <option value="agent">Agent</option>
          <option value="template">Template</option>
          <option value="document">Document</option>
        </select>
        <input
          value={linkId}
          onChange={(event) => onLinkIdChange(event.target.value)}
          placeholder="Linked id"
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
        />
        <input
          value={linkLabel}
          onChange={(event) => onLinkLabelChange(event.target.value)}
          placeholder="Label"
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
        />
        <Button onClick={onAdd}>Add link</Button>
      </div>

      <div className="mt-6 space-y-3">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3"
          >
            <div>
              <p className="text-sm text-white">{link.label || link.linkedId}</p>
              <p className="mt-1 text-xs text-slate-500">{link.linkedId}</p>
            </div>
            <Badge tone="info">{link.linkedType}</Badge>
          </div>
        ))}
        {links.length === 0 ? (
          <p className="text-sm text-slate-500">No relationships yet.</p>
        ) : null}
      </div>
    </Panel>
  );
}
