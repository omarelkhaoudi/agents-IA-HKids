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

export class ContextRanker {
  rank(candidates, topK = 5) {
    const maxKeywordScore = Math.max(...candidates.map((candidate) => candidate.keywordScore || 0), 1);
    const maxPriority = Math.max(...candidates.map((candidate) => candidate.document.priority || 1), 1);

    return candidates
      .map((candidate) => {
        const keywordScore = normalizeScore(candidate.keywordScore || 0, maxKeywordScore);
        const semanticScore = Math.max(0, candidate.semanticScore || 0);
        const tagRelevance = normalizeScore(candidate.matchSignals.tagMatches || 0, 3);
        const recencyScore = normalizeScore(recencyBoost(candidate.document.updatedDate), 4);
        const priorityScore = normalizeScore(candidate.document.priority || 1, maxPriority);
        const finalScore =
          semanticScore * 0.45 +
          keywordScore * 0.25 +
          priorityScore * 0.1 +
          recencyScore * 0.1 +
          tagRelevance * 0.1;

        return {
          ...candidate,
          keywordScore,
          semanticScore,
          recencyScore,
          priorityScore,
          finalScore,
          rankingScore: finalScore,
        };
      })
      .sort((left, right) => right.finalScore - left.finalScore)
      .slice(0, topK);
  }
}
