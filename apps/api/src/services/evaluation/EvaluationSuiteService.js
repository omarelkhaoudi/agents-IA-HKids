const DEFAULT_SUITES = [
  {
    code: 'sales-tests',
    name: 'Sales Tests',
    description: 'Checks quotation wording, pricing clarity and commercial tone.',
    agentCode: 'sales-agent',
    acceptanceThreshold: 70,
    cases: [
      {
        name: 'Quotation summary',
        inputText:
          'Rédige un devis synthétique pour 12 tablettes éducatives avec remise de 10% et conditions de paiement à 30 jours.',
        expectedOutput:
          'devis tablettes éducatives quantité remise conditions paiement total validité signature',
        rules: { mustInclude: ['devis'], minScore: 60 },
      },
      {
        name: 'Follow-up email',
        inputText: 'Rédige un email de relance professionnel après un devis resté sans réponse.',
        expectedOutput: 'relance devis proposition disponibilité échange cordialement',
        rules: { mustNotInclude: ['lol'], minScore: 60 },
      },
    ],
  },
  {
    code: 'hr-tests',
    name: 'HR Tests',
    description: 'Checks job descriptions, leave answers and HR compliance tone.',
    agentCode: 'hr-agent',
    acceptanceThreshold: 70,
    cases: [
      {
        name: 'Job description',
        inputText: "Rédige une fiche de poste pour un éducateur petite enfance en contrat CDI.",
        expectedOutput:
          'fiche poste éducateur petite enfance missions compétences profil contrat rémunération',
        rules: { mustInclude: ['missions'], minScore: 60 },
      },
      {
        name: 'Leave policy answer',
        inputText: 'Explique la procédure de demande de congés payés pour un salarié.',
        expectedOutput: 'demande congés payés procédure validation manager délai solde',
        rules: { minScore: 60 },
      },
    ],
  },
  {
    code: 'administration-tests',
    name: 'Administration Tests',
    description: 'Checks administrative correspondence, structure and formality.',
    agentCode: 'administrative-assistant',
    acceptanceThreshold: 70,
    cases: [
      {
        name: 'Official letter',
        inputText: "Rédige un courrier administratif d'information aux familles sur les horaires.",
        expectedOutput: 'courrier familles horaires information date signature cordialement',
        rules: { mustInclude: ['cordialement'], minScore: 60 },
      },
      {
        name: 'Meeting minutes',
        inputText: "Rédige un compte rendu de réunion d'équipe avec les décisions prises.",
        expectedOutput: 'compte rendu réunion participants ordre du jour décisions actions',
        rules: { minScore: 60 },
      },
    ],
  },
  {
    code: 'community-manager-tests',
    name: 'Community Manager Tests',
    description: 'Checks social copy, brand tone and call to action quality.',
    agentCode: 'community-manager',
    acceptanceThreshold: 65,
    cases: [
      {
        name: 'Instagram post',
        inputText: "Rédige un post Instagram pour annoncer l'ouverture des inscriptions.",
        expectedOutput: 'inscriptions ouverture places enfants activités contact lien',
        rules: { minScore: 55 },
      },
      {
        name: 'Newsletter intro',
        inputText: 'Rédige une introduction de newsletter mensuelle pour les parents.',
        expectedOutput: 'newsletter mois actualités enfants équipe programme',
        rules: { mustNotInclude: ['lol'], minScore: 55 },
      },
    ],
  },
];

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function parseRules(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value) || {};
  } catch {
    return {};
  }
}

function checkRules({ rules, outputText, evaluation }) {
  const failures = [];
  const normalized = outputText.toLowerCase();

  for (const token of rules.mustInclude || []) {
    if (!normalized.includes(String(token).toLowerCase())) {
      failures.push(`missing required content "${token}"`);
    }
  }

  for (const token of rules.mustNotInclude || []) {
    if (normalized.includes(String(token).toLowerCase())) {
      failures.push(`contains forbidden content "${token}"`);
    }
  }

  if (Number.isFinite(Number(rules.minScore)) && evaluation.overallScore < Number(rules.minScore)) {
    failures.push(`score ${evaluation.overallScore} below case minimum ${rules.minScore}`);
  }

  for (const [criterion, minimum] of Object.entries(rules.criteria || {})) {
    const score = evaluation.scores.find((entry) => entry.criterion === criterion);

    if (score && score.score < Number(minimum)) {
      failures.push(`${criterion} scored ${score.score}, below ${minimum}`);
    }
  }

  return failures;
}

/**
 * Runs curated evaluation suites against the live AI Gateway and scores each
 * case with the same engine used for production traffic, so suite results are
 * directly comparable with day-to-day quality.
 */
export class EvaluationSuiteService {
  constructor({ evaluationRepository, evaluationService, evaluationEngine, aiGateway = null }) {
    this.evaluationRepository = evaluationRepository;
    this.evaluationService = evaluationService;
    this.evaluationEngine = evaluationEngine;
    this.aiGateway = aiGateway;
  }

  async seedDefaultSuitesIfEmpty() {
    const existing = await this.evaluationRepository.listSuites();

    if (existing.length > 0) {
      return existing;
    }

    for (const definition of DEFAULT_SUITES) {
      const suite = await this.evaluationRepository.createSuite({
        code: definition.code,
        name: definition.name,
        description: definition.description,
        agentCode: definition.agentCode,
        acceptanceThreshold: definition.acceptanceThreshold,
        owner: 'system',
      });

      let position = 0;

      for (const testCase of definition.cases) {
        await this.evaluationRepository.createCase({
          suiteId: suite.id,
          name: testCase.name,
          inputText: testCase.inputText,
          expectedOutput: testCase.expectedOutput,
          rules: testCase.rules,
          position,
        });
        position += 1;
      }
    }

    return this.evaluationRepository.listSuites();
  }

  async listSuites({ agentCode, status } = {}) {
    const suites = await this.evaluationRepository.listSuites({ agentCode, status });

    return Promise.all(
      suites.map(async (suite) => {
        const [cases, runs] = await Promise.all([
          this.evaluationRepository.listCases(suite.id),
          this.evaluationRepository.listSuiteRuns(suite.id, { limit: 1 }),
        ]);

        return {
          ...suite,
          caseCount: cases.length,
          lastRun: runs[0] || null,
        };
      })
    );
  }

  async getSuiteDetail(suiteId) {
    const suite = await this.evaluationRepository.getSuite(suiteId);

    if (!suite) {
      return null;
    }

    const [cases, runs] = await Promise.all([
      this.evaluationRepository.listCases(suiteId),
      this.evaluationRepository.listSuiteRuns(suiteId, { limit: 20 }),
    ]);

    const history = await Promise.all(
      runs.map(async (run) => ({
        ...run,
        results: await this.evaluationRepository.listCaseResults(run.id),
      }))
    );

    return { suite, cases, history };
  }

  async runSuite(suiteId, { actor = 'system' } = {}) {
    const suite = await this.evaluationRepository.getSuite(suiteId);

    if (!suite) {
      return null;
    }

    if (!this.aiGateway) {
      const error = new Error('AI Gateway is not available for suite execution.');
      error.statusCode = 503;
      throw error;
    }

    const cases = await this.evaluationRepository.listCases(suiteId);
    const startedAt = Date.now();
    const results = [];
    let scoreTotal = 0;
    let passedCases = 0;

    for (const testCase of cases) {
      const rules = parseRules(testCase.rules);
      const caseStartedAt = Date.now();
      let outputText = '';
      let usage = null;
      let failureReason = '';

      try {
        const generated = await this.aiGateway.generate({
          agentCode: suite.agent_code,
          systemPrompt: `You are the ${suite.name} evaluation target. Answer precisely and professionally.`,
          messages: [{ role: 'user', content: testCase.input_text }],
        });

        outputText = generated?.text || '';
        usage = generated?.usage || null;
      } catch (error) {
        failureReason = error instanceof Error ? error.message : 'Generation failed.';
      }

      const evaluation = this.evaluationEngine.evaluate({
        question: testCase.input_text,
        outputText,
        expectedOutput: testCase.expected_output,
        knowledgeText: '',
      });

      const ruleFailures = failureReason
        ? [failureReason]
        : checkRules({ rules, outputText, evaluation });
      const passed = ruleFailures.length === 0 && evaluation.verdict !== 'fail';

      const runId = await this.evaluationService.recordEvaluationForSuite({
        suite,
        testCase,
        outputText,
        usage,
        evaluation,
        actor,
        latencyMs: Date.now() - caseStartedAt,
      });

      scoreTotal += evaluation.overallScore;
      passedCases += passed ? 1 : 0;

      results.push({
        caseId: testCase.id,
        caseName: testCase.name,
        runId,
        passed,
        score: evaluation.overallScore,
        outputText,
        failureReason: ruleFailures.join('; '),
      });
    }

    const averageScore = cases.length ? round(scoreTotal / cases.length) : 0;
    const threshold = Number(suite.acceptance_threshold) || 70;
    const status = cases.length && passedCases === cases.length && averageScore >= threshold
      ? 'passed'
      : 'failed';

    const savedRunId = await this.evaluationRepository.saveSuiteRun({
      suiteId,
      status,
      totalCases: cases.length,
      passedCases,
      failedCases: cases.length - passedCases,
      averageScore,
      acceptanceThreshold: threshold,
      durationMs: Date.now() - startedAt,
      actor,
      metadata: { agentCode: suite.agent_code },
    });

    for (const result of results) {
      await this.evaluationRepository.saveCaseResult({
        suiteRunId: savedRunId,
        caseId: result.caseId,
        runId: result.runId,
        passed: result.passed,
        score: result.score,
        outputText: result.outputText,
        failureReason: result.failureReason,
      });
    }

    return {
      suiteRunId: savedRunId,
      suiteId,
      suiteName: suite.name,
      status,
      totalCases: cases.length,
      passedCases,
      failedCases: cases.length - passedCases,
      averageScore,
      acceptanceThreshold: threshold,
      durationMs: Date.now() - startedAt,
      results,
    };
  }
}
