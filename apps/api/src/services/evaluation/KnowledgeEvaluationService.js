const DAY_MS = 24 * 60 * 60 * 1000;

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDocumentIds(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Measures how useful the knowledge corpus actually is. Document and collection
 * counters come from the Knowledge Platform tables; usefulness and groundedness
 * come from the evaluation runs that cited each document.
 */
export class KnowledgeEvaluationService {
  constructor({ evaluationRepository, staleDays = 90 }) {
    this.evaluationRepository = evaluationRepository;
    this.staleDays = staleDays;
  }

  async getKnowledgeQuality({ days = 30 } = {}) {
    const windowDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const since = new Date(Date.now() - windowDays * DAY_MS);

    const [corpus, runs] = await Promise.all([
      this.evaluationRepository.getKnowledgeEvaluation({ staleDays: this.staleDays }),
      this.evaluationRepository.listRunWindow({ since }),
    ]);

    const perDocument = new Map();
    let runsWithKnowledge = 0;
    let retrievalFailures = 0;

    for (const run of runs) {
      const documentIds = parseDocumentIds(run.document_ids);

      if (documentIds.length) {
        runsWithKnowledge += 1;
      } else if (toNumber(run.knowledge_coverage) < 40) {
        retrievalFailures += 1;
      }

      for (const documentId of documentIds) {
        const entry = perDocument.get(documentId) || {
          documentId,
          citations: 0,
          scoreTotal: 0,
          groundednessTotal: 0,
        };

        entry.citations += 1;
        entry.scoreTotal += toNumber(run.overall_score);
        entry.groundednessTotal += toNumber(run.groundedness_score);
        perDocument.set(documentId, entry);
      }
    }

    const summaries = await this.evaluationRepository.listDocumentSummaries([...perDocument.keys()]);
    const summaryById = new Map(summaries.map((row) => [row.id, row]));
    const collectionsById = new Map(
      (await this.evaluationRepository.listCollectionSummaries()).map((row) => [row.id, row])
    );

    const documents = [...perDocument.values()]
      .map((entry) => {
        const summary = summaryById.get(entry.documentId);

        return {
          documentId: entry.documentId,
          title: summary?.title || 'Unknown document',
          category: summary?.category || '',
          collectionId: summary?.collection_id || null,
          collectionName: summary?.collection_id
            ? collectionsById.get(summary.collection_id)?.name || ''
            : '',
          citations: entry.citations,
          averageScore: round(entry.scoreTotal / entry.citations),
          averageGroundedness: round(entry.groundednessTotal / entry.citations),
          documentQuality: round(toNumber(summary?.quality_score)),
        };
      })
      .sort((left, right) => right.citations - left.citations);

    const collectionTotals = new Map();

    for (const document of documents) {
      if (!document.collectionId) {
        continue;
      }

      const entry = collectionTotals.get(document.collectionId) || {
        citations: 0,
        scoreTotal: 0,
        documents: 0,
      };

      entry.citations += document.citations;
      entry.scoreTotal += document.averageScore * document.citations;
      entry.documents += 1;
      collectionTotals.set(document.collectionId, entry);
    }

    const collections = corpus.collections.map((collection) => {
      const totals = collectionTotals.get(collection.id);

      return {
        ...collection,
        citedDocuments: totals?.documents || 0,
        citations: totals?.citations || 0,
        averageScore: totals?.citations ? round(totals.scoreTotal / totals.citations) : 0,
        healthPercent: collection.documents
          ? round(((totals?.documents || 0) / collection.documents) * 100)
          : 0,
      };
    });

    const retrievalSuccessRate = runs.length
      ? round((runsWithKnowledge / runs.length) * 100)
      : 0;

    return {
      windowDays,
      totalDocuments: corpus.totalDocuments,
      retrievedDocuments: corpus.retrievedDocuments,
      totalRetrievals: corpus.totalRetrievals,
      averageQuality: corpus.averageQuality,
      averageCompleteness: corpus.averageCompleteness,
      documentsInReview: corpus.documentsInReview,
      coveragePercent: corpus.coveragePercent,
      retrievalSuccessRate,
      retrievalFailures,
      freshness: {
        staleDays: this.staleDays,
        staleDocuments: corpus.stale.length,
        items: corpus.stale.map((row) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          updatedAt: row.updated_at,
        })),
      },
      mostUseful: documents.slice(0, 10),
      unusedDocuments: corpus.unused.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        updatedAt: row.updated_at,
      })),
      knowledgeGaps: this.buildKnowledgeGaps({ runs, corpus, retrievalSuccessRate }),
      documents,
      collections,
    };
  }

  buildKnowledgeGaps({ runs, corpus, retrievalSuccessRate }) {
    const gaps = [];

    if (runs.length && retrievalSuccessRate < 50) {
      gaps.push({
        code: 'low_retrieval_coverage',
        title: 'Most answers are produced without knowledge',
        detail: `Only ${retrievalSuccessRate}% of evaluated generations cited a knowledge document.`,
      });
    }

    if (corpus.unused.length > 0) {
      gaps.push({
        code: 'unused_documents',
        title: 'Documents are never retrieved',
        detail: `${corpus.unused.length} active documents have never been used by an agent.`,
      });
    }

    if (corpus.stale.length > 0) {
      gaps.push({
        code: 'stale_documents',
        title: 'Knowledge is ageing',
        detail: `${corpus.stale.length} documents have not been updated in the last ${this.staleDays} days.`,
      });
    }

    if (corpus.documentsInReview > 0) {
      gaps.push({
        code: 'review_backlog',
        title: 'Review backlog',
        detail: `${corpus.documentsInReview} documents are waiting for review.`,
      });
    }

    return gaps;
  }
}
