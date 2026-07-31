const CRITERION_LABELS: Record<string, string> = {
  instruction_following: 'Instruction following',
  relevance: 'Relevance',
  completeness: 'Completeness',
  consistency: 'Consistency',
  professional_tone: 'Professional tone',
  formatting: 'Formatting',
  knowledge_usage: 'Knowledge usage',
  groundedness: 'Groundedness',
  safety: 'Safety',
  human_approval: 'Human approval',
  response_length: 'Response length',
  response_quality: 'Response quality',
};

export function formatScore(value: number | string): string {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return '—';
  }

  return `${Math.round(score * 10) / 10}`;
}

export function formatDelta(value: number | string): string {
  const delta = Number(value);

  if (!Number.isFinite(delta) || delta === 0) {
    return '0';
  }

  const rounded = Math.round(delta * 100) / 100;

  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

export function formatCriterion(criterion: string): string {
  return (
    CRITERION_LABELS[criterion] ||
    criterion.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
  );
}

export function formatDurationSeconds(seconds: number | string): string {
  const value = Number(seconds);

  if (!Number.isFinite(value) || value <= 0) {
    return '0s';
  }

  if (value < 60) {
    return `${Math.round(value)}s`;
  }

  if (value < 3_600) {
    return `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`;
  }

  if (value < 86_400) {
    return `${Math.floor(value / 3_600)}h ${Math.floor((value % 3_600) / 60)}m`;
  }

  return `${Math.floor(value / 86_400)}d ${Math.floor((value % 86_400) / 3_600)}h`;
}

export function scoreTone(value: number | string): 'success' | 'info' | 'warning' | 'neutral' {
  const score = Number(value);

  if (!Number.isFinite(score) || score === 0) {
    return 'neutral';
  }

  if (score >= 80) {
    return 'success';
  }

  if (score >= 60) {
    return 'info';
  }

  return 'warning';
}

export function verdictTone(verdict: string): 'success' | 'warning' | 'neutral' {
  if (verdict === 'pass') {
    return 'success';
  }

  if (verdict === 'warn' || verdict === 'fail') {
    return 'warning';
  }

  return 'neutral';
}

export function riskTone(value: number | string): 'success' | 'info' | 'warning' {
  const risk = Number(value);

  if (!Number.isFinite(risk) || risk <= 25) {
    return 'success';
  }

  return risk <= 45 ? 'info' : 'warning';
}

export function impactTone(impact: string): 'warning' | 'info' | 'neutral' {
  if (impact === 'high') {
    return 'warning';
  }

  return impact === 'medium' ? 'info' : 'neutral';
}

export function scoreAccent(value: number | string): 'emerald' | 'cyan' | 'orange' {
  const score = Number(value);

  if (Number.isFinite(score) && score >= 80) {
    return 'emerald';
  }

  return Number.isFinite(score) && score >= 60 ? 'cyan' : 'orange';
}

/** Renders a bucket key such as 2026-07-31 or 2026-07 as a compact axis label. */
export function formatBucketLabel(bucket: string): string {
  const parts = String(bucket || '').split('-');

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }

  if (parts.length === 2) {
    return `${parts[1]}/${parts[0].slice(2)}`;
  }

  return bucket;
}
