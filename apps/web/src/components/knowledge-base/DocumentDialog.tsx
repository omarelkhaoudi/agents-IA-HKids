import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import type {
  KnowledgeBaseDocument,
  KnowledgeBaseDocumentPayload,
  KnowledgeBaseStatus,
  KnowledgeCollection,
  SupportedDocumentType,
} from '../../types/knowledge-base';
import Button from '../ui/Button';

const supportedTypes: SupportedDocumentType[] = ['PDF', 'DOCX', 'XLSX', 'TXT', 'CSV', 'MD', 'HTML'];
const statuses: KnowledgeBaseStatus[] = ['draft', 'review', 'active', 'archived'];

interface DocumentDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  document: KnowledgeBaseDocument | null;
  collections?: KnowledgeCollection[];
  onClose: () => void;
  onSubmit: (payload: KnowledgeBaseDocumentPayload) => Promise<void>;
}

interface FormState {
  title: string;
  category: string;
  description: string;
  tags: string;
  status: KnowledgeBaseStatus;
  author: string;
  owner: string;
  language: string;
  collectionId: string;
  priority: string;
  reviewDate: string;
  expirationDate: string;
  notes: string;
  fileType: SupportedDocumentType;
  size: string;
  sourceFileName: string;
}

const initialState: FormState = {
  title: '',
  category: 'Administration',
  description: '',
  tags: '',
  status: 'draft',
  author: 'Operations Team',
  owner: 'Knowledge Manager',
  language: 'fr',
  collectionId: '',
  priority: '2',
  reviewDate: '',
  expirationDate: '',
  notes: '',
  fileType: 'PDF',
  size: '0.0 MB',
  sourceFileName: '',
};

export default function DocumentDialog({
  open,
  mode,
  document,
  collections = [],
  onClose,
  onSubmit,
}: DocumentDialogProps) {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!document || mode === 'create') {
      setFormState({
        ...initialState,
        collectionId: collections[0]?.id || '',
      });
      return;
    }

    setFormState({
      title: document.title,
      category: document.category,
      description: document.description,
      tags: document.tags.join(', '),
      status: document.status === 'deleted' ? 'archived' : document.status,
      author: document.author,
      owner: document.owner || document.author,
      language: document.language || 'fr',
      collectionId: document.collectionId || '',
      priority: String(document.priority ?? 2),
      reviewDate: document.reviewDate || '',
      expirationDate: document.expirationDate || '',
      notes: document.notes || '',
      fileType: document.fileType,
      size: document.size,
      sourceFileName: document.sourceFileName,
    });
  }, [collections, document, mode, open]);

  const title = useMemo(
    () => (mode === 'create' ? 'Upload document' : 'Edit document metadata'),
    [mode]
  );

  if (!open) {
    return null;
  }

  const handleChange = (
    field: keyof FormState,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: event.target.value,
    }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toUpperCase() as SupportedDocumentType | undefined;
    const sizeInMb = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    setFormState((currentState) => ({
      ...currentState,
      title: currentState.title || file.name.replace(/\.[^.]+$/, ''),
      sourceFileName: file.name,
      size: sizeInMb,
      fileType: supportedTypes.includes(extension || 'PDF')
        ? (extension as SupportedDocumentType)
        : 'PDF',
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        title: formState.title,
        category: formState.category,
        description: formState.description,
        tags: formState.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        status: formState.status,
        author: formState.author,
        owner: formState.owner,
        language: formState.language,
        collectionId: formState.collectionId || null,
        priority: Number(formState.priority) || 2,
        reviewDate: formState.reviewDate,
        expirationDate: formState.expirationDate,
        notes: formState.notes,
        fileType: formState.fileType,
        size: formState.size,
        sourceFileName: formState.sourceFileName,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
              Knowledge Platform
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-200">Document file</span>
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.txt,.csv,.md,.html"
              onChange={handleFileChange}
              className="w-full rounded-2xl border border-dashed border-white/15 bg-slate-950/70 px-4 py-4 text-sm text-slate-300"
            />
          </label>

          <Field label="Title">
            <input
              value={formState.title}
              onChange={(event) => handleChange('title', event)}
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Category">
            <input
              value={formState.category}
              onChange={(event) => handleChange('category', event)}
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Collection">
            <select
              value={formState.collectionId}
              onChange={(event) => handleChange('collectionId', event)}
              className={inputClassName}
            >
              <option value="">Unassigned</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Language">
            <select
              value={formState.language}
              onChange={(event) => handleChange('language', event)}
              className={inputClassName}
            >
              <option value="fr">French</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </Field>

          <Field label="Author">
            <input
              value={formState.author}
              onChange={(event) => handleChange('author', event)}
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Owner">
            <input
              value={formState.owner}
              onChange={(event) => handleChange('owner', event)}
              className={inputClassName}
            />
          </Field>

          <Field label="Status">
            <select
              value={formState.status}
              onChange={(event) => handleChange('status', event)}
              className={inputClassName}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'active' ? 'published' : status}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority">
            <input
              type="number"
              min={0}
              max={10}
              value={formState.priority}
              onChange={(event) => handleChange('priority', event)}
              className={inputClassName}
            />
          </Field>

          <Field label="File type">
            <select
              value={formState.fileType}
              onChange={(event) => handleChange('fileType', event)}
              className={inputClassName}
            >
              {supportedTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Size">
            <input
              value={formState.size}
              onChange={(event) => handleChange('size', event)}
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Review date">
            <input
              value={formState.reviewDate}
              onChange={(event) => handleChange('reviewDate', event)}
              placeholder="e.g. 01 Aug 2026"
              className={inputClassName}
            />
          </Field>

          <Field label="Expiration date">
            <input
              value={formState.expirationDate}
              onChange={(event) => handleChange('expirationDate', event)}
              placeholder="e.g. 01 Aug 2027"
              className={inputClassName}
            />
          </Field>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-200">Description</span>
            <textarea
              value={formState.description}
              onChange={(event) => handleChange('description', event)}
              rows={4}
              className={inputClassName}
              required
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-200">Notes</span>
            <textarea
              value={formState.notes}
              onChange={(event) => handleChange('notes', event)}
              rows={3}
              className={inputClassName}
            />
          </label>

          <Field label="Tags">
            <input
              value={formState.tags}
              onChange={(event) => handleChange('tags', event)}
              placeholder="finance, contract, onboarding"
              className={inputClassName}
            />
          </Field>

          <Field label="Original file name">
            <input
              value={formState.sourceFileName}
              onChange={(event) => handleChange('sourceFileName', event)}
              className={inputClassName}
              required
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : mode === 'create' ? 'Upload document' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400';
