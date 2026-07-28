import { useEffect, useState } from 'react';
import { getAdminDashboard } from '../../api/admin';
import type { AdminDashboardData } from '../../types/admin';
import Panel from '../../components/ui/Panel';

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setDashboard(await getAdminDashboard());
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading || !dashboard) {
    return <Panel className="p-10 text-center text-sm text-slate-400">Loading admin dashboard...</Panel>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Agents" value={String(dashboard.totalAgents)} />
        <MetricCard label="Conversations" value={String(dashboard.totalConversations)} />
        <MetricCard label="Documents générés" value={String(dashboard.totalGeneratedDocuments)} />
        <MetricCard label="Documents approuvés" value={String(dashboard.totalApprovedDocuments)} />
        <MetricCard label="Workflows actifs" value={String(dashboard.activeWorkflows)} />
        <MetricCard label="Knowledge Base" value={String(dashboard.knowledgeBaseDocuments)} />
        <MetricCard label="Prompts" value={String(dashboard.totalPrompts)} />
        <MetricCard label="Feedbacks" value={String(dashboard.totalFeedbacks)} />
        <MetricCard label="Coût IA total" value={`$${dashboard.totalAiCost.toFixed(4)}`} />
        <MetricCard label="Tokens" value={String(dashboard.totalTokens)} />
        <MetricCard
          label="Temps moyen"
          value={`${Math.round(dashboard.averageResponseMs)} ms`}
        />
        <MetricCard label="Requêtes IA" value={String(dashboard.totalRequests)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Coût par fournisseur</h2>
          <div className="mt-4 space-y-3">
            {dashboard.costByProvider.map((item) => (
              <div key={item.provider} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">{item.provider}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                  ${Number(item.estimated_cost || 0).toFixed(4)} | {item.requests} req
                </p>
              </div>
            ))}
            {!dashboard.costByProvider.length ? (
              <p className="text-sm text-slate-400">Aucun coût enregistré.</p>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Coût par agent</h2>
          <div className="mt-4 space-y-3">
            {dashboard.costByAgent.map((item) => (
              <div key={item.agent_code} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">{item.agent_name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                  ${Number(item.estimated_cost || 0).toFixed(4)} | {item.total_tokens} tokens
                </p>
              </div>
            ))}
            {!dashboard.costByAgent.length ? (
              <p className="text-sm text-slate-400">Aucun agent configuré.</p>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Répartition des modèles</h2>
          <div className="mt-4 space-y-3">
            {dashboard.modelDistribution.map((item) => (
              <div
                key={`${item.provider}-${item.model}`}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <p className="text-sm font-semibold text-white">{item.model}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                  {item.provider} | {item.requests} req | {item.total_tokens} tokens
                </p>
              </div>
            ))}
            {!dashboard.modelDistribution.length ? (
              <p className="text-sm text-slate-400">Aucun usage modèle.</p>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </Panel>
  );
}
