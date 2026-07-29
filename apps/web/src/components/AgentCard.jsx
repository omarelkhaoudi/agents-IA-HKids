import { Link } from 'react-router-dom';
import Badge from './ui/Badge';

const accentStyles = {
  blue: {
    card: 'agent-accent-blue border-sky-400/25 hover:border-sky-300/45',
    icon: 'bg-sky-400/15 text-sky-300',
    bar: 'from-sky-400/40 to-transparent',
  },
  orange: {
    card: 'agent-accent-orange border-orange-400/25 hover:border-orange-300/45',
    icon: 'bg-orange-400/15 text-orange-300',
    bar: 'from-orange-400/40 to-transparent',
  },
  emerald: {
    card: 'agent-accent-emerald border-emerald-400/25 hover:border-emerald-300/45',
    icon: 'bg-emerald-400/15 text-emerald-300',
    bar: 'from-emerald-400/40 to-transparent',
  },
  purple: {
    card: 'agent-accent-purple border-violet-400/25 hover:border-violet-300/45',
    icon: 'bg-violet-400/15 text-violet-300',
    bar: 'from-violet-400/40 to-transparent',
  },
};

export default function AgentCard({
  title,
  description,
  enabled = true,
  accent = 'blue',
  icon = 'AI',
  provider = 'anthropic',
  model = 'claude-3-5-sonnet-latest',
  stats = 'Ready',
  lastActivity = 'Just now',
  workspaceTo = '/assistant',
  configureTo = '/administration/agents',
}) {
  const styles = accentStyles[accent] || accentStyles.blue;

  return (
    <article
      className={[
        'surface-panel hover-lift flex h-full flex-col rounded-[1.35rem] border p-6',
        styles.card,
        enabled ? '' : 'opacity-60',
      ].join(' ')}
    >
      <div className={['mb-5 h-1 w-16 rounded-full bg-gradient-to-r', styles.bar].join(' ')} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={[
              'flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold',
              styles.icon,
            ].join(' ')}
          >
            {icon}
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {provider} · {model}
            </p>
          </div>
        </div>
        <Badge tone={enabled ? 'success' : 'neutral'}>{enabled ? 'Active' : 'Soon'}</Badge>
      </div>

      <p className="mt-4 flex-1 text-sm leading-6 text-slate-300">{description}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-400">
        <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
          <p className="uppercase tracking-[0.14em] text-slate-500">Stats</p>
          <p className="mt-1 text-slate-200">{stats}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
          <p className="uppercase tracking-[0.14em] text-slate-500">Last activity</p>
          <p className="mt-1 text-slate-200">{lastActivity}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to={workspaceTo}
          className="inline-flex flex-1 items-center justify-center rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Open Workspace
        </Link>
        <Link
          to={configureTo}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
        >
          Configure
        </Link>
      </div>
    </article>
  );
}
