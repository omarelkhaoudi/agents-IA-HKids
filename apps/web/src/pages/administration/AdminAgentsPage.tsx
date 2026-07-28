import { useEffect, useMemo, useState } from 'react';
import {
  createAdminAgent,
  deleteAdminAgent,
  getAdminAgents,
  updateAdminAgent,
} from '../../api/admin';
import type { AdminAgent, AdminResources } from '../../types/admin';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';

const emptyForm: Partial<AdminAgent> = {
  code: '',
  name: '',
  description: '',
  status: 'active',
  defaultProvider: 'anthropic',
  defaultModel: 'claude-3-5-sonnet-latest',
  temperature: 0.3,
  maxTokens: 1500,
  timeout: 30000,
  retryCount: 2,
  promptIds: [],
  documentIds: [],
  workflowCodes: [],
};

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [resources, setResources] = useState<AdminResources | null>(null);
  const [form, setForm] = useState<Partial<AdminAgent>>(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await getAdminAgents();
    setAgents(data.items);
    setResources(data.resources);
  };

  useEffect(() => {
    void load();
  }, []);

  const availableModels = useMemo(
    () =>
      (resources?.models || []).filter(
        (model) => !form.defaultProvider || model.provider === form.defaultProvider
      ),
    [form.defaultProvider, resources]
  );

  const selectAgent = (agent: AdminAgent) => {
    setSelectedId(agent.id);
    setForm(agent);
    setError('');
  };

  const resetForm = () => {
    setSelectedId(null);
    setForm(emptyForm);
    setError('');
  };

  const toggleListValue = (key: 'promptIds' | 'documentIds' | 'workflowCodes', value: string) => {
    setForm((current) => {
      const list = current[key] || [];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  };

  const save = async () => {
    setBusy(true);
    setError('');

    try {
      if (selectedId) {
        await updateAdminAgent(selectedId, form);
      } else {
        await createAdminAgent(form);
      }
      await load();
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save agent.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await deleteAdminAgent(id);
      await load();
      if (selectedId === id) {
        resetForm();
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (agent: AdminAgent) => {
    await updateAdminAgent(agent.id, {
      ...agent,
      status: agent.status === 'active' ? 'inactive' : 'active',
    });
    await load();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Panel className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Agents</h2>
          <Button variant="secondary" onClick={resetForm}>
            Nouveau
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {agents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => selectAgent(agent)}
              className={[
                'w-full rounded-2xl border p-4 text-left transition',
                selectedId === agent.id
                  ? 'border-cyan-400/35 bg-cyan-400/10'
                  : 'border-white/10 bg-slate-950/60 hover:bg-white/5',
              ].join(' ')}
            >
              <p className="text-sm font-semibold text-white">{agent.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                {agent.code} | {agent.status}
              </p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">
          {selectedId ? 'Modifier un agent' : 'Créer un agent'}
        </h2>
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Code"
            value={form.code || ''}
            onChange={(value) => setForm((current) => ({ ...current, code: value }))}
          />
          <Field
            label="Nom"
            value={form.name || ''}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          />
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Description
            </span>
            <textarea
              value={form.description || ''}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Status
            </span>
            <select
              value={form.status || 'active'}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Provider
            </span>
            <select
              value={form.defaultProvider || 'anthropic'}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultProvider: event.target.value }))
              }
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              {(resources?.providers || []).map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Model
            </span>
            <select
              value={form.defaultModel || ''}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultModel: event.target.value }))
              }
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
          </label>

          <NumberField
            label="Température"
            value={form.temperature ?? 0.3}
            onChange={(value) => setForm((current) => ({ ...current, temperature: value }))}
          />
          <NumberField
            label="Max tokens"
            value={form.maxTokens ?? 1500}
            onChange={(value) => setForm((current) => ({ ...current, maxTokens: value }))}
          />
          <NumberField
            label="Timeout (ms)"
            value={form.timeout ?? 30000}
            onChange={(value) => setForm((current) => ({ ...current, timeout: value }))}
          />
          <NumberField
            label="Retry"
            value={form.retryCount ?? 2}
            onChange={(value) => setForm((current) => ({ ...current, retryCount: value }))}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Checklist
            title="Prompts associés"
            items={(resources?.prompts || []).map((item) => ({
              id: item.id,
              label: item.name,
            }))}
            selected={form.promptIds || []}
            onToggle={(id) => toggleListValue('promptIds', id)}
          />
          <Checklist
            title="Documents associés"
            items={(resources?.documents || []).map((item) => ({
              id: item.id,
              label: item.title,
            }))}
            selected={form.documentIds || []}
            onToggle={(id) => toggleListValue('documentIds', id)}
          />
          <Checklist
            title="Workflows associés"
            items={(resources?.workflowCodes || []).map((item) => ({
              id: item.code,
              label: item.label,
            }))}
            selected={form.workflowCodes || []}
            onToggle={(id) => toggleListValue('workflowCodes', id)}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => void save()} disabled={busy}>
            {selectedId ? 'Enregistrer' : 'Créer'}
          </Button>
          {selectedId ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  const agent = agents.find((item) => item.id === selectedId);
                  if (agent) void toggleStatus(agent);
                }}
                disabled={busy}
              >
                {form.status === 'active' ? 'Désactiver' : 'Activer'}
              </Button>
              <Button variant="ghost" onClick={() => void remove(selectedId)} disabled={busy}>
                Supprimer
              </Button>
            </>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
      />
    </label>
  );
}

function Checklist({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: Array<{ id: string; label: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => onToggle(item.id)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
