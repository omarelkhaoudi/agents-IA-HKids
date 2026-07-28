import { defaultContext, supportedModels } from '../data/assistant-config.js';
import { createDatabasePool } from '../config/database.js';
import { env } from '../config/env.js';
import { listDocumentSources } from '../data/mock-document-sources.js';
import { listDocuments } from '../data/mock-documents.js';
import { listPrompts } from '../data/mock-prompts.js';
import { ProviderFactory } from '../providers/ProviderFactory.js';
import { ConversationService } from '../services/ConversationService.js';
import { AIGateway } from '../services/ai-gateway/AIGateway.js';
import { CostEstimator } from '../services/ai-gateway/CostEstimator.js';
import { ModelManager } from '../services/ai-gateway/ModelManager.js';
import { ProviderManager } from '../services/ai-gateway/ProviderManager.js';
import { RetryManager } from '../services/ai-gateway/RetryManager.js';
import { StreamingManager } from '../services/ai-gateway/StreamingManager.js';
import { TimeoutManager } from '../services/ai-gateway/TimeoutManager.js';
import { TokenCounter } from '../services/ai-gateway/TokenCounter.js';
import { UsageLogger } from '../services/ai-gateway/UsageLogger.js';
import { CorrectionAnalyzer } from '../services/feedback/CorrectionAnalyzer.js';
import { FeedbackRepository } from '../services/feedback/FeedbackRepository.js';
import { FeedbackService } from '../services/feedback/FeedbackService.js';
import { KnowledgeContextBuilder } from '../services/KnowledgeContextBuilder.js';
import { PatternExtractor } from '../services/feedback/PatternExtractor.js';
import { PromptAssembler } from '../services/PromptAssembler.js';
import { PromptOptimizer } from '../services/feedback/PromptOptimizer.js';
import { PersistenceService } from '../services/persistence/PersistenceService.js';
import { SuggestionEngine } from '../services/feedback/SuggestionEngine.js';
import { ContextRanker } from '../services/retrieval/ContextRanker.js';
import { DocumentChunker } from '../services/retrieval/DocumentChunker.js';
import { DocumentIndexer } from '../services/retrieval/DocumentIndexer.js';
import { EmbeddingIndex } from '../services/retrieval/EmbeddingIndex.js';
import { EmbeddingService } from '../services/retrieval/EmbeddingService.js';
import { HybridRetriever } from '../services/retrieval/HybridRetriever.js';
import { KeywordRetriever } from '../services/retrieval/KeywordRetriever.js';
import { RetrievalService } from '../services/retrieval/RetrievalService.js';
import { SemanticRetriever } from '../services/retrieval/SemanticRetriever.js';

const databasePool = createDatabasePool({
  connectionString: env.databaseUrl,
  sslEnabled: env.dbSsl,
});
export const persistenceService = new PersistenceService(databasePool, {
  listDocuments,
  listPrompts,
});
export const feedbackService = new FeedbackService({
  feedbackRepository: new FeedbackRepository(persistenceService.pool),
  correctionAnalyzer: new CorrectionAnalyzer(),
  patternExtractor: new PatternExtractor(),
  promptOptimizer: new PromptOptimizer(),
  suggestionEngine: new SuggestionEngine(),
});
const knowledgeContextBuilder = new KnowledgeContextBuilder();
const promptAssembler = new PromptAssembler({ knowledgeContextBuilder });
const providerFactory = new ProviderFactory();
const providerManager = new ProviderManager(providerFactory);
const modelManager = new ModelManager(env);
export const aiGateway = new AIGateway({
  providerManager,
  modelManager,
  tokenCounter: new TokenCounter(),
  costEstimator: new CostEstimator(),
  retryManager: new RetryManager({ maxRetries: env.maxRetries }),
  timeoutManager: new TimeoutManager({ timeoutMs: env.requestTimeoutMs }),
  usageLogger: new UsageLogger({
    pool: persistenceService.pool,
    enabled: env.enableUsageTracking,
  }),
  streamingManager: new StreamingManager({ enabled: env.enableStreaming }),
});
const documentChunker = new DocumentChunker();
const documentIndexer = new DocumentIndexer({ documentChunker });
const embeddingService = new EmbeddingService();
const embeddingIndex = new EmbeddingIndex();
const keywordRetriever = new KeywordRetriever();
const semanticRetriever = new SemanticRetriever({ embeddingService });
const hybridRetriever = new HybridRetriever({
  keywordRetriever,
  semanticRetriever,
});
const contextRanker = new ContextRanker();

export const retrievalService = new RetrievalService({
  documentIndexer,
  embeddingIndex,
  embeddingService,
  hybridRetriever,
  contextRanker,
  documents: listDocuments,
  rawSources: listDocumentSources,
});

export const conversationService = new ConversationService({
  aiGateway,
  promptAssembler,
  retrievalService,
  feedbackService,
  sessionRepository: persistenceService.sessionRepository,
  messageRepository: persistenceService.messageRepository,
  promptRepository: persistenceService.promptRepository,
  knowledgeRepository: persistenceService.knowledgeRepository,
});

export function getAssistantBootstrap() {
  return {
    prompts: listPrompts(),
    documents: listDocuments(),
    models: supportedModels,
    defaultModel: env.defaultModel,
    defaultProvider: env.defaultProvider,
    defaultContext,
  };
}
