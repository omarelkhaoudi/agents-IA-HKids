import type { AssistantSession } from '../../types/assistant-runtime';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

interface ConversationSidebarProps {
  sessions: AssistantSession[];
  selectedSessionId: string | null;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
}

export default function ConversationSidebar({
  sessions,
  selectedSessionId,
  onCreateSession,
  onSelectSession,
}: ConversationSidebarProps) {
  return (
    <Panel className="flex h-full min-h-[860px] flex-col p-4">
      <Button fullWidth onClick={onCreateSession}>
        New Conversation
      </Button>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            Conversation Sessions
          </p>
          <p className="mt-1 text-sm text-slate-500">Stored in active runtime memory</p>
        </div>
        <Badge tone="info">{sessions.length}</Badge>
      </div>

      <div className="custom-scrollbar mt-5 flex-1 space-y-3 overflow-y-auto">
        {sessions.map((session) => {
          const isSelected = session.id === selectedSessionId;

          return (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
              className={[
                'w-full rounded-2xl border p-4 text-left transition',
                isSelected
                  ? 'border-cyan-400/35 bg-cyan-400/10'
                  : 'border-white/10 bg-slate-950/60 hover:bg-white/5',
              ].join(' ')}
            >
              <p className="text-sm font-semibold text-white">{session.title}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                {session.provider} | {session.model}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                {session.messages.length} messages | Updated{' '}
                {new Date(session.updatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
