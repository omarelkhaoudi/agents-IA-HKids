import type { ChangeEvent } from 'react';
import type { DocumentFilters } from '../../types/knowledge-base';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

interface DocumentSearchToolbarProps {
  filters: DocumentFilters;
  categories: string[];
  onFilterChange: (filters: DocumentFilters) => void;
  onOpenUpload: () => void;
}

export default function DocumentSearchToolbar({
  filters,
  categories,
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              Search
            </span>
            <input
              value={filters.search}
              onChange={(event) => handleFieldChange('search', event)}
              placeholder="Search title, tags, description..."
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
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="archived">Archived</option>
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
            </select>
          </label>
        </div>

        <Button onClick={onOpenUpload}>Upload Document</Button>
      </div>
    </Panel>
  );
}
