import type { ConversationMessage } from '../../types/assistant';
import Badge from '../ui/Badge';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: ConversationMessage[];
  typing: boolean;
}

export default function MessageList({ messages, typing }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isUser = message.role === 'user';
        const isSystem = message.role === 'system';

        return (
          <div
            key={message.id}
            className={[
              'flex',
              isUser ? 'justify-end' : 'justify-start',
              isSystem ? 'justify-center' : '',
            ].join(' ')}
          >
            {isSystem ? (
              <div className="rounded-full border border-cyan-400/15 bg-cyan-400/8 px-4 py-2 text-xs uppercase tracking-[0.25em] text-cyan-200">
                {message.content}
              </div>
            ) : (
              <div
                className={[
                  'max-w-3xl rounded-3xl px-5 py-4 shadow-lg',
                  isUser
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-white/10 bg-slate-950/75 text-slate-100',
                ].join(' ')}
              >
                <div className="mb-3 flex items-center gap-3">
                  <Badge tone={isUser ? 'success' : 'info'}>
                    {isUser ? 'User' : 'Assistant'}
                  </Badge>
                  <span
                    className={[
                      'text-xs',
                      isUser ? 'text-slate-800/70' : 'text-slate-500',
                    ].join(' ')}
                  >
                    {message.createdAt}
                  </span>
                </div>
                <p className="text-sm leading-7">{message.content}</p>
              </div>
            )}
          </div>
        );
      })}

      {typing ? (
        <div className="flex justify-start">
          <TypingIndicator />
        </div>
      ) : null}
    </div>
  );
}
