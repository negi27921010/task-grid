'use client';

import { Avatar, type AvatarSize } from './avatar';
import { cn } from '@/lib/utils/cn';

interface AvatarStackProps {
  users: Array<{ id: string | number; fullName: string; src?: string | null }>;
  size?: AvatarSize;
  max?: number;
  className?: string;
}

const SIZE_PX: Record<Exclude<AvatarSize, number>, number> = {
  xs: 18, sm: 22, md: 28, lg: 36, xl: 48,
};

export function AvatarStack({
  users,
  size = 'sm',
  max = 3,
  className,
}: AvatarStackProps) {
  const px = typeof size === 'number' ? size : SIZE_PX[size];
  const overlap = Math.round(px * 0.32);
  const shown = users.slice(0, max);
  const extra = users.length - max;
  const fontSize = Math.round(px * 0.4);

  return (
    <span className={cn('inline-flex items-center', className)}>
      {shown.map((u, i) => (
        <span
          key={u.id}
          style={{ marginLeft: i === 0 ? 0 : -overlap }}
        >
          <Avatar fullName={u.fullName} src={u.src} size={size} ring />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-neutral-200 font-semibold text-text-muted ring-2 ring-surface"
          style={{
            width: px,
            height: px,
            marginLeft: -overlap,
            fontSize,
          }}
          title={`+${extra} more`}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
