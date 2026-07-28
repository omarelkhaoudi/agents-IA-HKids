import { useState, type FormEvent } from 'react';
import type { DocumentKind } from '../../types/assistant';
import Button from '../ui/Button';

interface MessageComposerProps {
  actionLabel: string;
  actionId: DocumentKind;
  disabled?: boolean;
  onSend: (message: string) => Promise<void> | void;
}

const placeholderByAction: Record<DocumentKind, string> = {
  quotation: 'Add a note about budget, validity period, or pricing structure...',
  invoice: 'Add billing notes, due dates, or payment terms...',
  'purchase-order': 'Add supplier requirements, item constraints, or delivery notes...',
  'delivery-note': 'Add delivery instructions or acknowledgement details...',
  letter: 'Add instructions about tone, recipient, or key administrative points...',
  email: 'Add follow-up details, deadline reminders, or requested attachments...',
};

export default function MessageComposer({
  actionLabel,
  actionId,
  disabled = false,
  onSend,
}: MessageComposerProps) {
  const [draft, setDraft] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.trim() || disabled) {
      return;
    }

    await onSend(draft.trim());
    setDraft('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholderByAction[actionId]}
          rows={4}
          disabled={disabled}
          className="w-full resize-none bg-transparent text-sm leading-7 text-white outline-none placeholder:text-slate-500"
        />
        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            You are working on <span className="font-medium text-white">{actionLabel}</span>.
          </p>
          <Button type="submit" disabled={disabled}>
            {disabled ? 'Sending...' : 'Send prompt'}
          </Button>
        </div>
      </div>
    </form>
  );
}
