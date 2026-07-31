const DAY_MS = 24 * 60 * 60 * 1000;

const COMPARISON_METRICS = [
  { key: 'averageScore', label: 'Quality', higherIsBetter: true },
  { key: 'averageLatencyMs', label: 'Latency', higherIsBetter: false },
  { key: 'averageTokens', label: 'Tokens', higherIsBetter: false },
  { key: 'averageCost', label: 'Cost', higherIsBetter: false },
  { key: 'approvalRate', label: 'Approval rate', higherIsBetter: true },
  { key: 'averageFeedback', label: 'Feedback', higherIsBetter: true },
  { key: 'averageKnowledgeCoverage', label: 'Knowledge usage', higherIsBetter: true },
  { key: 'averageGroundedness', label: 'Groundedness', higherIsBetter: true },
];

const WINNER_WEIGHTS = {
  averageScore: 3,
  averageGroundedness: 2,
  approvalRate: 2,
  averageFeedback: 1.5,
  averageKnowledgeCoverage: 1,
  averageLatencyMs: 1,
  averageTokens: 0.75,
  averageCost: 1,
};

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function standardDeviation(values) {
  if (values.length < 2) {
    return 0;
  }

  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1);

  return Math.sqrt(variance);
}

/**
 * Turns every prompt into a benchmarkable asset. Catalog counters are read from
 * the Prompt Platform tables; quality, groundedness and regression signals come
 * from evaluation runs tagged with the prompt id and version.
 */
export class PromptEvaluationService {
  constructor({ evaluationRepository, regressionDropPercent = 8, minimumSample = 3 }) {
    this.evaluationRepository = evaluationRepository;
    this.regressionDropPercent = regressionDropPercent;
    this.minimumSample = minimumSample;
  }

  async getPromptMetrics({ days = 30, limit = 50 } = {}) {
    const windowDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const since = new Date(Date.now() - windowDays * DAY_MS);

    const [catalog, evaluated] = await Promise.all([
      this.evaluationRepository.getPromptCatalog({ limit }),
      this.evaluationRepository.getQualityByDimension('prompt', { since, limit: 100 }),
    ]);

    const evaluatedById = new Map(evaluated.map((entry) => [entry.key, entry]));

    const items = catalog.map((prompt) => {
      const quality = evaluatedById.get(prompt.id);
      const usageCount = toNumber(prompt.usage_count);
      const decided = toNumber(prompt.approval_count) + toNumber(prompt.rejection_count);

      return {
        id: prompt.id,
        name: prompt.name,
        status: prompt.status,
        version: toNumber(prompt.version),
        agentCode: prompt.agent_code,
        category: prompt.category,
        usageCount,
        successRate: usageCount
          ? round((toNumber(prompt.success_count) / usageCount) * 100)
          : 0,
        approvalRate: decided ? round((toNumber(prompt.approval_count) / decided) * 100) : 0,
        averageFeedback: round(toNumber(prompt.feedback_score)),
        catalogQuality: round(toNumber(prompt.quality_score)),
        completeness: round(toNumber(prompt.completeness_score)),
        averageLatencyMs: round(toNumber(prompt.average_latency_ms)),
        evaluatedRuns: quality?.runs || 0,
        averageQuality: quality?.averageScore || 0,
        averageGroundedness: quality?.averageGroundedness || 0,
        averageKnowledgeCoverage: quality?.averageKnowledgeCoverage || 0,
        averageTokens: quality?.averageTokens || 0,
        averageCost: quality?.averageCost || 0,
        evaluatedApprovalRate: quality?.approvalRate || 0,
      };
    });

    return {
      windowDays,
      items: items.sort((left, right) => right.usageCount - left.usageCount),
    };
  }

  async getPromptStability(promptId) {
    const runs = await this.evaluationRepository.listRuns({ promptId, limit: 200 });
    const scores = runs.map((run) => toNumber(run.overall_score));

    if (scores.length < 2) {
      return {
        samples: scores.length,
        stability: scores.length ? 100 : 0,
        deviation: 0,
      };
    }

    const deviation = standardDeviation(scores);

    return {
      samples: scores.length,
      stability: round(Math.max(0, 100 - deviation * 2)),
      deviation: round(deviation),
    };
  }

  async compareVersions(promptId, leftVersion, rightVersion) {
    const prompt = await this.evaluationRepository.getPromptById(promptId);

    if (!prompt) {
      return null;
    }

    const evaluatedVersions = await this.evaluationRepository.listPromptVersionsEvaluated(promptId);
    const resolvedRight = Number(rightVersion) || toNumber(prompt.version);
    const resolvedLeft =
      Number(leftVersion) ||
      evaluatedVersions
        .map((entry) => entry.version)
        .filter((version) => version < resolvedRight)
        .pop() ||
      Math.max(resolvedRight - 1, 1);

    const [left, right] = await Promise.all([
      this.evaluationRepository.getPromptVersionQuality(promptId, resolvedLeft),
      this.evaluationRepository.getPromptVersionQuality(promptId, resolvedRight),
    ]);

    const metrics = COMPARISON_METRICS.map((metric) => {
      const leftValue = toNumber(left[metric.key]);
      const rightValue = toNumber(right[metric.key]);
      const delta = round(rightValue - leftValue, 4);
      const improved = metric.higherIsBetter ? delta > 0 : delta < 0;

      return {
        key: metric.key,
        label: metric.label,
        higherIsBetter: metric.higherIsBetter,
        left: leftValue,
        right: rightValue,
        delta,
        winner: delta === 0 ? 'tie' : improved ? 'right' : 'left',
      };
    });

    let leftPoints = 0;
    let rightPoints = 0;

    for (const metric of metrics) {
      const weight = WINNER_WEIGHTS[metric.key] || 1;

      if (metric.winner === 'left') {
        leftPoints += weight;
      } else if (metric.winner === 'right') {
        rightPoints += weight;
      }
    }

    let winner = 'tie';

    if (!left.runs && !right.runs) {
      winner = 'insufficient_data';
    } else if (rightPoints > leftPoints) {
      winner = 'right';
    } else if (leftPoints > rightPoints) {
      winner = 'left';
    }

    return {
      promptId,
      promptName: prompt.name,
      left,
      right,
      metrics,
      winner,
      leftPoints: round(leftPoints),
      rightPoints: round(rightPoints),
      evaluatedVersions,
    };
  }

  async detectRegressions({ limit = 50 } = {}) {
    const catalog = await this.evaluationRepository.getPromptCatalog({ limit });
    const regressions = [];

    for (const prompt of catalog) {
      const versions = await this.evaluationRepository.listPromptVersionsEvaluated(prompt.id);
      const usable = versions.filter((entry) => entry.runs >= this.minimumSample);

      if (usable.length < 2) {
        continue;
      }

      const current = usable[usable.length - 1];
      const previous = usable[usable.length - 2];

      const [currentQuality, previousQuality] = await Promise.all([
        this.evaluationRepository.getPromptVersionQuality(prompt.id, current.version),
        this.evaluationRepository.getPromptVersionQuality(prompt.id, previous.version),
      ]);

      const drop = round(previousQuality.averageScore - currentQuality.averageScore);

      if (drop >= this.regressionDropPercent) {
        regressions.push({
          promptId: prompt.id,
          promptName: prompt.name,
          agentCode: prompt.agent_code,
          previousVersion: previous.version,
          currentVersion: current.version,
          previousScore: previousQuality.averageScore,
          currentScore: currentQuality.averageScore,
          drop,
          samples: current.runs,
        });
      }
    }

    return {
      thresholdPercent: this.regressionDropPercent,
      minimumSample: this.minimumSample,
      items: regressions.sort((left, right) => right.drop - left.drop),
    };
  }
}
