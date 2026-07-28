import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { CorrectionAnalyzer } from '../src/services/feedback/CorrectionAnalyzer.js';
import { FeedbackRepository } from '../src/services/feedback/FeedbackRepository.js';
import { FeedbackService } from '../src/services/feedback/FeedbackService.js';
import { PatternExtractor } from '../src/services/feedback/PatternExtractor.js';
import { PromptOptimizer } from '../src/services/feedback/PromptOptimizer.js';
import { SuggestionEngine } from '../src/services/feedback/SuggestionEngine.js';

async function createFeedbackRepository() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);
  await pool.query(
    `
      INSERT INTO conversations (id, title, provider, model, language, current_context, metadata)
      VALUES ('session-001', 'Feedback Session', 'anthropic', 'claude-3-5-sonnet-latest', 'English', '{}'::jsonb, '{}'::jsonb)
    `
  );
  return new FeedbackRepository(pool);
}

test('CorrectionAnalyzer detects correction categories', () => {
  const analyzer = new CorrectionAnalyzer();
  const result = analyzer.analyze({
    originalText: 'Short text',
    correctedText: 'Short text with extra payment term and VAT details added for compliance.',
    comment: 'Please use a more formal tone and include VAT.',
  });

  assert.ok(result.includes('tone changes'));
  assert.ok(result.includes('pricing corrections'));
});

test('PatternExtractor detects recurring policy patterns', () => {
  const extractor = new PatternExtractor();
  const result = extractor.extract({
    correctedText: 'Please include VAT and company registration.',
    comment: 'Always use formal tone and payment terms.',
  });

  assert.ok(result.some((pattern) => pattern.patternText.includes('formal tone')));
  assert.ok(result.some((pattern) => pattern.patternText.includes('payment terms')));
});

test('FeedbackService stores feedback and dashboard suggestions', async () => {
  const repository = await createFeedbackRepository();
  const service = new FeedbackService({
    feedbackRepository: repository,
    correctionAnalyzer: new CorrectionAnalyzer(),
    patternExtractor: new PatternExtractor(),
    promptOptimizer: new PromptOptimizer(),
    suggestionEngine: new SuggestionEngine(),
  });

  await service.recordFeedback({
    conversationId: 'session-001',
    messageId: 'message-001',
    documentId: 'generated-001',
    originalText: 'Original quotation text',
    correctedText: 'Corrected quotation text with VAT and formal tone.',
    feedbackType: 'Major Edit',
    rating: 2,
    comment: 'Use formal tone and include VAT.',
  });

  const dashboard = await service.getDashboard();
  const guidance = await service.getApprovedGuidance();

  assert.equal(dashboard.ratings.totalResponses, 1);
  assert.ok(dashboard.commonCorrections.length >= 1);
  assert.ok(dashboard.improvementSuggestions.length >= 1);
  assert.equal(guidance, '');
});
