import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import type { PromptDefinition, PromptLink, PromptVersion } from '../../types/prompts';

interface PromptVersionRelationshipsProps {
  prompt: PromptDefinition;
  versions: PromptVersion[];
  links: PromptLink[];
  timeline: Array<{ type: string; at?: string; label: string; actor: string }>;
  busy: boolean;
  onRestore: (version: number) => void;
  linkType: PromptLink['linkedType'];
  linkId: string;
  linkLabel: string;
  onLinkTypeChange: (value: PromptLink['linkedType']) => void;
  onLinkIdChange: (value: string) => void;
  onLinkLabelChange: (value: string) => void;
  onAddLink: () => void;
}

export default function PromptVersionRelationships({
  prompt,
  versions,
  links,
  timeline,
  busy,
  onRestore,
  linkType,
  linkId,
  linkLabel,
  onLinkTypeChange,
  onLinkIdChange,
  onLinkLabelChange,
  onAddLink,
}: PromptVersionRelationshipsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Version history</h2>
        <p className="mt-2 text-sm text-slate-400">
          {prompt.name} · current v{prompt.version}
        </p>
        <div className="mt-5 space-y-3">
          {versions.map((version) => (
            <article key={version.id} className="rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">v{version.version}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {version.author} · {version.changeSummary}
                  </p>
                </div>
                <Badge>{version.createdAt ? String(version.createdAt).slice(0, 10) : '—'}</Badge>
              </div>
              <Button
                className="mt-3"
                disabled={busy}
                variant="secondary"
                onClick={() => onRestore(version.version)}
              >
                Rollback / restore
              </Button>
            </article>
          ))}
          {versions.length === 0 ? (
            <p className="text-sm text-slate-500">Edits create version snapshots automatically.</p>
          ) : null}
        </div>
        <ol className="mt-6 space-y-3 border-l border-white/10 pl-4">
          {timeline.slice(0, 8).map((item, index) => (
            <li key={`${item.label}-${index}`} className="relative text-sm text-slate-300">
              <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
              {item.label}
              <p className="text-xs text-slate-500">
                {item.actor || 'system'} · {item.at ? String(item.at).slice(0, 19) : '—'}
              </p>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Relationships</h2>
        <p className="mt-2 text-sm text-slate-400">
          Link knowledge collections, documents, templates, workflows, agents, and analytics.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <select
            value={linkType}
            onChange={(event) => onLinkTypeChange(event.target.value as PromptLink['linkedType'])}
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="collection">Knowledge collection</option>
            <option value="document">Document</option>
            <option value="template">Template</option>
            <option value="workflow">Workflow</option>
            <option value="agent">Agent</option>
            <option value="analytics">Analytics</option>
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
          <Button onClick={onAddLink}>Add link</Button>
        </div>
        <div className="mt-5 space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm"
            >
              <span className="text-white">{link.label || link.linkedId}</span>
              <Badge tone="info">{link.linkedType}</Badge>
            </div>
          ))}
          {links.length === 0 ? <p className="text-sm text-slate-500">No relationships yet.</p> : null}
        </div>
      </Panel>
    </div>
  );
}
