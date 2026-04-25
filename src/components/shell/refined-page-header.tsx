'use client';

import { ChevronDown, Star, Sparkles, Workflow, UserPlus } from 'lucide-react';
import { NotificationBell } from '@/components/layout/notification-bell';
import { cn } from '@/lib/utils/cn';

export interface PageTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface RefinedPageHeaderProps {
  title: string;
  subtitle?: string;
  tabs?: PageTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  // Optional right-side action affordances. Each renders if provided.
  onInvite?: () => void;
  onAutomate?: () => void;
  onSidekick?: () => void;
  // Slot for arbitrary right-side content (overrides defaults if needed).
  rightSlot?: React.ReactNode;
  className?: string;
}

export function RefinedPageHeader({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  onInvite,
  onAutomate,
  onSidekick,
  rightSlot,
  className,
}: RefinedPageHeaderProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 border-b border-border-color bg-surface px-6 pt-3.5',
        className,
      )}
    >
      {/* Top row */}
      <div className="flex items-center gap-2.5">
        <h1
          className="text-[22px] font-semibold tracking-tight text-text"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h1>
        <button
          type="button"
          aria-label="Title actions"
          className="rounded p-1 text-text-faint transition-colors hover:bg-hover hover:text-text"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Favorite"
          className="rounded p-1 text-text-faint transition-colors hover:bg-hover hover:text-amber-500"
        >
          <Star className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Page-specific right slot rendered first so it's adjacent to the
              persistent notification bell on the right edge. */}
          {rightSlot ?? (
            <div className="flex items-center gap-1">
              {onSidekick && (
                <HeaderAction icon={Sparkles} label="Sidekick" onClick={onSidekick} accent />
              )}
              {onAutomate && (
                <HeaderAction icon={Workflow} label="Automate" onClick={onAutomate} />
              )}
              {onInvite && (
                <HeaderAction icon={UserPlus} label="Invite" onClick={onInvite} />
              )}
            </div>
          )}
          <NotificationBell />
        </div>
      </div>

      {subtitle && (
        <p className="mt-0.5 text-[12.5px] text-text-muted">{subtitle}</p>
      )}

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="mt-2.5 flex items-center -mb-px">
          {tabs.map((t) => {
            const active = t.id === activeTab;
            const IconComponent = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange?.(t.id)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-[13px] transition-colors',
                  active
                    ? 'border-[var(--accent)] font-semibold text-text'
                    : 'border-transparent font-medium text-text-muted hover:text-text',
                )}
              >
                {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HeaderAction({
  icon: IconComponent, label, onClick, accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
    >
      <IconComponent className={cn('h-3.5 w-3.5', accent && 'text-[var(--accent)]')} />
      {label}
    </button>
  );
}
