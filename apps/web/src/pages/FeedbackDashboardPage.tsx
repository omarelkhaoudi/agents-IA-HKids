import { useEffect, useState } from 'react';
import {
  approveFeedbackPattern,
  approvePromptImprovement,
  getFeedbackDashboard,
} from '../api/assistant';
import type { FeedbackDashboardData } from '../types/feedback';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import MetricCard from '../components/ui/MetricCard';
import Skeleton from '../components/ui/Skeleton';

export default function FeedbackDashboardPage() {
  const [dashboard, setDashboard] = useState<FeedbackDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await getFeedbackDashboard();
      setDashboard(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const approvePattern = async (patternId: string) => {
    await approveFeedbackPattern(patternId);
    await loadDashboard();
  };

  const approveImprovement = async (improvementId: string) => {
    await approvePromptImprovement(improvementId);
    await loadDashboard();
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Feedback
        </p>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Human-in-the-loop learning
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">
          Review corrections, approve recurring patterns, and promote prompt improvements.
        </p>
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Average Rating"
          value={String(dashboard?.ratings.average || 0)}
          accent="cyan"
        />
        <MetricCard
          label="Accepted Documents"
          value={String(dashboard?.acceptedDocuments || 0)}
          accent="emerald"
        />
        <MetricCard
          label="Rejected Documents"
          value={String(dashboard?.rejectedDocuments || 0)}
          accent="orange"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="font-display text-lg font-semibold text-white">Common Corrections</h2>
          <div className="mt-4 space-y-3">
            {dashboard?.commonCorrections.map((pattern) => (
              <div
                key={pattern.id}
                className="hover-lift rounded-2xl border border-white/10 bg-white/4 p-4"
              >
                <p className="text-sm font-semibold text-white">{pattern.pattern_text}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {pattern.pattern_type} · Occurrences {pattern.occurrences} · {pattern.status}
                </p>
                {pattern.status !== 'approved' ? (
                  <div className="mt-4">
                    <Button size="sm" onClick={() => void approvePattern(pattern.id)}>
                      Approve Rule
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="font-display text-lg font-semibold text-white">
            Improvement Suggestions
          </h2>
          <div className="mt-4 space-y-3">
            {dashboard?.improvementSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="hover-lift rounded-2xl border border-white/10 bg-white/4 p-4"
              >
                <p className="text-sm font-semibold text-white">{suggestion.suggestion_text}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{suggestion.rationale}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {suggestion.status}
                </p>
                {suggestion.status !== 'approved' ? (
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void approveImprovement(suggestion.id)}
                    >
                      Approve Suggestion
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
