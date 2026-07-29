import type { ChangeEvent } from 'react';
import type { DocumentFilters, KnowledgeCollection } from '../../types/knowledge-base';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

interface DocumentSearchToolbarProps {
  filters: DocumentFilters;
  categories: string[];
  collections?: KnowledgeCollection[];
  tags?: string[];
  onFilterChange: (filters: DocumentFilters) => void;
  onOpenUpload: () => void;
}

export default function DocumentSearchToolbar({
  filters,
  categories,
  collections = [],
  tags = [],
  onFilterChange,
  onOpenUpload,
}: DocumentSearchToolbarProps) {
  const handleFieldChange = (
    field: keyof DocumentFilters,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    onFilterChange({
      ...filters,
      [field]: event.target.value,
    });
  };

  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-4">
        <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block xl:col-span-2">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Enterprise search
            </span>
            <input
              data-knowledge-search="true"
              value={filters.search}
              onChange={(event) => handleFieldChange('search', event)}
              placeholder="Title, content, tags..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Category
            </span>
            <select
              value={filters.category}
              onChange={(event) => handleFieldChange('category', event)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Status
            </span>
            <select
              value={filters.status}
              onChange={(event) => handleFieldChange('status', event)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="active">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Collection
            </span>
            <select
              value={filters.collectionId || ''}
              onChange={(event) => handleFieldChange('collectionId', event)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="">All collections</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Owner</span>
            <input
              value={filters.owner || ''}
              onChange={(event) => handleFieldChange('owner', event)}
              placeholder="Owner / author"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Language
            </span>
            <select
              value={filters.language || ''}
              onChange={(event) => handleFieldChange('language', event)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="">All languages</option>
              <option value="fr">French</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Tag</span>
            <select
              value={filters.tag || ''}
              onChange={(event) => handleFieldChange('tag', event)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="">All tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Sort</span>
            <select
              value={filters.sort || 'updated'}
              onChange={(event) => handleFieldChange('sort', event)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="updated">Recently updated</option>
              <option value="views">Most viewed</option>
              <option value="ai">Most used by AI</option>
              <option value="title">Title</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              File type
            </span>
            <select
              value={filters.fileType}
              onChange={(event) => handleFieldChange('fileType', event)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="">All types</option>
              <option value="PDF">PDF</option>
              <option value="DOCX">DOCX</option>
              <option value="XLSX">XLSX</option>
              <option value="TXT">TXT</option>
              <option value="CSV">CSV</option>
              <option value="MD">Markdown</option>
              <option value="HTML">HTML</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end">
          <Button onClick={onOpenUpload}>Upload Document</Button>
        </div>
      </div>
    </Panel>
  );
}
