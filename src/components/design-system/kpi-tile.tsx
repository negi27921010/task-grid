'use client';

import { ArrowUp, ArrowDown, AlertTriangle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type KpiTrend = 'up' | 'down' | 'warn' | 'neutral';

interface KpiTileProps {
  label: string;
  value: number | string;
  delta?: string;
  trend?: KpiTrend;
  icon?: LucideIcon;
  // CSS color (hex, rgb, var) — drives the top accent stripe + icon tint.
  accent?: string;
  className?: string;
}

const TREND_COLOR: Record<KpiTrend, string> = {
  up: 'text-[#16a34a]',
  down: 'text-[#dc2626]',
  warn: 'text-[#d97706]',
  neutral: 'text-text-muted',
};

export function KpiTile({
  label, value, delta, trend = 'neutral', icon: IconComponent, accent = 'var(--accent)', className,
}: KpiTileProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border-color bg-surface p-5',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: accent }}
      />
      <div className="flex items-start gap-3">
        {IconComponent && (
          <div className="rounded-lg p-2.5" style={{ background: accent + '14' }}>
            <IconComponent className="h-5 w-5" style={{ color: accent }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-text-muted">
            {label}
          </p>
          <p
            className="mt-1 text-[34px] font-semibold leading-none tracking-tight tabular-nums text-text"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {value}
          </p>
          {delta && (
            <p className={cn('mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-medium', TREND_COLOR[trend])}>
              {trend === 'up' && <ArrowUp className="h-3 w-3" />}
              {trend === 'down' && <ArrowDown className="h-3 w-3" />}
              {trend === 'warn' && <AlertTriangle className="h-3 w-3" />}
              {delta}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
