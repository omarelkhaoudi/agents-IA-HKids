import type { ChangeEvent } from 'react';
import type { KnowledgeBaseDocument } from '../../types/knowledge-base';
import type { PromptDefinition } from '../../types/prompts';
import type { AssistantContext, AssistantModelOption } from '../../types/assistant-runtime';
import Badge from '../ui/Badge';
import Panel from '../ui/Panel';

interface ContextPanelProps {
  prompts: PromptDefinition[];
  documents: KnowledgeBaseDocument[];
  models: AssistantModelOption[];
  selectedPromptId: string;
  selectedDocumentIds: string[];
  selectedModel: string;
  currentContext: AssistantContext;
  requestPreview: {
    provider: string;
    model: string;
    assembledPrompt: string;
  } | null;
  onPromptChange: (promptId: string) => void;
  onDocumentToggle: (documentId: string) => void;
  onModelChange: (modelId: string) => void;
  onContextChange: (context: AssistantContext) => void;
}

export default function ContextPanel({
  prompts,
  documents,
  models,
  selectedPromptId,
  selectedDocumentIds,
  selectedModel,
  currentContext,
  requestPreview,
  onPromptChange,
  onDocumentToggle,
  onModelChange,
  onContextChange,
}: ContextPanelProps) {
  const handleContextFieldChange =
    (field: keyof AssistantContext) => (event: ChangeEvent<HTMLInputElement>) => {
      onContextChange({
        ...currentContext,
        [field]: event.target.value,
      });
    };

  return (
    <Panel className="flex h-full min-h-[860px] flex-col p-5">
      <div className="space-y-6">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              Current Context
            </h2>
            <Badge tone="info">Live</Badge>
          </div>
          <div className="mt-4 grid gap-3">
            <Field label="Department" value={currentContext.department} onChange={handleContextFieldChange('department')} />
            <Field label="Language" value={currentContext.language} onChange={handleContextFieldChange('language')} />
            <Field label="Company" value={currentContext.companyName} onChange={handleContextFieldChange('companyName')} />
            <Field
              label="Company Address"
              value={currentContext.companyAddress}
              onChange={handleContextFieldChange('companyAddress')}
            />
            <Field
              label="Primary Contact"
              value={currentContext.contactName}
              onChange={handleContextFieldChange('contactName')}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <h3 className="text-sm font-semibold text-white">Selected Prompt</h3>
          <select
            value={selectedPromptId}
            onChange={(event) => onPromptChange(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.name} v{prompt.version}
              </option>
            ))}
          </select>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Model Selection</h3>
          <select
            value={selectedModel}
            onChange={(event) => onModelChange(event.target.value)}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            Selected Knowledge Documents
          </h3>
          <div className="mt-4 space-y-3">
            {documents.map((document) => (
              <label
                key={document.id}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={selectedDocumentIds.includes(document.id)}
                  onChange={() => onDocumentToggle(document.id)}
                  className="mt-1"
                />
                <span>
                  <p className="text-sm font-medium text-white">{document.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {document.fileType} | {document.category}
                  </p>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-400/15 bg-emerald-400/6 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Request Envelope</h3>
            <Badge tone="success">Ready</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Provider: {requestPreview?.provider || 'anthropic'}
            <br />
            Model: {requestPreview?.model || selectedModel}
            <br />
            Prompt assembly includes selected prompt, constraints, context, selected knowledge documents, and conversation history.
          </p>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Assembled Prompt Preview</h3>
          <div className="custom-scrollbar mt-4 max-h-[260px] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-300">
              {requestPreview?.assembledPrompt || 'Send a message to inspect the assembled system prompt payload.'}
            </pre>
          </div>
        </section>
      </div>
    </Panel>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function Field({ label, value, onChange }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <input
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
      />
    </label>
  );
}
