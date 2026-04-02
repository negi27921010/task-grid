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

  // Don't render until user is loaded
  if (userLoading || !currentUser.id) return null;

  const nextId = () => {
    idCounter.current++;
    return `msg-${idCounter.current}`;
  };

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
      const reader = res.body!.getReader();
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

  const handleClear = () => {
    setMessages([]);
  };

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[45] flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl hover:scale-105 active:scale-95"
          aria-label="Open AI chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-[45] flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:w-96 sm:h-[32rem] h-[calc(100vh-6rem)]">
          {/* Header */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
                <Bot className="h-4 w-4 text-blue-700" />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-900">TaskFlow AI</span>
                <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700">Online</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Clear chat"
                  title="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
          <div className="shrink-0 border-t border-slate-100 px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about tasks, projects..."
                className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                disabled={isStreaming}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                  input.trim() && !isStreaming
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-slate-300'
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
            <p className="mt-1 text-center text-[10px] text-slate-400">
              Powered by Llama 3.3 via Groq
            </p>
          </div>
        </div>
      )}
    </>
  );
}
