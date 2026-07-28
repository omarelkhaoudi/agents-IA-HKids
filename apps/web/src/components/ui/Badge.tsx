import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'info';
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-white/8 text-slate-300',
  success: 'bg-emerald-400/15 text-emerald-300',
  info: 'bg-cyan-400/15 text-cyan-300',
};

export default function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]',
        toneClasses[tone],
      ].join(' ')}
    >
      {children}
    </span>
  );
}
