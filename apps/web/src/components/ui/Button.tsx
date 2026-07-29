import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  fullWidth?: boolean;
  size?: 'sm' | 'md';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-[0_8px_24px_rgba(34,211,238,0.25)]',
  secondary: 'bg-white/8 text-white hover:bg-white/12 border border-white/10',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/6 hover:text-white',
  danger: 'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 border border-rose-400/20',
};

const sizeClasses = {
  sm: 'rounded-xl px-3 py-2 text-xs',
  md: 'rounded-2xl px-4 py-2.5 text-sm',
};

export default function Button({
  children,
  className = '',
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
