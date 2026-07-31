import { randomUUID } from 'node:crypto';

function percentile(sortedValues, ratio) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(ratio * sortedValues.length) - 1)
  );

  return sortedValues[index];
}

/**
 * Tracks in-flight AI Gateway calls so the dashboard can report live concurrency
 * and queue pressure, which cannot be derived from the persisted ai_usage rows.
 */
export class ActiveRequestTracker {
  constructor({ capacity = 8, historySize = 200 } = {}) {
    this.capacity = Math.max(1, Number(capacity) || 1);
    this.historySize = Math.max(10, Number(historySize) || 10);
    this.active = new Map();
    this.history = [];
    this.peakConcurrency = 0;
  }

  begin(context = {}) {
    const id = context.id || randomUUID();

    this.active.set(id, {
      id,
      provider: context.provider || '',
      model: context.model || '',
      agentCode: context.agentCode || '',
      conversationId: context.conversationId || null,
      userId: context.userId || null,
      streaming: Boolean(context.streaming),
      startedAt: Date.now(),
    });

    this.peakConcurrency = Math.max(this.peakConcurrency, this.active.size);

    return id;
  }

  end(id, outcome = {}) {
    const entry = this.active.get(id);

    if (!entry) {
      return null;
    }

    this.active.delete(id);

    const record = {
      ...entry,
      status: outcome.status || 'success',
      errorMessage: outcome.errorMessage || null,
      durationMs: Number(outcome.durationMs) || Date.now() - entry.startedAt,
      finishedAt: Date.now(),
    };

    this.history.push(record);

    if (this.history.length > this.historySize) {
      this.history.splice(0, this.history.length - this.historySize);
    }

    return record;
  }

  getActiveRequests() {
    const now = Date.now();

    return Array.from(this.active.values())
      .map((entry) => ({
        id: entry.id,
        provider: entry.provider,
        model: entry.model,
        agentCode: entry.agentCode,
        conversationId: entry.conversationId,
        streaming: entry.streaming,
        elapsedMs: now - entry.startedAt,
      }))
      .sort((left, right) => right.elapsedMs - left.elapsedMs);
  }

  getQueueStatus() {
    const inFlight = this.active.size;
    const queued = Math.max(0, inFlight - this.capacity);
    const saturationPercent = Number(
      Math.min(100, (inFlight / this.capacity) * 100).toFixed(2)
    );
    const activeRequests = this.getActiveRequests();
    const oldestWaitMs = activeRequests.length ? activeRequests[0].elapsedMs : 0;

    let state = 'idle';

    if (queued > 0) {
      state = 'saturated';
    } else if (saturationPercent >= 75) {
      state = 'busy';
    } else if (inFlight > 0) {
      state = 'nominal';
    }

    return {
      capacity: this.capacity,
      inFlight,
      queued,
      saturationPercent,
      oldestWaitMs,
      peakConcurrency: this.peakConcurrency,
      state,
    };
  }

  getRecentOutcomes({ limit = 20 } = {}) {
    return this.history
      .slice(-Math.max(1, Number(limit) || 20))
      .reverse()
      .map((entry) => ({
        id: entry.id,
        provider: entry.provider,
        model: entry.model,
        agentCode: entry.agentCode,
        conversationId: entry.conversationId,
        status: entry.status,
        errorMessage: entry.errorMessage,
        durationMs: entry.durationMs,
        finishedAt: new Date(entry.finishedAt).toISOString(),
      }));
  }

  getLatencyProfile() {
    const durations = this.history.map((entry) => entry.durationMs).sort((a, b) => a - b);

    if (durations.length === 0) {
      return { samples: 0, p50Ms: 0, p95Ms: 0, maxMs: 0 };
    }

    return {
      samples: durations.length,
      p50Ms: Math.round(percentile(durations, 0.5)),
      p95Ms: Math.round(percentile(durations, 0.95)),
      maxMs: durations[durations.length - 1],
    };
  }

  reset() {
    this.active.clear();
    this.history = [];
    this.peakConcurrency = 0;
  }
}
