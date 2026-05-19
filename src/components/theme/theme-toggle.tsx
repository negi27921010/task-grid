'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';
import { cn } from '@/lib/utils/cn';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Pill-shaped theme toggle that animates the icon swap.
 * Antigravity-aligned: rounded-pill, soft surface, accent glow on hover.
 */
export function ThemeToggle({ className, size = 'md' }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const dimensions = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex items-center justify-center',
        'rounded-[var(--radius-pill)] border border-border-color bg-surface text-text-muted',
        'shadow-[var(--shadow-xs)]',
        'hover:bg-hover hover:text-text hover:border-border-strong hover:shadow-[var(--shadow-sm)]',
        'active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
        'transition-[background-color,border-color,color,box-shadow,transform]',
        'duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]',
        dimensions,
        className,
      )}
    >
      {isDark ? (
        <Sun
          key="sun"
          className={cn(iconSize, 'text-[var(--brand-yellow)] animate-theme-icon-in')}
        />
      ) : (
        <Moon
          key="moon"
          className={cn(iconSize, 'text-[var(--accent)] animate-theme-icon-in')}
        />
      )}
    </button>
  );
}
