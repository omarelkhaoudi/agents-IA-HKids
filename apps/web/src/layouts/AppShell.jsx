import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  administrator: 'Administrator',
  manager: 'Manager',
  employee: 'Employee',
  read_only: 'Read Only',
};

const agentLinks = [
  {
    to: '/assistant?agent=administrative-assistant',
    label: 'Administrative Assistant',
    code: 'administrative-assistant',
    accent: 'bg-sky-400',
  },
  {
    to: '/sales-agent',
    label: 'Sales Agent',
    code: 'sales-agent',
    accent: 'bg-orange-400',
  },
  {
    to: '/assistant?agent=hr-agent',
    label: 'HR Agent',
    code: 'hr-agent',
    accent: 'bg-emerald-400',
  },
  {
    to: '/community-manager',
    label: 'Community Manager',
    code: 'community-manager',
    accent: 'bg-violet-400',
  },
];

export default function AppShell() {
  const { user, logout, hasMinimumRole } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('hkids.sidebar.collapsed');
    if (stored === 'true') {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('hkids.sidebar.collapsed', String(next));
      return next;
    });
  };

  const isManager = hasMinimumRole('manager');

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/community-manager')) return 'Community Manager';
    if (location.pathname.startsWith('/sales-agent')) return 'Sales Agent';
    if (location.pathname.startsWith('/administration')) return 'Administration';
    if (location.pathname.startsWith('/assistant')) return 'AI Workspace';
    if (location.pathname.startsWith('/knowledge-base')) return 'Knowledge Base';
    if (location.pathname.startsWith('/prompt-builder')) return 'Prompt Builder';
    if (location.pathname.startsWith('/feedback-dashboard')) return 'Feedback';
    if (location.pathname.startsWith('/ai-administration')) return 'Analytics';
    return 'Dashboard';
  }, [location.pathname]);

  return (
    <div
      className={[
        'app-shell min-h-screen text-slate-100',
        collapsed ? 'app-shell--collapsed' : '',
      ].join(' ')}
    >
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={[
          'app-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-[var(--bg-sidebar)] backdrop-blur-xl transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        aria-label="Primary"
      >
        <div className="flex h-[var(--topbar-height)] items-center justify-between border-b border-white/10 px-4">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-sm font-bold text-cyan-300">
              HK
            </span>
            {!collapsed ? (
              <span className="font-display truncate text-sm font-semibold tracking-tight text-white">
                H-Kids AI
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <NavItem to="/dashboard" label="Dashboard" icon="◈" collapsed={collapsed} />

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setAgentsOpen((open) => !open)}
              className={[
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
              aria-expanded={agentsOpen}
            >
              <span aria-hidden="true">✦</span>
              {!collapsed ? (
                <>
                  <span className="flex-1 text-left font-medium">AI Agents</span>
                  <span className="text-xs text-slate-500">{agentsOpen ? '−' : '+'}</span>
                </>
              ) : null}
            </button>
            {agentsOpen && !collapsed ? (
              <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-2">
                {agentLinks.map((agent) => (
                  <NavLink
                    key={agent.code}
                    to={agent.to}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition',
                        isActive || location.search.includes(agent.code)
                          ? 'bg-white/8 text-white'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                      ].join(' ')
                    }
                  >
                    <span className={['h-2 w-2 rounded-full', agent.accent].join(' ')} />
                    {agent.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
            {collapsed ? <NavItem to="/assistant" label="Agents" icon="✦" collapsed /> : null}
          </div>

          <NavItem to="/knowledge-base" label="Knowledge Base" icon="▣" collapsed={collapsed} />
          <NavItem to="/prompt-builder" label="Prompt Builder" icon="✎" collapsed={collapsed} />
          <NavItem to="/assistant" label="Workflows" icon="⇄" collapsed={collapsed} />
          <NavItem to="/feedback-dashboard" label="Feedback" icon="★" collapsed={collapsed} />
          {isManager ? (
            <NavItem to="/ai-administration" label="Analytics" icon="▦" collapsed={collapsed} />
          ) : null}
          {isManager ? (
            <NavItem to="/administration" label="Administration" icon="⚙" collapsed={collapsed} />
          ) : null}
          {isManager ? (
            <NavItem to="/administration/settings" label="Settings" icon="◎" collapsed={collapsed} />
          ) : null}
        </nav>

        <div className="border-t border-white/10 p-3">
          {!collapsed && user ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="truncate text-sm font-medium text-white">{user.name || user.email}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                {ROLE_LABELS[user.role] || user.role}
              </p>
              <button
                type="button"
                onClick={() => logout()}
                className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logout()}
              className="w-full rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5"
              aria-label="Sign out"
            >
              ⎋
            </button>
          )}
        </div>
      </aside>

      <div className="app-content min-h-screen">
        <header className="sticky top-0 z-20 flex h-[var(--topbar-height)] items-center gap-4 border-b border-white/10 bg-[var(--bg-topbar)] px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            Menu
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              Workspace
            </p>
            <h1 className="font-display truncate text-base font-semibold text-white sm:text-lg">
              {pageTitle}
            </h1>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <label className="relative">
              <span className="sr-only">Search</span>
              <input
                type="search"
                placeholder="Search..."
                className="w-44 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-400/50 lg:w-56"
              />
            </label>
            <button
              type="button"
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5"
              aria-label="Notifications"
            >
              ●
            </button>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              <span className="text-cyan-300">Anthropic</span>
              <span className="mx-1 text-slate-600">·</span>
              <span>claude-3-5-sonnet</span>
            </div>
            {user ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-semibold text-cyan-200">
                  {(user.name || user.email || 'U').slice(0, 1).toUpperCase()}
                </span>
                <div className="hidden text-left xl:block">
                  <p className="text-xs font-medium text-white">{user.name || 'Profile'}</p>
                  <p className="text-[10px] text-slate-500">{ROLE_LABELS[user.role] || user.role}</p>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <main className="page-enter mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, label, icon, collapsed }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
          collapsed ? 'justify-center' : '',
          isActive ? 'nav-item-active' : 'text-slate-300 hover:bg-white/5 hover:text-white',
        ].join(' ')
      }
    >
      <span aria-hidden="true">{icon}</span>
      {!collapsed ? <span className="font-medium">{label}</span> : null}
    </NavLink>
  );
}
