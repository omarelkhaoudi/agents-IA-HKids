import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard', minRole: 'read_only' },
  { to: '/assistant', label: 'Administrative Assistant', minRole: 'read_only' },
  { to: '/knowledge-base', label: 'Knowledge Base', minRole: 'read_only' },
  { to: '/prompt-builder', label: 'Prompt Builder', minRole: 'read_only' },
  { to: '/feedback-dashboard', label: 'Feedback Dashboard', minRole: 'read_only' },
  { to: '/ai-administration', label: 'Administration IA', minRole: 'manager' },
  { to: '/administration', label: 'Administration', minRole: 'manager' },
];

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  administrator: 'Administrator',
  manager: 'Manager',
  employee: 'Employee',
  read_only: 'Read Only',
};

export default function AppShell() {
  const { user, logout, hasMinimumRole } = useAuth();
  const visibleNavigation = navigationItems.filter((item) => hasMinimumRole(item.minRole));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-lg font-semibold tracking-tight">
            H-Kids AI Platform
          </Link>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2">
              {visibleNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded-full px-4 py-2 text-sm transition',
                      isActive ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-white/5',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            {user ? (
              <div className="flex items-center gap-3 border-l border-white/10 pl-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.name || user.email}</p>
                  <p className="text-xs text-slate-400">
                    {ROLE_LABELS[user.role] || user.role}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
