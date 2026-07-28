import { NavLink, useNavigate } from 'react-router-dom';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import { conversationHistory, sidebarSections } from '../../data/assistant';

const routeBySection: Record<string, string> = {
  'New Conversation': '/assistant',
  'Conversation History': '/assistant',
  Templates: '/prompt-builder',
  'Knowledge Base': '/knowledge-base',
  'Generated Documents': '/assistant',
  Settings: '/assistant',
};

export default function SidebarNav() {
  const navigate = useNavigate();

  return (
    <Panel className="flex h-full min-h-[780px] flex-col p-4">
      <Button fullWidth className="mb-4" onClick={() => navigate('/assistant')}>
        New Conversation
      </Button>

      <div className="space-y-2">
        {sidebarSections.map((section) => (
          <NavLink
            key={section}
            to={routeBySection[section] || '/assistant'}
            className={({ isActive }) =>
              [
                'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition',
                isActive
                  ? 'bg-cyan-400/12 text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white',
              ].join(' ')
            }
          >
            <span>{section}</span>
            {section === 'Generated Documents' ? <Badge tone="info">3</Badge> : null}
          </NavLink>
        ))}
      </div>

      <div className="mt-8 border-t border-white/10 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            Conversation History
          </h2>
          <Badge>Today</Badge>
        </div>

        <div className="space-y-3">
          {conversationHistory.map((conversation) => (
            <div
              key={conversation.id}
              className="rounded-2xl border border-white/8 bg-slate-950/60 p-4"
            >
              <p className="text-sm font-medium text-white">{conversation.title}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span className="capitalize">{conversation.category}</span>
                <span>{conversation.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
