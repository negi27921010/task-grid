'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border px-1.5 text-[11px] font-medium leading-none',
        'border-[var(--kbd-border)] bg-[var(--kbd-bg)] text-[var(--kbd-fg)]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

// Detect mac so we can render ⌘ vs Ctrl correctly.
// Browser-only — defaults to non-mac during SSR. Hydration matches the
// first client render, then updates once. Suppressed warning is intentional.
export function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.platform || navigator.userAgent : '';
    setIsMac(/Mac|iPod|iPhone|iPad/.test(ua));
  }, []);
  return isMac;
}

interface ShortcutKbdProps {
  // E.g. "cmd+k" or "shift+enter". Recognized tokens:
  //   cmd  → ⌘ on mac, Ctrl on windows
  //   alt  → ⌥ on mac, Alt on windows
  //   shift → ⇧ on mac, Shift on windows
  //   enter → ↵
  //   esc  → Esc
  //   up/down/left/right → arrow glyphs
  //   any single char → uppercased
  shortcut: string;
  className?: string;
  separator?: React.ReactNode;
}

const MAC_GLYPHS: Record<string, string> = {
  cmd: '⌘', alt: '⌥', shift: '⇧',
  enter: '↵', esc: 'Esc',
  up: '↑', down: '↓', left: '←', right: '→',
};

const WIN_GLYPHS: Record<string, string> = {
  cmd: 'Ctrl', alt: 'Alt', shift: 'Shift',
  enter: '↵', esc: 'Esc',
  up: '↑', down: '↓', left: '←', right: '→',
};

export function ShortcutKbd({ shortcut, className, separator }: ShortcutKbdProps) {
  const isMac = useIsMac();
  const map = isMac ? MAC_GLYPHS : WIN_GLYPHS;
  const parts = shortcut.split('+').map((p) => p.trim().toLowerCase());

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {parts.map((p, i) => (
        <span key={`${p}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 && (separator ?? <span className="text-text-faint">+</span>)}
          <Kbd>{map[p] ?? p.toUpperCase()}</Kbd>
        </span>
      ))}
    </span>
  );
}
