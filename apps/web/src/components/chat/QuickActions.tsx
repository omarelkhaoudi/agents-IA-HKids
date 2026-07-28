import type { QuickAction } from '../../types/assistant';

interface QuickActionsProps {
  actions: QuickAction[];
  selectedActionId: QuickAction['id'];
  onSelect: (actionId: QuickAction['id']) => void;
}

export default function QuickActions({
  actions,
  selectedActionId,
  onSelect,
}: QuickActionsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => {
        const isActive = action.id === selectedActionId;

        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onSelect(action.id)}
            className={[
              'rounded-2xl border p-4 text-left transition',
              isActive
                ? 'border-cyan-400/35 bg-cyan-400/10'
                : 'border-white/10 bg-slate-950/55 hover:border-white/20 hover:bg-white/5',
            ].join(' ')}
          >
            <p className="text-sm font-semibold text-white">{action.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{action.summary}</p>
          </button>
        );
      })}
    </div>
  );
}
