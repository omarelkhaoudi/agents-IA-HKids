import { useEffect, useState } from 'react';
import {
  approveFeedbackPattern,
  approvePromptImprovement,
  getFeedbackDashboard,
} from '../api/assistant';
import type { FeedbackDashboardData } from '../types/feedback';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';

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
    return <Panel className="p-10 text-center text-sm text-slate-400">Loading feedback dashboard...</Panel>;
  }

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
          Feedback Dashboard
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
          Human-in-the-loop learning overview
        </h1>
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Average Rating" value={String(dashboard?.ratings.average || 0)} />
        <MetricCard
          label="Accepted Documents"
          value={String(dashboard?.acceptedDocuments || 0)}
        />
        <MetricCard
          label="Rejected Documents"
          value={String(dashboard?.rejectedDocuments || 0)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Common Corrections</h2>
          <div className="mt-4 space-y-3">
            {dashboard?.commonCorrections.map((pattern) => (
              <div key={pattern.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">{pattern.pattern_text}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                  {pattern.pattern_type} | Occurrences {pattern.occurrences} | {pattern.status}
                </p>
                {pattern.status !== 'approved' ? (
                  <div className="mt-4">
                    <Button onClick={() => void approvePattern(pattern.id)}>Approve Rule</Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Improvement Suggestions</h2>
          <div className="mt-4 space-y-3">
            {dashboard?.improvementSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">{suggestion.suggestion_text}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{suggestion.rationale}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                  {suggestion.status}
                </p>
                {suggestion.status !== 'approved' ? (
                  <div className="mt-4">
                    <Button variant="secondary" onClick={() => void approveImprovement(suggestion.id)}>
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

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Panel className="p-5">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
    </Panel>
  );
}
