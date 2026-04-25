'use client';

import { TONES, type Tone } from './tone';
import { cn } from '@/lib/utils/cn';

export type PriorityStyle = 'soft' | 'solid' | 'bar';

interface PriorityTagProps {
  label: string;
  tone: Tone;
  // 1-based index in a fixed scale (e.g. 1..4 for low/medium/high/critical).
  // Used by the `bar` style to fill bars left → right.
  level?: number;
  scaleSize?: number; // total bars; defaults to 4
  style?: PriorityStyle;
  className?: string;
}

export function PriorityTag({
  label,
  tone,
  level,
  scaleSize = 4,
  style = 'soft',
  className,
}: PriorityTagProps) {
  const t = TONES[tone];

  if (style === 'bar') {
    const filled = level ?? scaleSize;
    return (
      <span className={cn('inline-flex items-center gap-1.5', className)}>
        <span className="flex items-end gap-[2px]">
          {Array.from({ length: scaleSize }, (_, i) => {
            const isFilled = i < filled;
            return (
              <span
                key={i}
                className="rounded-[1px]"
                style={{
                  width: 3,
                  height: 4 + i * 2,
                  background: isFilled ? t.solid : 'var(--neutral-200)',
                }}
              />
            );
          })}
        </span>
        <span className="text-[12.5px] font-medium text-text">{label}</span>
      </span>
    );
  }

  const styles =
    style === 'solid'
      ? { background: t.solid, color: t.solidText }
      : { background: t.soft, color: t.softText };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-[3px] text-[12px] font-semibold tracking-tight whitespace-nowrap',
        className,
      )}
      style={styles}
    >
      {label}
    </span>
  );
}
