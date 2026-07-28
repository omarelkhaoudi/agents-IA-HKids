import { Link, NavLink, Outlet } from 'react-router-dom';

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/assistant', label: 'Administrative Assistant' },
  { to: '/knowledge-base', label: 'Knowledge Base' },
  { to: '/prompt-builder', label: 'Prompt Builder' },
  { to: '/feedback-dashboard', label: 'Feedback Dashboard' },
  { to: '/ai-administration', label: 'Administration IA' },
];

export default function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-lg font-semibold tracking-tight">
            H-Kids AI Platform
          </Link>
          <nav className="flex items-center gap-2">
            {navigationItems.map((item) => (
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
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
