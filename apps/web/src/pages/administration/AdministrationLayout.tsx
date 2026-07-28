import { Link, NavLink, Outlet } from 'react-router-dom';
import Panel from '../../components/ui/Panel';

const adminNav = [
  { to: '/administration/dashboard', label: 'Dashboard' },
  { to: '/administration/agents', label: 'Gestion des Agents' },
  { to: '/administration/settings', label: 'Paramètres' },
  { to: '/administration/statistics', label: 'Statistiques' },
];

export default function AdministrationLayout() {
  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
          Administration
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
          Governance Console
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Console centrale pour gérer les agents IA, les paramètres système et les statistiques
          plateforme sans modifier le code.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'rounded-full px-4 py-2 text-sm transition',
                  isActive ? 'bg-cyan-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/ai-administration"
            className="rounded-full bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
          >
            Administration IA
          </Link>
        </div>
      </Panel>

      <Outlet />
    </div>
  );
}
