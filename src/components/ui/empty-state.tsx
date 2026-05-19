import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from './button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            'mb-5 flex h-14 w-14 items-center justify-center rounded-full',
            'bg-accent-soft text-[var(--accent)]',
            'ring-8 ring-accent-soft/40',
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <h3
        className="text-base font-semibold text-text"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-text-muted leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-5" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
