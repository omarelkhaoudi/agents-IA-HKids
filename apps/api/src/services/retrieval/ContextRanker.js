const AGENT_FILTER_TERMS = {
  'community-manager': [
    'community',
    'marketing',
    'social',
    'instagram',
    'facebook',
    'linkedin',
    'campaign',
    'parents',
  ],
  'administrative-assistant': [
    'administration',
    'administrative',
    'enrollment',
    'policy',
    'procedure',
    'operations',
  ],
  'sales-agent': [
    'sales',
    'commercial',
    'pricing',
    'quotation',
    'proposal',
    'contract',
    'product',
  ],
  'hr-agent': ['hr', 'rh', 'policy', 'recruitment', 'leave', 'contract', 'onboarding', 'employee'],
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function recencyBoost(updatedDate) {
  const timestamp = Date.parse(updatedDate);

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  const daysSinceUpdate = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24))
  );

  return Math.max(0, 4 - Math.min(daysSinceUpdate, 4));
}

function normalizeScore(value, maxValue) {
  if (!maxValue) {
    return 0;
  }

  return value / maxValue;
}

function candidateMatchesAgent(candidate, agentCode) {
  const terms = AGENT_FILTER_TERMS[agentCode] || [];
  if (!terms.length) {
    return true;
  }

  const metadata = candidate.chunk?.metadata || {};
  const haystack = normalizeText(
    [
      candidate.document?.title,
      candidate.document?.category,
      candidate.document?.description,
      ...((candidate.document?.tags || []).map(String)),
      ...(metadata.tags || []).map(String),
      metadata.owner,
      metadata.author,
      metadata.language,
      metadata.type,
    ]
      .filter(Boolean)
      .join(' ')
  );

  return terms.some((term) => haystack.includes(normalizeText(term)));
}

export class ContextRanker {
  rank(candidates, topK = 5, options = {}) {
    const maxKeywordScore = Math.max(...candidates.map((candidate) => candidate.keywordScore || 0), 1);
    const maxPriority = Math.max(...candidates.map((candidate) => candidate.document?.priority || 1), 1);

    return candidates
      .map((candidate) => {
        const keywordScore = normalizeScore(candidate.keywordScore || 0, maxKeywordScore);
        const semanticScore = clamp01(candidate.semanticScore || 0);
        const tagRelevance = normalizeScore(candidate.matchSignals?.tagMatches || 0, 3);
        const freshnessScore = normalizeScore(recencyBoost(candidate.document?.updatedDate), 4);
        const priorityScore = normalizeScore(candidate.document?.priority || 1, maxPriority);
        const languageMatch = options.language
          ? normalizeText(options.language) === normalizeText(candidate.chunk?.metadata?.language || candidate.document?.language)
          : 0;
        const typeMatch = options.fileType
          ? normalizeText(options.fileType) === normalizeText(candidate.chunk?.metadata?.type || candidate.document?.fileType)
          : 0;
        const workflowStateMatch = normalizeText(candidate.chunk?.metadata?.status || candidate.document?.status) === 'active' ? 1 : 0;
        const agentAffinity = options.agentCode ? (candidateMatchesAgent(candidate, options.agentCode) ? 1 : 0) : 0;
        const metadataScore = clamp01(
          tagRelevance * 0.35 +
            languageMatch * 0.2 +
            typeMatch * 0.2 +
            workflowStateMatch * 0.15 +
            agentAffinity * 0.1
        );
        const finalScore =
          semanticScore * 0.4 +
          keywordScore * 0.25 +
          metadataScore * 0.15 +
          priorityScore * 0.1 +
          freshnessScore * 0.05 +
          tagRelevance * 0.05;
        const confidence = clamp01(finalScore * 0.75 + semanticScore * 0.25);

        return {
          ...candidate,
          keywordScore,
          semanticScore,
          freshnessScore,
          priorityScore,
          metadataScore,
          finalScore,
          confidence,
          rankingScore: finalScore,
        };
      })
      .sort((left, right) => right.finalScore - left.finalScore)
      .slice(0, topK);
  }
}
