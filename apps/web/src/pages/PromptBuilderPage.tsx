import { useEffect, useMemo, useState } from 'react';
import { createPrompt, getPrompts, updatePrompt } from '../api/prompts';
import PromptComparePanel from '../components/prompts/PromptComparePanel';
import PromptEditorForm from '../components/prompts/PromptEditorForm';
import PromptLibrary from '../components/prompts/PromptLibrary';
import PromptPreviewPanel from '../components/prompts/PromptPreviewPanel';
import SidebarNav from '../components/sidebar/SidebarNav';
import Panel from '../components/ui/Panel';
import type { PromptDefinition, PromptPayload } from '../types/prompts';

export default function PromptBuilderPage() {
  const [prompts, setPrompts] = useState<PromptDefinition[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [compareLeftId, setCompareLeftId] = useState('');
  const [compareRightId, setCompareRightId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPrompts = async () => {
      setLoading(true);
      setError('');

      try {
        const items = await getPrompts();
        setPrompts(items);
        setSelectedPromptId(items[0]?.id || null);
        setCompareLeftId(items[0]?.id || '');
        setCompareRightId(items[1]?.id || items[0]?.id || '');
      } catch {
        setError('Unable to load mock prompts. Please make sure the API is running.');
      } finally {
        setLoading(false);
      }
    };

    void loadPrompts();
  }, []);

  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedPromptId) || null,
    [prompts, selectedPromptId]
  );

  const handleSave = async (payload: PromptPayload) => {
    if (!selectedPrompt) {
      return;
    }

    const updatedPrompt = await updatePrompt(selectedPrompt.id, payload);

    setPrompts((currentPrompts) =>
      currentPrompts.map((prompt) => (prompt.id === updatedPrompt.id ? updatedPrompt : prompt))
    );
    setSelectedPromptId(updatedPrompt.id);
  };

  const handleCreateVersion = async () => {
    if (!selectedPrompt) {
      return;
    }

    const nextVersion =
      Math.max(
        ...prompts
          .filter((prompt) => prompt.promptGroupId === selectedPrompt.promptGroupId)
          .map((prompt) => prompt.version)
      ) + 1;

    const createdPrompt = await createPrompt({
      promptGroupId: selectedPrompt.promptGroupId,
      version: nextVersion,
      status: 'draft',
      name: selectedPrompt.name,
      description: `${selectedPrompt.description} (new version)`,
      role: selectedPrompt.role,
      objective: selectedPrompt.objective,
      systemPrompt: selectedPrompt.systemPrompt,
      instructions: selectedPrompt.instructions,
      constraints: selectedPrompt.constraints,
      validationChecklist: selectedPrompt.validationChecklist,
      outputStyle: selectedPrompt.outputStyle,
    });

    setPrompts((currentPrompts) => [createdPrompt, ...currentPrompts]);
    setSelectedPromptId(createdPrompt.id);
    setCompareRightId(createdPrompt.id);
  };

  const handleDuplicate = async () => {
    if (!selectedPrompt) {
      return;
    }

    const createdPrompt = await createPrompt({
      promptGroupId: `group-${Date.now()}`,
      version: 1,
      status: 'draft',
      name: `${selectedPrompt.name} Copy`,
      description: `Duplicate of ${selectedPrompt.name} for experimentation.`,
      role: selectedPrompt.role,
      objective: selectedPrompt.objective,
      systemPrompt: selectedPrompt.systemPrompt,
      instructions: selectedPrompt.instructions,
      constraints: selectedPrompt.constraints,
      validationChecklist: selectedPrompt.validationChecklist,
      outputStyle: selectedPrompt.outputStyle,
    });

    setPrompts((currentPrompts) => [createdPrompt, ...currentPrompts]);
    setSelectedPromptId(createdPrompt.id);
  };

  const handleArchive = async () => {
    if (!selectedPrompt || selectedPrompt.status === 'archived') {
      return;
    }

    const archivedPrompt = await updatePrompt(selectedPrompt.id, {
      ...selectedPrompt,
      status: 'archived',
    });

    setPrompts((currentPrompts) =>
      currentPrompts.map((prompt) => (prompt.id === archivedPrompt.id ? archivedPrompt : prompt))
    );
    setSelectedPromptId(archivedPrompt.id);
  };

  const handleRestore = async () => {
    if (!selectedPrompt || selectedPrompt.status !== 'archived') {
      return;
    }

    const restoredPrompt = await updatePrompt(selectedPrompt.id, {
      ...selectedPrompt,
      status: 'active',
    });

    setPrompts((currentPrompts) =>
      currentPrompts.map((prompt) => (prompt.id === restoredPrompt.id ? restoredPrompt : prompt))
    );
    setSelectedPromptId(restoredPrompt.id);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_380px]">
        <SidebarNav />

        <div className="space-y-6">
          <Panel className="p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
              Prompt Builder
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Prompt orchestration for the Administrative Assistant
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
              Design, version, compare, archive, restore, and preview agent prompts through a
              production-ready interface that prepares future LLM integrations without calling any
              model today.
            </p>
          </Panel>

          {loading ? (
            <Panel className="p-10 text-center text-sm text-slate-400">
              Loading mock prompt definitions...
            </Panel>
          ) : error ? (
            <Panel className="p-10 text-center text-sm text-rose-300">{error}</Panel>
          ) : (
            <>
              <PromptEditorForm prompt={selectedPrompt} onSave={handleSave} />
              <PromptComparePanel
                prompts={prompts}
                leftPromptId={compareLeftId}
                rightPromptId={compareRightId}
                onLeftChange={setCompareLeftId}
                onRightChange={setCompareRightId}
              />
            </>
          )}
        </div>

        <div className="space-y-6">
          <PromptLibrary
            prompts={prompts}
            selectedPromptId={selectedPromptId}
            onSelect={(prompt) => setSelectedPromptId(prompt.id)}
            onCreateVersion={() => {
              void handleCreateVersion();
            }}
            onDuplicate={() => {
              void handleDuplicate();
            }}
            onArchive={() => {
              void handleArchive();
            }}
            onRestore={() => {
              void handleRestore();
            }}
          />
          <PromptPreviewPanel prompt={selectedPrompt} />
        </div>
      </section>
    </div>
  );
}
