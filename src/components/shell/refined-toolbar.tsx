'use client';

import { Search, Filter, ArrowDownUp, EyeOff, Group, User, Plus, ChevronDown, X } from 'lucide-react';
import { ShortcutKbd } from '@/components/design-system/kbd';
import { cn } from '@/lib/utils/cn';

interface RefinedToolbarProps {
  // Primary CTA
  primaryLabel?: string;
  onPrimaryClick?: () => void;

  // Toolbar buttons (each is independently optional so callers only enable
  // what their page supports — Standups doesn't need Sort/Group, etc.)
  onSearchClick?: () => void;       // opens command palette
  onPersonFilter?: () => void;
  onFilter?: () => void;
  onSort?: () => void;
  onHide?: () => void;
  onGroup?: () => void;

  // Selection chip + clear
  selectedCount?: number;
  onClearSelection?: () => void;

  // Optional right slot for page-specific extras (e.g. AI Sidekick).
  rightSlot?: React.ReactNode;

  // Density: compact rows for table-heavy pages, comfortable for dashboards.
  density?: 'compact' | 'comfortable';

  className?: string;
}

export function RefinedToolbar({
  primaryLabel = 'New task',
  onPrimaryClick,
  onSearchClick,
  onPersonFilter,
  onFilter,
  onSort,
  onHide,
  onGroup,
  selectedCount = 0,
  onClearSelection,
  rightSlot,
  density = 'compact',
  className,
}: RefinedToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center gap-2.5 border-b border-border-color bg-surface px-6',
        density === 'compact' ? 'py-2' : 'py-3',
        className,
      )}
    >
      {/* Primary CTA */}
      {onPrimaryClick && (
        <button
          type="button"
          onClick={onPrimaryClick}
          className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:-translate-y-px"
          style={{ background: 'var(--accent)' }}
        >
          {primaryLabel}
          <ChevronDown className="h-3 w-3" />
        </button>
      )}

      {/* Filter row */}
      <div className="flex items-center gap-0.5 ml-1.5">
        {onSearchClick && (
          <ToolbarButton icon={Search} label="Search" onClick={onSearchClick}>
            <ShortcutKbd shortcut="cmd+k" className="ml-1" />
          </ToolbarButton>
        )}
        {onPersonFilter && (
          <ToolbarButton icon={User} label="Person" onClick={onPersonFilter} />
        )}
        {onFilter && (
          <ToolbarButton icon={Filter} label="Filter" onClick={onFilter} />
        )}
        {onSort && (
          <ToolbarButton icon={ArrowDownUp} label="Sort" onClick={onSort} />
        )}
        {onHide && (
          <ToolbarButton icon={EyeOff} label="Hide" onClick={onHide} />
        )}
        {onGroup && (
          <ToolbarButton icon={Group} label="Group by" onClick={onGroup} />
        )}
      </div>

      <div className="flex-1" />

      {selectedCount > 0 && (
        <div
          className="flex items-center gap-2 rounded-md border border-[color:rgba(0,115,234,0.2)] bg-accent-soft px-2.5 py-1 text-[12.5px] font-medium text-text"
        >
          <span className="font-semibold">{selectedCount}</span>
          <span>selected</span>
          {onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="rounded p-0.5 text-text-muted transition-colors hover:bg-hover hover:text-text"
              aria-label="Clear selection"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {rightSlot}
    </div>
  );
}

function ToolbarButton({
  icon: IconComponent,
  label,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
    >
      <IconComponent className="h-3.5 w-3.5" />
      {label}
      {children}
    </button>
  );
}

// Convenience for "New task" primary cta with embedded plus icon if needed.
export function PrimaryNewTaskButton({ onClick, label = 'New task' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:-translate-y-px"
      style={{ background: 'var(--accent)' }}
    >
      <Plus className="h-3 w-3" strokeWidth={2.4} />
      {label}
    </button>
  );
}
