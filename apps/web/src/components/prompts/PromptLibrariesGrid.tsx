import Badge from '../ui/Badge';
import Panel from '../ui/Panel';
import type { PromptDefinition, PromptLibrary } from '../../types/prompts';

interface PromptLibrariesGridProps {
  libraries: PromptLibrary[];
  prompts: PromptDefinition[];
}

export default function PromptLibrariesGrid({ libraries, prompts }: PromptLibrariesGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {libraries.map((library) => {
        const count = prompts.filter((item) => item.libraryId === library.id).length;
        return (
          <Panel key={library.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  v{library.version} · {library.language}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">{library.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{library.description}</p>
              </div>
              <Badge tone={library.status === 'active' ? 'success' : 'neutral'}>{library.status}</Badge>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div className="rounded-2xl border border-white/10 px-3 py-2">
                Owner
                <p className="mt-1 text-sm text-white">{library.owner || '—'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 px-3 py-2">
                Prompts
                <p className="mt-1 text-sm text-white">{count}</p>
              </div>
              <div className="rounded-2xl border border-white/10 px-3 py-2">
                Priority
                <p className="mt-1 text-sm text-white">{library.priority}</p>
              </div>
              <div className="rounded-2xl border border-white/10 px-3 py-2">
                Tags
                <p className="mt-1 text-sm text-white">{library.tags.join(', ') || '—'}</p>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
