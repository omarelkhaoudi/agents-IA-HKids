import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export default function Panel({ children, className = '' }: PanelProps) {
  return (
    <section
      className={[
        'rounded-3xl border border-white/10 bg-slate-900/75 shadow-xl shadow-slate-950/30 backdrop-blur',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  );
}
