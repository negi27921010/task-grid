'use client';

import { TONES, type Tone } from './tone';
import { cn } from '@/lib/utils/cn';

interface TimelineBarProps {
  // Item being plotted on the axis
  start: Date | string;
  end: Date | string;
  // The visible window the bar lives inside (drives the proportional position)
  axisStart: Date | string;
  axisEnd: Date | string;
  tone?: Tone;
  showStartLabel?: boolean;
  className?: string;
  height?: number;
}

function toMs(d: Date | string): number {
  return d instanceof Date ? d.getTime() : new Date(d).getTime();
}

function formatShort(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

export function TimelineBar({
  start,
  end,
  axisStart,
  axisEnd,
  tone = 'blue',
  showStartLabel = true,
  className,
  height = 18,
}: TimelineBarProps) {
  const min = toMs(axisStart);
  const max = toMs(axisEnd);
  const range = Math.max(1, max - min);
  const sFrac = Math.max(0, Math.min(1, (toMs(start) - min) / range));
  const eFrac = Math.max(sFrac, Math.min(1, (toMs(end) - min) / range));
  const t = TONES[tone];

  return (
    <div
      className={cn('relative w-full', className)}
      style={{ height, minWidth: 100 }}
    >
      {/* Axis line */}
      <div
        className="absolute inset-x-0 rounded-[1px]"
        style={{ top: height / 2 - 1, height: 2, background: 'var(--neutral-100)' }}
      />
      {/* Range bar */}
      <div
        className="absolute rounded-[5px]"
        style={{
          top: height / 2 - 5,
          height: 10,
          left: `${sFrac * 100}%`,
          width: `${(eFrac - sFrac) * 100}%`,
          background: `linear-gradient(90deg, ${t.solid}, ${t.solid}cc)`,
          boxShadow: `0 1px 3px ${t.solid}55`,
        }}
      />
      {showStartLabel && (
        <span
          className="absolute -top-[1px] whitespace-nowrap text-[10.5px] font-semibold text-text-muted"
          style={{ left: `${sFrac * 100}%`, transform: 'translateX(-2px)' }}
        >
          {formatShort(start)}
        </span>
      )}
    </div>
  );
}
