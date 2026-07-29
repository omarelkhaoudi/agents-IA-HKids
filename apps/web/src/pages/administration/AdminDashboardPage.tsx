import { useEffect, useState } from 'react';
import { getAdminDashboard } from '../../api/admin';
import type { AdminDashboardData } from '../../types/admin';
import Panel from '../../components/ui/Panel';
import MetricCard from '../../components/ui/MetricCard';
import Skeleton from '../../components/ui/Skeleton';

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
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Agents" value={String(dashboard.totalAgents)} accent="blue" />
        <MetricCard
          label="Conversations"
          value={String(dashboard.totalConversations)}
          accent="cyan"
        />
        <MetricCard
          label="Documents générés"
          value={String(dashboard.totalGeneratedDocuments)}
          accent="orange"
        />
        <MetricCard
          label="Documents approuvés"
          value={String(dashboard.totalApprovedDocuments)}
          accent="emerald"
        />
        <MetricCard
          label="Workflows actifs"
          value={String(dashboard.activeWorkflows)}
          accent="purple"
        />
        <MetricCard
          label="Knowledge Base"
          value={String(dashboard.knowledgeBaseDocuments)}
          accent="blue"
        />
        <MetricCard label="Prompts" value={String(dashboard.totalPrompts)} accent="cyan" />
        <MetricCard label="Feedbacks" value={String(dashboard.totalFeedbacks)} accent="purple" />
        <MetricCard
          label="Coût IA total"
          value={`$${dashboard.totalAiCost.toFixed(4)}`}
          accent="orange"
        />
        <MetricCard label="Tokens" value={String(dashboard.totalTokens)} accent="emerald" />
        <MetricCard
          label="Temps moyen"
          value={`${Math.round(dashboard.averageResponseMs)} ms`}
          accent="cyan"
        />
        <MetricCard label="Requêtes IA" value={String(dashboard.totalRequests)} accent="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="p-5">
          <h2 className="font-display text-lg font-semibold text-white">Coût par fournisseur</h2>
          <div className="mt-4 space-y-3">
            {dashboard.costByProvider.map((item) => (
              <div key={item.provider} className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <p className="text-sm font-semibold text-white">{item.provider}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                  ${Number(item.estimated_cost || 0).toFixed(4)} · {item.requests} req
                </p>
              </div>
            ))}
            {!dashboard.costByProvider.length ? (
              <p className="text-sm text-slate-400">Aucun coût enregistré.</p>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="font-display text-lg font-semibold text-white">Coût par agent</h2>
          <div className="mt-4 space-y-3">
            {dashboard.costByAgent.map((item) => (
              <div
                key={item.agent_code}
                className="rounded-2xl border border-white/10 bg-white/4 p-4"
              >
                <p className="text-sm font-semibold text-white">{item.agent_name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                  ${Number(item.estimated_cost || 0).toFixed(4)} · {item.total_tokens} tokens
                </p>
              </div>
            ))}
            {!dashboard.costByAgent.length ? (
              <p className="text-sm text-slate-400">Aucun agent configuré.</p>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="font-display text-lg font-semibold text-white">Répartition des modèles</h2>
          <div className="mt-4 space-y-3">
            {dashboard.modelDistribution.map((item) => (
              <div
                key={`${item.provider}-${item.model}`}
                className="rounded-2xl border border-white/10 bg-white/4 p-4"
              >
                <p className="text-sm font-semibold text-white">{item.model}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {item.provider} · {item.requests} req · {item.total_tokens} tokens
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
