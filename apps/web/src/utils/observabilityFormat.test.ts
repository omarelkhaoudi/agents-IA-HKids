import { describe, expect, it } from 'vitest';
import {
  barHeightPercent,
  formatBytes,
  formatCost,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatUptime,
  healthTone,
  severityTone,
} from './observabilityFormat';

describe('observability formatters', () => {
  it('formats latency across millisecond, second and minute ranges', () => {
    expect(formatDuration(0)).toBe('0 ms');
    expect(formatDuration(420)).toBe('420 ms');
    expect(formatDuration(1500)).toBe('1.5 s');
    expect(formatDuration(125_000)).toBe('2 min 5 s');
  });

  it('formats uptime with the most relevant unit', () => {
    expect(formatUptime(45)).toBe('0m 45s');
    expect(formatUptime(3700)).toBe('1h 1m');
    expect(formatUptime(180_000)).toBe('2d 2h');
  });

  it('formats byte sizes and large counters compactly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatNumber(950)).toBe('950');
    expect(formatNumber(12_400)).toBe('12.4k');
    expect(formatNumber(2_500_000)).toBe('2.5M');
  });

  it('formats costs and percentages for dashboard cards', () => {
    expect(formatCost(0)).toBe('$0.00');
    expect(formatCost(0.0042)).toBe('$0.0042');
    expect(formatCost(12.5)).toBe('$12.50');
    expect(formatPercent(99)).toBe('99%');
    expect(formatPercent(33.33)).toBe('33.3%');
  });

  it('describes recent activity relative to now', () => {
    const now = Date.parse('2026-07-31T12:00:00.000Z');
    expect(formatRelativeTime('2026-07-31T11:59:58.000Z', now)).toBe('just now');
    expect(formatRelativeTime('2026-07-31T11:59:00.000Z', now)).toBe('1m ago');
    expect(formatRelativeTime('2026-07-31T09:00:00.000Z', now)).toBe('3h ago');
    expect(formatRelativeTime('not-a-date', now)).toBe('—');
  });

  it('maps health and severity states to badge tones', () => {
    expect(healthTone('ok')).toBe('success');
    expect(healthTone('degraded')).toBe('warning');
    expect(healthTone('unconfigured')).toBe('neutral');
    expect(severityTone('critical')).toBe('warning');
    expect(severityTone('info')).toBe('info');
  });

  it('scales chart bars proportionally with a readable floor', () => {
    expect(barHeightPercent(0, 100)).toBe(0);
    expect(barHeightPercent(50, 100)).toBe(50);
    expect(barHeightPercent(1, 1000)).toBe(4);
    expect(barHeightPercent(10, 0)).toBe(0);
  });
});
