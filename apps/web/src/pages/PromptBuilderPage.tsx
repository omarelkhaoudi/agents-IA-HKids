import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPrompt, updatePrompt } from '../api/prompts';
import {
  addPromptLink,
  approvePromptChange,
  archivePromptPlatform,
  duplicatePromptPlatform,
  getPromptPlatformBootstrap,
  getPromptPlatformDetail,
  publishPromptChange,
  requestPromptCorrections,
  restorePromptPlatform,
  restorePromptVersion,
  runPromptPlayground,
  submitPromptReview,
} from '../api/promptPlatform';
import PromptAnalyticsPanel from '../components/prompts/PromptAnalyticsPanel';
import PromptComparePanel from '../components/prompts/PromptComparePanel';
import PromptDashboardMetrics from '../components/prompts/PromptDashboardMetrics';
import PromptEditorForm from '../components/prompts/PromptEditorForm';
import PromptLibrariesGrid from '../components/prompts/PromptLibrariesGrid';
import PromptLibrary from '../components/prompts/PromptLibrary';
import PromptPlaygroundPanel from '../components/prompts/PromptPlaygroundPanel';
import PromptPreviewPanel from '../components/prompts/PromptPreviewPanel';
import PromptReviewQueue from '../components/prompts/PromptReviewQueue';
import PromptVersionRelationships from '../components/prompts/PromptVersionRelationships';
import SidebarNav from '../components/sidebar/SidebarNav';
import Badge from '../components/ui/Badge';
import Panel from '../components/ui/Panel';
import Skeleton from '../components/ui/Skeleton';
import type {
  PromptAnalytics,
  PromptBootstrap,
  PromptDashboard,
  PromptDefinition,
  PromptLibrary as PromptLibraryType,
  PromptLink,
  PromptPayload,
  PromptVersion,
} from '../types/prompts';

const sections = [
  { id: 'home', label: 'Prompt Home' },
  { id: 'editor', label: 'Editor' },
  { id: 'libraries', label: 'Libraries' },
  { id: 'review', label: 'Approvals' },
  { id: 'versions', label: 'Versions & Links' },
  { id: 'playground', label: 'Playground' },
  { id: 'analytics', label: 'Analytics' },
];

export default function PromptBuilderPage() {
  const [section, setSection] = useState('home');
  const [bootstrap, setBootstrap] = useState<PromptBootstrap | null>(null);
  const [prompts, setPrompts] = useState<PromptDefinition[]>([]);
  const [libraries, setLibraries] = useState<PromptLibraryType[]>([]);
  const [dashboard, setDashboard] = useState<PromptDashboard | null>(null);
  const [analytics, setAnalytics] = useState<PromptAnalytics | null>(null);
  const [knownVariables, setKnownVariables] = useState<string[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [links, setLinks] = useState<PromptLink[]>([]);
  const [timeline, setTimeline] = useState<
    Array<{ type: string; at?: string; label: string; actor: string }>
  >([]);
  const [compareLeftId, setCompareLeftId] = useState('');
  const [compareRightId, setCompareRightId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [playgroundResult, setPlaygroundResult] = useState<any>(null);
  const [linkType, setLinkType] = useState<PromptLink['linkedType']>('document');
  const [linkId, setLinkId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPromptPlatformBootstrap();
      setBootstrap(data);
      setPrompts(data.prompts);
      setLibraries(data.libraries);
      setDashboard(data.dashboard);
      setAnalytics(data.analytics);
      setKnownVariables(data.knownVariables);
      setSelectedPromptId((current) => current || data.prompts[0]?.id || null);
      setCompareLeftId((current) => current || data.prompts[0]?.id || '');
      setCompareRightId((current) => current || data.prompts[1]?.id || data.prompts[0]?.id || '');
    } catch {
      setError('Unable to load the prompt platform. Please make sure the API is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadDetail = useCallback(async (promptId: string) => {
    try {
      const detail = await getPromptPlatformDetail(promptId);
      setVersions(detail.versions);
      setLinks(detail.links);
      setTimeline(detail.timeline);
      setPrompts((current) =>
        current.map((item) => (item.id === detail.prompt.id ? detail.prompt : item))
      );
    } catch {
      // Keep list selection if detail fails.
    }
  }, []);

  useEffect(() => {
    if (selectedPromptId) {
      void loadDetail(selectedPromptId);
    }
  }, [selectedPromptId, loadDetail]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        setSection('editor');
        document.querySelector<HTMLInputElement>('input[data-prompt-search="true"]')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedPromptId) || null,
    [prompts, selectedPromptId]
  );

  const filteredPrompts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return prompts.filter((prompt) => {
      const matchesSearch =
        !query ||
        prompt.name.toLowerCase().includes(query) ||
        prompt.description.toLowerCase().includes(query) ||
        (prompt.tags || []).some((tag) => tag.toLowerCase().includes(query));
      const matchesStatus = !statusFilter || prompt.status === statusFilter;
      const matchesLibrary = !libraryFilter || prompt.libraryId === libraryFilter;
      return matchesSearch && matchesStatus && matchesLibrary;
    });
  }, [prompts, search, statusFilter, libraryFilter]);

  const handleSave = async (payload: PromptPayload) => {
    if (!selectedPrompt) return;
    const updatedPrompt = await updatePrompt(selectedPrompt.id, payload);
    await reload();
    setSelectedPromptId(updatedPrompt.id);
  };

  const handleCreateVersion = async () => {
    if (!selectedPrompt) return;
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
      libraryId: selectedPrompt.libraryId,
      category: selectedPrompt.category,
      tags: selectedPrompt.tags,
      language: selectedPrompt.language,
      agentCode: selectedPrompt.agentCode,
    });

    await reload();
    setSelectedPromptId(createdPrompt.id);
    setCompareRightId(createdPrompt.id);
  };

  const handleDuplicate = async () => {
    if (!selectedPrompt) return;
    setBusy(true);
    try {
      const created = await duplicatePromptPlatform(selectedPrompt.id);
      await reload();
      setSelectedPromptId(created.id);
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedPrompt || selectedPrompt.status === 'archived') return;
    setBusy(true);
    try {
      await archivePromptPlatform(selectedPrompt.id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedPrompt || selectedPrompt.status !== 'archived') return;
    setBusy(true);
    try {
      await restorePromptPlatform(selectedPrompt.id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
        <aside className="space-y-4">
          <SidebarNav />
          <Panel className="p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Prompt Platform
            </p>
            <nav className="space-y-1" aria-label="Prompt sections">
              {sections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={[
                    'block w-full rounded-xl px-3 py-2 text-left text-sm transition',
                    section === item.id
                      ? 'bg-cyan-400/15 text-cyan-100'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </Panel>
        </aside>

        <div className="space-y-6">
          <Panel className="p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Enterprise Prompt Management
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Prompt engineering at platform scale
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-400">
              Libraries, lifecycle, versioning, playground testing, and approval workflows — without
              inventing business prompts. Existing Prompt Builder APIs and AI Gateway stay intact.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="info">Libraries</Badge>
              <Badge>Lifecycle</Badge>
              <Badge>Playground</Badge>
              <Badge tone="success">Feedback loop</Badge>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                / focus search
              </span>
            </div>
          </Panel>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-[1.25rem]" />
              ))}
            </div>
          ) : error ? (
            <Panel className="p-10 text-center text-sm text-rose-300">{error}</Panel>
          ) : (
            <>
              {section === 'home' && dashboard ? (
                <div className="space-y-6">
                  <PromptDashboardMetrics dashboard={dashboard} />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Panel className="p-5">
                      <h2 className="text-lg font-semibold text-white">Recently edited</h2>
                      <ul className="mt-4 space-y-3">
                        {dashboard.recentlyEdited.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              className="text-left text-sm text-cyan-200 hover:underline"
                              onClick={() => {
                                setSelectedPromptId(item.id);
                                setSection('editor');
                              }}
                            >
                              {item.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </Panel>
                    <Panel className="p-5">
                      <h2 className="text-lg font-semibold text-white">Most successful</h2>
                      <ul className="mt-4 space-y-3">
                        {dashboard.mostSuccessful.map((item) => (
                          <li key={item.id} className="flex justify-between gap-3 text-sm text-slate-300">
                            <span>{item.name}</span>
                            <Badge tone="success">{item.successRate || 0}%</Badge>
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  </div>
                </div>
              ) : null}

              {section === 'editor' ? (
                <div className="space-y-6">
                  <Panel className="grid gap-3 p-4 md:grid-cols-3">
                    <input
                      data-prompt-search="true"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search title, description, tags..."
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                    />
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                    >
                      <option value="">All statuses</option>
                      <option value="draft">Draft</option>
                      <option value="review">Review</option>
                      <option value="approved">Approved</option>
                      <option value="active">Published</option>
                      <option value="archived">Archived</option>
                      <option value="deprecated">Deprecated</option>
                    </select>
                    <select
                      value={libraryFilter}
                      onChange={(event) => setLibraryFilter(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                    >
                      <option value="">All libraries</option>
                      {libraries.map((library) => (
                        <option key={library.id} value={library.id}>
                          {library.name}
                        </option>
                      ))}
                    </select>
                  </Panel>
                  <PromptEditorForm
                    prompt={selectedPrompt}
                    libraries={libraries}
                    onSave={handleSave}
                  />
                  <PromptComparePanel
                    prompts={filteredPrompts}
                    leftPromptId={compareLeftId}
                    rightPromptId={compareRightId}
                    onLeftChange={setCompareLeftId}
                    onRightChange={setCompareRightId}
                  />
                </div>
              ) : null}

              {section === 'libraries' ? (
                <PromptLibrariesGrid libraries={libraries} prompts={prompts} />
              ) : null}

              {section === 'review' ? (
                <PromptReviewQueue
                  prompts={bootstrap?.reviewQueue || []}
                  busy={busy}
                  onSelect={(prompt) => setSelectedPromptId(prompt.id)}
                  onApprove={(prompt) => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await approvePromptChange(prompt.id);
                        await reload();
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                  onPublish={(prompt) => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await publishPromptChange(prompt.id);
                        await reload();
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                  onCorrections={(prompt) => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await requestPromptCorrections(prompt.id);
                        await reload();
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                />
              ) : null}

              {section === 'versions' && selectedPrompt ? (
                <PromptVersionRelationships
                  prompt={selectedPrompt}
                  versions={versions}
                  links={links}
                  timeline={timeline}
                  busy={busy}
                  onRestore={(version) => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await restorePromptVersion(selectedPrompt.id, version);
                        await reload();
                        await loadDetail(selectedPrompt.id);
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                  linkType={linkType}
                  linkId={linkId}
                  linkLabel={linkLabel}
                  onLinkTypeChange={setLinkType}
                  onLinkIdChange={setLinkId}
                  onLinkLabelChange={setLinkLabel}
                  onAddLink={() => {
                    void (async () => {
                      if (!linkId.trim()) return;
                      setBusy(true);
                      try {
                        await addPromptLink(selectedPrompt.id, {
                          linkedType: linkType,
                          linkedId: linkId.trim(),
                          label: linkLabel,
                        });
                        setLinkId('');
                        setLinkLabel('');
                        await loadDetail(selectedPrompt.id);
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                />
              ) : null}

              {section === 'playground' ? (
                <PromptPlaygroundPanel
                  prompt={selectedPrompt}
                  knownVariables={knownVariables}
                  busy={busy}
                  lastResult={playgroundResult}
                  onRun={(payload) => {
                    if (!selectedPrompt) return;
                    void (async () => {
                      setBusy(true);
                      try {
                        const result = await runPromptPlayground(selectedPrompt.id, payload);
                        setPlaygroundResult(result);
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                />
              ) : null}

              {section === 'analytics' && analytics ? (
                <PromptAnalyticsPanel analytics={analytics} />
              ) : null}
            </>
          )}
        </div>

        <div className="space-y-6">
          <PromptLibrary
            prompts={filteredPrompts}
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
          {selectedPrompt?.status === 'draft' ? (
            <Panel className="p-4">
              <button
                type="button"
                className="w-full rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    try {
                      await submitPromptReview(selectedPrompt.id);
                      await reload();
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                Submit for review
              </button>
            </Panel>
          ) : null}
        </div>
      </section>
    </div>
  );
}
