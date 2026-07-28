import Badge from '../ui/Badge';
import type { QuickAction } from '../../types/assistant';

interface WelcomeHeroProps {
  agentName: string;
  agentDescription: string;
  selectedAction: QuickAction;
}

export default function WelcomeHero({
  agentName,
  agentDescription,
  selectedAction,
}: WelcomeHeroProps) {
  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/12 via-slate-900 to-slate-950 p-8">
      <Badge tone="info">{agentName}</Badge>
      <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white xl:text-5xl">
        Work with specialized H-Kids AI agents through one governed workspace.
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
        {agentDescription}
      </p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Selected workflow</p>
        <p className="mt-2 text-base font-medium text-white">{selectedAction.label}</p>
        <p className="mt-1 text-sm text-slate-400">{selectedAction.summary}</p>
      </div>
    </div>
  );
}