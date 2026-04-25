'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';
import { ChatMessages, type ChatMessage } from './chat-messages';

export function ChatWidget() {
  const { currentUser, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  const nextId = useCallback(() => {
    idCounter.current++;
    return `msg-${idCounter.current}`;
  }, []);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isStreaming) return;
    setInput('');

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: msg };
    const assistantMsg: ChatMessage = { id: nextId(), role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    try {
      // Build history (last 5 messages, excluding the ones we just added)
      const historyMsgs = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: historyMsgs }),
      });

      if (!res.ok) {
        let errorMsg = 'Something went wrong';
        try {
          const errData = await res.json();
          errorMsg = errData.error ?? errorMsg;
        } catch { /* use default */ }

        toast(errorMsg, 'error');
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `Sorry, I couldn't process your request: ${errorMsg}`,
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      // Stream the response
      if (!res.body) {
        const text = await res.text();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: text || 'No response received.' };
          return updated;
        });
        setIsStreaming(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const content = accumulated;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content };
          return updated;
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      toast(`Chat error: ${errorMsg}`, 'error');
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Sorry, something went wrong. Please try again.',
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = useCallback(() => {
    setMessages([]);
  }, []);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Don't render until user is loaded
  if (userLoading || !currentUser.id) return null;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[45] flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-all hover:bg-[var(--accent-hover)] hover:shadow-xl hover:scale-105 active:scale-95"
          aria-label="Open AI chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-[45] flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border-color bg-surface shadow-2xl sm:bottom-6 sm:right-6 sm:w-96 sm:h-[32rem] h-[calc(100vh-6rem)]">
          {/* Header */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border-color px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft">
                <Bot className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <span className="text-sm font-semibold text-text">Task Grid AI</span>
                <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700 dark:bg-green-500/20 dark:text-green-300">Online</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-neutral-100 hover:text-text-muted"
                  aria-label="Clear chat"
                  title="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-neutral-100 hover:text-text-muted"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <ChatMessages
            messages={messages}
            isStreaming={isStreaming}
            userName={currentUser.full_name}
            userAvatar={currentUser.avatar_url}
            onSuggestionClick={handleSend}
          />

          {/* Input */}
          <div className="shrink-0 border-t border-border-color px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-border-color bg-hover px-3 py-1.5 focus-within:border-[var(--accent)] focus-within:bg-surface focus-within:ring-2 focus-within:ring-[var(--accent)]/20 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about tasks, projects..."
                className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
                disabled={isStreaming}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                  input.trim() && !isStreaming
                    ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                    : 'text-text-faint'
                )}
                aria-label="Send message"
              >
                {isStreaming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-1 text-center text-[10px] text-text-faint">
              Powered by Llama 3.3 via Groq
            </p>
          </div>
        </div>
      )}
    </>
  );
}
