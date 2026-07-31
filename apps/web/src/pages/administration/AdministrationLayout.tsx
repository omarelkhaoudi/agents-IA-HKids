import { Link, NavLink, Outlet } from 'react-router-dom';
import Panel from '../../components/ui/Panel';

const adminNav = [
  { to: '/administration/dashboard', label: 'Overview' },
  { to: '/administration/observability', label: 'Observability' },
  { to: '/administration/agents', label: 'Users & Agents' },
  { to: '/ai-administration', label: 'Providers & Models' },
  { to: '/administration/system-status', label: 'Logs & Security' },
  { to: '/administration/statistics', label: 'Metrics' },
  { to: '/administration/exports', label: 'Backup & Exports' },
  { to: '/administration/settings', label: 'Configuration' },
];

export default function AdministrationLayout() {
  return (
    <div className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Administration
        </p>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Governance Console
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Enterprise controls for agents, providers, metrics, security posture, backups, and platform
          configuration — without changing application code.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'rounded-full px-4 py-2 text-sm transition',
                  isActive
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/ai-administration"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
          >
            API Keys & Usage
          </Link>
        </div>
      </Panel>

      <Outlet />
    </div>
  );
}
