import { useEffect, useState } from 'react';
import { getAdminStatistics } from '../../api/admin';
import type { AdminDashboardData } from '../../types/admin';
import Panel from '../../components/ui/Panel';

export default function AdminStatisticsPage() {
  const [statistics, setStatistics] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setStatistics(await getAdminStatistics());
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading || !statistics) {
    return <Panel className="p-10 text-center text-sm text-slate-400">Loading statistics...</Panel>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Coût IA total" value={`$${statistics.totalAiCost.toFixed(4)}`} />
        <MetricCard label="Tokens consommés" value={String(statistics.totalTokens)} />
        <MetricCard
          label="Temps moyen"
          value={`${Math.round(statistics.averageResponseMs)} ms`}
        />
        <MetricCard label="Requêtes IA" value={String(statistics.totalRequests)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Coût par fournisseur</h2>
          <div className="mt-4 space-y-3">
            {statistics.costByProvider.map((item) => (
              <div key={item.provider} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">{item.provider}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                  ${Number(item.estimated_cost || 0).toFixed(4)} | {item.total_tokens} tokens |{' '}
                  {item.requests} req
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Coût par agent</h2>
          <div className="mt-4 space-y-3">
            {statistics.costByAgent.map((item) => (
              <div key={item.agent_code} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">{item.agent_name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                  {item.agent_code} | ${Number(item.estimated_cost || 0).toFixed(4)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Répartition des modèles utilisés</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {statistics.modelDistribution.map((item) => (
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
        </div>
      </Panel>
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
