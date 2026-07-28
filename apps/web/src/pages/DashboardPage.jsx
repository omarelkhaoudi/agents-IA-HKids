import { Link } from 'react-router-dom';
import ModuleCard from '../components/ModuleCard';

const modules = [
  {
    title: 'Administrative Assistant',
    description:
      'The first active H-Kids module, prepared as the operational entry point for future administrative workflows.',
    enabled: true,
  },
  {
    title: 'Community Manager',
    description: 'Reserved for future social engagement, moderation, and content assistance features.',
    enabled: false,
  },
  {
    title: 'Sales Agent',
    description: 'Reserved for future lead qualification, follow-up orchestration, and CRM support.',
    enabled: false,
  },
  {
    title: 'HR Agent',
    description: 'Reserved for future recruitment support, staff administration, and internal workflows.',
    enabled: false,
  },
];

export default function DashboardPage() {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            AI modules for H-Kids
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
            This foundation emphasizes maintainable architecture and progressive delivery. Only the
            Administrative Assistant is active in this first release.
          </p>
        </div>

        <Link
          to="/assistant"
          className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Open Administrative Assistant
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {modules.map((module) => (
          <ModuleCard key={module.title} {...module} />
        ))}
      </div>
    </section>
  );
}
