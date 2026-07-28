import type { ReactNode } from 'react';
import Badge from '../ui/Badge';
import Panel from '../ui/Panel';

interface PreviewFrameProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function PreviewFrame({ title, subtitle, children }: PreviewFrameProps) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            Document Preview
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <Badge tone="success">Preview Mode</Badge>
      </div>

      <div className="bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_45%),linear-gradient(180deg,_rgba(15,23,42,0.7),_rgba(2,6,23,0.9))] p-6">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white p-8 text-slate-800 shadow-2xl">
          {children}
        </div>
      </div>
    </Panel>
  );
}
