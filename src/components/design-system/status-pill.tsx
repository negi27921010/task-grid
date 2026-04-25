'use client';

import { useMemo } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, AlertTriangle, Clock, Eye, CircleDot } from 'lucide-react';
import { TONES, type Tone } from './tone';
import { cn } from '@/lib/utils/cn';

export type PillStyle = 'solid' | 'soft' | 'dot' | 'outline';
export type PillSize = 'sm' | 'md';

export interface StatusOption<TValue extends string = string> {
  value: TValue;
  label: string;
  tone: Tone;
  icon?: React.ReactNode;
}

interface BaseProps {
  label: string;
  tone: Tone;
  style?: PillStyle;
  size?: PillSize;
  icon?: React.ReactNode;
  className?: string;
}

interface InteractiveProps<TValue extends string> extends BaseProps {
  value: TValue;
  options: StatusOption<TValue>[];
  onChange: (value: TValue) => void;
}

type StatusPillProps<TValue extends string = string> =
  | (BaseProps & { interactive?: false; options?: never; onChange?: never; value?: never })
  | InteractiveProps<TValue>;

const SEMANTIC_ICONS: Record<string, React.ReactNode> = {
  done: <Check className="h-3 w-3" strokeWidth={2.6} />,
  stuck: <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />,
  blocked: <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />,
  working: <Clock className="h-3 w-3" strokeWidth={2.2} />,
  in_progress: <Clock className="h-3 w-3" strokeWidth={2.2} />,
  review: <Eye className="h-3 w-3" strokeWidth={2.2} />,
};

function semanticIconFor(label: string): React.ReactNode | undefined {
  const key = label.trim().toLowerCase().replace(/\s+/g, '_');
  return SEMANTIC_ICONS[key];
}

function pillStyles(tone: Tone, style: PillStyle): React.CSSProperties {
  const t = TONES[tone];
  switch (style) {
    case 'solid':
      return { background: t.solid, color: t.solidText, borderColor: 'transparent' };
    case 'soft':
      return { background: t.soft, color: t.softText, borderColor: 'transparent' };
    case 'outline':
      return { background: 'transparent', color: t.softText, borderColor: t.softText + '55' };
    case 'dot':
      return { background: 'transparent', color: 'var(--text)', borderColor: 'transparent' };
  }
}

function PillButton({
  label, tone, style, size, icon, className, onClick, asChild = false,
}: BaseProps & { onClick?: (e: React.MouseEvent) => void; asChild?: boolean }) {
  const styles = useMemo(() => pillStyles(tone, style ?? 'soft'), [tone, style]);
  const padX = size === 'sm' ? 'px-2' : 'px-2.5';
  const padY = size === 'sm' ? 'py-0.5' : 'py-1';
  const fontSize = size === 'sm' ? 'text-[11px]' : 'text-[12px]';
  const dotColor = TONES[tone].dot;

  const content = (
    <>
      {style === 'dot' && (
        <span
          aria-hidden="true"
          className="h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ background: dotColor }}
        />
      )}
      {icon ?? semanticIconFor(label)}
      <span>{label}</span>
    </>
  );

  const base = cn(
    'inline-flex items-center justify-center gap-1.5 rounded-full border font-semibold tracking-tight whitespace-nowrap select-none',
    'min-w-[88px] transition-transform duration-100 will-change-transform',
    onClick && 'cursor-pointer hover:-translate-y-px',
    !onClick && 'cursor-default',
    padX, padY, fontSize,
    className,
  );

  if (asChild) {
    return <span className={base} style={styles}>{content}</span>;
  }
  return (
    <button type="button" className={base} style={styles} onClick={onClick}>
      {content}
    </button>
  );
}

export function StatusPill<TValue extends string = string>(props: StatusPillProps<TValue>) {
  const { label, tone, style, size, icon, className } = props;

  // Read-only path
  if (!('options' in props) || !props.options) {
    return (
      <PillButton
        label={label}
        tone={tone}
        style={style}
        size={size}
        icon={icon}
        className={className}
      />
    );
  }

  const { options, onChange, value } = props;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          onClick={(e) => e.stopPropagation()}
        >
          <PillButton
            asChild
            label={label}
            tone={tone}
            style={style}
            size={size}
            icon={icon}
            className={cn(className, 'cursor-pointer hover:-translate-y-px')}
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[180px] rounded-lg border border-border-color bg-surface p-1 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <DropdownMenu.Item
                key={opt.value}
                onSelect={() => onChange(opt.value)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none',
                  'text-text data-[highlighted]:bg-hover',
                  selected && 'bg-hover',
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: TONES[opt.tone].dot }}
                />
                <span className="flex-1">{opt.label}</span>
                {selected && <Check className="h-3.5 w-3.5 text-text-muted" />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// Convenience for cases where the consumer doesn't want a label icon override.
export const StatusPillIcon = { CircleDot };
