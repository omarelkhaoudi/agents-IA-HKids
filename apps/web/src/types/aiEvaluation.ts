export type EvaluationVerdict = 'pass' | 'warn' | 'fail';
export type EvaluationGranularity = 'daily' | 'weekly' | 'monthly';
export type EvaluationSource = 'automatic' | 'suite' | 'manual';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';
export type SuggestionCategory = 'prompt' | 'knowledge' | 'workflow' | 'agent';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface EvaluationSummary {
  totalRuns: number;
  averageScore: number;
  averageGroundedness: number;
  averageHallucinationRisk: number;
  averageKnowledgeCoverage: number;
  averageFeedback: number;
  averageLatencyMs: number;
  averageTokens: number;
  averageCost: number;
  totalCost: number;
  totalTokens: number;
  passed: number;
  warned: number;
  failed: number;
  approved: number;
  rejected: number;
  passRate: number;
  approvalRate: number;
}

export interface CriterionScore {
  criterion: string;
  samples: number;
  averageScore: number;
  failures: number;
}

export interface CriterionDefinition {
  key: string;
  label: string;
  weight: number;
}

export interface EvaluationThresholds {
  pass: number;
  warn: number;
  criterion: number;
  minCharacters: number;
  maxCharacters: number;
}

export interface DimensionQuality {
  key: string;
  runs: number;
  averageScore: number;
  averageGroundedness: number;
  averageHallucinationRisk: number;
  averageKnowledgeCoverage: number;
  averageFeedback: number;
  averageLatencyMs: number;
  averageTokens: number;
  totalTokens: number;
  averageCost: number;
  totalCost: number;
  failed: number;
  approvalRate: number;
}

export interface TrendBucket {
  bucket: string;
  runs: number;
  averageScore: number;
  averageGroundedness: number;
  averageLatencyMs: number;
  averageTokens: number;
  totalCost: number;
  averageFeedback: number;
  approvalRate: number;
  failureRate: number;
}

export interface EvaluationTrend {
  granularity: EvaluationGranularity;
  days: number;
  series: TrendBucket[];
}

export interface KnowledgeDocumentQuality {
  documentId: string;
  title: string;
  category: string;
  collectionId: string | null;
  collectionName: string;
  citations: number;
  averageScore: number;
  averageGroundedness: number;
  documentQuality: number;
}

export interface KnowledgeCollectionQuality {
  id: string;
  name: string;
  status: string;
  documents: number;
  retrievals: number;
  averageQuality: number;
  citedDocuments: number;
  citations: number;
  averageScore: number;
  healthPercent: number;
}

export interface KnowledgeGap {
  code: string;
  title: string;
  detail: string;
}

export interface KnowledgeDocumentRef {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
}

export interface KnowledgeEvaluation {
  windowDays: number;
  totalDocuments: number;
  retrievedDocuments: number;
  totalRetrievals: number;
  averageQuality: number;
  averageCompleteness: number;
  documentsInReview: number;
  coveragePercent: number;
  vectorCoveragePercent?: number;
  retrievalPrecision?: number;
  citationAccuracy?: number;
  groundedness?: number;
  hallucinationReduction?: number;
  knowledgeEffectiveness?: number;
  semanticRelevance?: number;
  missingKnowledge?: number;
  retrievalSuccessRate: number;
  retrievalFailures: number;
  vectorHealth?: {
    chunks: number;
    embeddings: number;
    averageChunkTokens: number;
    coveragePercent: number;
    missingEmbeddings: number;
    failedIndexing: number;
    retrievalSamples: number;
    retrievalPrecision: number;
    retrievalSuccessRate: number;
    retrievalFailures: number;
    averageRetrievalLatencyMs: number;
    semanticRelevance: number;
    cacheHitRatio: number;
  };
  freshness: {
    staleDays: number;
    staleDocuments: number;
    items: KnowledgeDocumentRef[];
  };
  mostUseful: KnowledgeDocumentQuality[];
  unusedDocuments: KnowledgeDocumentRef[];
  knowledgeGaps: KnowledgeGap[];
  documents: KnowledgeDocumentQuality[];
  collections: KnowledgeCollectionQuality[];
}

export interface WorkflowEvaluation {
  windowDays: number;
  totalInstances: number;
  totalWorkflows: number;
  completionRate: number;
  failureRate: number;
  approvalRate: number;
  averageDurationSeconds: number;
  rejectedDrafts: number;
  revisions: number;
  exportSuccess: number;
  archived: number;
  totalDocuments: number;
  approvedDocuments: number;
  documentApprovalRate: number;
  states: { state: string; total: number }[];
}

export interface ScorecardComponents {
  quality: number;
  reliability: number;
  groundedness: number;
  humanApproval: number;
  feedback: number;
  speed: number;
  costEfficiency: number;
}

export interface AgentScorecard {
  agentCode: string;
  agentName: string;
  status: string;
  provider: string;
  model: string;
  runs: number;
  averageScore: number;
  averageGroundedness: number;
  averageHallucinationRisk: number;
  averageKnowledgeCoverage: number;
  averageFeedback: number;
  averageLatencyMs: number;
  averageTokens: number;
  totalTokens: number;
  averageCost: number;
  totalCost: number;
  approvalRate: number;
  failureRate: number;
  overallScore: number;
  components: ScorecardComponents;
  strengths: string[];
  recommendations: string[];
  previousScore: number;
  trend: number;
}

export interface AgentBenchmark {
  windowDays: number;
  agents: AgentScorecard[];
  platformScore: number;
}

export interface PromptMetric {
  id: string;
  name: string;
  status: string;
  version: number;
  agentCode: string;
  category: string;
  usageCount: number;
  successRate: number;
  approvalRate: number;
  averageFeedback: number;
  catalogQuality: number;
  completeness: number;
  averageLatencyMs: number;
  evaluatedRuns: number;
  averageQuality: number;
  averageGroundedness: number;
  averageKnowledgeCoverage: number;
  averageTokens: number;
  averageCost: number;
  evaluatedApprovalRate: number;
}

export interface PromptMetricList {
  windowDays: number;
  items: PromptMetric[];
}

export interface PromptVersionQuality {
  version: number;
  runs: number;
  averageScore: number;
  averageGroundedness: number;
  averageKnowledgeCoverage: number;
  averageFeedback: number;
  averageLatencyMs: number;
  averageTokens: number;
  averageCost: number;
  successRate: number;
  approvalRate: number;
}

export interface ComparisonMetric {
  key: string;
  label: string;
  higherIsBetter: boolean;
  left: number;
  right: number;
  delta: number;
  winner: 'left' | 'right' | 'tie';
}

export interface PromptComparison {
  promptId: string;
  promptName: string;
  left: PromptVersionQuality;
  right: PromptVersionQuality;
  metrics: ComparisonMetric[];
  winner: 'left' | 'right' | 'tie' | 'insufficient_data';
  leftPoints: number;
  rightPoints: number;
  evaluatedVersions: { version: number; runs: number }[];
}

export interface PromptRegression {
  promptId: string;
  promptName: string;
  agentCode: string;
  previousVersion: number;
  currentVersion: number;
  previousScore: number;
  currentScore: number;
  drop: number;
  samples: number;
}

export interface RegressionReport {
  thresholdPercent: number;
  minimumSample: number;
  items: PromptRegression[];
}

export interface EvaluationSuite {
  id: string;
  code: string;
  name: string;
  description: string;
  agent_code: string;
  status: string;
  acceptance_threshold: string | number;
  owner: string;
  caseCount: number;
  lastRun: SuiteRun | null;
}

export interface SuiteRun {
  id: string;
  suite_id: string;
  status: 'passed' | 'failed';
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  average_score: string | number;
  acceptance_threshold: string | number;
  duration_ms: number;
  actor: string;
  created_at: string;
}

export interface SuiteCase {
  id: string;
  suite_id: string;
  name: string;
  input_text: string;
  expected_output: string;
  weight: string | number;
  position: number;
}

export interface SuiteCaseResult {
  id: string;
  suite_run_id: string;
  case_id: string;
  run_id: string | null;
  passed: boolean;
  score: string | number;
  output_text: string;
  failure_reason: string;
}

export interface SuiteDetail {
  suite: EvaluationSuite;
  cases: SuiteCase[];
  history: (SuiteRun & { results: SuiteCaseResult[] })[];
}

export interface SuiteRunResult {
  suiteRunId: string;
  suiteId: string;
  suiteName: string;
  status: 'passed' | 'failed';
  totalCases: number;
  passedCases: number;
  failedCases: number;
  averageScore: number;
  acceptanceThreshold: number;
  durationMs: number;
  results: {
    caseId: string;
    caseName: string;
    runId: string;
    passed: boolean;
    score: number;
    outputText: string;
    failureReason: string;
  }[];
}

export interface EvaluationRun {
  id: string;
  subject_type: string;
  subject_id: string | null;
  agent_code: string;
  conversation_id: string | null;
  prompt_id: string | null;
  prompt_version: number;
  provider: string;
  model: string;
  source: EvaluationSource;
  reviewer: string;
  latency_ms: number;
  total_tokens: number;
  estimated_cost: string | number;
  overall_score: string | number;
  groundedness_score: string | number;
  hallucination_risk: string | number;
  knowledge_coverage: string | number;
  approval_state: string;
  verdict: EvaluationVerdict;
  created_at: string;
}

export interface EvaluationRunScore {
  id: string;
  run_id: string;
  criterion: string;
  score: string | number;
  weight: string | number;
  passed: boolean;
  rationale: string;
}

export interface EvaluationRunDetail {
  run: EvaluationRun;
  scores: EvaluationRunScore[];
}

export interface EvaluationHistory {
  items: EvaluationRun[];
  total: number;
  limit: number;
  offset: number;
}

export interface EvaluationAlert {
  id: string;
  alert_key: string;
  rule_code: string;
  category: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  observed_value: string | number;
  threshold_value: string | number;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged_by: string | null;
  resolved_by: string | null;
}

export interface EvaluationAlertList {
  items: EvaluationAlert[];
  counts: { open: number; acknowledged: number; resolved: number; critical: number };
  thresholds: Record<string, number>;
}

export interface EvaluationSuggestion {
  id: string;
  category: SuggestionCategory;
  target_type: string;
  target_id: string | null;
  title: string;
  suggestion: string;
  rationale: string;
  impact: 'low' | 'medium' | 'high';
  status: SuggestionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface SuggestionList {
  items: EvaluationSuggestion[];
  counts: { pending: number; approved: number; rejected: number };
}

export interface FeedbackSignals {
  windowDays: number;
  totalFeedback: number;
  acceptedOutputs: number;
  rejectedOutputs: number;
  averageRating: number;
  revisionReasons: { type: string; occurrences: number }[];
  approvalComments: {
    agentCode: string;
    feedbackType: string;
    comment: string;
    createdAt: string;
  }[];
  patterns: { type: string; text: string; occurrences: number; status: string }[];
  weakCriteria: CriterionScore[];
}

export interface EvaluationAnalytics {
  generatedAt: string;
  windowDays: number;
  granularity: EvaluationGranularity;
  qualityEvolution: { bucket: string; value: number }[];
  costEvolution: { bucket: string; value: number }[];
  latencyEvolution: { bucket: string; value: number }[];
  approvalEvolution: { bucket: string; value: number }[];
  feedbackEvolution: { bucket: string; value: number }[];
  agentEvolution: DimensionQuality[];
  promptEvolution: DimensionQuality[];
  knowledgeEvolution: KnowledgeCollectionQuality[];
  workflowEvolution: { state: string; total: number }[];
  criteria: CriterionScore[];
}

export interface EvaluationOverview {
  generatedAt: string;
  windowDays: number;
  summary: EvaluationSummary;
  criteria: CriterionScore[];
  agents: DimensionQuality[];
  models: DimensionQuality[];
  providers: DimensionQuality[];
  prompts: DimensionQuality[];
  promptEffectiveness: number;
  knowledgeCollections: KnowledgeCollectionQuality[];
  knowledgeDocuments: KnowledgeDocumentQuality[];
  trend: TrendBucket[];
  suggestions: { pending: number; approved: number; rejected: number };
  benchmark: AgentScorecard[];
  workflow: WorkflowEvaluation;
  recentSuiteRuns: SuiteRun[];
  criteriaCatalog: CriterionDefinition[];
  thresholds: EvaluationThresholds;
}
