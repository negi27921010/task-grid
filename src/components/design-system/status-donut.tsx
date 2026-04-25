'use client';

import { TONES, type Tone } from './tone';
import { cn } from '@/lib/utils/cn';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  tone: Tone;
}

interface StatusDonutProps {
  slices: DonutSlice[];
  centerLabel?: string;
  className?: string;
}

const SIZE = 200;
const STROKE = 22;
const RADIUS = 72;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = Math.PI * 2 * RADIUS;

export function StatusDonut({ slices, centerLabel, className }: StatusDonutProps) {
  const filtered = slices.filter((s) => s.value > 0);
  const total = filtered.reduce((acc, s) => acc + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-text-muted">
        No data to chart
      </div>
    );
  }

  let acc = 0;
  return (
    <div className={cn('flex items-center gap-6', className)}>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--neutral-100)"
            strokeWidth={STROKE}
          />
          {filtered.map((s) => {
            const len = (s.value / total) * CIRCUMFERENCE;
            const offset = -acc;
            acc += len;
            return (
              <circle
                key={s.key}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={TONES[s.tone].solid}
                strokeWidth={STROKE}
                strokeDasharray={`${len} ${CIRCUMFERENCE - len}`}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dasharray 0.4s ease' }}
              />
            );
          })}
        </svg>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        >
          <p
            className="text-[34px] font-semibold leading-none tracking-tight tabular-nums text-text"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {total}
          </p>
          <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">
            {centerLabel ?? 'Total'}
          </p>
        </div>
      </div>

      <ul className="flex-1 space-y-1.5">
        {filtered.map((s) => {
          const pct = Math.round((s.value / total) * 100);
          return (
            <li key={s.key} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: TONES[s.tone].solid }}
              />
              <span className="flex-1 truncate text-[13px] text-text">{s.label}</span>
              <span className="text-[13px] font-semibold tabular-nums text-text">{s.value}</span>
              <span className="w-9 text-right text-[11.5px] tabular-nums text-text-faint">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
