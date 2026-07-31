import type { TimelineReport } from '../../types/observability';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import { formatTimestamp, severityTone } from '../../utils/observabilityFormat';

const sourceTone = {
  platform: 'info',
  knowledge: 'purple',
  prompt: 'info',
  dms: 'neutral',
  workflow: 'success',
} as const;

interface AuditTimelinePanelProps {
  timeline: TimelineReport;
  category: string;
  onCategoryChange: (category: string) => void;
  onExport: () => void;
  busy?: boolean;
}

export default function AuditTimelinePanel({
  timeline,
  category,
  onCategoryChange,
  onExport,
  busy = false,
}: AuditTimelinePanelProps) {
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Audit timeline</h2>
          <p className="mt-1 text-sm text-slate-400">
            Every governed event from the last {timeline.windowDays} days across knowledge, prompts,
            documents, workflows and exports.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCategoryChange('')}
            className={[
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
              category === ''
                ? 'bg-cyan-400 text-slate-950'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
            ].join(' ')}
          >
            All
          </button>
          {timeline.categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onCategoryChange(item)}
              className={[
                'rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition',
                category === item
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
              ].join(' ')}
            >
              {item}
            </button>
          ))}
          <Button size="sm" variant="secondary" onClick={onExport} disabled={busy}>
            Export CSV
          </Button>
        </div>
      </div>

      {timeline.items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400">
          No event was recorded for this filter and period.
        </p>
      ) : (
        <ol className="mt-6 space-y-3 border-l border-white/10 pl-5">
          {timeline.items.map((entry) => (
            <li key={`${entry.source}-${entry.id}`} className="relative">
              <span
                className={[
                  'absolute -left-[1.6rem] top-3 h-2.5 w-2.5 rounded-full',
                  entry.severity === 'critical'
                    ? 'bg-rose-400'
                    : entry.severity === 'warning'
                      ? 'bg-orange-400'
                      : 'bg-cyan-400',
                ].join(' ')}
              />
              <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={sourceTone[entry.source as keyof typeof sourceTone] || 'neutral'}>
                      {entry.source}
                    </Badge>
                    <span className="text-sm text-white">{entry.eventType}</span>
                    {entry.severity !== 'info' ? (
                      <Badge tone={severityTone(entry.severity)}>{entry.severity}</Badge>
                    ) : null}
                  </div>
                  <span className="text-xs text-slate-500">{formatTimestamp(entry.createdAt)}</span>
                </div>

                {entry.summary ? (
                  <p className="mt-2 text-sm leading-6 text-slate-400">{entry.summary}</p>
                ) : null}

                <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  {entry.actor || 'system'}
                  {entry.subjectId ? ` · ${entry.subjectType} ${entry.subjectId}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
