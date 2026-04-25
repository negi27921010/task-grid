'use client';

import { useCallback, useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { RefinedSidebar } from './refined-sidebar';
import { CommandPalette } from './command-palette';
import { cn } from '@/lib/utils/cn';

const SIDEBAR_STORAGE_KEY = 'taskflow-refined-sidebar-width';
const SIDEBAR_DEFAULT = 240;
const SIDEBAR_COLLAPSED = 64;

interface RefinedAppShellProps {
  children: React.ReactNode;
  // Optional content rendered inside the page header zone — pages own their
  // header so they can supply tabs, subtitles, or page-specific affordances.
  // The shell itself only owns the sidebar + command palette + chrome.
  className?: string;
}

export function RefinedAppShell({ children, className }: RefinedAppShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_DEFAULT);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate persisted sidebar width
  useEffect(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (v) {
        const n = Number(v);
        if (Number.isFinite(n) && n >= SIDEBAR_COLLAPSED && n <= 320) {
          setSidebarWidth(n);
        }
      }
    } catch {
      /* localStorage unavailable */
    }
    setMounted(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarWidth((prev) => {
      const next = prev <= 80 ? SIDEBAR_DEFAULT : SIDEBAR_COLLAPSED;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
  }, []);

  // Close mobile drawer when crossing the lg breakpoint.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Cmd/Ctrl + K opens the palette globally.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Avoid hydration flash for the persisted sidebar width.
  if (!mounted) return null;

  return (
    <div className={cn('flex h-full bg-canvas text-text', className)}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <RefinedSidebar width={sidebarWidth} onToggle={toggleSidebar} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <RefinedSidebar width={SIDEBAR_DEFAULT} onToggle={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile menu button — placed inside the page so it floats over the
            page's own header with subtle styling. */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open sidebar"
          className="absolute left-3 top-3 z-30 rounded-md p-1.5 text-text-muted transition-colors hover:bg-hover hover:text-text lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

// Convenience hook for page code that wants to trigger the palette without
// listening for the global shortcut (e.g. clicking a Search button in the
// page-level toolbar).
export function useCommandPalette() {
  // Dispatches a synthetic keydown the global handler picks up. Keeps the
  // palette state private to RefinedAppShell so pages don't have to lift it.
  return () => {
    const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
    window.dispatchEvent(e);
  };
}
