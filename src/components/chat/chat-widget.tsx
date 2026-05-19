'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare, X, Send, Loader2, Bot, Plus, Search, Brain, ArrowLeft, Trash2, Sparkles,
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';
import { ChatMessages, type ChatMessage } from './chat-messages';
import { matchSkills, type BoltSkill } from '@/lib/bolt-skills';

type View = 'chat' | 'search' | 'memory';

interface SearchResult {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  snippet: string;
  created_at: string;
}

interface MemoryItem {
  id: string;
  kind: 'preference' | 'fact' | 'goal' | 'constraint';
  content: string;
  last_used_at: string;
  created_at: string;
}

export function ChatWidget() {
  const { currentUser, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  // Phase 3: count of unread proactive messages (drives the red dot on
  // the closed floating button). Polled while the widget is closed.
  const [unreadCount, setUnreadCount] = useState(0);

  // Slash-command autocomplete state.
  const [skillIndex, setSkillIndex] = useState(0);

  // Search state.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Memory panel state.
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);
  const nextId = useCallback(() => `msg-${++idCounter.current}`, []);

  // Skills filtered by role + current slash query.
  const role: 'admin' | 'member' = currentUser.role === 'admin' ? 'admin' : 'member';
  const slashQuery = input.startsWith('/') ? input.slice(1) : '';
  const showSkillMenu = input.startsWith('/');
  const skillMatches = useMemo(
    () => (showSkillMenu ? matchSkills(role, slashQuery) : []),
    [role, slashQuery, showSkillMenu],
  );

  // Reset skill index when matches change.
  useEffect(() => { setSkillIndex(0); }, [slashQuery, showSkillMenu]);

  // ─── History hydration ─────────────────────────────────────────────────
  const hydrateHistory = useCallback(async () => {
    if (hasHydrated) return;
    try {
      const res = await fetch('/api/chat/history');
      if (!res.ok) {
        if (res.status !== 401) console.warn('[bolt] history load failed');
        return;
      }
      const data = await res.json() as {
        messages: {
          id: string;
          role: ChatMessage['role'];
          content: string;
          is_proactive?: boolean;
          was_unread?: boolean;
        }[];
      };
      if (data.messages?.length) {
        setMessages(data.messages.map(m => ({
          id: m.id, role: m.role, content: m.content,
          isProactive: !!m.is_proactive,
          wasUnread: !!m.was_unread,
        })));
      }
      // Server marks rows read on this fetch — clear the badge.
      setUnreadCount(0);
    } catch (err) {
      console.warn('[bolt] history load error:', err);
    } finally {
      setHasHydrated(true);
    }
  }, [hasHydrated]);

  // Poll the unread count every 5 min while the widget is CLOSED.
  // While open, hydration already pulled latest + marked read. Used to
  // poll every 60s — that was 1440 calls/day per signed-in user; the
  // proactive cron only fires twice a day, so 5 min is plenty.
  useEffect(() => {
    if (isOpen) return;
    let cancelled = false;
    const tick = async () => {
      // Skip when tab is hidden — saves request churn for users who
      // leave the app open in a background tab all day.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/api/chat/unread');
        if (!res.ok) return;
        const data = await res.json() as { count: number };
        if (!cancelled) setUnreadCount(data.count ?? 0);
      } catch { /* silent */ }
    };
    void tick();
    const id = setInterval(tick, 5 * 60_000);
    // Also tick when the tab regains focus, so a user returning after
    // hours sees the badge without waiting up to 5 min.
    const onVis = () => { if (document.visibilityState === 'visible') void tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isOpen]);

  // ─── Send a message ────────────────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isStreaming) return;
    setInput('');

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: msg };
    const assistantMsg: ChatMessage = { id: nextId(), role: 'assistant', content: '' };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok) {
        let errorMsg = 'Something went wrong';
        try { errorMsg = (await res.json()).error ?? errorMsg; } catch { /* default */ }
        toast(errorMsg, 'error');
        setMessages(prev => {
          const u = [...prev];
          u[u.length - 1] = { ...u[u.length - 1], content: `Sorry, I couldn't process that: ${errorMsg}` };
          return u;
        });
        return;
      }
      if (!res.body) {
        const text = await res.text();
        setMessages(prev => {
          const u = [...prev];
          u[u.length - 1] = { ...u[u.length - 1], content: text || 'No response received.' };
          return u;
        });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const u = [...prev];
          u[u.length - 1] = { ...u[u.length - 1], content: acc };
          return u;
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      toast(`Chat error: ${errorMsg}`, 'error');
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { ...u[u.length - 1], content: 'Sorry, something went wrong. Please try again.' };
        return u;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  // ─── Skills ────────────────────────────────────────────────────────────
  const handleSkill = (skill: BoltSkill) => {
    if (skill.kind === 'action') {
      if (skill.action === 'open-memory-panel') openMemoryPanel();
      setInput('');
      return;
    }
    if (skill.prompt) {
      // Send immediately — saves a click. Users can edit if they prefer
      // by typing the prompt text themselves.
      setInput('');
      void handleSend(skill.prompt);
    }
  };

  // ─── New conversation ──────────────────────────────────────────────────
  const handleNewConversation = useCallback(async () => {
    if (isStreaming) return;
    try {
      const res = await fetch('/api/chat/new', { method: 'POST' });
      if (!res.ok) {
        toast((await res.json().catch(() => ({}))).error ?? 'Could not start a new conversation', 'error');
        return;
      }
      setMessages([]);
      toast('Started a fresh conversation', 'success');
    } catch (err) {
      toast(`Could not start: ${err instanceof Error ? err.message : 'unknown'}`, 'error');
    }
  }, [isStreaming, toast]);

  // ─── Search ────────────────────────────────────────────────────────────
  const openSearch = () => {
    setView('search');
    setSearchQuery('');
    setSearchResults([]);
    setTimeout(() => searchInputRef.current?.focus(), 80);
  };
  const runSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/chat/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) { setSearchResults([]); return; }
      const data = await res.json() as { results: SearchResult[] };
      setSearchResults(data.results);
    } catch { setSearchResults([]); }
    finally { setIsSearching(false); }
  };
  // Debounce search-as-you-type by 300ms.
  useEffect(() => {
    if (view !== 'search') return;
    const t = setTimeout(() => void runSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, view]);

  // ─── Memory panel ──────────────────────────────────────────────────────
  const openMemoryPanel = async () => {
    setView('memory');
    setIsLoadingMemory(true);
    try {
      const res = await fetch('/api/chat/memory');
      if (!res.ok) { setMemoryItems([]); return; }
      const data = await res.json() as { items: MemoryItem[] };
      setMemoryItems(data.items);
    } catch { setMemoryItems([]); }
    finally { setIsLoadingMemory(false); }
  };
  const forgetMemory = async (id: string) => {
    try {
      const res = await fetch('/api/chat/memory/forget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory_id: id }),
      });
      if (!res.ok) {
        toast('Could not forget that memory', 'error');
        return;
      }
      setMemoryItems(prev => prev.filter(m => m.id !== id));
      toast('Forgotten', 'success');
    } catch (err) {
      toast(`Could not forget: ${err instanceof Error ? err.message : 'unknown'}`, 'error');
    }
  };

  // ─── Input keybindings ─────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSkillMenu && skillMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSkillIndex(i => Math.min(skillMatches.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSkillIndex(i => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        handleSkill(skillMatches[skillIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput('');
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Open/close lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      void hydrateHistory();
    }
  }, [isOpen, hydrateHistory]);

  if (userLoading || !currentUser.id) return null;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[45] flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-all hover:bg-[var(--accent-hover)] hover:shadow-xl hover:scale-105 active:scale-95"
          aria-label={unreadCount > 0 ? `Open AI chat — ${unreadCount} new` : 'Open AI chat'}
        >
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-canvas bg-amber-500 px-1 text-[10px] font-bold text-white shadow-sm"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-4 right-4 z-[45] flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border-color bg-surface shadow-2xl sm:bottom-6 sm:right-6 sm:w-96 sm:h-[34rem] h-[calc(100vh-6rem)]">
          {/* Header */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border-color px-3">
            <div className="flex items-center gap-2">
              {view !== 'chat' ? (
                <button
                  type="button"
                  onClick={() => setView('chat')}
                  className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-neutral-100 hover:text-text"
                  aria-label="Back to chat"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft">
                  <Bot className="h-4 w-4 text-[var(--accent)]" />
                </div>
              )}
              <div>
                <span className="text-sm font-semibold text-text">
                  {view === 'chat' ? 'Bolt' : view === 'search' ? 'Search history' : "Bolt's memory"}
                </span>
                {view === 'chat' && (
                  <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700 dark:bg-green-500/20 dark:text-green-300">
                    Online
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {view === 'chat' && (
                <>
                  <button
                    type="button"
                    onClick={openSearch}
                    className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-neutral-100 hover:text-text-muted"
                    aria-label="Search conversation history"
                    title="Search history"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={openMemoryPanel}
                    className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-neutral-100 hover:text-text-muted"
                    aria-label="What Bolt remembers"
                    title="What Bolt remembers"
                  >
                    <Brain className="h-3.5 w-3.5" />
                  </button>
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleNewConversation}
                      disabled={isStreaming}
                      className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-neutral-100 hover:text-text-muted disabled:opacity-40"
                      aria-label="New conversation"
                      title="New conversation"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
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

          {/* Body — switches between chat / search / memory views */}
          {view === 'chat' && (
            <>
              <ChatMessages
                messages={messages}
                isStreaming={isStreaming}
                userName={currentUser.full_name}
                userAvatar={currentUser.avatar_url}
                onSuggestionClick={handleSend}
              />

              {/* Input */}
              <div className="relative shrink-0 border-t border-border-color px-3 py-2.5">
                {/* Slash-command autocomplete */}
                {showSkillMenu && skillMatches.length > 0 && (
                  <div className="absolute bottom-full left-3 right-3 mb-1 max-h-72 overflow-y-auto rounded-xl border border-border-color bg-surface shadow-xl">
                    <div className="border-b border-border-color px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                      Skills · {skillMatches.length} match{skillMatches.length === 1 ? '' : 'es'}
                    </div>
                    {skillMatches.map((s, i) => (
                      <button
                        key={`${s.name}-${i}`}
                        type="button"
                        onMouseEnter={() => setSkillIndex(i)}
                        onClick={() => handleSkill(s)}
                        className={cn(
                          'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors',
                          i === skillIndex ? 'bg-accent-soft' : 'hover:bg-hover',
                        )}
                      >
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-text">/{s.name}</span>
                            <span className="truncate text-[11px] text-text-muted">{s.label}</span>
                          </div>
                          <p className="truncate text-[11px] text-text-faint">{s.description}</p>
                        </div>
                      </button>
                    ))}
                    <div className="border-t border-border-color px-3 py-1.5 text-[10px] text-text-faint">
                      ↑↓ to navigate · Tab/Enter to run · Esc to cancel
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-xl border border-border-color bg-hover px-3 py-1.5 focus-within:border-[var(--accent)] focus-within:bg-surface focus-within:ring-2 focus-within:ring-[var(--accent)]/20 transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything · or type / for skills"
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
                        : 'text-text-faint',
                    )}
                    aria-label="Send message"
                  >
                    {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="mt-1 text-center text-[10px] text-text-faint">
                  Powered by Llama 3.3 via Groq · Memory & history on
                </p>
              </div>
            </>
          )}

          {view === 'search' && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b border-border-color px-3 py-2">
                <div className="flex items-center gap-2 rounded-lg border border-border-color bg-hover px-2.5 py-1.5 focus-within:border-[var(--accent)] focus-within:bg-surface">
                  <Search className="h-3.5 w-3.5 text-text-faint" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search past chats…"
                    className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
                  />
                  {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-faint" />}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {searchQuery.trim() === '' ? (
                  <p className="mt-12 text-center text-xs text-text-faint">
                    Type to search across every conversation you've had with Bolt.
                  </p>
                ) : !isSearching && searchResults.length === 0 ? (
                  <p className="mt-12 text-center text-xs text-text-faint">No matches.</p>
                ) : (
                  <ul className="space-y-2">
                    {searchResults.map(r => (
                      <li
                        key={r.id}
                        className="rounded-lg border border-border-color bg-canvas p-2.5 text-xs"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className={cn(
                            'rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                            r.role === 'user'
                              ? 'bg-[color:rgba(0,115,234,0.18)] text-[var(--accent)]'
                              : 'bg-neutral-200 text-text-muted dark:bg-neutral-700 dark:text-text-muted',
                          )}>{r.role === 'user' ? 'You' : 'Bolt'}</span>
                          <span className="text-[10px] text-text-faint">
                            {new Date(r.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-text">{r.snippet}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {view === 'memory' && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b border-border-color bg-canvas px-3 py-2 text-[11px] text-text-muted">
                Durable facts Bolt has learned about you across past chats. Forget anything that's wrong or stale.
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {isLoadingMemory ? (
                  <div className="mt-12 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-text-faint" />
                  </div>
                ) : memoryItems.length === 0 ? (
                  <p className="mt-12 text-center text-xs text-text-faint">
                    Nothing yet. Bolt will start learning as you chat.
                  </p>
                ) : (
                  (['fact', 'preference', 'goal', 'constraint'] as const).map(kind => {
                    const items = memoryItems.filter(m => m.kind === kind);
                    if (items.length === 0) return null;
                    return (
                      <div key={kind} className="mb-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                          {kind === 'fact' ? 'Facts'
                            : kind === 'preference' ? 'Preferences'
                            : kind === 'goal' ? 'Goals'
                            : 'Constraints'}
                          <span className="ml-1 text-text-muted">· {items.length}</span>
                        </p>
                        <ul className="space-y-1.5">
                          {items.map(m => (
                            <li
                              key={m.id}
                              className="group flex items-start gap-2 rounded-lg border border-border-color bg-canvas p-2 text-xs"
                            >
                              <p className="flex-1 text-text">{m.content}</p>
                              <button
                                type="button"
                                onClick={() => forgetMemory(m.id)}
                                title="Forget this"
                                aria-label="Forget this memory"
                                className="opacity-0 transition-opacity group-hover:opacity-100 text-text-faint hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
