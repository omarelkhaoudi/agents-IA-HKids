import { env } from '../../config/env.js';

const MINIMUM_LATENCY_SAMPLE = 3;

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

/**
 * Evaluates platform alert rules against data already produced by the existing
 * AI Gateway, Workflow, DMS and Knowledge modules. Alerts are idempotent: the
 * same rule reuses one row keyed by alert_key and auto-resolves once healthy.
 */
export class AlertService {
  constructor({ observabilityRepository, systemHealthMonitor, thresholds = {} }) {
    this.observabilityRepository = observabilityRepository;
    this.systemHealthMonitor = systemHealthMonitor;
    this.thresholds = {
      latencyMs: Number(thresholds.latencyMs || env.alertLatencyMs),
      errorRatePercent: Number(thresholds.errorRatePercent || env.alertErrorRatePercent),
      storagePercent: Number(thresholds.storagePercent || env.alertStoragePercent),
      pendingApprovals: Number(thresholds.pendingApprovals || env.alertPendingApprovals),
      failedWorkflows: Number(thresholds.failedWorkflows || env.alertFailedWorkflows),
      retrievalFailures: Number(thresholds.retrievalFailures || env.alertRetrievalFailures),
    };
  }

  getThresholds() {
    return { ...this.thresholds };
  }

  async buildCandidates() {
    const now = Date.now();
    const lastHour = new Date(now - 60 * 60 * 1000);
    const lastDay = new Date(now - 24 * 60 * 60 * 1000);

    const [hourSummary, health, approvals, retrievalFailures] = await Promise.all([
      this.observabilityRepository.getUsageSummary({ since: lastHour }),
      this.systemHealthMonitor.getSystemHealth(),
      this.observabilityRepository.getApprovalStatistics(),
      this.observabilityRepository.countEvents({
        eventType: 'retrieval_failed',
        since: lastDay,
      }),
    ]);

    const candidates = [];
    const errorRate = hourSummary.totalRequests
      ? round((hourSummary.failedRequests / hourSummary.totalRequests) * 100)
      : 0;

    if (
      hourSummary.totalRequests >= MINIMUM_LATENCY_SAMPLE &&
      hourSummary.averageDurationMs > this.thresholds.latencyMs
    ) {
      candidates.push({
        alertKey: 'ai:high-latency',
        ruleCode: 'high_latency',
        category: 'ai',
        severity: 'warning',
        title: 'AI latency above target',
        description: `Average AI latency reached ${Math.round(
          hourSummary.averageDurationMs
        )} ms over the last hour.`,
        observedValue: round(hourSummary.averageDurationMs),
        thresholdValue: this.thresholds.latencyMs,
        metadata: {
          requests: hourSummary.totalRequests,
          maxDurationMs: hourSummary.maxDurationMs,
        },
      });
    }

    if (hourSummary.failedRequests > 0 && errorRate >= this.thresholds.errorRatePercent) {
      candidates.push({
        alertKey: 'ai:failure-rate',
        ruleCode: 'ai_failures',
        category: 'ai',
        severity: errorRate >= this.thresholds.errorRatePercent * 2 ? 'critical' : 'warning',
        title: 'AI request failures detected',
        description: `${hourSummary.failedRequests} of ${hourSummary.totalRequests} AI requests failed in the last hour (${errorRate}%).`,
        observedValue: errorRate,
        thresholdValue: this.thresholds.errorRatePercent,
        metadata: {
          failedRequests: hourSummary.failedRequests,
          totalRequests: hourSummary.totalRequests,
        },
      });
    }

    if (health.modules.storage.usedPercent >= this.thresholds.storagePercent) {
      candidates.push({
        alertKey: 'storage:quota',
        ruleCode: 'storage_limit',
        category: 'storage',
        severity: health.modules.storage.usedPercent >= 100 ? 'critical' : 'warning',
        title: 'Storage approaching quota',
        description: `Document storage is at ${health.modules.storage.usedPercent}% of the configured ${health.modules.storage.quotaMegabytes} MB quota.`,
        observedValue: health.modules.storage.usedPercent,
        thresholdValue: this.thresholds.storagePercent,
        metadata: {
          usedMegabytes: health.modules.storage.usedMegabytes,
          storedFiles: health.modules.storage.storedFiles,
        },
      });
    }

    if (approvals.pendingDocuments >= this.thresholds.pendingApprovals) {
      candidates.push({
        alertKey: 'workflow:pending-approvals',
        ruleCode: 'missing_approvals',
        category: 'workflow',
        severity: 'warning',
        title: 'Approvals are piling up',
        description: `${approvals.pendingDocuments} generated documents are still waiting for approval.`,
        observedValue: approvals.pendingDocuments,
        thresholdValue: this.thresholds.pendingApprovals,
        metadata: {
          approvalRate: approvals.approvalRate,
          activeWorkflows: approvals.activeWorkflows,
        },
      });
    }

    if (approvals.failedWorkflows >= this.thresholds.failedWorkflows) {
      candidates.push({
        alertKey: 'workflow:failed',
        ruleCode: 'failed_workflows',
        category: 'workflow',
        severity: 'critical',
        title: 'Workflows are failing',
        description: `${approvals.failedWorkflows} workflow instances are in a rejected or failed state.`,
        observedValue: approvals.failedWorkflows,
        thresholdValue: this.thresholds.failedWorkflows,
        metadata: { workflowStates: approvals.workflowStates },
      });
    }

    if (retrievalFailures >= this.thresholds.retrievalFailures) {
      candidates.push({
        alertKey: 'retrieval:failures',
        ruleCode: 'retrieval_failures',
        category: 'retrieval',
        severity: 'warning',
        title: 'Knowledge retrieval failures',
        description: `${retrievalFailures} retrieval failures were recorded in the last 24 hours.`,
        observedValue: retrievalFailures,
        thresholdValue: this.thresholds.retrievalFailures,
        metadata: { windowHours: 24 },
      });
    }

    for (const [moduleName, moduleHealth] of Object.entries(health.modules)) {
      if (moduleHealth.status === 'error') {
        candidates.push({
          alertKey: `system:${moduleName}`,
          ruleCode: 'module_unhealthy',
          category: 'system',
          severity: 'critical',
          title: `${moduleName} module is unhealthy`,
          description: moduleHealth.message || `The ${moduleName} module reported an error status.`,
          observedValue: 1,
          thresholdValue: 0,
          metadata: { module: moduleName },
        });
      }
    }

    return candidates;
  }

  async evaluate({ actor = 'system' } = {}) {
    const candidates = await this.buildCandidates();
    const saved = [];

    for (const candidate of candidates) {
      saved.push(await this.observabilityRepository.saveAlert(candidate));
    }

    const resolved = await this.observabilityRepository.autoResolveAlerts(
      candidates.map((candidate) => candidate.alertKey),
      actor
    );

    return {
      evaluatedAt: new Date().toISOString(),
      triggered: saved.length,
      autoResolved: resolved,
      thresholds: this.getThresholds(),
      alerts: saved,
    };
  }

  async listAlerts(filters) {
    const [items, counts] = await Promise.all([
      this.observabilityRepository.listAlerts(filters),
      this.observabilityRepository.getAlertCounts(),
    ]);

    return { items, counts, thresholds: this.getThresholds() };
  }

  async acknowledge(id, actor) {
    return this.observabilityRepository.updateAlertStatus(id, { status: 'acknowledged', actor });
  }

  async resolve(id, actor) {
    return this.observabilityRepository.updateAlertStatus(id, { status: 'resolved', actor });
  }
}
