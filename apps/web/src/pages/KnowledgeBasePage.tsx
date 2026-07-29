import { useEffect, useMemo, useState } from 'react';
import {
  createDocument,
  deleteDocument,
  getDocuments,
  updateDocument,
} from '../api/documents';
import DocumentDialog from '../components/knowledge-base/DocumentDialog';
import DocumentPreviewPanel from '../components/knowledge-base/DocumentPreviewPanel';
import DocumentSearchToolbar from '../components/knowledge-base/DocumentSearchToolbar';
import DocumentStats from '../components/knowledge-base/DocumentStats';
import DocumentTable from '../components/knowledge-base/DocumentTable';
import SidebarNav from '../components/sidebar/SidebarNav';
import Panel from '../components/ui/Panel';
import type {
  DocumentFilters,
  KnowledgeBaseDocument,
  KnowledgeBaseDocumentPayload,
} from '../types/knowledge-base';

const initialFilters: DocumentFilters = {
  search: '',
  category: '',
  status: '',
  fileType: '',
};

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeBaseDocument | null>(null);
  const [filters, setFilters] = useState<DocumentFilters>(initialFilters);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      setError('');

      try {
        const items = await getDocuments();
        setDocuments(items);
        setSelectedDocument(items[0] || null);
      } catch {
        setError('Unable to load mock documents. Please make sure the API is running.');
      } finally {
        setLoading(false);
      }
    };

    void loadDocuments();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(documents.map((document) => document.category))).sort(),
    [documents]
  );

  const filteredDocuments = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesSearch =
        query.length === 0 ||
        document.title.toLowerCase().includes(query) ||
        document.description.toLowerCase().includes(query) ||
        document.tags.some((tag) => tag.toLowerCase().includes(query));

      const matchesCategory = !filters.category || document.category === filters.category;
      const matchesStatus = !filters.status || document.status === filters.status;
      const matchesType = !filters.fileType || document.fileType === filters.fileType;

      return matchesSearch && matchesCategory && matchesStatus && matchesType;
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

    if (!selectedStillVisible) {
      setSelectedDocument(filteredDocuments[0] || null);
    }
  }, [filteredDocuments, selectedDocument]);

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
    setDocuments((currentDocuments) => [createdDocument, ...currentDocuments]);
    setSelectedDocument(createdDocument);
  };

  const handleUpdate = async (payload: KnowledgeBaseDocumentPayload) => {
    if (!selectedDocument) {
      return;
    }

    const updatedDocument = await updateDocument(selectedDocument.id, payload);

    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === updatedDocument.id ? updatedDocument : document
      )
    );
    setSelectedDocument(updatedDocument);
  };

  const handleDelete = async (document: KnowledgeBaseDocument) => {
    const confirmed = window.confirm(`Delete "${document.title}" from the knowledge base?`);

    if (!confirmed) {
      return;
    }

    await deleteDocument(document.id);

    setDocuments((currentDocuments) =>
      currentDocuments.filter((currentDocument) => currentDocument.id !== document.id)
    );

    setSelectedDocument((currentSelected) =>
      currentSelected?.id === document.id ? null : currentSelected
    );
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <SidebarNav />

        <div className="space-y-6">
          <Panel className="p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Knowledge Base
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Documents, folders, and indexed knowledge
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-400">
              Search, filter, tag, upload, and review operational documents that power retrieval across
              every agent workspace.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Folders</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Tags</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Filters
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Upload
              </span>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-200">
                Indexing ready
              </span>
            </div>
          </Panel>

          <DocumentStats documents={documents} />

          <DocumentSearchToolbar
            filters={filters}
            categories={categories}
            onFilterChange={setFilters}
            onOpenUpload={openCreateDialog}
          />

          {loading ? (
            <Panel className="p-10 text-center text-sm text-slate-400">
              Loading mock knowledge base documents...
            </Panel>
          ) : error ? (
            <Panel className="p-10 text-center text-sm text-rose-300">{error}</Panel>
          ) : (
            <DocumentTable
              documents={filteredDocuments}
              selectedDocumentId={selectedDocument?.id || null}
              onSelect={setSelectedDocument}
              onEdit={openEditDialog}
              onDelete={(document) => {
                void handleDelete(document);
              }}
            />
          )}
        </div>

        <DocumentPreviewPanel
          document={selectedDocument}
          onEdit={openEditDialog}
          onDelete={(document) => {
            void handleDelete(document);
          }}
        />
      </section>

      <DocumentDialog
        open={dialogOpen}
        mode={dialogMode}
        document={dialogMode === 'edit' ? selectedDocument : null}
        onClose={() => setDialogOpen(false)}
        onSubmit={(payload) => (dialogMode === 'create' ? handleCreate(payload) : handleUpdate(payload))}
      />
    </div>
  );
}
