import { persistenceService } from './assistant-runtime.js';
import { CorrectionAnalyzer } from '../services/feedback/CorrectionAnalyzer.js';
import { FeedbackRepository } from '../services/feedback/FeedbackRepository.js';
import { FeedbackService } from '../services/feedback/FeedbackService.js';
import { PatternExtractor } from '../services/feedback/PatternExtractor.js';
import { PromptOptimizer } from '../services/feedback/PromptOptimizer.js';
import { SuggestionEngine } from '../services/feedback/SuggestionEngine.js';

const feedbackRepository = new FeedbackRepository(persistenceService.pool);

export const feedbackService = new FeedbackService({
  feedbackRepository,
  correctionAnalyzer: new CorrectionAnalyzer(),
  patternExtractor: new PatternExtractor(),
  promptOptimizer: new PromptOptimizer(),
  suggestionEngine: new SuggestionEngine(),
});
