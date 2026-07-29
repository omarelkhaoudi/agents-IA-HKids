interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: 'cyan' | 'blue' | 'orange' | 'emerald' | 'purple';
}

const accentMap = {
  cyan: 'from-cyan-400/20 to-transparent text-cyan-300',
  blue: 'from-sky-400/20 to-transparent text-sky-300',
  orange: 'from-orange-400/20 to-transparent text-orange-300',
  emerald: 'from-emerald-400/20 to-transparent text-emerald-300',
  purple: 'from-violet-400/20 to-transparent text-violet-300',
};

export default function MetricCard({
  label,
  value,
  hint,
  accent = 'cyan',
}: MetricCardProps) {
  return (
    <article className="surface-panel hover-lift rounded-[1.25rem] p-5">
      <div
        className={[
          'mb-4 h-1.5 w-10 rounded-full bg-gradient-to-r',
          accentMap[accent],
        ].join(' ')}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="font-display mt-3 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </article>
  );
}
