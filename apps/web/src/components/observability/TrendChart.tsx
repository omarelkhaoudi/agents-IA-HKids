import { barHeightPercent, formatNumber } from '../../utils/observabilityFormat';

export interface TrendPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  hint?: string;
}

interface TrendChartProps {
  points: TrendPoint[];
  emptyLabel?: string;
  accent?: 'cyan' | 'violet' | 'emerald';
  height?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  maxValue?: number;
}

const accentClasses = {
  cyan: 'bg-gradient-to-t from-cyan-500/40 to-cyan-300',
  violet: 'bg-gradient-to-t from-violet-500/40 to-violet-300',
  emerald: 'bg-gradient-to-t from-emerald-500/40 to-emerald-300',
};

export default function TrendChart({
  points,
  emptyLabel = 'No activity recorded for this period.',
  accent = 'cyan',
  height = 180,
  primaryLabel = 'Volume',
  secondaryLabel = 'Failures',
  maxValue,
}: TrendChartProps) {
  const maximum = maxValue ?? points.reduce((max, point) => Math.max(max, point.value), 0);

  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }

  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  return (
    <div>
      <div
        className="custom-scrollbar flex items-end gap-1 overflow-x-auto pb-2"
        style={{ height }}
        role="img"
        aria-label={`Trend chart with ${points.length} data points, maximum ${maximum}`}
      >
        {points.map((point) => (
          <div key={point.label} className="flex h-full min-w-[10px] flex-1 flex-col justify-end">
            <div
              className="relative w-full rounded-t-md bg-white/5"
              style={{ height: `${Math.max(barHeightPercent(point.value, maximum), 2)}%` }}
              title={point.hint || `${point.label}: ${point.value}`}
            >
              <div
                className={['absolute inset-0 rounded-t-md', accentClasses[accent]].join(' ')}
                style={{ opacity: point.value > 0 ? 1 : 0.25 }}
              />
              {point.secondaryValue ? (
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-md bg-rose-400/70"
                  style={{
                    height: `${barHeightPercent(point.secondaryValue, point.value || 1)}%`,
                  }}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-slate-500">
        {points
          .filter((_, index) => index % labelStep === 0)
          .map((point) => (
            <span key={`label-${point.label}`}>{point.label}</span>
          ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className={['h-2 w-4 rounded-full', accentClasses[accent]].join(' ')} />
          {primaryLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-4 rounded-full bg-rose-400/70" />
          {secondaryLabel}
        </span>
        <span>Peak {formatNumber(maximum)}</span>
      </div>
    </div>
  );
}
