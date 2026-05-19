'use client';

import { useEffect, useRef } from 'react';
import { Bot, Sparkles, Zap } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/cn';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // Phase 3: agent-initiated nudge (cron-driven, not a reply to a user
  // turn). Renders with a "Bolt reached out" badge.
  isProactive?: boolean;
  // Phase 3: was unread when the user opened this widget — hint to the
  // UI to draw attention to this row in the current paint.
  wasUnread?: boolean;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  userName: string;
  userAvatar?: string | null;
  onSuggestionClick: (text: string) => void;
}

const SUGGESTIONS = [
  'What are my overdue tasks?',
  'Summarize today\'s standups',
  'Show blocked tasks',
  'Who is on my team?',
];

function MarkdownLite({ text }: { text: string }) {
  // Simple markdown: bold (**text**), bullet points (- item), line breaks
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        const isBullet = /^[\-\*]\s/.test(line.trim());
        const content = line.replace(/^[\-\*]\s/, '');

        // Bold
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        });

        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-1.5 pl-1">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
              <span>{rendered}</span>
            </div>
          );
        }

        return <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}

export function ChatMessages({
  messages,
  isStreaming,
  userName,
  userAvatar,
  onSuggestionClick,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="rounded-full bg-accent-soft p-3 mb-3">
          <Sparkles className="h-6 w-6 text-[var(--accent)]" />
        </div>
        <h3 className="text-sm font-semibold text-text mb-1">Task Grid AI</h3>
        <p className="text-xs text-text-muted text-center mb-5">
          Ask me anything about your tasks, projects, standups, or team.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggestionClick(s)}
              className="rounded-full border border-border-color bg-surface px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-[var(--accent)]/40 hover:bg-accent-soft hover:text-[var(--accent)]"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            'flex gap-2.5',
            msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
          )}
        >
          {/* Avatar */}
          {msg.role === 'assistant' ? (
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft">
              <Bot className="h-4 w-4 text-[var(--accent)]" />
            </div>
          ) : (
            <Avatar fullName={userName} src={userAvatar} size="sm" />
          )}

          {/* Message bubble */}
          <div className="max-w-[80%]">
            {msg.role === 'assistant' && msg.isProactive && (
              <span
                className={cn(
                  'mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  msg.wasUnread
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                    : 'bg-neutral-200 text-text-muted dark:bg-neutral-700',
                )}
              >
                <Zap className="h-2.5 w-2.5" />
                Bolt reached out{msg.wasUnread ? ' · new' : ''}
              </span>
            )}
            <div
              className={cn(
                'rounded-xl px-3.5 py-2.5 text-sm',
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-white rounded-br-sm'
                  : msg.isProactive && msg.wasUnread
                    ? 'bg-amber-50 ring-1 ring-amber-200 text-text rounded-bl-sm dark:bg-amber-500/10 dark:ring-amber-500/30'
                    : 'bg-neutral-100 text-text rounded-bl-sm dark:bg-neutral-800',
              )}
            >
              {msg.role === 'assistant' ? (
                msg.content ? (
                  <MarkdownLite text={msg.content} />
                ) : (
                  <StreamingDots />
                )
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Streaming indicator on last assistant message */}
      {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content && (
        <div className="flex items-center gap-1 pl-10 text-xs text-text-faint">
          <span className="h-1 w-1 rounded-full bg-[var(--accent)] animate-pulse" />
          <span>typing</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-text-faint animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-text-faint animate-pulse" style={{ animationDelay: '150ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-text-faint animate-pulse" style={{ animationDelay: '300ms' }} />
    </span>
  );
}
