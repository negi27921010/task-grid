'use client';

import { cn } from '@/lib/utils/cn';

interface CompletionSparkProps {
  // Daily counts of completed items, oldest → newest. Length = number of bars.
  daily: number[];
  total: number;
  done: number;
  windowLabel?: string;
  // CSS color used for the latest bars (highlight tail). Defaults to accent.
  highlight?: string;
  highlightLastN?: number;
  className?: string;
}

export function CompletionSpark({
  daily, total, done,
  windowLabel = '14d ago → Today',
  highlight = 'var(--accent)',
  highlightLastN = 4,
  className,
}: CompletionSparkProps) {
  const max = Math.max(1, ...daily);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const cutoff = Math.max(0, daily.length - highlightLastN);

  return (
    <div className={cn('space-y-3.5', className)}>
      <div className="flex items-baseline gap-3.5">
        <p
          className="text-[36px] font-semibold leading-none tracking-tight tabular-nums text-text"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {pct}
          <span className="ml-0.5 text-[22px] text-text-muted">%</span>
        </p>
        <p className="text-[12.5px] text-text-muted">
          {done} of {total} tasks done
        </p>
      </div>

      <div className="flex h-20 items-end gap-1">
        {daily.map((v, i) => (
          <span
            key={i}
            className="flex-1 rounded-[2px]"
            style={{
              height: `${(v / max) * 100}%`,
              minHeight: 2,
              background: i >= cutoff ? highlight : 'var(--neutral-200)',
            }}
          />
        ))}
      </div>

      <div className="flex justify-between text-[10.5px] text-text-faint">
        <span>{windowLabel.split('→')[0].trim()}</span>
        <span>{windowLabel.split('→')[1]?.trim() ?? 'Today'}</span>
      </div>
    </div>
  );
}
