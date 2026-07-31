import { env } from '../../config/env.js';
import { encryptionService } from '../security/EncryptionService.js';
import { secretManager } from '../security/SecretManager.js';

const MINIMUM_LATENCY_SAMPLE = 3;

// Evaluation alerts share this table but are owned by the evaluation rule
// engine, so this service must not resolve them during its own sweep.
const EVALUATION_ALERT_PREFIX = 'evaluation:';

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
  constructor({
    observabilityRepository,
    systemHealthMonitor,
    thresholds = {},
    manager = secretManager,
    encryption = encryptionService,
  }) {
    this.observabilityRepository = observabilityRepository;
    this.systemHealthMonitor = systemHealthMonitor;
    this.secretManager = manager;
    this.encryptionService = encryption;
    this.thresholds = {
      latencyMs: Number(thresholds.latencyMs || env.alertLatencyMs),
      errorRatePercent: Number(thresholds.errorRatePercent || env.alertErrorRatePercent),
      storagePercent: Number(thresholds.storagePercent || env.alertStoragePercent),
      pendingApprovals: Number(thresholds.pendingApprovals || env.alertPendingApprovals),
      failedWorkflows: Number(thresholds.failedWorkflows || env.alertFailedWorkflows),
      retrievalFailures: Number(thresholds.retrievalFailures || env.alertRetrievalFailures),
      permissionViolations: Number(thresholds.permissionViolations || 3),
      failedAuthentications: Number(thresholds.failedAuthentications || 5),
    };
  }

  getThresholds() {
    return { ...this.thresholds };
  }

  async buildCandidates() {
    const now = Date.now();
    const lastHour = new Date(now - 60 * 60 * 1000);
    const lastDay = new Date(now - 24 * 60 * 60 * 1000);

    const [
      hourSummary,
      health,
      approvals,
      workflowGovernance,
      retrievalFailures,
      permissionViolations,
      tenantViolations,
      failedAuthentications,
    ] = await Promise.all([
      this.observabilityRepository.getUsageSummary({ since: lastHour }),
      this.systemHealthMonitor.getSystemHealth(),
      this.observabilityRepository.getApprovalStatistics(),
      this.observabilityRepository.getWorkflowGovernanceStatistics(),
      this.observabilityRepository.countEvents({
        eventType: 'retrieval_failed',
        since: lastDay,
      }),
      this.observabilityRepository.countEvents({
        category: 'security',
        eventType: 'permission_denied',
        since: lastDay,
      }),
      this.observabilityRepository.countEvents({
        category: 'security',
        eventType: 'tenant_violation',
        since: lastDay,
      }),
      this.observabilityRepository.countEvents({
        category: 'security',
        eventType: 'login_failed',
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

    if (workflowGovernance.pendingApprovalTasks >= this.thresholds.pendingApprovals) {
      candidates.push({
        alertKey: 'workflow:approval-queue',
        ruleCode: 'approval_queue',
        category: 'workflow',
        severity: 'warning',
        title: 'Workflow approval queue is growing',
        description: `${workflowGovernance.pendingApprovalTasks} workflow approval task(s) are pending.`,
        observedValue: workflowGovernance.pendingApprovalTasks,
        thresholdValue: this.thresholds.pendingApprovals,
        metadata: workflowGovernance,
      });
    }

    if (workflowGovernance.overdueApprovalTasks > 0 || workflowGovernance.slaBreaches > 0) {
      candidates.push({
        alertKey: 'workflow:sla-breach',
        ruleCode: 'workflow_sla_breach',
        category: 'workflow',
        severity: workflowGovernance.slaBreaches > 0 ? 'critical' : 'warning',
        title: 'Workflow SLA attention required',
        description: `${workflowGovernance.overdueApprovalTasks} overdue task(s) and ${workflowGovernance.slaBreaches} SLA breach event(s) detected.`,
        observedValue: workflowGovernance.overdueApprovalTasks + workflowGovernance.slaBreaches,
        thresholdValue: 0,
        metadata: workflowGovernance,
      });
    }

    if (workflowGovernance.activeEscalations > 0) {
      candidates.push({
        alertKey: 'workflow:active-escalations',
        ruleCode: 'workflow_escalation',
        category: 'workflow',
        severity: workflowGovernance.timeoutEscalations > 0 ? 'critical' : 'warning',
        title: 'Workflow escalations are active',
        description: `${workflowGovernance.activeEscalations} workflow escalation(s) are active.`,
        observedValue: workflowGovernance.activeEscalations,
        thresholdValue: 0,
        metadata: workflowGovernance,
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

    if (permissionViolations >= this.thresholds.permissionViolations) {
      candidates.push({
        alertKey: 'security:permission-violations',
        ruleCode: 'permission_violation',
        category: 'security',
        severity: 'warning',
        title: 'Permission violations detected',
        description: `${permissionViolations} permission denials were recorded in the last 24 hours.`,
        observedValue: permissionViolations,
        thresholdValue: this.thresholds.permissionViolations,
        metadata: { windowHours: 24 },
      });
    }

    if (tenantViolations > 0) {
      candidates.push({
        alertKey: 'security:tenant-violation',
        ruleCode: 'tenant_violation',
        category: 'security',
        severity: 'critical',
        title: 'Tenant isolation violation',
        description: `${tenantViolations} tenant isolation violation(s) were recorded in the last 24 hours.`,
        observedValue: tenantViolations,
        thresholdValue: 0,
        metadata: { windowHours: 24 },
      });
    }

    if (failedAuthentications >= this.thresholds.failedAuthentications) {
      candidates.push({
        alertKey: 'security:failed-authentication',
        ruleCode: 'failed_authentication',
        category: 'security',
        severity: 'warning',
        title: 'Failed authentication spike',
        description: `${failedAuthentications} failed login attempts were recorded in the last 24 hours.`,
        observedValue: failedAuthentications,
        thresholdValue: this.thresholds.failedAuthentications,
        metadata: { windowHours: 24 },
      });
    }

    const secretHealth = this.secretManager.getSecretHealth();
    if (secretHealth.missing > 0 || secretHealth.expired > 0) {
      candidates.push({
        alertKey: 'security:secret-health',
        ruleCode: 'expired_secret',
        category: 'security',
        severity: secretHealth.expired > 0 ? 'critical' : 'warning',
        title: 'Secret health requires attention',
        description: `${secretHealth.missing} missing and ${secretHealth.expired} expired secret(s) detected.`,
        observedValue: secretHealth.missing + secretHealth.expired,
        thresholdValue: 0,
        metadata: { missing: secretHealth.missing, expired: secretHealth.expired },
      });
    }

    const encryptionHealth = this.encryptionService.getHealth();
    if (encryptionHealth.status !== 'healthy') {
      candidates.push({
        alertKey: 'security:encryption-key',
        ruleCode: 'expired_key',
        category: 'security',
        severity: 'critical',
        title: 'Encryption key health degraded',
        description: 'The encryption service does not have a healthy configured key.',
        observedValue: 1,
        thresholdValue: 0,
        metadata: encryptionHealth,
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
      actor,
      { excludePrefix: EVALUATION_ALERT_PREFIX }
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
