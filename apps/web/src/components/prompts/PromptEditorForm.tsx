import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import type { PromptDefinition, PromptPayload, PromptStatus } from '../../types/prompts';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

interface PromptEditorFormProps {
  prompt: PromptDefinition | null;
  onSave: (payload: PromptPayload) => Promise<void>;
}

interface FormState {
  promptGroupId: string;
  version: number;
  status: PromptStatus;
  name: string;
  description: string;
  role: string;
  objective: string;
  systemPrompt: string;
  instructions: string;
  constraints: string;
  validationChecklist: string;
  outputStyle: string;
}

export default function PromptEditorForm({ prompt, onSave }: PromptEditorFormProps) {
  const [formState, setFormState] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prompt) {
      setFormState(null);
      return;
    }

    setFormState({
      promptGroupId: prompt.promptGroupId,
      version: prompt.version,
      status: prompt.status,
      name: prompt.name,
      description: prompt.description,
      role: prompt.role,
      objective: prompt.objective,
      systemPrompt: prompt.systemPrompt,
      instructions: prompt.instructions.join('\n'),
      constraints: prompt.constraints.join('\n'),
      validationChecklist: prompt.validationChecklist.join('\n'),
      outputStyle: prompt.outputStyle,
    });
  }, [prompt]);

  if (!formState || !prompt) {
    return (
      <Panel className="p-8 text-center text-sm text-slate-400">
        Select a prompt version to edit orchestration fields and preview the final assembled prompt.
      </Panel>
    );
  }

  const handleChange = (
    field: keyof FormState,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormState((currentState) =>
      currentState
        ? {
            ...currentState,
            [field]: event.target.value,
          }
        : currentState
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      await onSave({
        promptGroupId: formState.promptGroupId,
        version: formState.version,
        status: formState.status,
        name: formState.name,
        description: formState.description,
        role: formState.role,
        objective: formState.objective,
        systemPrompt: formState.systemPrompt,
        instructions: splitLines(formState.instructions),
        constraints: splitLines(formState.constraints),
        validationChecklist: splitLines(formState.validationChecklist),
        outputStyle: formState.outputStyle,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
          Prompt Builder
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          {prompt.name} <span className="text-slate-500">v{prompt.version}</span>
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <input
            value={formState.name}
            onChange={(event) => handleChange('name', event)}
            className={inputClassName}
          />
        </Field>
        <Field label="Status">
          <select
            value={formState.status}
            onChange={(event) => handleChange('status', event)}
            className={inputClassName}
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </Field>

        <Field label="Description" className="md:col-span-2">
          <textarea
            value={formState.description}
            onChange={(event) => handleChange('description', event)}
            rows={3}
            className={inputClassName}
          />
        </Field>

        <Field label="Role">
          <input
            value={formState.role}
            onChange={(event) => handleChange('role', event)}
            className={inputClassName}
          />
        </Field>
        <Field label="Objective">
          <input
            value={formState.objective}
            onChange={(event) => handleChange('objective', event)}
            className={inputClassName}
          />
        </Field>

        <Field label="System Prompt" className="md:col-span-2">
          <textarea
            value={formState.systemPrompt}
            onChange={(event) => handleChange('systemPrompt', event)}
            rows={6}
            className={inputClassName}
          />
        </Field>

        <Field label="Instructions" className="md:col-span-2">
          <textarea
            value={formState.instructions}
            onChange={(event) => handleChange('instructions', event)}
            rows={6}
            className={inputClassName}
          />
        </Field>

        <Field label="Constraints" className="md:col-span-2">
          <textarea
            value={formState.constraints}
            onChange={(event) => handleChange('constraints', event)}
            rows={5}
            className={inputClassName}
          />
        </Field>

        <Field label="Validation Checklist" className="md:col-span-2">
          <textarea
            value={formState.validationChecklist}
            onChange={(event) => handleChange('validationChecklist', event)}
            rows={5}
            className={inputClassName}
          />
        </Field>

        <Field label="Output Style" className="md:col-span-2">
          <textarea
            value={formState.outputStyle}
            onChange={(event) => handleChange('outputStyle', event)}
            rows={4}
            className={inputClassName}
          />
        </Field>

        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Prompt'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

function Field({ label, children, className = '' }: FieldProps) {
  return (
    <label className={['block', className].join(' ')}>
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400';
