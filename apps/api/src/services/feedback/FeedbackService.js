export class FeedbackService {
  constructor({
    feedbackRepository,
    correctionAnalyzer,
    patternExtractor,
    promptOptimizer,
    suggestionEngine,
  }) {
    this.feedbackRepository = feedbackRepository;
    this.correctionAnalyzer = correctionAnalyzer;
    this.patternExtractor = patternExtractor;
    this.promptOptimizer = promptOptimizer;
    this.suggestionEngine = suggestionEngine;
  }

  async recordFeedback(payload) {
    const feedback = await this.feedbackRepository.createFeedback({
      id: `feedback-${Date.now()}`,
      ...payload,
    });

    const correctionTypes = this.correctionAnalyzer.analyze({
      originalText: payload.originalText,
      correctedText: payload.correctedText,
      comment: payload.comment,
    });

    for (const correctionType of correctionTypes) {
      await this.feedbackRepository.createDocumentCorrection({
        id: `correction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        feedbackId: feedback.id,
        correctionType,
        originalFragment: payload.originalText.slice(0, 240),
        correctedFragment: (payload.correctedText || '').slice(0, 240),
      });
    }

    const extractedPatterns = this.patternExtractor.extract({
      correctedText: payload.correctedText,
      comment: payload.comment,
    });

    const storedPatterns = [];

    for (const pattern of extractedPatterns) {
      const storedPattern = await this.feedbackRepository.upsertPattern({
        id: `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        patternType: pattern.patternType,
        patternText: pattern.patternText,
        metadata: {
          feedbackType: payload.feedbackType,
        },
      });

      storedPatterns.push(storedPattern);
    }

    const suggestions = this.promptOptimizer.buildSuggestions(extractedPatterns);

    for (const suggestion of suggestions) {
      await this.feedbackRepository.createPromptImprovement({
        id: `improvement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...suggestion,
      });
    }

    return {
      feedback,
      correctionTypes,
      patterns: storedPatterns,
    };
  }

  async getApprovedGuidance() {
    const approvedPatterns = await this.feedbackRepository.listApprovedPatterns();

    if (approvedPatterns.length === 0) {
      return '';
    }

    return approvedPatterns.map((pattern) => `- ${pattern.pattern_text}`).join('\n');
  }

  async getDashboard() {
    const stats = await this.feedbackRepository.getDashboardStats();
    return this.suggestionEngine.buildDashboard(stats);
  }

  approvePattern(patternId) {
    return this.feedbackRepository.approvePattern(patternId);
  }

  approvePromptImprovement(improvementId) {
    return this.feedbackRepository.approvePromptImprovement(improvementId);
  }
}
