import { useState } from 'react';
import { downloadAdminExport } from '../../api/admin';
import Panel from '../../components/ui/Panel';

const exportTypes = [
  { type: 'ai-usage', label: 'AI usage' },
  { type: 'feedback', label: 'Feedback' },
  { type: 'statistics', label: 'Statistics' },
  { type: 'generated-documents', label: 'Generated documents' },
] as const;

export default function AdminExportsPage() {
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleExport(
    type: (typeof exportTypes)[number]['type'],
    format: 'json' | 'csv'
  ) {
    const key = `${type}:${format}`;
    setBusyKey(key);
    setMessage('');
    setError('');
    try {
      await downloadAdminExport(type, format);
      setMessage(`Exported ${type} as ${format.toUpperCase()}.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Export failed.');
    } finally {
      setBusyKey('');
    }
  }

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <h2 className="text-lg font-semibold text-white">Administrator exports</h2>
        <p className="mt-2 text-sm text-slate-400">
          Download platform data as CSV or JSON for audit, reporting, and backup enrichment.
        </p>
        {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {exportTypes.map((item) => (
          <Panel key={item.type} className="p-5">
            <h3 className="text-base font-semibold text-white">{item.label}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(busyKey)}
                onClick={() => void handleExport(item.type, 'json')}
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
              >
                {busyKey === `${item.type}:json` ? 'Exporting...' : 'JSON'}
              </button>
              <button
                type="button"
                disabled={Boolean(busyKey)}
                onClick={() => void handleExport(item.type, 'csv')}
                className="rounded-full bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busyKey === `${item.type}:csv` ? 'Exporting...' : 'CSV'}
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
