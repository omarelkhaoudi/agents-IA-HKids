import { useMemo, useState } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import type { PromptDefinition } from '../../types/prompts';

interface PromptPlaygroundPanelProps {
  prompt: PromptDefinition | null;
  knownVariables: string[];
  busy: boolean;
  lastResult: any;
  onRun: (payload: {
    variables: Record<string, string>;
    userMessage: string;
    includeKnowledge: boolean;
    dryRun: boolean;
  }) => void;
}

export default function PromptPlaygroundPanel({
  prompt,
  knownVariables,
  busy,
  lastResult,
  onRun,
}: PromptPlaygroundPanelProps) {
  const [userMessage, setUserMessage] = useState('Test this prompt in playground mode.');
  const [includeKnowledge, setIncludeKnowledge] = useState(true);
  const [dryRun, setDryRun] = useState(true);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({
    company: 'H-Kids',
    customer: 'École partenaire',
    employee: 'Collaborateur',
    product: 'Service',
    price: 'N/A',
    language: 'fr',
    today: new Date().toLocaleDateString('fr-FR'),
    manager: 'Manager',
  });

  const autocomplete = useMemo(() => knownVariables, [knownVariables]);

  if (!prompt) {
    return (
      <Panel className="p-8 text-center text-sm text-slate-400">
        Select a prompt to open the testing playground.
      </Panel>
    );
  }

  return (
    <Panel className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Prompt playground</h2>
          <p className="mt-2 text-sm text-slate-400">
            Run isolated tests. No production prompt state is modified by playground output.
          </p>
        </div>
        <Badge tone="info">{prompt.name}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {autocomplete.map((name) => (
          <label key={name} className="block text-xs text-slate-400">
            {`{{${name}}}`}
            <input
              value={variableValues[name] || ''}
              onChange={(event) =>
                setVariableValues((current) => ({ ...current, [name]: event.target.value }))
              }
              list={`var-${name}`}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            />
            <datalist id={`var-${name}`}>
              <option value={variableValues[name] || ''} />
            </datalist>
          </label>
        ))}
      </div>

      <label className="block text-xs text-slate-400">
        User message
        <textarea
          value={userMessage}
          onChange={(event) => setUserMessage(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
        />
      </label>

      <div className="flex flex-wrap gap-4 text-sm text-slate-300">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeKnowledge}
            onChange={(event) => setIncludeKnowledge(event.target.checked)}
          />
          Inspect retrieved knowledge
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
          Dry-run (no model call)
        </label>
      </div>

      <Button
        disabled={busy}
        onClick={() =>
          onRun({
            variables: variableValues,
            userMessage,
            includeKnowledge,
            dryRun,
          })
        }
      >
        {busy ? 'Running...' : 'Run prompt test'}
      </Button>

      {lastResult ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
          <p>
            Latency {lastResult.latencyMs} ms · Tokens{' '}
            {lastResult.promptTokens + lastResult.completionTokens} · Model {lastResult.model || 'n/a'}
          </p>
          <p className="text-xs text-emerald-300">
            Production unchanged: {String(lastResult.productionUnchanged)}
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-400">
            {lastResult.assembledPrompt?.slice(0, 1200)}
          </pre>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-cyan-100">
            {lastResult.outputText}
          </pre>
          {lastResult.retrievedKnowledge ? (
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-500">
              {String(lastResult.retrievedKnowledge).slice(0, 800)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
