import type { PromptDefinition } from '../../types/prompts';
import Panel from '../ui/Panel';

interface PromptComparePanelProps {
  prompts: PromptDefinition[];
  leftPromptId: string;
  rightPromptId: string;
  onLeftChange: (promptId: string) => void;
  onRightChange: (promptId: string) => void;
}

export default function PromptComparePanel({
  prompts,
  leftPromptId,
  rightPromptId,
  onLeftChange,
  onRightChange,
}: PromptComparePanelProps) {
  const leftPrompt = prompts.find((prompt) => prompt.id === leftPromptId) || null;
  const rightPrompt = prompts.find((prompt) => prompt.id === rightPromptId) || null;

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
          Version Comparison
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Compare prompt versions</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Selector
          label="Version A"
          value={leftPromptId}
          prompts={prompts}
          onChange={onLeftChange}
        />
        <Selector
          label="Version B"
          value={rightPromptId}
          prompts={prompts}
          onChange={onRightChange}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <ComparisonCard prompt={leftPrompt} />
        <ComparisonCard prompt={rightPrompt} />
      </div>
    </Panel>
  );
}

interface SelectorProps {
  label: string;
  value: string;
  prompts: PromptDefinition[];
  onChange: (promptId: string) => void;
}

function Selector({ label, value, prompts, onChange }: SelectorProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
      >
        {prompts.map((prompt) => (
          <option key={prompt.id} value={prompt.id}>
            {prompt.name} v{prompt.version}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ComparisonCardProps {
  prompt: PromptDefinition | null;
}

function ComparisonCard({ prompt }: ComparisonCardProps) {
  if (!prompt) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-5">
      <h3 className="text-lg font-semibold text-white">
        {prompt.name} <span className="text-slate-500">v{prompt.version}</span>
      </h3>
      <div className="mt-4 space-y-4 text-sm text-slate-300">
        <Section label="Role" value={prompt.role} />
        <Section label="Objective" value={prompt.objective} />
        <Section label="System Prompt" value={prompt.systemPrompt} />
        <Section label="Instructions" value={prompt.instructions.join('\n')} />
        <Section label="Constraints" value={prompt.constraints.join('\n')} />
        <Section label="Validation Checklist" value={prompt.validationChecklist.join('\n')} />
        <Section label="Output Style" value={prompt.outputStyle} />
      </div>
    </div>
  );
}

interface SectionProps {
  label: string;
  value: string;
}

function Section({ label, value }: SectionProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <pre className="mt-2 whitespace-pre-wrap font-sans leading-7 text-slate-300">{value}</pre>
    </div>
  );
}
