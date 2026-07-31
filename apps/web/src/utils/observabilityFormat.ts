export function formatDuration(milliseconds: number): string {
  const value = Number(milliseconds);

  if (!Number.isFinite(value) || value <= 0) {
    return '0 ms';
  }

  if (value < 1000) {
    return `${Math.round(value)} ms`;
  }

  if (value < 60_000) {
    return `${(value / 1000).toFixed(1)} s`;
  }

  return `${Math.floor(value / 60_000)} min ${Math.round((value % 60_000) / 1000)} s`;
}

export function formatUptime(seconds: number): string {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  const days = Math.floor(value / 86_400);
  const hours = Math.floor((value % 86_400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${value % 60}s`;
}

export function formatBytes(bytes: number): string {
  const value = Number(bytes);

  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const scaled = value / 1024 ** exponent;

  return `${scaled.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatNumber(value: number): string {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return '0';
  }

  if (Math.abs(parsed) >= 1_000_000) {
    return `${(parsed / 1_000_000).toFixed(1)}M`;
  }

  if (Math.abs(parsed) >= 1000) {
    return `${(parsed / 1000).toFixed(1)}k`;
  }

  return String(Math.round(parsed));
}

export function formatCost(value: number): string {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed === 0) {
    return '$0.00';
  }

  return parsed < 0.01 ? `$${parsed.toFixed(4)}` : `$${parsed.toFixed(2)}`;
}

export function formatPercent(value: number): string {
  const parsed = Number(value);
  return `${Number.isFinite(parsed) ? parsed.toFixed(parsed % 1 === 0 ? 0 : 1) : '0'}%`;
}

export function formatTimestamp(value: string | number | Date): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(value: string | number | Date, now: number = Date.now()): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const deltaSeconds = Math.round((now - date.getTime()) / 1000);

  if (deltaSeconds < 5) {
    return 'just now';
  }

  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }

  if (deltaSeconds < 3600) {
    return `${Math.floor(deltaSeconds / 60)}m ago`;
  }

  if (deltaSeconds < 86_400) {
    return `${Math.floor(deltaSeconds / 3600)}h ago`;
  }

  return `${Math.floor(deltaSeconds / 86_400)}d ago`;
}

export function healthTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'ok' || status === 'ready') {
    return 'success';
  }

  if (status === 'error' || status === 'degraded' || status === 'not_ready') {
    return 'warning';
  }

  return 'neutral';
}

export function severityTone(severity: string): 'info' | 'warning' | 'neutral' {
  if (severity === 'critical' || severity === 'warning') {
    return 'warning';
  }

  if (severity === 'info') {
    return 'info';
  }

  return 'neutral';
}

/**
 * Scales a value against the largest value of a series so hand-built bars keep
 * a readable minimum height while staying proportional.
 */
export function barHeightPercent(value: number, maximum: number): number {
  const parsedValue = Number(value) || 0;
  const parsedMaximum = Number(maximum) || 0;

  if (parsedMaximum <= 0 || parsedValue <= 0) {
    return 0;
  }

  return Math.max(4, Math.round((parsedValue / parsedMaximum) * 100));
}
