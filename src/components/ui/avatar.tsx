'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils/cn';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Stable, name-derived hue from the Antigravity supporting palette.
 * Same name → same color across the app.
 */
const ACCENT_BG: Array<{ bg: string; fg: string }> = [
  { bg: 'bg-[rgba(49,134,255,0.18)]', fg: 'text-[var(--accent)]' },
  { bg: 'bg-[rgba(0,185,92,0.18)]',   fg: 'text-[var(--brand-green)]' },
  { bg: 'bg-[rgba(252,65,61,0.18)]',  fg: 'text-[var(--brand-red)]' },
  { bg: 'bg-[rgba(251,188,4,0.20)]',  fg: 'text-[#a06a00] dark:text-[var(--brand-yellow)]' },
  { bg: 'bg-[rgba(47,161,214,0.18)]', fg: 'text-[var(--brand-cyan)]' },
  { bg: 'bg-[rgba(124,58,237,0.18)]', fg: 'text-[#7c3aed]' },
];

function hashHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % ACCENT_BG.length;
}

interface AvatarProps {
  src?: string | null;
  fullName: string;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ src, fullName, size = 'md', className }: AvatarProps) {
  const initials = getInitials(fullName);
  const palette = ACCENT_BG[hashHue(fullName || 'user')];

  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden',
        'rounded-full bg-[var(--neutral-100)]',
        sizeClasses[size],
        className,
      )}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={fullName}
          className="h-full w-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback
        className={cn(
          'flex h-full w-full items-center justify-center font-semibold',
          palette.bg,
          palette.fg,
        )}
        delayMs={src ? 600 : 0}
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
