import { useEffect, useMemo, useState } from 'react';
import { getAiStatistics, getAiUsage } from '../api/assistant';
import type { AiStatistics, AiUsageRecord } from '../types/ai-gateway';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';

export default function AiAdministrationPage() {
  const [statistics, setStatistics] = useState<AiStatistics | null>(null);
  const [usage, setUsage] = useState<AiUsageRecord[]>([]);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stats, usageResponse] = await Promise.all([
        getAiStatistics(),
        getAiUsage({
          provider: provider || undefined,
          model: model || undefined,
          date: date || undefined,
        }),
      ]);
      setStatistics(stats);
      setUsage(usageResponse.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // Initial load only; filters apply via button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modelOptions = useMemo(() => {
    const models = new Set(usage.map((item) => item.model));
    (statistics?.byModel || []).forEach((item) => models.add(item.model));
    return Array.from(models);
  }, [statistics, usage]);

  if (loading && !statistics) {
    return <Panel className="p-10 text-center text-sm text-slate-400">Loading AI administration...</Panel>;
  }

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
          Administration IA
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
          AI Gateway & Model Management
        </h1>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Provider actuel" value={statistics?.current.provider || 'anthropic'} />
        <MetricCard label="Modèle actuel" value={statistics?.current.model || '-'} />
        <MetricCard label="Requêtes totales" value={String(statistics?.totalRequests || 0)} />
        <MetricCard label="Tokens consommés" value={String(statistics?.totalTokens || 0)} />
        <MetricCard
          label="Coût estimé"
          value={`$${(statistics?.estimatedCost || 0).toFixed(4)}`}
        />
        <MetricCard
          label="Temps moyen"
          value={`${Math.round(statistics?.averageDurationMs || 0)} ms`}
        />
      </div>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Filtres</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Provider
            </span>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="">Tous</option>
              <option value="anthropic">anthropic</option>
              <option value="openai">openai</option>
              <option value="gemini">gemini</option>
              <option value="ollama">ollama</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Model
            </span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="">Tous</option>
              {modelOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>

          <div className="flex items-end">
            <Button fullWidth onClick={() => void loadData()}>
              Appliquer
            </Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Répartition par modèle</h2>
          <div className="mt-4 space-y-3">
            {(statistics?.byModel || []).map((item) => (
              <div key={`${item.provider}-${item.model}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">{item.model}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                  {item.provider} | {item.requests} req | {item.total_tokens} tokens | $
                  {Number(item.estimated_cost || 0).toFixed(4)}
                </p>
              </div>
            ))}
            {!statistics?.byModel?.length ? (
              <p className="text-sm text-slate-400">Aucun usage enregistré pour le moment.</p>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Historique des appels IA</h2>
          <div className="mt-4 space-y-3">
            {usage.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">
                  {item.provider} / {item.model}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                  {item.status} | {item.total_tokens} tokens | {item.duration_ms} ms | $
                  {Number(item.estimated_cost || 0).toFixed(4)}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(item.created_at).toLocaleString()}
                </p>
                {item.error_message ? (
                  <p className="mt-2 text-sm text-rose-300">{item.error_message}</p>
                ) : null}
              </div>
            ))}
            {!usage.length ? (
              <p className="text-sm text-slate-400">Aucun appel IA trouvé pour ces filtres.</p>
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
