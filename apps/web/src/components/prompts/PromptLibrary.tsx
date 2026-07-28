import type { PromptDefinition } from '../../types/prompts';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

interface PromptLibraryProps {
  prompts: PromptDefinition[];
  selectedPromptId: string | null;
  onSelect: (prompt: PromptDefinition) => void;
  onCreateVersion: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

export default function PromptLibrary({
  prompts,
  selectedPromptId,
  onSelect,
  onCreateVersion,
  onDuplicate,
  onArchive,
  onRestore,
}: PromptLibraryProps) {
  return (
    <Panel className="flex h-full min-h-[860px] flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            Prompt Library
          </p>
          <p className="mt-1 text-sm text-slate-500">Versioned orchestration assets</p>
        </div>
        <Badge tone="info">{prompts.length}</Badge>
      </div>

      <div className="grid gap-2">
        <Button fullWidth onClick={onCreateVersion}>
          Create Version
        </Button>
        <Button fullWidth variant="secondary" onClick={onDuplicate}>
          Duplicate Prompt
        </Button>
      </div>

      <div className="mt-4 grid gap-2">
        <Button fullWidth variant="ghost" onClick={onArchive}>
          Archive Prompt
        </Button>
        <Button fullWidth variant="ghost" onClick={onRestore}>
          Restore Prompt
        </Button>
      </div>

      <div className="custom-scrollbar mt-6 flex-1 space-y-3 overflow-y-auto">
        {prompts.map((prompt) => {
          const isSelected = prompt.id === selectedPromptId;

          return (
            <button
              key={prompt.id}
              type="button"
              onClick={() => onSelect(prompt)}
              className={[
                'w-full rounded-2xl border p-4 text-left transition',
                isSelected
                  ? 'border-cyan-400/35 bg-cyan-400/10'
                  : 'border-white/10 bg-slate-950/60 hover:bg-white/5',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{prompt.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    v{prompt.version}
                  </p>
                </div>
                <Badge tone={prompt.status === 'active' ? 'success' : 'neutral'}>
                  {prompt.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{prompt.description}</p>
              <p className="mt-3 text-xs text-slate-500">Updated {prompt.updatedDate}</p>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
