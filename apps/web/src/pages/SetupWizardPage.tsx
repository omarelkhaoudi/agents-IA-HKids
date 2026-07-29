import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeSetup } from '../api/setup';

interface SetupWizardProps {
  onCompleted?: () => void;
}

export default function SetupWizardPage({ onCompleted }: SetupWizardProps) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    companyName: 'H-Kids',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    administratorName: 'H-Kids Administrator',
    administratorEmail: 'admin@hkids.app',
    administratorPassword: '',
    anthropicApiKey: '',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-latest',
    language: 'French',
    timezone: 'Africa/Casablanca',
    currency: 'MAD',
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await completeSetup(form);
      onCompleted?.();
      navigate('/login', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to complete setup.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl space-y-6 rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl"
      >
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">First-run setup</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Installation wizard</h1>
          <p className="mt-2 text-sm text-slate-400">
            Configure company information, administrator access, and Claude as the default provider.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Company name" value={form.companyName} onChange={(value) => updateField('companyName', value)} required />
          <Field label="Company email" value={form.companyEmail} onChange={(value) => updateField('companyEmail', value)} />
          <Field label="Company phone" value={form.companyPhone} onChange={(value) => updateField('companyPhone', value)} />
          <Field label="Company address" value={form.companyAddress} onChange={(value) => updateField('companyAddress', value)} />
          <Field label="Administrator name" value={form.administratorName} onChange={(value) => updateField('administratorName', value)} required />
          <Field label="Administrator email" value={form.administratorEmail} onChange={(value) => updateField('administratorEmail', value)} required type="email" />
          <Field label="Administrator password" value={form.administratorPassword} onChange={(value) => updateField('administratorPassword', value)} required type="password" />
          <Field label="Anthropic API key" value={form.anthropicApiKey} onChange={(value) => updateField('anthropicApiKey', value)} type="password" />
          <Field label="Default provider" value={form.defaultProvider} onChange={(value) => updateField('defaultProvider', value)} required />
          <Field label="Default model" value={form.defaultModel} onChange={(value) => updateField('defaultModel', value)} required />
          <Field label="Language" value={form.language} onChange={(value) => updateField('language', value)} required />
          <Field label="Timezone" value={form.timezone} onChange={(value) => updateField('timezone', value)} required />
          <Field label="Currency" value={form.currency} onChange={(value) => updateField('currency', value)} required />
        </section>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Complete installation'}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm text-slate-300">
      <span className="mb-2 block">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
      />
    </label>
  );
}
