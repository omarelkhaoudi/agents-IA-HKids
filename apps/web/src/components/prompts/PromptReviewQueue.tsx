import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import type { PromptDefinition } from '../../types/prompts';

interface PromptReviewQueueProps {
  prompts: PromptDefinition[];
  busy: boolean;
  onSelect: (prompt: PromptDefinition) => void;
  onApprove: (prompt: PromptDefinition) => void;
  onPublish: (prompt: PromptDefinition) => void;
  onCorrections: (prompt: PromptDefinition) => void;
}

export default function PromptReviewQueue({
  prompts,
  busy,
  onSelect,
  onApprove,
  onPublish,
  onCorrections,
}: PromptReviewQueueProps) {
  return (
    <Panel className="p-5">
      <h2 className="text-lg font-semibold text-white">Approval queue</h2>
      <p className="mt-2 text-sm text-slate-400">
        Draft → Review → Approved → Published. Nothing publishes automatically from feedback.
      </p>
      <div className="mt-5 space-y-3">
        {prompts.map((prompt) => (
          <article key={prompt.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button type="button" className="text-left" onClick={() => onSelect(prompt)}>
                <h3 className="font-medium text-white">{prompt.name}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  v{prompt.version} · Quality {prompt.qualityScore ?? 0}
                </p>
              </button>
              <Badge tone="warning">{prompt.status}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {prompt.status === 'review' ? (
                <Button disabled={busy} onClick={() => onApprove(prompt)}>
                  Approve
                </Button>
              ) : null}
              {prompt.status === 'approved' ? (
                <Button disabled={busy} onClick={() => onPublish(prompt)}>
                  Publish
                </Button>
              ) : null}
              <Button disabled={busy} variant="secondary" onClick={() => onCorrections(prompt)}>
                Request corrections
              </Button>
            </div>
          </article>
        ))}
        {prompts.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No prompts pending review.</p>
        ) : null}
      </div>
    </Panel>
  );
}
