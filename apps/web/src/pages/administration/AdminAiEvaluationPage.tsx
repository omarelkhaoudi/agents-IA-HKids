import { useCallback, useEffect, useState } from 'react';
import {
  acknowledgeEvaluationAlert,
  downloadEvaluationExport,
  evaluateEvaluationAlerts,
  generateEvaluationSuggestions,
  getAgentBenchmark,
  getEvaluationAlerts,
  getEvaluationAnalytics,
  getEvaluationHistory,
  getEvaluationOverview,
  getEvaluationRun,
  getEvaluationSuggestions,
  getEvaluationSuite,
  getEvaluationSuites,
  getFeedbackIntelligence,
  getKnowledgeEvaluation,
  getPromptComparison,
  getPromptMetrics,
  getPromptRegressions,
  getWorkflowEvaluation,
  resolveEvaluationAlert,
  reviewEvaluationSuggestion,
  runEvaluationSuite,
} from '../../api/aiEvaluation';
import type {
  AgentBenchmark,
  EvaluationAlertList,
  EvaluationAnalytics,
  EvaluationGranularity,
  EvaluationHistory,
  EvaluationOverview,
  EvaluationRunDetail,
  EvaluationSuite,
  FeedbackSignals,
  KnowledgeEvaluation,
  PromptComparison,
  PromptMetricList,
  RegressionReport,
  SuggestionList,
  SuiteDetail,
  WorkflowEvaluation,
} from '../../types/aiEvaluation';
import { useAuth } from '../../context/AuthContext';
import AgentBenchmarkPanel from '../../components/ai-evaluation/AgentBenchmarkPanel';
import EvaluationAlertsPanel from '../../components/ai-evaluation/EvaluationAlertsPanel';
import EvaluationAnalyticsPanel from '../../components/ai-evaluation/EvaluationAnalyticsPanel';
import EvaluationHistoryPanel from '../../components/ai-evaluation/EvaluationHistoryPanel';
import FeedbackIntelligencePanel from '../../components/ai-evaluation/FeedbackIntelligencePanel';
import KnowledgeEvaluationPanel from '../../components/ai-evaluation/KnowledgeEvaluationPanel';
import PromptEvaluationPanel from '../../components/ai-evaluation/PromptEvaluationPanel';
import QualityOverviewPanel from '../../components/ai-evaluation/QualityOverviewPanel';
import TestSuitesPanel from '../../components/ai-evaluation/TestSuitesPanel';
import WorkflowEvaluationPanel from '../../components/ai-evaluation/WorkflowEvaluationPanel';
import Badge from '../../components/ui/Badge';
import Panel from '../../components/ui/Panel';
import Skeleton from '../../components/ui/Skeleton';
import { formatScore, scoreTone } from '../../utils/evaluationFormat';

const sections = [
  { id: 'overview', label: 'Quality Overview' },
  { id: 'agents', label: 'Agent Benchmark' },
  { id: 'prompts', label: 'Prompt Evaluation' },
  { id: 'knowledge', label: 'Knowledge Evaluation' },
  { id: 'workflows', label: 'Workflow Evaluation' },
  { id: 'suites', label: 'Test Suites' },
  { id: 'history', label: 'Evaluation History' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'feedback', label: 'Feedback Intelligence' },
  { id: 'analytics', label: 'Analytics' },
];

const WINDOWS = [7, 30, 90];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminAiEvaluationPage() {
  const { hasMinimumRole } = useAuth();
  const canManage = hasMinimumRole('administrator');

  const [section, setSection] = useState('overview');
  const [windowDays, setWindowDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [overview, setOverview] = useState<EvaluationOverview | null>(null);
  const [benchmark, setBenchmark] = useState<AgentBenchmark | null>(null);
  const [prompts, setPrompts] = useState<PromptMetricList | null>(null);
  const [regressions, setRegressions] = useState<RegressionReport | null>(null);
  const [comparison, setComparison] = useState<PromptComparison | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [knowledge, setKnowledge] = useState<KnowledgeEvaluation | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowEvaluation | null>(null);
  const [suites, setSuites] = useState<EvaluationSuite[]>([]);
  const [suiteDetail, setSuiteDetail] = useState<SuiteDetail | null>(null);
  const [selectedSuiteId, setSelectedSuiteId] = useState('');
  const [history, setHistory] = useState<EvaluationHistory | null>(null);
  const [runDetail, setRunDetail] = useState<EvaluationRunDetail | null>(null);
  const [verdict, setVerdict] = useState('');
  const [alerts, setAlerts] = useState<EvaluationAlertList | null>(null);
  const [signals, setSignals] = useState<FeedbackSignals | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionList | null>(null);
  const [analytics, setAnalytics] = useState<EvaluationAnalytics | null>(null);
  const [granularity, setGranularity] = useState<EvaluationGranularity>('weekly');

  useEffect(() => {
    let active = true;
    setLoading(true);

    getEvaluationOverview({ days: windowDays })
      .then((data) => {
        if (active) {
          setOverview(data);
          setError('');
        }
      })
      .catch((overviewError: unknown) => {
        if (active) {
          setError(errorMessage(overviewError, 'Unable to load the evaluation overview.'));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [windowDays]);

  useEffect(() => {
    if (section !== 'agents') {
      return;
    }

    void getAgentBenchmark({ days: windowDays })
      .then(setBenchmark)
      .catch((benchmarkError: unknown) => {
        setError(errorMessage(benchmarkError, 'Unable to load the agent benchmark.'));
      });
  }, [section, windowDays]);

  useEffect(() => {
    if (section !== 'prompts') {
      return;
    }

    void Promise.all([getPromptMetrics({ days: windowDays }), getPromptRegressions()])
      .then(([metrics, regressionReport]) => {
        setPrompts(metrics);
        setRegressions(regressionReport);

        if (!selectedPromptId && metrics.items.length > 0) {
          setSelectedPromptId(metrics.items[0].id);
        }
      })
      .catch((promptError: unknown) => {
        setError(errorMessage(promptError, 'Unable to load prompt evaluation.'));
      });
  }, [section, windowDays, selectedPromptId]);

  useEffect(() => {
    if (section !== 'prompts' || !selectedPromptId) {
      return;
    }

    void getPromptComparison(selectedPromptId)
      .then(setComparison)
      .catch((comparisonError: unknown) => {
        setComparison(null);
        setError(errorMessage(comparisonError, 'Unable to compare prompt versions.'));
      });
  }, [section, selectedPromptId]);

  useEffect(() => {
    if (section !== 'knowledge') {
      return;
    }

    void getKnowledgeEvaluation({ days: windowDays })
      .then(setKnowledge)
      .catch((knowledgeError: unknown) => {
        setError(errorMessage(knowledgeError, 'Unable to load knowledge evaluation.'));
      });
  }, [section, windowDays]);

  useEffect(() => {
    if (section !== 'workflows') {
      return;
    }

    void getWorkflowEvaluation({ days: windowDays })
      .then(setWorkflow)
      .catch((workflowError: unknown) => {
        setError(errorMessage(workflowError, 'Unable to load workflow evaluation.'));
      });
  }, [section, windowDays]);

  useEffect(() => {
    if (section !== 'suites') {
      return;
    }

    void getEvaluationSuites()
      .then((data) => {
        setSuites(data.items);

        if (!selectedSuiteId && data.items.length > 0) {
          setSelectedSuiteId(data.items[0].id);
        }
      })
      .catch((suiteError: unknown) => {
        setError(errorMessage(suiteError, 'Unable to load evaluation suites.'));
      });
  }, [section, selectedSuiteId]);

  useEffect(() => {
    if (section !== 'suites' || !selectedSuiteId) {
      return;
    }

    void getEvaluationSuite(selectedSuiteId)
      .then(setSuiteDetail)
      .catch((suiteError: unknown) => {
        setError(errorMessage(suiteError, 'Unable to load the evaluation suite.'));
      });
  }, [section, selectedSuiteId]);

  useEffect(() => {
    if (section !== 'history') {
      return;
    }

    void getEvaluationHistory({ verdict: verdict || undefined, days: windowDays, limit: 50 })
      .then(setHistory)
      .catch((historyError: unknown) => {
        setError(errorMessage(historyError, 'Unable to load evaluation history.'));
      });
  }, [section, verdict, windowDays]);

  useEffect(() => {
    if (section !== 'alerts') {
      return;
    }

    void getEvaluationAlerts({ limit: 50 })
      .then(setAlerts)
      .catch((alertError: unknown) => {
        setError(errorMessage(alertError, 'Unable to load evaluation alerts.'));
      });
  }, [section]);

  useEffect(() => {
    if (section !== 'feedback') {
      return;
    }

    void Promise.all([
      getFeedbackIntelligence({ days: windowDays }),
      getEvaluationSuggestions({ limit: 50 }),
    ])
      .then(([feedbackSignals, suggestionList]) => {
        setSignals(feedbackSignals);
        setSuggestions(suggestionList);
      })
      .catch((feedbackError: unknown) => {
        setError(errorMessage(feedbackError, 'Unable to load feedback intelligence.'));
      });
  }, [section, windowDays]);

  useEffect(() => {
    if (section !== 'analytics') {
      return;
    }

    void getEvaluationAnalytics({ granularity, days: Math.max(windowDays, 60) })
      .then(setAnalytics)
      .catch((analyticsError: unknown) => {
        setError(errorMessage(analyticsError, 'Unable to load evaluation analytics.'));
      });
  }, [section, granularity, windowDays]);

  const handleSelectRun = useCallback((runId: string) => {
    setBusy(true);

    void getEvaluationRun(runId)
      .then(setRunDetail)
      .catch((runError: unknown) => {
        setError(errorMessage(runError, 'Unable to load the evaluation run.'));
      })
      .finally(() => setBusy(false));
  }, []);

  const handleRunSuite = useCallback(async (suiteId: string) => {
    setBusy(true);
    setNotice('');

    try {
      const result = await runEvaluationSuite(suiteId);
      setNotice(
        `${result.suiteName} finished ${result.status}: ${result.passedCases}/${result.totalCases} cases passed with an average score of ${formatScore(result.averageScore)}.`
      );

      const [detail, list] = await Promise.all([
        getEvaluationSuite(suiteId),
        getEvaluationSuites(),
      ]);
      setSuiteDetail(detail);
      setSuites(list.items);
      setError('');
    } catch (suiteError: unknown) {
      setError(errorMessage(suiteError, 'Unable to run the evaluation suite.'));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleEvaluateAlerts = useCallback(async () => {
    setBusy(true);
    setNotice('');

    try {
      const result = await evaluateEvaluationAlerts();
      setNotice(
        `Evaluation rules processed: ${result.triggered} firing, ${result.autoResolved} auto-resolved.`
      );
      setAlerts(await getEvaluationAlerts({ limit: 50 }));
      setError('');
    } catch (alertError: unknown) {
      setError(errorMessage(alertError, 'Unable to evaluate the alert rules.'));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleAlertAction = useCallback(
    async (id: string, action: 'acknowledge' | 'resolve') => {
      setBusy(true);

      try {
        await (action === 'acknowledge'
          ? acknowledgeEvaluationAlert(id)
          : resolveEvaluationAlert(id));
        setAlerts(await getEvaluationAlerts({ limit: 50 }));
        setNotice(`Alert ${action === 'acknowledge' ? 'acknowledged' : 'resolved'}.`);
        setError('');
      } catch (alertError: unknown) {
        setError(errorMessage(alertError, 'Unable to update the alert.'));
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const handleGenerateSuggestions = useCallback(async () => {
    setBusy(true);
    setNotice('');

    try {
      const result = await generateEvaluationSuggestions();
      setNotice(`${result.generated} improvement suggestions are pending approval.`);
      setSuggestions(await getEvaluationSuggestions({ limit: 50 }));
      setError('');
    } catch (suggestionError: unknown) {
      setError(errorMessage(suggestionError, 'Unable to generate improvement suggestions.'));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleReviewSuggestion = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      setBusy(true);

      try {
        await reviewEvaluationSuggestion(id, status);
        setSuggestions(await getEvaluationSuggestions({ limit: 50 }));
        setNotice(`Suggestion ${status}.`);
        setError('');
      } catch (suggestionError: unknown) {
        setError(errorMessage(suggestionError, 'Unable to review the suggestion.'));
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const handleExport = useCallback(
    (dataset: 'runs' | 'agents' | 'prompts' | 'criteria' | 'trend') => {
      void downloadEvaluationExport(dataset, 'csv').catch((exportError: unknown) => {
        setError(errorMessage(exportError, 'Unable to export evaluation data.'));
      });
    },
    []
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-[1.25rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[1.25rem]" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-72 rounded-[1.25rem]" />
          <Skeleton className="h-72 rounded-[1.25rem]" />
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return <Panel className="p-10 text-center text-sm text-rose-300">{error}</Panel>;
  }

  if (!overview) {
    return (
      <Panel className="p-10 text-center text-sm text-slate-400">
        Evaluation data is unavailable.
      </Panel>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <Panel className="p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Evaluation
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Enterprise AI Evaluation
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Continuous quality measurement for every agent, prompt, knowledge document and
              workflow — scored automatically on top of the existing AI Gateway, Prompt Platform,
              Knowledge Platform, Workflow Engine and Feedback Engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={scoreTone(overview.summary.averageScore)}>
              {formatScore(overview.summary.averageScore)}/100 quality
            </Badge>
            <Badge tone={overview.summary.failed > 0 ? 'warning' : 'success'}>
              {overview.summary.failed} failed evaluations
            </Badge>
            <Badge tone={overview.suggestions.pending > 0 ? 'warning' : 'success'}>
              {overview.suggestions.pending} pending suggestions
            </Badge>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={[
                'rounded-full px-4 py-2 text-sm transition',
                section === item.id
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Window
          </span>
          {WINDOWS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setWindowDays(option)}
              className={[
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                windowDays === option
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
              ].join(' ')}
            >
              {option} days
            </button>
          ))}
        </div>
      </Panel>

      {notice ? (
        <Panel className="border-cyan-400/20 p-4 text-sm text-cyan-200">{notice}</Panel>
      ) : null}
      {error ? <Panel className="p-4 text-sm text-rose-300">{error}</Panel> : null}

      {section === 'overview' ? <QualityOverviewPanel overview={overview} /> : null}

      {section === 'agents' ? (
        benchmark ? (
          <AgentBenchmarkPanel benchmark={benchmark} />
        ) : (
          <Skeleton className="h-72 rounded-[1.25rem]" />
        )
      ) : null}

      {section === 'prompts' ? (
        prompts && regressions ? (
          <PromptEvaluationPanel
            prompts={prompts}
            regressions={regressions}
            comparison={comparison}
            selectedPromptId={selectedPromptId}
            onSelectPrompt={setSelectedPromptId}
            busy={busy}
          />
        ) : (
          <Skeleton className="h-72 rounded-[1.25rem]" />
        )
      ) : null}

      {section === 'knowledge' ? (
        knowledge ? (
          <KnowledgeEvaluationPanel knowledge={knowledge} />
        ) : (
          <Skeleton className="h-72 rounded-[1.25rem]" />
        )
      ) : null}

      {section === 'workflows' ? (
        workflow ? (
          <WorkflowEvaluationPanel workflow={workflow} />
        ) : (
          <Skeleton className="h-72 rounded-[1.25rem]" />
        )
      ) : null}

      {section === 'suites' ? (
        <TestSuitesPanel
          suites={suites}
          detail={suiteDetail}
          selectedSuiteId={selectedSuiteId}
          onSelectSuite={setSelectedSuiteId}
          onRunSuite={handleRunSuite}
          canRun
          busy={busy}
        />
      ) : null}

      {section === 'history' ? (
        history ? (
          <EvaluationHistoryPanel
            history={history}
            detail={runDetail}
            verdict={verdict}
            onVerdictChange={setVerdict}
            onSelectRun={handleSelectRun}
            busy={busy}
          />
        ) : (
          <Skeleton className="h-72 rounded-[1.25rem]" />
        )
      ) : null}

      {section === 'alerts' ? (
        alerts ? (
          <EvaluationAlertsPanel
            alerts={alerts}
            onEvaluate={handleEvaluateAlerts}
            onAcknowledge={(id) => void handleAlertAction(id, 'acknowledge')}
            onResolve={(id) => void handleAlertAction(id, 'resolve')}
            canManage={canManage}
            busy={busy}
          />
        ) : (
          <Skeleton className="h-72 rounded-[1.25rem]" />
        )
      ) : null}

      {section === 'feedback' ? (
        signals && suggestions ? (
          <FeedbackIntelligencePanel
            signals={signals}
            suggestions={suggestions}
            onGenerate={handleGenerateSuggestions}
            onReview={(id, status) => void handleReviewSuggestion(id, status)}
            canReview={canManage}
            busy={busy}
          />
        ) : (
          <Skeleton className="h-72 rounded-[1.25rem]" />
        )
      ) : null}

      {section === 'analytics' ? (
        analytics ? (
          <EvaluationAnalyticsPanel
            analytics={analytics}
            granularity={granularity}
            onGranularityChange={setGranularity}
            onExport={handleExport}
          />
        ) : (
          <Skeleton className="h-72 rounded-[1.25rem]" />
        )
      ) : null}
    </div>
  );
}
