import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from '../api/documents';
import {
  addKnowledgeLink,
  archiveKnowledgeDocument,
  bulkKnowledgeAction,
  duplicateKnowledgeVersion,
  exportKnowledgeMetadata,
  getKnowledgeBootstrap,
  getKnowledgeDocumentDetail,
  mergeKnowledgeTags,
  publishKnowledgeDocument,
  requestKnowledgeCorrections,
  restoreKnowledgeVersion,
  submitKnowledgeReview,
} from '../api/knowledge';
import DocumentDialog from '../components/knowledge-base/DocumentDialog';
import DocumentPreviewPanel from '../components/knowledge-base/DocumentPreviewPanel';
import DocumentSearchToolbar from '../components/knowledge-base/DocumentSearchToolbar';
import DocumentTable from '../components/knowledge-base/DocumentTable';
import KnowledgeAnalyticsPanel from '../components/knowledge-base/KnowledgeAnalyticsPanel';
import KnowledgeCollectionsGrid from '../components/knowledge-base/KnowledgeCollectionsGrid';
import KnowledgeDashboardMetrics from '../components/knowledge-base/KnowledgeDashboardMetrics';
import KnowledgeRelationshipsPanel from '../components/knowledge-base/KnowledgeRelationshipsPanel';
import KnowledgeReviewQueue from '../components/knowledge-base/KnowledgeReviewQueue';
import KnowledgeVersionTimeline from '../components/knowledge-base/KnowledgeVersionTimeline';
import SidebarNav from '../components/sidebar/SidebarNav';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Panel from '../components/ui/Panel';
import Skeleton from '../components/ui/Skeleton';
import type {
  DocumentFilters,
  KnowledgeAnalytics,
  KnowledgeBaseDocument,
  KnowledgeBaseDocumentPayload,
  KnowledgeBootstrap,
  KnowledgeCollection,
  KnowledgeDashboard,
  KnowledgeLink,
  KnowledgeTag,
  KnowledgeVersion,
} from '../types/knowledge-base';

const sections = [
  { id: 'home', label: 'Knowledge Home' },
  { id: 'documents', label: 'Documents' },
  { id: 'collections', label: 'Collections' },
  { id: 'review', label: 'Review Queue' },
  { id: 'versions', label: 'Versions' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'tags', label: 'Tags' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'admin', label: 'Administration' },
];

const initialFilters: DocumentFilters = {
  search: '',
  category: '',
  status: '',
  fileType: '',
  collectionId: '',
  owner: '',
  language: '',
  tag: '',
  sort: 'updated',
};

export default function KnowledgeBasePage() {
  const [section, setSection] = useState('home');
  const [bootstrap, setBootstrap] = useState<KnowledgeBootstrap | null>(null);
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [tags, setTags] = useState<KnowledgeTag[]>([]);
  const [dashboard, setDashboard] = useState<KnowledgeDashboard | null>(null);
  const [analytics, setAnalytics] = useState<KnowledgeAnalytics | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeBaseDocument | null>(null);
  const [versions, setVersions] = useState<KnowledgeVersion[]>([]);
  const [links, setLinks] = useState<KnowledgeLink[]>([]);
  const [timeline, setTimeline] = useState<
    Array<{ type: string; at?: string; label: string; actor: string }>
  >([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<DocumentFilters>(initialFilters);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [linkType, setLinkType] = useState<KnowledgeLink['linkedType']>('prompt');
  const [linkId, setLinkId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getKnowledgeBootstrap();
      setBootstrap(data);
      setDocuments(data.documents);
      setCollections(data.collections);
      setTags(data.tags);
      setDashboard(data.dashboard);
      setAnalytics(data.analytics);
      setSelectedDocument((current) => {
        if (!current) return data.documents[0] || null;
        return data.documents.find((item) => item.id === current.id) || data.documents[0] || null;
      });
    } catch {
      setError('Unable to load the knowledge platform. Please make sure the API is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadDetail = useCallback(async (documentId: string) => {
    try {
      const detail = await getKnowledgeDocumentDetail(documentId);
      setSelectedDocument(detail.document);
      setVersions(detail.versions);
      setLinks(detail.links);
      setTimeline(detail.timeline);
      setDocuments((current) =>
        current.map((item) => (item.id === detail.document.id ? detail.document : item))
      );
    } catch {
      // Keep list selection even if detail endpoints fail.
    }
  }, []);

  useEffect(() => {
    if (selectedDocument?.id) {
      void loadDetail(selectedDocument.id);
    }
  }, [selectedDocument?.id, loadDetail]);

  const categories = useMemo(
    () => Array.from(new Set(documents.map((document) => document.category))).sort(),
    [documents]
  );

  const filteredDocuments = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return documents
      .filter((document) => {
        const matchesSearch =
          query.length === 0 ||
          document.title.toLowerCase().includes(query) ||
          document.description.toLowerCase().includes(query) ||
          document.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          (document.content || '').toLowerCase().includes(query);

        const matchesCategory = !filters.category || document.category === filters.category;
        const matchesStatus = !filters.status || document.status === filters.status;
        const matchesType = !filters.fileType || document.fileType === filters.fileType;
        const matchesCollection =
          !filters.collectionId || document.collectionId === filters.collectionId;
        const matchesOwner =
          !filters.owner ||
          (document.owner || document.author || '').toLowerCase().includes(filters.owner.toLowerCase());
        const matchesLanguage = !filters.language || document.language === filters.language;
        const matchesTag =
          !filters.tag || document.tags.some((tag) => tag.toLowerCase() === filters.tag?.toLowerCase());

        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus &&
          matchesType &&
          matchesCollection &&
          matchesOwner &&
          matchesLanguage &&
          matchesTag
        );
      })
      .sort((a, b) => {
        if (filters.sort === 'views') return (b.viewCount || 0) - (a.viewCount || 0);
        if (filters.sort === 'ai') return (b.aiUsageCount || 0) - (a.aiUsageCount || 0);
        if (filters.sort === 'title') return a.title.localeCompare(b.title);
        return String(b.updatedAt || b.updatedDate).localeCompare(String(a.updatedAt || a.updatedDate));
      });
  }, [documents, filters]);

  useEffect(() => {
    if (!selectedDocument) {
      setSelectedDocument(filteredDocuments[0] || null);
      return;
    }

    const selectedStillVisible = filteredDocuments.find(
      (document) => document.id === selectedDocument.id
    );

    if (!selectedStillVisible && section === 'documents') {
      setSelectedDocument(filteredDocuments[0] || null);
    }
  }, [filteredDocuments, selectedDocument, section]);

  const openCreateDialog = () => {
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEditDialog = (document: KnowledgeBaseDocument) => {
    setSelectedDocument(document);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleCreate = async (payload: KnowledgeBaseDocumentPayload) => {
    const createdDocument = await createDocument(payload);
    await reload();
    setSelectedDocument(createdDocument);
  };

  const handleUpdate = async (payload: KnowledgeBaseDocumentPayload) => {
    if (!selectedDocument) return;
    const updatedDocument = await updateDocument(selectedDocument.id, payload);
    await reload();
    setSelectedDocument(updatedDocument);
  };

  const handleDelete = async (document: KnowledgeBaseDocument) => {
    const confirmed = window.confirm(`Delete "${document.title}" from the knowledge base?`);
    if (!confirmed) return;
    await deleteDocument(document.id);
    setSelectedIds((current) => current.filter((id) => id !== document.id));
    await reload();
  };

  const runReviewAction = async (
    action: 'submit' | 'publish' | 'corrections' | 'archive',
    document: KnowledgeBaseDocument
  ) => {
    setBusy(true);
    try {
      if (action === 'submit') await submitKnowledgeReview(document.id);
      if (action === 'publish') await publishKnowledgeDocument(document.id);
      if (action === 'corrections') await requestKnowledgeCorrections(document.id);
      if (action === 'archive') await archiveKnowledgeDocument(document.id);
      await reload();
      await loadDetail(document.id);
    } finally {
      setBusy(false);
    }
  };

  const toggleSelected = (documentId: string) => {
    setSelectedIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    );
  };

  const runBulk = async (action: 'archive' | 'delete' | 'duplicate' | 'tag' | 'move') => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    try {
      await bulkKnowledgeAction({
        action,
        documentIds: selectedIds,
        collectionId: filters.collectionId || collections[0]?.id,
        tags: filters.tag ? [filters.tag] : ['bulk'],
      });
      setSelectedIds([]);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        setSection('documents');
        const input = document.querySelector<HTMLInputElement>('input[data-knowledge-search="true"]');
        input?.focus();
      }
      if (event.key === 'n' && event.altKey) {
        event.preventDefault();
        openCreateDialog();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
        <aside className="space-y-4">
          <SidebarNav />
          <Panel className="p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Knowledge Platform
            </p>
            <nav className="space-y-1" aria-label="Knowledge sections">
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
              Enterprise Knowledge Platform
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Knowledge ready for H-Kids business content
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-400">
              Organize, validate, version, and search enterprise knowledge. Collections are empty shells —
              no invented products, prices, or procedures. Real H-Kids content can be added without
              architectural changes.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-400">
              <Badge tone="info">Collections</Badge>
              <Badge>Versioning</Badge>
              <Badge>Review workflow</Badge>
              <Badge>Relationships</Badge>
              <Badge tone="success">RAG reuse</Badge>
              <span className="rounded-full border border-white/10 px-3 py-1">/ focus search</span>
              <span className="rounded-full border border-white/10 px-3 py-1">Alt+N new</span>
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
                  <KnowledgeDashboardMetrics dashboard={dashboard} />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Panel className="p-5">
                      <h2 className="text-lg font-semibold text-white">Recently updated</h2>
                      <ul className="mt-4 space-y-3">
                        {dashboard.recentlyUpdated.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              className="text-left text-sm text-cyan-200 hover:underline"
                              onClick={() => {
                                setSelectedDocument(item);
                                setSection('documents');
                              }}
                            >
                              {item.title}
                            </button>
                            <p className="text-xs text-slate-500">{item.updatedDate}</p>
                          </li>
                        ))}
                      </ul>
                    </Panel>
                    <Panel className="p-5">
                      <h2 className="text-lg font-semibold text-white">Most used by AI</h2>
                      <ul className="mt-4 space-y-3">
                        {dashboard.mostUsedByAi.map((item) => (
                          <li key={item.id} className="flex items-center justify-between gap-3">
                            <span className="text-sm text-slate-200">{item.title}</span>
                            <Badge tone="info">{item.aiUsageCount || 0}</Badge>
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  </div>
                </div>
              ) : null}

              {section === 'documents' ? (
                <div className="space-y-6">
                  <DocumentSearchToolbar
                    filters={filters}
                    categories={categories}
                    collections={collections}
                    tags={tags.map((tag) => tag.name)}
                    onFilterChange={setFilters}
                    onOpenUpload={openCreateDialog}
                  />
                  <DocumentTable
                    documents={filteredDocuments}
                    selectedDocumentId={selectedDocument?.id || null}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelected}
                    onSelect={setSelectedDocument}
                    onEdit={openEditDialog}
                    onDelete={(document) => {
                      void handleDelete(document);
                    }}
                  />
                </div>
              ) : null}

              {section === 'collections' ? (
                <KnowledgeCollectionsGrid collections={collections} documents={documents} />
              ) : null}

              {section === 'review' ? (
                <KnowledgeReviewQueue
                  documents={bootstrap?.reviewQueue || documents.filter((item) => item.status === 'review')}
                  busy={busy}
                  onSelect={setSelectedDocument}
                  onPublish={(document) => void runReviewAction('publish', document)}
                  onCorrections={(document) => void runReviewAction('corrections', document)}
                  onArchive={(document) => void runReviewAction('archive', document)}
                />
              ) : null}

              {section === 'versions' && selectedDocument ? (
                <KnowledgeVersionTimeline
                  document={selectedDocument}
                  versions={versions}
                  timeline={timeline}
                  busy={busy}
                  onRestore={(version) => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await restoreKnowledgeVersion(selectedDocument.id, version);
                        await reload();
                        await loadDetail(selectedDocument.id);
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                  onDuplicate={(version) => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await duplicateKnowledgeVersion(selectedDocument.id, version);
                        await reload();
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                />
              ) : null}

              {section === 'relationships' && selectedDocument ? (
                <KnowledgeRelationshipsPanel
                  document={selectedDocument}
                  links={links}
                  linkType={linkType}
                  linkId={linkId}
                  linkLabel={linkLabel}
                  onLinkTypeChange={setLinkType}
                  onLinkIdChange={setLinkId}
                  onLinkLabelChange={setLinkLabel}
                  onAdd={() => {
                    void (async () => {
                      if (!linkId.trim()) return;
                      setBusy(true);
                      try {
                        await addKnowledgeLink(selectedDocument.id, {
                          linkedType: linkType,
                          linkedId: linkId.trim(),
                          label: linkLabel,
                        });
                        setLinkId('');
                        setLinkLabel('');
                        await loadDetail(selectedDocument.id);
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                />
              ) : null}

              {section === 'tags' ? (
                <Panel className="p-5">
                  <h2 className="text-lg font-semibold text-white">Professional tags</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Color tags, frequency ranking, and merge duplicates without inventing content.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag.id} tone={tag.usageCount > 2 ? 'info' : 'neutral'}>
                        {tag.name} · {tag.usageCount}
                      </Badge>
                    ))}
                    {tags.length === 0 ? (
                      <p className="text-sm text-slate-500">Tags appear as documents are tagged.</p>
                    ) : null}
                  </div>
                  <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      value={mergeSource}
                      onChange={(event) => setMergeSource(event.target.value)}
                      placeholder="Source tag"
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                    />
                    <input
                      value={mergeTarget}
                      onChange={(event) => setMergeTarget(event.target.value)}
                      placeholder="Target tag"
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                    />
                    <Button
                      disabled={busy || !mergeSource || !mergeTarget}
                      onClick={() => {
                        void (async () => {
                          setBusy(true);
                          try {
                            await mergeKnowledgeTags(mergeSource, mergeTarget);
                            setMergeSource('');
                            setMergeTarget('');
                            await reload();
                          } finally {
                            setBusy(false);
                          }
                        })();
                      }}
                    >
                      Merge tags
                    </Button>
                  </div>
                </Panel>
              ) : null}

              {section === 'analytics' && analytics ? (
                <KnowledgeAnalyticsPanel analytics={analytics} />
              ) : null}

              {section === 'admin' ? (
                <Panel className="space-y-4 p-5">
                  <h2 className="text-lg font-semibold text-white">Bulk administration</h2>
                  <p className="text-sm text-slate-400">
                    Selected documents: {selectedIds.length}. Use the documents table checkboxes first.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => void runBulk('archive')}>
                      Archive
                    </Button>
                    <Button disabled={busy} onClick={() => void runBulk('duplicate')}>
                      Duplicate
                    </Button>
                    <Button disabled={busy} onClick={() => void runBulk('tag')}>
                      Mass tag
                    </Button>
                    <Button disabled={busy} onClick={() => void runBulk('move')}>
                      Move to collection
                    </Button>
                    <Button
                      disabled={busy}
                      variant="ghost"
                      className="text-rose-300"
                      onClick={() => void runBulk('delete')}
                    >
                      Delete
                    </Button>
                    <Button
                      disabled={busy}
                      variant="secondary"
                      onClick={() => {
                        void (async () => {
                          const exported = await exportKnowledgeMetadata();
                          const blob = new Blob([JSON.stringify(exported, null, 2)], {
                            type: 'application/json',
                          });
                          const url = URL.createObjectURL(blob);
                          const anchor = document.createElement('a');
                          anchor.href = url;
                          anchor.download = 'knowledge-metadata.json';
                          anchor.click();
                          URL.revokeObjectURL(url);
                        })();
                      }}
                    >
                      Export metadata
                    </Button>
                  </div>
                  {selectedDocument ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        disabled={busy || selectedDocument.status !== 'draft'}
                        onClick={() => void runReviewAction('submit', selectedDocument)}
                      >
                        Submit review
                      </Button>
                      <Button
                        disabled={busy || selectedDocument.status !== 'review'}
                        onClick={() => void runReviewAction('publish', selectedDocument)}
                      >
                        Publish
                      </Button>
                    </div>
                  ) : null}
                </Panel>
              ) : null}
            </>
          )}
        </div>

        <DocumentPreviewPanel
          document={selectedDocument}
          collections={collections}
          links={links}
          onEdit={openEditDialog}
          onDelete={(document) => {
            void handleDelete(document);
          }}
          onSubmitReview={(document) => void runReviewAction('submit', document)}
          onPublish={(document) => void runReviewAction('publish', document)}
        />
      </section>

      <DocumentDialog
        open={dialogOpen}
        mode={dialogMode}
        document={dialogMode === 'edit' ? selectedDocument : null}
        collections={collections}
        onClose={() => setDialogOpen(false)}
        onSubmit={(payload) => (dialogMode === 'create' ? handleCreate(payload) : handleUpdate(payload))}
      />
    </div>
  );
}
