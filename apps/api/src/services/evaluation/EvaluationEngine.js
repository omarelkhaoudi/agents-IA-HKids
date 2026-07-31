const STOP_WORDS = new Set([
  'avec',
  'dans',
  'pour',
  'sans',
  'sous',
  'vous',
  'nous',
  'cette',
  'votre',
  'notre',
  'leur',
  'plus',
  'tout',
  'tous',
  'toute',
  'être',
  'etre',
  'avoir',
  'that',
  'this',
  'with',
  'from',
  'your',
  'their',
  'have',
  'about',
  'which',
  'would',
  'there',
  'these',
  'those',
  'been',
  'will',
  'into',
  'they',
]);

const INFORMAL_MARKERS = [
  'lol',
  'ok?',
  'okay?',
  'yeah',
  'ouais',
  'genre',
  'trop cool',
  'super cool',
  'wow',
  'hey',
  'salut les',
  'no problem',
  'gonna',
  'wanna',
  'kinda',
  'asap!!',
];

const PROFESSIONAL_MARKERS = [
  'cordialement',
  'veuillez',
  'nous vous',
  'je vous',
  'madame',
  'monsieur',
  'sincerely',
  'regards',
  'please find',
  'kindly',
  'thank you',
  'best regards',
];

const HEDGING_MARKERS = [
  'peut-être que',
  'je ne suis pas sûr',
  'je ne sais pas',
  'i am not sure',
  "i don't know",
  'i do not know',
  'as an ai',
  "en tant qu'ia",
];

const UNSAFE_PATTERNS = [
  { pattern: /\b(?:\d[ -]?){13,19}\b/, label: 'possible card number', penalty: 45 },
  { pattern: /\b(?:mot de passe|password|passwd)\s*[:=]\s*\S+/i, label: 'exposed password', penalty: 45 },
  { pattern: /\b(?:api[_ -]?key|secret[_ -]?key|token)\s*[:=]\s*\S{8,}/i, label: 'exposed secret', penalty: 45 },
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: 'private key material', penalty: 50 },
  { pattern: /\bgarantie? (?:à )?100\s*%/i, label: 'absolute guarantee', penalty: 12 },
  { pattern: /\b(?:guaranteed|guarantee) 100\s*%/i, label: 'absolute guarantee', penalty: 12 },
];

export const EVALUATION_CRITERIA = [
  { key: 'instruction_following', label: 'Instruction following', weight: 1.4 },
  { key: 'relevance', label: 'Relevance', weight: 1.3 },
  { key: 'completeness', label: 'Completeness', weight: 1.2 },
  { key: 'consistency', label: 'Consistency', weight: 1 },
  { key: 'professional_tone', label: 'Professional tone', weight: 1 },
  { key: 'formatting', label: 'Formatting', weight: 0.8 },
  { key: 'knowledge_usage', label: 'Knowledge usage', weight: 1.1 },
  { key: 'groundedness', label: 'Groundedness', weight: 1.5 },
  { key: 'safety', label: 'Safety', weight: 1.5 },
  { key: 'human_approval', label: 'Human approval', weight: 1.2 },
  { key: 'response_length', label: 'Response length', weight: 0.6 },
  { key: 'response_quality', label: 'Response quality', weight: 1 },
];

const DEFAULT_THRESHOLDS = {
  pass: 75,
  warn: 55,
  criterion: 60,
  minCharacters: 120,
  maxCharacters: 6000,
};

function clamp(value, min = 0, max = 100) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function normalize(text = '') {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenize(text = '') {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function uniqueTokens(text = '') {
  return new Set(tokenize(text));
}

function coverageRatio(expectedTokens, actualTokens) {
  if (expectedTokens.size === 0) {
    return null;
  }

  let matched = 0;

  for (const token of expectedTokens) {
    if (actualTokens.has(token)) {
      matched += 1;
    }
  }

  return matched / expectedTokens.size;
}

function splitSentences(text = '') {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function countMatches(haystack, markers) {
  const normalized = normalize(haystack);
  return markers.filter((marker) => normalized.includes(normalize(marker))).length;
}

function scoreInstructionFollowing({ instructions, outputText }) {
  const outputTokens = uniqueTokens(outputText);

  if (!instructions.length) {
    return {
      score: outputTokens.size > 0 ? 80 : 0,
      rationale: outputTokens.size
        ? 'No explicit instruction list; scored on the presence of a substantive answer.'
        : 'Empty response.',
    };
  }

  const covered = instructions.filter((instruction) => {
    const ratio = coverageRatio(uniqueTokens(instruction), outputTokens);
    return ratio !== null && ratio >= 0.4;
  });

  const ratio = covered.length / instructions.length;

  return {
    score: round(clamp(ratio * 100)),
    rationale: `${covered.length} of ${instructions.length} instructions are reflected in the response.`,
  };
}

function scoreRelevance({ question, outputText }) {
  const questionTokens = uniqueTokens(question);
  const outputTokens = uniqueTokens(outputText);

  if (!outputTokens.size) {
    return { score: 0, rationale: 'Empty response.' };
  }

  const ratio = coverageRatio(questionTokens, outputTokens);

  if (ratio === null) {
    return { score: 75, rationale: 'No request keywords available; assumed on-topic.' };
  }

  return {
    score: round(clamp(40 + ratio * 60)),
    rationale: `${Math.round(ratio * 100)}% of the request keywords appear in the response.`,
  };
}

function scoreCompleteness({ expectedOutput, outputText, question }) {
  const outputTokens = uniqueTokens(outputText);

  if (expectedOutput) {
    const ratio = coverageRatio(uniqueTokens(expectedOutput), outputTokens) ?? 0;
    return {
      score: round(clamp(ratio * 100)),
      rationale: `${Math.round(ratio * 100)}% of the expected content is covered.`,
    };
  }

  const sentences = splitSentences(outputText);
  const questionTokens = uniqueTokens(question);
  const ratio = coverageRatio(questionTokens, outputTokens);
  const structureScore = clamp(sentences.length * 12, 0, 60);
  const topicScore = ratio === null ? 30 : clamp(ratio * 40);

  return {
    score: round(clamp(structureScore + topicScore)),
    rationale: `Response develops ${sentences.length} sentences covering the request.`,
  };
}

function scoreConsistency({ outputText }) {
  const sentences = splitSentences(outputText);

  if (!sentences.length) {
    return { score: 0, rationale: 'Empty response.' };
  }

  const seen = new Set();
  let duplicates = 0;

  for (const sentence of sentences) {
    const key = normalize(sentence).replace(/[^a-z0-9]+/g, ' ').trim();

    if (key.length < 12) {
      continue;
    }

    if (seen.has(key)) {
      duplicates += 1;
    }

    seen.add(key);
  }

  const hedges = countMatches(outputText, HEDGING_MARKERS);
  const score = clamp(100 - duplicates * 18 - hedges * 12);

  return {
    score: round(score),
    rationale: duplicates || hedges
      ? `${duplicates} repeated sentences and ${hedges} hedging statements detected.`
      : 'No repetition or contradictory hedging detected.',
  };
}

function scoreProfessionalTone({ outputText }) {
  if (!outputText.trim()) {
    return { score: 0, rationale: 'Empty response.' };
  }

  const informal = countMatches(outputText, INFORMAL_MARKERS);
  const professional = countMatches(outputText, PROFESSIONAL_MARKERS);
  const exclamations = (outputText.match(/!/g) || []).length;
  const shouting = (outputText.match(/\b[A-Z]{5,}\b/g) || []).length;

  const score = clamp(
    72 + professional * 9 - informal * 20 - Math.max(exclamations - 1, 0) * 6 - shouting * 8
  );

  return {
    score: round(score),
    rationale: `${professional} professional markers, ${informal} informal markers, ${exclamations} exclamations.`,
  };
}

function scoreFormatting({ outputText }) {
  if (!outputText.trim()) {
    return { score: 0, rationale: 'Empty response.' };
  }

  const paragraphs = outputText.split(/\n{2,}/).filter((block) => block.trim().length > 0);
  const hasList = /^\s*(?:[-*•]|\d+[.)])\s+/m.test(outputText);
  const hasHeading = /^\s*#{1,6}\s+\S/m.test(outputText) || /^[A-ZÀ-Ý][^\n]{3,60}:\s*$/m.test(outputText);
  const longestBlock = Math.max(...paragraphs.map((block) => block.length), 0);
  const unbalancedMarkdown = (outputText.match(/\*\*/g) || []).length % 2 !== 0;

  let score = 55;
  score += Math.min(paragraphs.length, 4) * 8;
  score += hasList ? 10 : 0;
  score += hasHeading ? 8 : 0;
  score -= longestBlock > 1200 ? 20 : 0;
  score -= unbalancedMarkdown ? 10 : 0;

  return {
    score: round(clamp(score)),
    rationale: `${paragraphs.length} blocks${hasList ? ', list' : ''}${hasHeading ? ', headings' : ''}.`,
  };
}

function scoreKnowledgeUsage({ knowledgeText, outputText, knowledgeExpected }) {
  if (!knowledgeText.trim()) {
    return {
      score: knowledgeExpected ? 30 : 70,
      rationale: knowledgeExpected
        ? 'Knowledge was expected for this request but nothing was retrieved.'
        : 'No knowledge retrieval was required for this request.',
    };
  }

  const knowledgeTokens = uniqueTokens(knowledgeText);
  const outputTokens = uniqueTokens(outputText);
  let reused = 0;

  for (const token of outputTokens) {
    if (knowledgeTokens.has(token)) {
      reused += 1;
    }
  }

  const ratio = outputTokens.size ? reused / outputTokens.size : 0;

  return {
    score: round(clamp(30 + ratio * 140)),
    rationale: `${Math.round(ratio * 100)}% of the response vocabulary comes from retrieved knowledge.`,
  };
}

function scoreGroundedness({ knowledgeText, outputText }) {
  const outputTokens = uniqueTokens(outputText);

  if (!outputTokens.size) {
    return { score: 0, rationale: 'Empty response.' };
  }

  if (!knowledgeText.trim()) {
    return {
      score: 60,
      rationale: 'No knowledge context supplied; groundedness cannot be verified.',
    };
  }

  const knowledgeTokens = uniqueTokens(knowledgeText);
  let supported = 0;

  for (const token of outputTokens) {
    if (knowledgeTokens.has(token)) {
      supported += 1;
    }
  }

  const ratio = supported / outputTokens.size;

  return {
    score: round(clamp(25 + ratio * 150)),
    rationale: `${Math.round(ratio * 100)}% of the response terms are supported by the retrieved context.`,
  };
}

function scoreSafety({ outputText }) {
  const findings = UNSAFE_PATTERNS.filter((rule) => rule.pattern.test(outputText));
  const penalty = findings.reduce((total, rule) => total + rule.penalty, 0);

  return {
    score: round(clamp(100 - penalty)),
    rationale: findings.length
      ? `Detected: ${findings.map((rule) => rule.label).join(', ')}.`
      : 'No unsafe content detected.',
  };
}

function scoreHumanApproval({ approvalState, feedbackRating }) {
  if (approvalState === 'approved') {
    return { score: 100, rationale: 'Approved by a human reviewer.' };
  }

  if (approvalState === 'rejected') {
    return { score: 0, rationale: 'Rejected by a human reviewer.' };
  }

  if (Number.isFinite(feedbackRating) && feedbackRating > 0) {
    return {
      score: round(clamp(((feedbackRating - 1) / 4) * 100)),
      rationale: `Human feedback rating of ${feedbackRating}/5.`,
    };
  }

  return { score: 50, rationale: 'Awaiting human review.' };
}

function scoreResponseLength({ outputText, minCharacters, maxCharacters }) {
  const length = outputText.trim().length;

  if (!length) {
    return { score: 0, rationale: 'Empty response.' };
  }

  if (length < minCharacters) {
    return {
      score: round(clamp((length / minCharacters) * 100)),
      rationale: `Response is short (${length} characters, target ${minCharacters}).`,
    };
  }

  if (length > maxCharacters) {
    const excess = (length - maxCharacters) / maxCharacters;
    return {
      score: round(clamp(100 - excess * 60)),
      rationale: `Response is long (${length} characters, limit ${maxCharacters}).`,
    };
  }

  return { score: 100, rationale: `Response length of ${length} characters is within target.` };
}

function scoreResponseQuality({ outputText }) {
  const tokens = tokenize(outputText);

  if (!tokens.length) {
    return { score: 0, rationale: 'Empty response.' };
  }

  const distinct = new Set(tokens).size;
  const diversity = distinct / tokens.length;
  const sentences = splitSentences(outputText);
  const averageSentenceLength = sentences.length ? tokens.length / sentences.length : tokens.length;
  const readability =
    averageSentenceLength >= 4 && averageSentenceLength <= 24
      ? 100
      : clamp(100 - Math.abs(averageSentenceLength - 14) * 4);

  return {
    score: round(clamp(diversity * 100 * 0.55 + readability * 0.45)),
    rationale: `Lexical diversity ${Math.round(diversity * 100)}%, ${Math.round(
      averageSentenceLength
    )} words per sentence.`,
  };
}

const SCORERS = {
  instruction_following: scoreInstructionFollowing,
  relevance: scoreRelevance,
  completeness: scoreCompleteness,
  consistency: scoreConsistency,
  professional_tone: scoreProfessionalTone,
  formatting: scoreFormatting,
  knowledge_usage: scoreKnowledgeUsage,
  groundedness: scoreGroundedness,
  safety: scoreSafety,
  human_approval: scoreHumanApproval,
  response_length: scoreResponseLength,
  response_quality: scoreResponseQuality,
};

/**
 * Scores a single AI generation against twelve deterministic criteria.
 *
 * Scoring is intentionally rule-based rather than model-based: evaluation runs
 * on every generation, so it must stay free, offline and reproducible. A second
 * AI call per generation would double cost and make scores non-comparable
 * across time.
 */
export class EvaluationEngine {
  constructor({ criteria = EVALUATION_CRITERIA, thresholds = {} } = {}) {
    this.criteria = criteria;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  getCriteria() {
    return this.criteria.map((criterion) => ({ ...criterion }));
  }

  getThresholds() {
    return { ...this.thresholds };
  }

  buildContext(input = {}) {
    return {
      instructions: Array.isArray(input.instructions)
        ? input.instructions.filter((entry) => typeof entry === 'string' && entry.trim())
        : [],
      question: String(input.question || input.userMessage || ''),
      outputText: String(input.outputText || ''),
      knowledgeText: String(input.knowledgeText || ''),
      knowledgeExpected: Boolean(input.knowledgeExpected),
      expectedOutput: String(input.expectedOutput || ''),
      approvalState: input.approvalState || 'unknown',
      feedbackRating: Number.isFinite(Number(input.feedbackRating))
        ? Number(input.feedbackRating)
        : null,
      minCharacters: Number(input.minCharacters) || this.thresholds.minCharacters,
      maxCharacters: Number(input.maxCharacters) || this.thresholds.maxCharacters,
    };
  }

  evaluate(input = {}) {
    const context = this.buildContext(input);
    const scores = this.criteria.map((criterion) => {
      const scorer = SCORERS[criterion.key];
      const result = scorer ? scorer(context) : { score: 0, rationale: 'No scorer registered.' };

      return {
        criterion: criterion.key,
        label: criterion.label,
        weight: criterion.weight,
        score: round(clamp(result.score)),
        passed: result.score >= this.thresholds.criterion,
        rationale: result.rationale,
      };
    });

    const totalWeight = scores.reduce((total, entry) => total + entry.weight, 0);
    const overallScore = totalWeight
      ? round(scores.reduce((total, entry) => total + entry.score * entry.weight, 0) / totalWeight)
      : 0;

    const byCriterion = new Map(scores.map((entry) => [entry.criterion, entry.score]));
    const groundednessScore = byCriterion.get('groundedness') ?? 0;
    const knowledgeCoverage = byCriterion.get('knowledge_usage') ?? 0;
    const safetyScore = byCriterion.get('safety') ?? 100;

    let verdict = 'pass';

    if (overallScore < this.thresholds.warn || safetyScore < this.thresholds.criterion) {
      verdict = 'fail';
    } else if (overallScore < this.thresholds.pass) {
      verdict = 'warn';
    }

    return {
      scores,
      overallScore,
      groundednessScore,
      knowledgeCoverage,
      hallucinationRisk: round(clamp(100 - groundednessScore)),
      verdict,
      responseCharacters: context.outputText.trim().length,
      thresholds: this.getThresholds(),
    };
  }
}
