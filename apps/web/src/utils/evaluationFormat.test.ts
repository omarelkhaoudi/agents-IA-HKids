import { describe, expect, it } from 'vitest';
import {
  formatBucketLabel,
  formatCriterion,
  formatDelta,
  formatDurationSeconds,
  formatScore,
  impactTone,
  riskTone,
  scoreAccent,
  scoreTone,
  verdictTone,
} from './evaluationFormat';

describe('evaluation formatters', () => {
  it('formats scores and rejects non numeric values', () => {
    expect(formatScore(82.44)).toBe('82.4');
    expect(formatScore(100)).toBe('100');
    expect(formatScore('not-a-number')).toBe('—');
  });

  it('signs deltas so regressions are readable at a glance', () => {
    expect(formatDelta(12.345)).toBe('+12.35');
    expect(formatDelta(-8)).toBe('-8');
    expect(formatDelta(0)).toBe('0');
  });

  it('turns criterion keys into human labels', () => {
    expect(formatCriterion('instruction_following')).toBe('Instruction following');
    expect(formatCriterion('groundedness')).toBe('Groundedness');
    expect(formatCriterion('custom_rule')).toBe('Custom rule');
  });

  it('formats workflow durations with the most relevant unit', () => {
    expect(formatDurationSeconds(0)).toBe('0s');
    expect(formatDurationSeconds(45)).toBe('45s');
    expect(formatDurationSeconds(125)).toBe('2m 5s');
    expect(formatDurationSeconds(7_200)).toBe('2h 0m');
    expect(formatDurationSeconds(180_000)).toBe('2d 2h');
  });

  it('maps scores, risks, verdicts and impacts to design system tones', () => {
    expect(scoreTone(92)).toBe('success');
    expect(scoreTone(65)).toBe('info');
    expect(scoreTone(30)).toBe('warning');
    expect(scoreTone(0)).toBe('neutral');

    expect(riskTone(10)).toBe('success');
    expect(riskTone(40)).toBe('info');
    expect(riskTone(70)).toBe('warning');

    expect(verdictTone('pass')).toBe('success');
    expect(verdictTone('fail')).toBe('warning');
    expect(verdictTone('unknown')).toBe('neutral');

    expect(impactTone('high')).toBe('warning');
    expect(impactTone('medium')).toBe('info');
    expect(impactTone('low')).toBe('neutral');
  });

  it('selects metric card accents from the score band', () => {
    expect(scoreAccent(85)).toBe('emerald');
    expect(scoreAccent(70)).toBe('cyan');
    expect(scoreAccent(20)).toBe('orange');
  });

  it('shortens bucket keys for chart axes', () => {
    expect(formatBucketLabel('2026-07-31')).toBe('31/07');
    expect(formatBucketLabel('2026-07')).toBe('07/26');
    expect(formatBucketLabel('')).toBe('');
  });
});
