import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AgentCard from '../components/AgentCard';
import MetricCard from '../components/ui/MetricCard';
import Panel from '../components/ui/Panel';
import Skeleton from '../components/ui/Skeleton';
import { getAdminDashboard } from '../api/admin';
import { useAuth } from '../context/AuthContext';

const agents = [
  {
    title: 'Administrative Assistant',
    description:
      'Quotations, invoices, administrative letters, and governed document workflows with human validation.',
    accent: 'blue',
    icon: 'AD',
    workspaceTo: '/assistant?agent=administrative-assistant',
    stats: 'Docs & letters',
  },
  {
    title: 'Sales Agent',
    description:
      'Lead qualification, proposals, product suggestions, and follow-up drafts for commercial teams.',
    accent: 'orange',
    icon: 'SA',
    workspaceTo: '/assistant?agent=sales-agent',
    stats: 'Proposals',
  },
  {
    title: 'HR Agent',
    description:
      'HR letters, job descriptions, absence follow-up, and staff documents under controlled review.',
    accent: 'emerald',
    icon: 'HR',
    workspaceTo: '/assistant?agent=hr-agent',
    stats: 'HR drafts',
  },
  {
    title: 'Community Manager',
    description:
      'Editorial calendars, publication drafts, story ideas, and comment responses for brand channels.',
    accent: 'purple',
    icon: 'CM',
    workspaceTo: '/community-manager',
    stats: 'Content',
  },
];

const quickAccess = [
  { to: '/assistant', label: 'Open Workspace', hint: 'Start a governed conversation' },
  { to: '/knowledge-base', label: 'Knowledge Base', hint: 'Browse indexed documents' },
  { to: '/prompt-builder', label: 'Prompt Builder', hint: 'Edit and version prompts' },
  { to: '/feedback-dashboard', label: 'Feedback', hint: 'Review corrections & patterns' },
];

export default function DashboardPage() {
  const { user, hasMinimumRole } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!hasMinimumRole('manager')) {
        setLoading(false);
        return;
      }

      try {
        const dashboard = await getAdminDashboard();
        if (!cancelled) {
          setStats(dashboard);
        }
      } catch {
        if (!cancelled) {
          setStats(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [hasMinimumRole]);

  const firstName = (user?.name || user?.email || 'there').split(' ')[0];

  return (
    <section className="space-y-8">
      <Panel className="relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Welcome back
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Hello, {firstName}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              Your multi-agent H-Kids platform is ready. Prepare drafts, retrieve knowledge, run
              workflows, and keep every output under human validation before export.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/assistant"
                className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Open Agent Workspace
              </Link>
              <Link
                to="/knowledge-base"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                Browse Knowledge
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              System status
            </p>
            <p className="mt-2 text-lg font-semibold text-white">Operational</p>
            <p className="mt-1 text-xs text-slate-400">
              Claude default · RAG online · Workflows ready
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[1.25rem]" />
          ))
        ) : (
          <>
            <MetricCard
              label="Agents"
              value={String(stats?.totalAgents ?? 4)}
              hint="Active blueprints"
              accent="blue"
            />
            <MetricCard
              label="Documents generated"
              value={String(stats?.totalGeneratedDocuments ?? 0)}
              hint="Across all agents"
              accent="cyan"
            />
            <MetricCard
              label="AI requests"
              value={String(stats?.totalRequests ?? 0)}
              hint="Tracked usage"
              accent="purple"
            />
            <MetricCard
              label="AI usage cost"
              value={`$${(stats?.totalAiCost ?? 0).toFixed(4)}`}
              hint="Estimated total"
              accent="orange"
            />
            <MetricCard
              label="Avg response"
              value={`${Math.round(stats?.averageResponseMs ?? 0)} ms`}
              hint="Gateway latency"
              accent="emerald"
            />
            <MetricCard
              label="Feedback"
              value={String(stats?.totalFeedbacks ?? 0)}
              hint="Learning signals"
              accent="purple"
            />
            <MetricCard label="Provider" value="Claude" hint="Default Anthropic" accent="cyan" />
            <MetricCard
              label="Knowledge base"
              value={String(stats?.knowledgeBaseDocuments ?? 0)}
              hint="Indexed documents"
              accent="blue"
            />
          </>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">AI Agents</h2>
            <p className="mt-1 text-sm text-slate-400">
              Each agent inherits gateway, retrieval, workflow, and feedback controls.
            </p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard key={agent.title} {...agent} enabled />
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-6">
          <h2 className="font-display text-lg font-semibold text-white">Recent activity</h2>
          <ol className="mt-5 space-y-4">
            {[
              'Platform ready — migrations and health checks available',
              'Multi-agent workspace sharing Claude as default provider',
              'Human validation required before document export',
              'Feedback loop active for prompt and pattern improvements',
            ].map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-[11px] font-semibold text-cyan-300">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-slate-300">{item}</p>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel className="p-6">
          <h2 className="font-display text-lg font-semibold text-white">Quick access</h2>
          <div className="mt-5 grid gap-3">
            {quickAccess.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="hover-lift rounded-2xl border border-white/10 bg-white/4 px-4 py-3 transition"
              >
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
