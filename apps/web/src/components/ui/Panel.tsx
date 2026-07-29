import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'glass' | 'surface';
}

export default function Panel({ children, className = '', variant = 'glass' }: PanelProps) {
  return (
    <section
      className={[
        'rounded-[1.25rem]',
        variant === 'glass' ? 'glass-panel' : 'surface-panel',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  );
}
