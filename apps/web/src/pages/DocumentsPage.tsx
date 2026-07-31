import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getDmsBootstrap,
  getDmsDocumentDetail,
  getDmsFolderBreadcrumb,
  getDmsVectorStats,
  moveDmsDocuments,
  reindexDmsDocument,
  runDmsWorkflow,
  startDmsUploadSession,
  uploadDmsDocument,
} from '../api/dms';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import MetricCard from '../components/ui/MetricCard';
import Panel from '../components/ui/Panel';
import Skeleton from '../components/ui/Skeleton';
import VectorKnowledgeHealthPanel from '../components/knowledge-base/VectorKnowledgeHealthPanel';
import type { VectorKnowledgeStats } from '../types/knowledge-base';

const sections = [
  { id: 'home', label: 'Document Home' },
  { id: 'browser', label: 'Folders & Files' },
  { id: 'upload', label: 'Upload' },
  { id: 'review', label: 'Approvals' },
  { id: 'preview', label: 'Preview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'audit', label: 'Audit Log' },
];

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function DocumentsPage() {
  const [section, setSection] = useState('home');
  const [bootstrap, setBootstrap] = useState<any>(null);
  const [vectorStats, setVectorStats] = useState<VectorKnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<any[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploadQueue, setUploadQueue] = useState<
    Array<{ id: string; name: string; progress: number; status: string; error?: string }>
  >([]);
  const [dragActive, setDragActive] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, stats] = await Promise.all([
        getDmsBootstrap(),
        getDmsVectorStats().catch(() => null),
      ]);
      setBootstrap(data);
      setVectorStats(stats);
      setSelectedDocumentId((current) => current || data.documents[0]?.id || null);
    } catch {
      setError('Unable to load the document management system. Please make sure the API is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!currentFolderId) {
      setBreadcrumb([]);
      return;
    }
    void getDmsFolderBreadcrumb(currentFolderId)
      .then((data) => setBreadcrumb(data.items || []))
      .catch(() => setBreadcrumb([]));
  }, [currentFolderId]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setDetail(null);
      return;
    }
    void getDmsDocumentDetail(selectedDocumentId)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selectedDocumentId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        setSection('browser');
        document.querySelector<HTMLInputElement>('input[data-dms-search="true"]')?.focus();
      }
      if (event.key === 'u' && event.altKey) {
        event.preventDefault();
        setSection('upload');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const folders = useMemo(() => bootstrap?.folders || [], [bootstrap]);
  const documents = useMemo(() => bootstrap?.documents || [], [bootstrap]);
  const dashboard = bootstrap?.dashboard;
  const analytics = bootstrap?.analytics;

  const childFolders = useMemo(
    () => folders.filter((folder: any) => (folder.parentId || null) === currentFolderId),
    [folders, currentFolderId]
  );

  const folderDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((document: any) => {
      const matchesFolder = (document.folderId || null) === currentFolderId;
      const matchesSearch =
        !query ||
        document.title.toLowerCase().includes(query) ||
        document.description.toLowerCase().includes(query) ||
        (document.tags || []).some((tag: string) => tag.toLowerCase().includes(query));
      const matchesStatus = !statusFilter || document.status === statusFilter;
      return matchesFolder && matchesSearch && matchesStatus;
    });
  }, [documents, currentFolderId, search, statusFilter]);

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    setBusy(true);
    for (const file of files) {
      const queueId = `${file.name}-${Date.now()}`;
      setUploadQueue((current) => [
        { id: queueId, name: file.name, progress: 10, status: 'uploading' },
        ...current,
      ]);
      try {
        const session = await startDmsUploadSession({
          filename: file.name,
          mimeType: file.type,
          byteSize: file.size,
          totalChunks: 1,
          folderId: currentFolderId,
        });
        setUploadQueue((current) =>
          current.map((item) =>
            item.id === queueId ? { ...item, progress: 45, status: 'transferring' } : item
          )
        );
        const contentBase64 = await fileToBase64(file);
        const result = await uploadDmsDocument({
          filename: file.name,
          mimeType: file.type,
          contentBase64,
          folderId: currentFolderId,
          category: 'Documents',
          status: 'draft',
          uploadSessionId: session.id,
          allowDuplicate: false,
        });
        if (result.duplicate) {
          const overwrite = window.confirm(
            `Duplicate detected for ${file.name}. Overwrite first match?`
          );
          if (overwrite && result.matches?.[0]?.id) {
            await uploadDmsDocument({
              filename: file.name,
              mimeType: file.type,
              contentBase64,
              folderId: currentFolderId,
              overwriteDocumentId: result.matches[0].id,
              uploadSessionId: session.id,
            });
          } else {
            setUploadQueue((current) =>
              current.map((item) =>
                item.id === queueId
                  ? { ...item, progress: 100, status: 'duplicate', error: 'Duplicate skipped' }
                  : item
              )
            );
            continue;
          }
        }
        setUploadQueue((current) =>
          current.map((item) =>
            item.id === queueId ? { ...item, progress: 100, status: 'completed' } : item
          )
        );
      } catch (uploadError) {
        setUploadQueue((current) =>
          current.map((item) =>
            item.id === queueId
              ? {
                  ...item,
                  progress: 100,
                  status: 'failed',
                  error: uploadError instanceof Error ? uploadError.message : 'Upload failed',
                }
              : item
          )
        );
      }
    }
    await reload();
    setBusy(false);
  };

  const refreshVectorStats = async () => {
    setVectorStats(await getDmsVectorStats().catch(() => null));
  };

  const handleReindexSelected = async () => {
    if (!selectedDocumentId) return;
    setBusy(true);
    setNotice('');
    try {
      await reindexDmsDocument(selectedDocumentId, { force: true, background: true });
      setNotice('Vector re-index queued for the selected document.');
      await refreshVectorStats();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <Panel className="p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Document System
            </p>
            <nav className="space-y-1" aria-label="DMS sections">
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
            <Link to="/knowledge-base" className="mt-4 block px-3 text-xs text-cyan-300 hover:underline">
              Open Knowledge Platform
            </Link>
          </Panel>
        </aside>

        <div className="space-y-6">
          <Panel className="p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Enterprise Document Management
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ready for real H-Kids documents
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-400">
              Folders, uploads, versioning, workflow, OCR/virus abstractions, and analytics — integrated
              with the Knowledge Platform. No invented contracts, quotations, or procedures.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="info">Nested folders</Badge>
              <Badge>Drag & drop</Badge>
              <Badge>Versioning</Badge>
              <Badge tone="success">Knowledge linked</Badge>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                / search · Alt+U upload
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
              {notice ? (
                <Panel className="border-cyan-400/20 p-4 text-sm text-cyan-200">{notice}</Panel>
              ) : null}

              {section === 'home' && dashboard ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Total documents" value={String(dashboard.totalDocuments)} />
                    <MetricCard label="Folders" value={String(dashboard.folders)} accent="blue" />
                    <MetricCard label="Published" value={String(dashboard.published)} accent="emerald" />
                    <MetricCard
                      label="Storage"
                      value={dashboard.storageUsageLabel}
                      accent="orange"
                    />
                    <MetricCard label="Draft" value={String(dashboard.draft)} accent="blue" />
                    <MetricCard label="Review" value={String(dashboard.review)} accent="purple" />
                    <MetricCard
                      label="Pending approvals"
                      value={String(dashboard.pendingApprovals)}
                      accent="orange"
                    />
                    <MetricCard
                      label="Quality"
                      value={String(dashboard.documentQuality)}
                      accent="cyan"
                    />
                  </div>
                  <VectorKnowledgeHealthPanel
                    stats={vectorStats}
                    busy={busy}
                    selectedDocumentTitle={detail?.document?.title}
                    onReindexSelected={() => void handleReindexSelected()}
                  />
                </div>
              ) : null}

              {section === 'browser' ? (
                <div className="space-y-4">
                  <Panel className="flex flex-wrap items-center gap-2 p-4 text-sm text-slate-300">
                    <button type="button" className="text-cyan-300" onClick={() => setCurrentFolderId(null)}>
                      Root
                    </button>
                    {breadcrumb.map((folder) => (
                      <span key={folder.id} className="flex items-center gap-2">
                        <span>/</span>
                        <button
                          type="button"
                          className="text-cyan-300"
                          onClick={() => setCurrentFolderId(folder.id)}
                        >
                          {folder.name}
                        </button>
                      </span>
                    ))}
                  </Panel>
                  <Panel className="grid gap-3 p-4 md:grid-cols-3">
                    <input
                      data-dms-search="true"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search title, content metadata, tags..."
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
                    </select>
                    <Button variant="secondary" onClick={() => setSection('upload')}>
                      Upload files
                    </Button>
                  </Panel>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {childFolders.map((folder: any) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-left hover:bg-white/5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-white">{folder.name}</p>
                          {folder.isPinned ? <Badge tone="info">Pinned</Badge> : null}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{folder.description}</p>
                      </button>
                    ))}
                  </div>
                  <Panel className="overflow-hidden">
                    <div className="border-b border-white/10 px-5 py-4">
                      <h2 className="text-lg font-semibold text-white">Documents in folder</h2>
                    </div>
                    <div className="divide-y divide-white/5">
                      {folderDocuments.map((document: any) => (
                        <button
                          key={document.id}
                          type="button"
                          onClick={() => {
                            setSelectedDocumentId(document.id);
                            setSection('preview');
                          }}
                          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/4"
                        >
                          <div>
                            <p className="font-medium text-white">{document.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {document.fileType} · v{document.version} · {document.securityClassification}
                            </p>
                          </div>
                          <Badge tone={document.status === 'active' ? 'success' : 'neutral'}>
                            {document.status === 'active' ? 'published' : document.status}
                          </Badge>
                        </button>
                      ))}
                      {folderDocuments.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-slate-500">
                          No documents in this folder yet.
                        </p>
                      ) : null}
                    </div>
                  </Panel>
                </div>
              ) : null}

              {section === 'upload' ? (
                <Panel className="space-y-4 p-5">
                  <h2 className="text-lg font-semibold text-white">Professional uploader</h2>
                  <p className="text-sm text-slate-400">
                    Multiple upload, progress, retry-ready queue, duplicate detection, batch support.
                    Formats: PDF, DOCX, XLSX, PPTX, TXT, MD, HTML, CSV, PNG, JPEG, SVG, ZIP.
                  </p>
                  <div
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setDragActive(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragActive(false);
                      if (event.dataTransfer.files?.length) {
                        void processFiles(event.dataTransfer.files);
                      }
                    }}
                    className={[
                      'rounded-[1.5rem] border border-dashed px-6 py-16 text-center transition',
                      dragActive
                        ? 'border-cyan-400 bg-cyan-400/10'
                        : 'border-white/15 bg-slate-950/50',
                    ].join(' ')}
                  >
                    <p className="text-sm text-slate-300">Drag & drop files here</p>
                    <label className="mt-4 inline-flex cursor-pointer">
                      <span className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-cyan-200">
                        Browse files
                      </span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.docx,.xlsx,.pptx,.txt,.md,.html,.csv,.png,.jpeg,.jpg,.svg,.zip"
                        onChange={(event) => {
                          if (event.target.files?.length) {
                            void processFiles(event.target.files);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    {uploadQueue.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/10 p-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-white">{item.name}</span>
                          <Badge
                            tone={
                              item.status === 'completed'
                                ? 'success'
                                : item.status === 'failed'
                                  ? 'warning'
                                  : 'info'
                            }
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full bg-cyan-400 transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        {item.error ? <p className="mt-2 text-xs text-rose-300">{item.error}</p> : null}
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : null}

              {section === 'review' ? (
                <Panel className="space-y-3 p-5">
                  <h2 className="text-lg font-semibold text-white">Document workflow</h2>
                  {(bootstrap?.reviewQueue || []).map((document: any) => (
                    <article key={document.id} className="rounded-2xl border border-white/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{document.title}</p>
                          <p className="text-xs text-slate-500">{document.status}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {document.status === 'review' ? (
                            <Button
                              disabled={busy}
                              onClick={() => {
                                void (async () => {
                                  setBusy(true);
                                  try {
                                    await runDmsWorkflow(document.id, 'approve');
                                    await reload();
                                  } finally {
                                    setBusy(false);
                                  }
                                })();
                              }}
                            >
                              Approve
                            </Button>
                          ) : null}
                          {document.status === 'approved' ? (
                            <Button
                              disabled={busy}
                              onClick={() => {
                                void (async () => {
                                  setBusy(true);
                                  try {
                                    await runDmsWorkflow(document.id, 'publish');
                                    await reload();
                                  } finally {
                                    setBusy(false);
                                  }
                                })();
                              }}
                            >
                              Publish
                            </Button>
                          ) : null}
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() => {
                              void (async () => {
                                setBusy(true);
                                try {
                                  await runDmsWorkflow(document.id, 'corrections');
                                  await reload();
                                } finally {
                                  setBusy(false);
                                }
                              })();
                            }}
                          >
                            Corrections
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {(bootstrap?.reviewQueue || []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">No pending approvals.</p>
                  ) : null}
                </Panel>
              ) : null}

              {section === 'preview' && detail ? (
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <Panel className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {detail.document.fileType} · v{detail.document.version}
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">
                          {detail.document.title}
                        </h2>
                      </div>
                      <Badge>{detail.document.status}</Badge>
                    </div>
                    <pre className="mt-5 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs text-slate-300">
                      {detail.document.content || detail.document.description || 'No preview content.'}
                    </pre>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        disabled={busy || detail.document.status !== 'draft'}
                        onClick={() => {
                          void (async () => {
                            setBusy(true);
                            try {
                              await runDmsWorkflow(detail.document.id, 'submit');
                              await reload();
                            } finally {
                              setBusy(false);
                            }
                          })();
                        }}
                      >
                        Submit review
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy || !currentFolderId}
                        onClick={() => {
                          void (async () => {
                            setBusy(true);
                            try {
                              await moveDmsDocuments([detail.document.id], currentFolderId);
                              await reload();
                            } finally {
                              setBusy(false);
                            }
                          })();
                        }}
                      >
                        Move to current folder
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void handleReindexSelected()}
                      >
                        Re-index for AI
                      </Button>
                    </div>
                  </Panel>
                  <Panel className="space-y-3 p-5 text-sm text-slate-300">
                    <h3 className="font-semibold text-white">Metadata</h3>
                    <p>Owner: {detail.document.owner || detail.document.author}</p>
                    <p>Classification: {detail.document.securityClassification}</p>
                    <p>AI visibility: {String(detail.document.aiVisibility)}</p>
                    <p>Downloads: {detail.document.downloadCount || 0}</p>
                    <p>Quality: {detail.document.qualityScore || 0}</p>
                    <h3 className="pt-3 font-semibold text-white">Related resources</h3>
                    {(detail.links || []).map((link: any) => (
                      <p key={link.id}>
                        {link.linkedType}: {link.label || link.linkedId}
                      </p>
                    ))}
                    {(detail.links || []).length === 0 ? (
                      <p className="text-slate-500">No linked resources.</p>
                    ) : null}
                    <h3 className="pt-3 font-semibold text-white">Versions</h3>
                    {(detail.versions || []).slice(0, 5).map((version: any) => (
                      <p key={version.id}>
                        v{version.version} · {version.changeSummary}
                      </p>
                    ))}
                  </Panel>
                </div>
              ) : null}

              {section === 'analytics' && analytics ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel className="p-5">
                    <h2 className="text-lg font-semibold text-white">Most downloaded</h2>
                    <ul className="mt-4 space-y-2 text-sm text-slate-300">
                      {analytics.mostDownloaded.map((item: any) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span>{item.title}</span>
                          <span>{item.downloadCount || 0}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                  <Panel className="p-5">
                    <h2 className="text-lg font-semibold text-white">Most used by AI</h2>
                    <ul className="mt-4 space-y-2 text-sm text-slate-300">
                      {analytics.mostUsedByAi.map((item: any) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span>{item.title}</span>
                          <span>{item.aiUsageCount || 0}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                  <Panel className="p-5">
                    <h2 className="text-lg font-semibold text-white">Unused documents</h2>
                    <ul className="mt-4 space-y-2 text-sm text-slate-300">
                      {analytics.unusedDocuments.map((item: any) => (
                        <li key={item.id}>{item.title}</li>
                      ))}
                    </ul>
                  </Panel>
                  <Panel className="p-5">
                    <h2 className="text-lg font-semibold text-white">Folder usage</h2>
                    <ul className="mt-4 space-y-2 text-sm text-slate-300">
                      {analytics.folderUsage.map((item: any) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span>{item.name}</span>
                          <span>{item.documents}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                </div>
              ) : null}

              {section === 'audit' ? (
                <Panel className="p-5">
                  <h2 className="text-lg font-semibold text-white">Audit log</h2>
                  <ol className="mt-5 space-y-3 border-l border-white/10 pl-4">
                    {(bootstrap?.audit || []).map((event: any) => (
                      <li key={event.id} className="relative text-sm text-slate-300">
                        <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                        {event.summary || event.eventType}
                        <p className="text-xs text-slate-500">
                          {event.actor || 'system'} ·{' '}
                          {event.createdAt ? String(event.createdAt).slice(0, 19) : '—'}
                        </p>
                      </li>
                    ))}
                  </ol>
                </Panel>
              ) : null}
            </>
          )}
        </div>

        <Panel className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-white">Pinned folders</h2>
          <div className="space-y-2">
            {folders
              .filter((folder: any) => folder.isPinned)
              .map((folder: any) => (
                <button
                  key={folder.id}
                  type="button"
                  className="block w-full rounded-2xl border border-white/10 px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5"
                  onClick={() => {
                    setCurrentFolderId(folder.id);
                    setSection('browser');
                  }}
                >
                  {folder.name}
                </button>
              ))}
          </div>
          <h2 className="pt-4 text-lg font-semibold text-white">Favorites</h2>
          <div className="space-y-2">
            {folders
              .filter((folder: any) => folder.isFavorite)
              .map((folder: any) => (
                <button
                  key={folder.id}
                  type="button"
                  className="block w-full rounded-2xl border border-white/10 px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5"
                  onClick={() => {
                    setCurrentFolderId(folder.id);
                    setSection('browser');
                  }}
                >
                  {folder.name}
                </button>
              ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
