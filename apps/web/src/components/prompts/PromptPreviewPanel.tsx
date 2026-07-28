import type { PromptDefinition } from '../../types/prompts';
import { buildPromptPreview } from '../../lib/prompt-preview';
import Badge from '../ui/Badge';
import Panel from '../ui/Panel';

interface PromptPreviewPanelProps {
  prompt: PromptDefinition | null;
}

export default function PromptPreviewPanel({ prompt }: PromptPreviewPanelProps) {
  const assembledPrompt = buildPromptPreview(prompt);

  return (
    <Panel className="flex h-full min-h-[860px] flex-col p-5">
      <div className="border-b border-white/10 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              Send Preview
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Read-only assembled prompt</h2>
          </div>
          <Badge tone="info">Model-ready</Badge>
        </div>
      </div>

      {!prompt ? (
        <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-400">
          Select a prompt version to inspect the final assembled payload preview.
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Transmission envelope</p>
            <div className="mt-3 grid gap-3 text-sm text-slate-300">
              <MetadataRow label="Agent" value={prompt.name} />
              <MetadataRow label="Version" value={`v${prompt.version}`} />
              <MetadataRow label="Status" value={prompt.status} />
              <MetadataRow label="Mode" value="System prompt orchestration preview only" />
            </div>
          </div>

          <div className="custom-scrollbar mt-5 flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/75 p-5">
            <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
              {assembledPrompt}
            </pre>
          </div>
        </div>
      )}
    </Panel>
  );
}

interface MetadataRowProps {
  label: string;
  value: string;
}

function MetadataRow({ label, value }: MetadataRowProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
