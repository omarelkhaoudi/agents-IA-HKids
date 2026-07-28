import { useEffect, useState } from 'react';
import { getAdminSettings, updateAdminSettings } from '../../api/admin';
import type { AdminSettings } from '../../types/admin';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';

const settingFields = [
  { key: 'default_provider', label: 'Provider par défaut' },
  { key: 'default_model', label: 'Modèle par défaut' },
  { key: 'enable_streaming', label: 'Streaming (true/false)' },
  { key: 'max_retries', label: 'Retry' },
  { key: 'request_timeout_ms', label: 'Timeout (ms)' },
  { key: 'default_language', label: 'Langue par défaut' },
  { key: 'company_name', label: 'Nom de la société' },
  { key: 'company_address', label: 'Adresse' },
  { key: 'company_phone', label: 'Téléphone' },
  { key: 'company_email', label: 'Email' },
  { key: 'company_logo', label: 'Logo (URL)' },
  { key: 'legal_information', label: 'Informations légales' },
  { key: 'vat_number', label: 'TVA' },
  { key: 'currency', label: 'Devise' },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getAdminSettings();
      setSettings(data.settings);
    }

    void load();
  }, []);

  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      const data = await updateAdminSettings(settings);
      setSettings(data.settings);
      setMessage('Paramètres enregistrés. Toutes les valeurs sont modifiables depuis cette interface.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="p-5">
      <h2 className="text-lg font-semibold text-white">Paramètres système</h2>
      <p className="mt-2 text-sm text-slate-400">
        Modifiez la configuration plateforme sans toucher au code source.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {settingFields.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
              {field.label}
            </span>
            <input
              value={settings[field.key] || ''}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Button onClick={() => void save()} disabled={busy}>
          Enregistrer les paramètres
        </Button>
        {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
      </div>
    </Panel>
  );
}
