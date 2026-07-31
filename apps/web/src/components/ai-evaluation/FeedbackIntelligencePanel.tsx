import type { FeedbackSignals, SuggestionList } from '../../types/aiEvaluation';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import {
  formatCriterion,
  formatScore,
  impactTone,
  scoreTone,
} from '../../utils/evaluationFormat';
import { formatNumber, formatRelativeTime } from '../../utils/observabilityFormat';

interface FeedbackIntelligencePanelProps {
  signals: FeedbackSignals;
  suggestions: SuggestionList;
  onGenerate: () => void;
  onReview: (id: string, status: 'approved' | 'rejected') => void;
  canReview: boolean;
  busy?: boolean;
}

export default function FeedbackIntelligencePanel({
  signals,
  suggestions,
  onGenerate,
  onReview,
  canReview,
  busy = false,
}: FeedbackIntelligencePanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Human feedback"
          value={formatNumber(signals.totalFeedback)}
          hint={`Average rating ${signals.averageRating}/5`}
          accent="purple"
        />
        <MetricCard
          label="Accepted outputs"
          value={formatNumber(signals.acceptedOutputs)}
          hint="Reviewed without correction"
          accent="emerald"
        />
        <MetricCard
          label="Rejected outputs"
          value={formatNumber(signals.rejectedOutputs)}
          hint="Rejected or rewritten by a human"
          accent={signals.rejectedOutputs > signals.acceptedOutputs ? 'orange' : 'cyan'}
        />
        <MetricCard
          label="Pending suggestions"
          value={String(suggestions.counts.pending)}
          hint="Awaiting administrator approval"
          accent={suggestions.counts.pending > 0 ? 'orange' : 'emerald'}
        />
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Improvement suggestions</h2>
            <p className="mt-1 text-sm text-slate-400">
              Generated from human corrections and failing criteria. Nothing is applied
              automatically: every suggestion requires administrator approval.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={onGenerate} disabled={busy}>
            {busy ? 'Generating…' : 'Generate suggestions'}
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {suggestions.items.map((suggestion) => (
            <div
              key={suggestion.id}
              className="rounded-xl border border-white/8 bg-white/4 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-white">{suggestion.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{suggestion.category}</Badge>
                  <Badge tone={impactTone(suggestion.impact)}>{suggestion.impact} impact</Badge>
                  <Badge tone={suggestion.status === 'approved' ? 'success' : 'neutral'}>
                    {suggestion.status}
                  </Badge>
                </div>
              </div>

              <p className="mt-2 text-sm text-slate-300">{suggestion.suggestion}</p>
              <p className="mt-1 text-xs text-slate-500">{suggestion.rationale}</p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Raised {formatRelativeTime(suggestion.created_at)}
                  {suggestion.reviewed_by ? ` · reviewed by ${suggestion.reviewed_by}` : ''}
                </p>

                {canReview && suggestion.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onReview(suggestion.id, 'approved')}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => onReview(suggestion.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {suggestions.items.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">
            No suggestion has been generated yet for this period.
          </p>
        ) : null}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Weakest criteria</h2>
          <p className="mt-1 text-sm text-slate-400">
            Criteria scoring below the improvement threshold.
          </p>

          <div className="mt-5 space-y-2.5">
            {signals.weakCriteria.map((criterion) => (
              <div
                key={criterion.criterion}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-2.5"
              >
                <div>
                  <p className="text-sm text-white">{formatCriterion(criterion.criterion)}</p>
                  <p className="text-xs text-slate-500">
                    {criterion.samples} samples · {criterion.failures} failures
                  </p>
                </div>
                <Badge tone={scoreTone(criterion.averageScore)}>
                  {formatScore(criterion.averageScore)}
                </Badge>
              </div>
            ))}
          </div>

          {signals.weakCriteria.length === 0 ? (
            <p className="mt-6 text-sm text-emerald-300">
              Every criterion is scoring above the improvement threshold.
            </p>
          ) : null}
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Revision reasons</h2>
          <p className="mt-1 text-sm text-slate-400">
            Correction categories captured by the Feedback Engine.
          </p>

          <div className="mt-5 space-y-2.5">
            {signals.revisionReasons.map((reason) => (
              <div
                key={reason.type}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-2.5"
              >
                <span className="text-sm text-white">{reason.type}</span>
                <span className="text-sm text-slate-300">{formatNumber(reason.occurrences)}</span>
              </div>
            ))}
          </div>

          {signals.revisionReasons.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">No human correction recorded yet.</p>
          ) : null}

          {signals.approvalComments.length > 0 ? (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Reviewer comments
              </p>
              <ul className="mt-2 space-y-2">
                {signals.approvalComments.slice(0, 5).map((comment) => (
                  <li
                    key={`${comment.agentCode}-${comment.createdAt}`}
                    className="rounded-xl border border-white/8 bg-white/4 px-4 py-2.5"
                  >
                    <p className="text-sm text-slate-300">{comment.comment}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {comment.agentCode} · {comment.feedbackType} ·{' '}
                      {formatRelativeTime(comment.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
