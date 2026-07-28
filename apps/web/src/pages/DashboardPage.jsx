import { Link } from 'react-router-dom';
import ModuleCard from '../components/ModuleCard';

const modules = [
  {
    title: 'Administrative Assistant',
    description: 'Active prototype for quotations, invoices, administrative letters, and document workflows.',
    enabled: true,
  },
  {
    title: 'Community Manager',
    description: 'Active prototype for editorial calendars, publication drafts, story ideas, and comment responses.',
    enabled: true,
  },
  {
    title: 'Sales Agent',
    description: 'Active prototype for lead qualification, proposals, product suggestions, and follow-up drafts.',
    enabled: true,
  },
  {
    title: 'HR Agent',
    description: 'Active prototype for HR letters, job descriptions, absence follow-up, and staff documents.',
    enabled: true,
  },
];

export default function DashboardPage() {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            H-Kids AI agent platform
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
            The platform now supports a governed multi-agent prototype with Community, Administrative,
            Sales, and HR workspaces sharing the same AI, retrieval, workflow, feedback, and
            administration foundations.
          </p>
        </div>

        <Link
          to="/assistant"
          className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Open Agent Workspace
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