const DAY_MS = 24 * 60 * 60 * 1000;

const SCORECARD_WEIGHTS = {
  quality: 3,
  reliability: 2,
  groundedness: 2,
  humanApproval: 2,
  feedback: 1,
  speed: 1,
  costEfficiency: 1,
};

const STRENGTH_LABELS = {
  quality: 'Consistently high answer quality',
  reliability: 'Very few failed evaluations',
  groundedness: 'Answers stay anchored in the knowledge base',
  humanApproval: 'Reviewers approve almost every output',
  feedback: 'Strong human feedback ratings',
  speed: 'Fast response times',
  costEfficiency: 'Low cost per generation',
};

const RECOMMENDATIONS = {
  quality: 'Review the agent prompts: several criteria score below target.',
  reliability: 'Investigate failed evaluations and add regression cases to the agent test suite.',
  groundedness: 'Expand or refresh the knowledge collections linked to this agent.',
  humanApproval: 'Align the prompt with reviewer expectations; approvals are being refused.',
  feedback: 'Collect and apply human corrections through the Feedback Engine.',
  speed: 'Reduce prompt size or retrieved context to cut latency.',
  costEfficiency: 'Trim the assembled prompt or lower max tokens to reduce cost per answer.',
};

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value, min = 0, max = 100) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function speedScore(averageLatencyMs) {
  if (averageLatencyMs <= 0) {
    return 0;
  }

  if (averageLatencyMs <= 2000) {
    return 100;
  }

  return round(clamp(100 - ((averageLatencyMs - 2000) / 8000) * 100));
}

function costScore(averageCost) {
  if (averageCost <= 0) {
    return 100;
  }

  return round(clamp(100 - (averageCost / 0.05) * 100));
}

/**
 * Compares the four production agents on the same axes and produces an
 * actionable scorecard per agent. All inputs are evaluation runs plus the
 * agents table already owned by the administration module.
 */
export class AgentBenchmarkService {
  constructor({ evaluationRepository }) {
    this.evaluationRepository = evaluationRepository;
  }

  buildScorecard(metrics) {
    const components = {
      quality: round(metrics.averageScore),
      reliability: round(clamp(100 - metrics.failureRate)),
      groundedness: round(metrics.averageGroundedness),
      humanApproval: round(metrics.approvalRate),
      feedback: round(metrics.averageFeedback),
      speed: speedScore(metrics.averageLatencyMs),
      costEfficiency: costScore(metrics.averageCost),
    };

    const totalWeight = Object.values(SCORECARD_WEIGHTS).reduce((total, value) => total + value, 0);
    const overall = round(
      Object.entries(components).reduce(
        (total, [key, value]) => total + value * (SCORECARD_WEIGHTS[key] || 1),
        0
      ) / totalWeight
    );

    const ranked = Object.entries(components).sort((left, right) => right[1] - left[1]);
    const strengths = ranked
      .filter(([, value]) => value >= 75)
      .slice(0, 3)
      .map(([key]) => STRENGTH_LABELS[key]);
    const recommendations = ranked
      .filter(([, value]) => value < 70)
      .slice(-3)
      .map(([key]) => RECOMMENDATIONS[key]);

    return { overall, components, strengths, recommendations };
  }

  async getBenchmark({ days = 30 } = {}) {
    const windowDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const now = Date.now();
    const since = new Date(now - windowDays * DAY_MS);
    const previousSince = new Date(now - windowDays * 2 * DAY_MS);

    const [agents, current, history] = await Promise.all([
      this.evaluationRepository.listAgents(),
      this.evaluationRepository.getQualityByDimension('agent', { since, limit: 50 }),
      this.evaluationRepository.listRunWindow({ since: previousSince }),
    ]);

    const previousTotals = new Map();

    for (const run of history) {
      if (new Date(run.created_at).getTime() >= since.getTime()) {
        continue;
      }

      const key = run.agent_code || 'unknown';
      const entry = previousTotals.get(key) || { runs: 0, scoreTotal: 0 };
      entry.runs += 1;
      entry.scoreTotal += toNumber(run.overall_score);
      previousTotals.set(key, entry);
    }

    const currentByAgent = new Map(current.map((entry) => [entry.key, entry]));
    const agentCodes = new Set([
      ...agents.map((agent) => agent.code),
      ...current.map((entry) => entry.key),
    ]);

    const items = [...agentCodes].map((code) => {
      const agent = agents.find((entry) => entry.code === code);
      const metrics = currentByAgent.get(code);
      const runs = metrics?.runs || 0;
      const failureRate = runs ? round(((metrics?.failed || 0) / runs) * 100) : 0;

      const normalized = {
        averageScore: metrics?.averageScore || 0,
        averageGroundedness: metrics?.averageGroundedness || 0,
        averageHallucinationRisk: metrics?.averageHallucinationRisk || 0,
        averageKnowledgeCoverage: metrics?.averageKnowledgeCoverage || 0,
        averageFeedback: metrics?.averageFeedback || 0,
        averageLatencyMs: metrics?.averageLatencyMs || 0,
        averageTokens: metrics?.averageTokens || 0,
        totalTokens: metrics?.totalTokens || 0,
        averageCost: metrics?.averageCost || 0,
        totalCost: metrics?.totalCost || 0,
        approvalRate: metrics?.approvalRate || 0,
        failureRate,
      };

      const previous = previousTotals.get(code);
      const previousScore = previous?.runs ? previous.scoreTotal / previous.runs : 0;
      const scorecard = this.buildScorecard(normalized);

      return {
        agentCode: code,
        agentName: agent?.name || code,
        status: agent?.status || 'unknown',
        provider: agent?.default_provider || '',
        model: agent?.default_model || '',
        runs,
        ...normalized,
        overallScore: scorecard.overall,
        components: scorecard.components,
        strengths: scorecard.strengths,
        recommendations: scorecard.recommendations,
        previousScore: round(previousScore),
        trend: previous?.runs ? round(normalized.averageScore - previousScore) : 0,
      };
    });

    const evaluated = items.filter((item) => item.runs > 0);

    return {
      windowDays,
      agents: items.sort((left, right) => right.overallScore - left.overallScore),
      platformScore: evaluated.length
        ? round(
            evaluated.reduce((total, item) => total + item.overallScore, 0) / evaluated.length
          )
        : 0,
    };
  }

  async getScorecard(agentCode, { days = 30 } = {}) {
    const benchmark = await this.getBenchmark({ days });
    return benchmark.agents.find((agent) => agent.agentCode === agentCode) || null;
  }
}
