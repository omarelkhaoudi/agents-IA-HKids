export default function ModuleCard({ title, description, enabled }) {
  return (
    <article
      className={[
        'rounded-3xl border p-6 shadow-xl shadow-slate-950/30 transition',
        enabled
          ? 'border-cyan-400/30 bg-slate-900/80 hover:-translate-y-1 hover:border-cyan-300/50'
          : 'border-white/10 bg-slate-900/50 opacity-60',
      ].join(' ')}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <span
          className={[
            'rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]',
            enabled ? 'bg-emerald-400/20 text-emerald-300' : 'bg-slate-800 text-slate-400',
          ].join(' ')}
        >
          {enabled ? 'Active' : 'Coming Soon'}
        </span>
      </div>

      <p className="text-sm leading-6 text-slate-300">{description}</p>
    </article>
  );
}
