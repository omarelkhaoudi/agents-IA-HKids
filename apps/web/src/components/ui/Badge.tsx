import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'info' | 'warning' | 'purple';
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-white/8 text-slate-300 border-white/10',
  success: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/20',
  info: 'bg-cyan-400/12 text-cyan-300 border-cyan-400/20',
  warning: 'bg-orange-400/12 text-orange-300 border-orange-400/20',
  purple: 'bg-violet-400/12 text-violet-300 border-violet-400/20',
};

export default function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
        toneClasses[tone],
      ].join(' ')}
    >
      {children}
    </span>
  );
}
