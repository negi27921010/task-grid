'use client';

import { cn } from '@/lib/utils/cn';

// Refined-system Avatar — colored bg with initials + optional ring + image.
// Differs from src/components/ui/avatar.tsx in that:
//   - color is derived from the name hash so each user gets a stable colour
//   - supports number-as-size for table cells that want an exact pixel size
//   - supports the ring treatment used inside <AvatarStack>
// We keep the legacy avatar untouched until Phase 4 page-by-page migration.

export type AvatarSize = number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<Exclude<AvatarSize, number>, number> = {
  xs: 18,
  sm: 22,
  md: 28,
  lg: 36,
  xl: 48,
};

// Stable colour palette — keyed by a simple hash of the name so the same
// user always renders the same colour across the app.
const PALETTE = [
  '#0073ea', '#9333ea', '#16a34a', '#f59e0b',
  '#dc2626', '#0ea5e9', '#ec4899', '#14b8a6',
  '#6366f1', '#f97316',
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function colorForName(name: string): string {
  return PALETTE[hashName(name) % PALETTE.length];
}

export function initialsFor(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface AvatarProps {
  fullName: string;
  src?: string | null;
  size?: AvatarSize;
  ring?: boolean;
  color?: string;     // override the derived colour
  className?: string;
  title?: string;     // tooltip on hover; defaults to fullName
}

export function Avatar({
  fullName,
  src,
  size = 'md',
  ring = false,
  color,
  className,
  title,
}: AvatarProps) {
  const px = typeof size === 'number' ? size : SIZE_PX[size];
  const initials = initialsFor(fullName);
  const bg = color ?? colorForName(fullName);
  const fontSize = Math.round(px * 0.42);

  return (
    <span
      title={title ?? fullName}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        ring && 'ring-2 ring-surface',
        className,
      )}
      style={{
        width: px,
        height: px,
        background: bg,
        fontSize,
        letterSpacing: 0.2,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={fullName}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
