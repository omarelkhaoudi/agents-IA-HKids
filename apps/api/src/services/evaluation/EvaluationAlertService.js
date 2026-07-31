import { env } from '../../config/env.js';

const ALERT_PREFIX = 'evaluation:';
const MINIMUM_SAMPLE = 3;

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

/**
 * Evaluation rule engine. Alerts are stored in the observability_alerts table
 * through the existing ObservabilityRepository — the evaluation layer adds
 * rules, not a second alert store. Every key is namespaced with `evaluation:`
 * so the two rule engines resolve only their own alerts.
 */
export class EvaluationAlertService {
  constructor({
    observabilityRepository,
    evaluationRepository,
    promptEvaluationService,
    knowledgeEvaluationService,
    thresholds = {},
  }) {
    this.observabilityRepository = observabilityRepository;
    this.evaluationRepository = evaluationRepository;
    this.promptEvaluationService = promptEvaluationService;
    this.knowledgeEvaluationService = knowledgeEvaluationService;
    this.thresholds = {
      qualityScore: Number(thresholds.qualityScore || env.evaluationMinQualityScore),
      qualityDrop: Number(thresholds.qualityDrop || env.evaluationQualityDropPercent),
      approvalRate: Number(thresholds.approvalRate || env.evaluationMinApprovalRate),
      hallucinationRisk: Number(thresholds.hallucinationRisk || env.evaluationMaxHallucinationRisk),
      failureRate: Number(thresholds.failureRate || env.evaluationMaxFailureRate),
      knowledgeStaleDocuments: Number(
        thresholds.knowledgeStaleDocuments || env.evaluationMaxStaleDocuments
      ),
      dailyCost: Number(thresholds.dailyCost || env.evaluationMaxDailyCost),
    };
  }

  getThresholds() {
    return { ...this.thresholds };
  }

  async buildCandidates({ days = 7 } = {}) {
    const now = Date.now();
    const windowMs = days * 24 * 60 * 60 * 1000;
    const since = new Date(now - windowMs);
    const previousSince = new Date(now - windowMs * 2);

    const [current, history, regressions, knowledge] = await Promise.all([
      this.evaluationRepository.getQualitySummary({ since }),
      this.evaluationRepository.listRunWindow({ since: previousSince }),
      this.promptEvaluationService.detectRegressions({ limit: 25 }),
      this.knowledgeEvaluationService.getKnowledgeQuality({ days }),
    ]);

    const previousRuns = history.filter(
      (run) => new Date(run.created_at).getTime() < since.getTime()
    );
    const previousScore = previousRuns.length
      ? previousRuns.reduce((total, run) => total + Number(run.overall_score || 0), 0) /
        previousRuns.length
      : 0;

    const candidates = [];

    if (current.totalRuns >= MINIMUM_SAMPLE && current.averageScore < this.thresholds.qualityScore) {
      candidates.push({
        alertKey: `${ALERT_PREFIX}quality-score`,
        ruleCode: 'quality_below_target',
        category: 'evaluation',
        severity: current.averageScore < this.thresholds.qualityScore * 0.75 ? 'critical' : 'warning',
        title: 'AI quality below target',
        description: `Average quality score is ${current.averageScore}/100 over the last ${days} days.`,
        observedValue: current.averageScore,
        thresholdValue: this.thresholds.qualityScore,
        metadata: { runs: current.totalRuns },
      });
    }

    if (previousRuns.length >= MINIMUM_SAMPLE && current.totalRuns >= MINIMUM_SAMPLE) {
      const drop = round(previousScore - current.averageScore);

      if (drop >= this.thresholds.qualityDrop) {
        candidates.push({
          alertKey: `${ALERT_PREFIX}quality-drop`,
          ruleCode: 'quality_drop',
          category: 'evaluation',
          severity: 'warning',
          title: 'AI quality is dropping',
          description: `Quality fell by ${drop} points compared with the previous ${days} days.`,
          observedValue: drop,
          thresholdValue: this.thresholds.qualityDrop,
          metadata: { previousScore: round(previousScore), currentScore: current.averageScore },
        });
      }
    }

    if (
      current.approved + current.rejected >= MINIMUM_SAMPLE &&
      current.approvalRate < this.thresholds.approvalRate
    ) {
      candidates.push({
        alertKey: `${ALERT_PREFIX}approval-rate`,
        ruleCode: 'approval_rate_drop',
        category: 'evaluation',
        severity: 'warning',
        title: 'Approval rate decreasing',
        description: `Only ${current.approvalRate}% of reviewed generations were approved.`,
        observedValue: current.approvalRate,
        thresholdValue: this.thresholds.approvalRate,
        metadata: { approved: current.approved, rejected: current.rejected },
      });
    }

    if (
      current.totalRuns >= MINIMUM_SAMPLE &&
      current.averageHallucinationRisk > this.thresholds.hallucinationRisk
    ) {
      candidates.push({
        alertKey: `${ALERT_PREFIX}hallucination-risk`,
        ruleCode: 'hallucination_risk',
        category: 'evaluation',
        severity: 'critical',
        title: 'Hallucination risk increasing',
        description: `Average hallucination risk is ${current.averageHallucinationRisk}%, above the ${this.thresholds.hallucinationRisk}% limit.`,
        observedValue: current.averageHallucinationRisk,
        thresholdValue: this.thresholds.hallucinationRisk,
        metadata: { groundedness: current.averageGroundedness },
      });
    }

    if (regressions.items.length > 0) {
      const worst = regressions.items[0];
      candidates.push({
        alertKey: `${ALERT_PREFIX}prompt-regression`,
        ruleCode: 'prompt_regression',
        category: 'evaluation',
        severity: 'warning',
        title: 'Prompt regression detected',
        description: `${worst.promptName} lost ${worst.drop} points between version ${worst.previousVersion} and ${worst.currentVersion}.`,
        observedValue: worst.drop,
        thresholdValue: regressions.thresholdPercent,
        metadata: { prompts: regressions.items.slice(0, 5) },
      });
    }

    if (knowledge.freshness.staleDocuments >= this.thresholds.knowledgeStaleDocuments) {
      candidates.push({
        alertKey: `${ALERT_PREFIX}knowledge-outdated`,
        ruleCode: 'knowledge_outdated',
        category: 'evaluation',
        severity: 'warning',
        title: 'Knowledge base is outdated',
        description: `${knowledge.freshness.staleDocuments} documents have not been updated in ${knowledge.freshness.staleDays} days.`,
        observedValue: knowledge.freshness.staleDocuments,
        thresholdValue: this.thresholds.knowledgeStaleDocuments,
        metadata: { coveragePercent: knowledge.coveragePercent },
      });
    }

    const failureRate = current.totalRuns
      ? round((current.failed / current.totalRuns) * 100)
      : 0;

    if (current.totalRuns >= MINIMUM_SAMPLE && failureRate >= this.thresholds.failureRate) {
      candidates.push({
        alertKey: `${ALERT_PREFIX}evaluation-failures`,
        ruleCode: 'evaluation_failures',
        category: 'evaluation',
        severity: 'critical',
        title: 'Evaluation failures increasing',
        description: `${current.failed} of ${current.totalRuns} evaluations failed (${failureRate}%).`,
        observedValue: failureRate,
        thresholdValue: this.thresholds.failureRate,
        metadata: { failed: current.failed, warned: current.warned },
      });
    }

    const dailyCost = days ? round(current.totalCost / days, 6) : 0;

    if (dailyCost > this.thresholds.dailyCost) {
      candidates.push({
        alertKey: `${ALERT_PREFIX}ai-cost`,
        ruleCode: 'high_ai_cost',
        category: 'evaluation',
        severity: 'warning',
        title: 'AI cost above budget',
        description: `Evaluated generations cost ${dailyCost} per day on average.`,
        observedValue: dailyCost,
        thresholdValue: this.thresholds.dailyCost,
        metadata: { totalCost: current.totalCost, windowDays: days },
      });
    }

    return candidates;
  }

  async evaluate({ actor = 'system', days = 7 } = {}) {
    const candidates = await this.buildCandidates({ days });
    const saved = [];

    for (const candidate of candidates) {
      saved.push(await this.observabilityRepository.saveAlert(candidate));
    }

    const autoResolved = await this.observabilityRepository.autoResolveAlerts(
      candidates.map((candidate) => candidate.alertKey),
      actor,
      { keyPrefix: ALERT_PREFIX }
    );

    return {
      evaluatedAt: new Date().toISOString(),
      triggered: saved.length,
      autoResolved,
      thresholds: this.getThresholds(),
      alerts: saved,
    };
  }

  async listAlerts(filters = {}) {
    const [items, counts] = await Promise.all([
      this.observabilityRepository.listAlerts({ ...filters, keyPrefix: ALERT_PREFIX }),
      this.observabilityRepository.getAlertCounts({ keyPrefix: ALERT_PREFIX }),
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
