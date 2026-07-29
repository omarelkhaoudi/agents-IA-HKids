import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import type { KnowledgeBaseDocument, KnowledgeVersion } from '../../types/knowledge-base';

interface KnowledgeVersionTimelineProps {
  document: KnowledgeBaseDocument;
  versions: KnowledgeVersion[];
  timeline: Array<{ type: string; at?: string; label: string; actor: string }>;
  busy: boolean;
  onRestore: (version: number) => void;
  onDuplicate: (version: number) => void;
}

export default function KnowledgeVersionTimeline({
  document,
  versions,
  timeline,
  busy,
  onRestore,
  onDuplicate,
}: KnowledgeVersionTimelineProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Version history</h2>
        <p className="mt-2 text-sm text-slate-400">
          {document.title} · current v{document.version || 1}
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
              <div className="mt-3 flex gap-2">
                <Button disabled={busy} variant="secondary" onClick={() => onRestore(version.version)}>
                  Restore / rollback
                </Button>
                <Button disabled={busy} variant="ghost" onClick={() => onDuplicate(version.version)}>
                  Duplicate version
                </Button>
              </div>
            </article>
          ))}
          {versions.length === 0 ? (
            <p className="text-sm text-slate-500">No snapshots yet. Edits create version history.</p>
          ) : null}
        </div>
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Version timeline</h2>
        <ol className="mt-5 space-y-4 border-l border-white/10 pl-4">
          {timeline.map((item, index) => (
            <li key={`${item.label}-${index}`} className="relative">
              <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <p className="text-sm text-white">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.actor || 'system'} · {item.at ? String(item.at).slice(0, 19) : '—'} · {item.type}
              </p>
            </li>
          ))}
          {timeline.length === 0 ? (
            <li className="text-sm text-slate-500">Timeline populates as reviews and edits occur.</li>
          ) : null}
        </ol>
      </Panel>
    </div>
  );
}
