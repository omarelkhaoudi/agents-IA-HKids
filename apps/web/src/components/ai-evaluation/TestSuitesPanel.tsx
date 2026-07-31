import type { EvaluationSuite, SuiteDetail } from '../../types/aiEvaluation';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import Skeleton from '../ui/Skeleton';
import { formatScore } from '../../utils/evaluationFormat';
import { formatDuration, formatRelativeTime } from '../../utils/observabilityFormat';

interface TestSuitesPanelProps {
  suites: EvaluationSuite[];
  detail: SuiteDetail | null;
  selectedSuiteId: string;
  onSelectSuite: (suiteId: string) => void;
  onRunSuite: (suiteId: string) => void;
  canRun: boolean;
  busy?: boolean;
}

export default function TestSuitesPanel({
  suites,
  detail,
  selectedSuiteId,
  onSelectSuite,
  onRunSuite,
  canRun,
  busy = false,
}: TestSuitesPanelProps) {
  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Evaluation suites</h2>
        <p className="mt-1 text-sm text-slate-400">
          Curated test suites scored by the same engine as production traffic.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {suites.map((suite) => (
            <button
              key={suite.id}
              type="button"
              onClick={() => onSelectSuite(suite.id)}
              className={[
                'rounded-xl border px-4 py-3 text-left transition',
                suite.id === selectedSuiteId
                  ? 'border-cyan-300/40 bg-cyan-400/8'
                  : 'border-white/8 bg-white/4 hover:bg-white/8',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-white">{suite.name}</p>
                {suite.lastRun ? (
                  <Badge tone={suite.lastRun.status === 'passed' ? 'success' : 'warning'}>
                    {suite.lastRun.status}
                  </Badge>
                ) : (
                  <Badge tone="neutral">never run</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {suite.caseCount} cases · {suite.agent_code} · threshold{' '}
                {formatScore(suite.acceptance_threshold)}
              </p>
              {suite.lastRun ? (
                <p className="mt-1 text-xs text-slate-500">
                  Last run {formatRelativeTime(suite.lastRun.created_at)} scoring{' '}
                  {formatScore(suite.lastRun.average_score)}
                </p>
              ) : null}
            </button>
          ))}
        </div>

        {suites.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">No evaluation suite has been created yet.</p>
        ) : null}
      </Panel>

      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {detail ? detail.suite.name : 'Suite detail'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {detail
                ? detail.suite.description
                : 'Select a suite to inspect its cases and run history.'}
            </p>
          </div>
          {detail && canRun ? (
            <Button size="sm" onClick={() => onRunSuite(detail.suite.id)} disabled={busy}>
              {busy ? 'Running…' : 'Run suite'}
            </Button>
          ) : null}
        </div>

        {busy ? (
          <div className="mt-6 space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : null}

        {!busy && detail ? (
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Cases
              </p>
              <div className="mt-2 space-y-2">
                {detail.cases.map((testCase) => (
                  <div
                    key={testCase.id}
                    className="rounded-xl border border-white/8 bg-white/4 px-4 py-3"
                  >
                    <p className="text-sm text-white">{testCase.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{testCase.input_text}</p>
                    {testCase.expected_output ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Expected: {testCase.expected_output}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                History
              </p>
              <ol className="mt-3 space-y-3 border-l border-white/10 pl-5">
                {detail.history.map((run) => (
                  <li key={run.id} className="relative">
                    <span className="absolute -left-[1.6rem] top-3 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                    <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-white">
                          {run.passed_cases}/{run.total_cases} cases passed
                        </p>
                        <Badge tone={run.status === 'passed' ? 'success' : 'warning'}>
                          {run.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatRelativeTime(run.created_at)} · score{' '}
                        {formatScore(run.average_score)} against threshold{' '}
                        {formatScore(run.acceptance_threshold)} · {formatDuration(run.duration_ms)}
                      </p>
                      {run.results
                        .filter((result) => !result.passed)
                        .map((result) => (
                          <p key={result.id} className="mt-1 text-xs text-rose-300">
                            {result.failure_reason || 'Case failed.'}
                          </p>
                        ))}
                    </div>
                  </li>
                ))}
              </ol>

              {detail.history.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">This suite has never been executed.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {!busy && !detail ? (
          <p className="mt-6 text-sm text-slate-400">No suite selected.</p>
        ) : null}
      </Panel>
    </div>
  );
}
