'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { SearchDialog } from './search-dialog';
import type { ViewMode } from '@/lib/types/filters';

const SIDEBAR_STORAGE_KEY = 'taskflow-sidebar-collapsed';

interface AppShellProps {
  children: React.ReactNode;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function AppShell({ children, viewMode, onViewModeChange }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === 'true');
    }
    setMounted(true);
  }, []);

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const handleMobileToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  // Close mobile sidebar on route change (via resize as a proxy)
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent rendering mismatched content before hydration
  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Suspense>
          <Sidebar collapsed={collapsed} onToggle={handleToggle} />
        </Suspense>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Suspense>
              <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
            </Suspense>
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          onSearchOpen={() => setSearchOpen(true)}
          notificationCount={3}
        />

        {/* Mobile menu button */}
        <button
          onClick={handleMobileToggle}
          className="absolute left-3 top-3.5 z-30 rounded-md p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Search dialog */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
