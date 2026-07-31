const DAY_MS = 24 * 60 * 60 * 1000;

const REJECTION_TYPES = new Set(['Rejected', 'Manual Rewrite', 'Major Edit']);

const CRITERION_ADVICE = {
  instruction_following: {
    category: 'prompt',
    title: 'Prompts are not being followed',
    suggestion:
      'Restate the mandatory instructions as a numbered checklist at the end of the system prompt.',
  },
  relevance: {
    category: 'prompt',
    title: 'Answers drift from the request',
    suggestion: 'Add an explicit instruction to restate and address the user request first.',
  },
  completeness: {
    category: 'prompt',
    title: 'Answers are incomplete',
    suggestion: 'Define the required output sections in the prompt so nothing is skipped.',
  },
  consistency: {
    category: 'prompt',
    title: 'Answers repeat themselves',
    suggestion: 'Instruct the model to avoid restating the same point and to keep one idea per paragraph.',
  },
  professional_tone: {
    category: 'prompt',
    title: 'Tone is not professional enough',
    suggestion: 'Pin the register in the prompt and give one approved sample paragraph.',
  },
  formatting: {
    category: 'prompt',
    title: 'Output formatting is inconsistent',
    suggestion: 'Specify the expected structure (headings, bullet lists, closing formula).',
  },
  knowledge_usage: {
    category: 'knowledge',
    title: 'Knowledge is retrieved but not used',
    suggestion: 'Require the answer to quote the retrieved context, and review collection relevance.',
  },
  groundedness: {
    category: 'knowledge',
    title: 'Hallucination risk is elevated',
    suggestion:
      'Expand the knowledge collections linked to this agent and forbid answering outside the retrieved context.',
  },
  safety: {
    category: 'prompt',
    title: 'Unsafe content detected',
    suggestion: 'Add an explicit safety constraint forbidding credentials, card numbers and absolute guarantees.',
  },
  human_approval: {
    category: 'workflow',
    title: 'Reviewers reject too many outputs',
    suggestion: 'Align the prompt with reviewer expectations and capture rejection reasons as feedback.',
  },
  response_length: {
    category: 'prompt',
    title: 'Response length is off target',
    suggestion: 'State a target length range in the prompt.',
  },
  response_quality: {
    category: 'prompt',
    title: 'Writing quality is weak',
    suggestion: 'Ask for varied vocabulary and sentences of 10 to 20 words.',
  },
};

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Turns human corrections and failing evaluation criteria into concrete
 * improvement suggestions. Nothing is applied automatically: every suggestion
 * stays pending until an administrator approves it.
 */
export class FeedbackIntelligenceService {
  constructor({ evaluationRepository, promptEvaluationService, weakCriterionScore = 65 }) {
    this.evaluationRepository = evaluationRepository;
    this.promptEvaluationService = promptEvaluationService;
    this.weakCriterionScore = weakCriterionScore;
  }

  async getSignals({ days = 30 } = {}) {
    const windowDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const since = new Date(Date.now() - windowDays * DAY_MS);

    const [signals, criteria] = await Promise.all([
      this.evaluationRepository.getFeedbackSignals({ since }),
      this.evaluationRepository.getScoreByCriterion({ since }),
    ]);

    const ratings = signals.feedback
      .map((row) => toNumber(row.rating))
      .filter((rating) => rating > 0);
    const rejected = signals.feedback.filter((row) => REJECTION_TYPES.has(row.feedback_type));
    const accepted = signals.feedback.filter((row) => row.feedback_type === 'Accept');

    return {
      windowDays,
      totalFeedback: signals.feedback.length,
      acceptedOutputs: accepted.length,
      rejectedOutputs: rejected.length,
      averageRating: ratings.length
        ? round(ratings.reduce((total, rating) => total + rating, 0) / ratings.length)
        : 0,
      revisionReasons: signals.corrections.map((row) => ({
        type: row.correction_type,
        occurrences: row.occurrences,
      })),
      approvalComments: signals.feedback
        .filter((row) => row.comment)
        .slice(0, 20)
        .map((row) => ({
          agentCode: row.agent_code,
          feedbackType: row.feedback_type,
          comment: row.comment,
          createdAt: row.created_at,
        })),
      patterns: signals.patterns.map((row) => ({
        type: row.pattern_type,
        text: row.pattern_text,
        occurrences: row.occurrences,
        status: row.status,
      })),
      weakCriteria: criteria.filter((entry) => entry.averageScore < this.weakCriterionScore),
    };
  }

  async generateSuggestions({ days = 30, persist = true } = {}) {
    const [signals, regressions, knowledge] = await Promise.all([
      this.getSignals({ days }),
      this.promptEvaluationService.detectRegressions({ limit: 25 }),
      this.evaluationRepository.getKnowledgeEvaluation({}),
    ]);

    const candidates = [];

    for (const criterion of signals.weakCriteria) {
      const advice = CRITERION_ADVICE[criterion.criterion];

      if (!advice) {
        continue;
      }

      candidates.push({
        category: advice.category,
        targetType: 'criterion',
        targetId: criterion.criterion,
        title: advice.title,
        suggestion: advice.suggestion,
        rationale: `Average score for ${criterion.criterion} is ${criterion.averageScore}/100 across ${criterion.samples} evaluations.`,
        impact: criterion.averageScore < 45 ? 'high' : 'medium',
        evidence: {
          criterion: criterion.criterion,
          averageScore: criterion.averageScore,
          samples: criterion.samples,
          failures: criterion.failures,
        },
      });
    }

    for (const regression of regressions.items) {
      candidates.push({
        category: 'prompt',
        targetType: 'prompt',
        targetId: regression.promptId,
        title: `Regression on ${regression.promptName}`,
        suggestion: `Review version ${regression.currentVersion} or restore version ${regression.previousVersion}.`,
        rationale: `Quality dropped by ${regression.drop} points between version ${regression.previousVersion} and ${regression.currentVersion}.`,
        impact: 'high',
        evidence: regression,
      });
    }

    if (knowledge.unused.length >= 3) {
      candidates.push({
        category: 'knowledge',
        targetType: 'collection',
        targetId: null,
        title: 'Retire or re-tag unused documents',
        suggestion:
          'Review documents that are never retrieved: re-tag them, merge them or archive them to reduce retrieval noise.',
        rationale: `${knowledge.unused.length} active documents have never been retrieved by an agent.`,
        impact: 'medium',
        evidence: { unused: knowledge.unused.slice(0, 10).map((row) => row.title) },
      });
    }

    if (knowledge.stale.length >= 3) {
      candidates.push({
        category: 'knowledge',
        targetType: 'collection',
        targetId: null,
        title: 'Refresh ageing knowledge',
        suggestion: 'Schedule a review pass on the oldest documents so answers stay accurate.',
        rationale: `${knowledge.stale.length} documents have not been updated recently.`,
        impact: 'medium',
        evidence: { stale: knowledge.stale.slice(0, 10).map((row) => row.title) },
      });
    }

    if (signals.rejectedOutputs > signals.acceptedOutputs && signals.totalFeedback > 0) {
      candidates.push({
        category: 'workflow',
        targetType: 'workflow',
        targetId: null,
        title: 'Reviewers reject more outputs than they accept',
        suggestion:
          'Run a calibration session between reviewers and prompt owners, then encode the agreed rules in the prompts.',
        rationale: `${signals.rejectedOutputs} rejections against ${signals.acceptedOutputs} acceptances.`,
        impact: 'high',
        evidence: {
          rejected: signals.rejectedOutputs,
          accepted: signals.acceptedOutputs,
          revisionReasons: signals.revisionReasons,
        },
      });
    }

    if (!persist) {
      return { generated: candidates.length, items: candidates };
    }

    const saved = [];

    for (const candidate of candidates) {
      saved.push(await this.evaluationRepository.saveSuggestion(candidate));
    }

    return { generated: saved.length, items: saved };
  }

  async listSuggestions(filters = {}) {
    const [items, counts] = await Promise.all([
      this.evaluationRepository.listSuggestions(filters),
      this.evaluationRepository.getSuggestionCounts(),
    ]);

    return { items, counts };
  }

  async reviewSuggestion(id, { status, actor }) {
    return this.evaluationRepository.updateSuggestionStatus(id, { status, actor });
  }
}
