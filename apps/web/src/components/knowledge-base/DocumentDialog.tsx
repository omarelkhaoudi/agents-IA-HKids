import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import type {
  KnowledgeBaseDocument,
  KnowledgeBaseDocumentPayload,
  KnowledgeBaseStatus,
  SupportedDocumentType,
} from '../../types/knowledge-base';
import Button from '../ui/Button';

const supportedTypes: SupportedDocumentType[] = ['PDF', 'DOCX', 'XLSX', 'TXT', 'CSV'];
const statuses: KnowledgeBaseStatus[] = ['active', 'review', 'archived'];

interface DocumentDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  document: KnowledgeBaseDocument | null;
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
  fileType: SupportedDocumentType;
  size: string;
  sourceFileName: string;
}

const initialState: FormState = {
  title: '',
  category: 'Administration',
  description: '',
  tags: '',
  status: 'active',
  author: 'Operations Team',
  fileType: 'PDF',
  size: '0.0 MB',
  sourceFileName: '',
};

export default function DocumentDialog({
  open,
  mode,
  document,
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
      setFormState(initialState);
      return;
    }

    setFormState({
      title: document.title,
      category: document.category,
      description: document.description,
      tags: document.tags.join(', '),
      status: document.status,
      author: document.author,
      fileType: document.fileType,
      size: document.size,
      sourceFileName: document.sourceFileName,
    });
  }, [document, mode, open]);

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
      fileType: supportedTypes.includes(extension || 'PDF') ? (extension as SupportedDocumentType) : 'PDF',
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
        className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
              Knowledge Base
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
              accept=".pdf,.docx,.xlsx,.txt,.csv"
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

          <Field label="Author">
            <input
              value={formState.author}
              onChange={(event) => handleChange('author', event)}
              className={inputClassName}
              required
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
                  {status}
                </option>
              ))}
            </select>
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
