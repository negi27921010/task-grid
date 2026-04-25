// Tone primitive — shared across StatusPill, PriorityTag, badges, etc.
// Each tone has a solid color, a soft tint, a text color, and a dot color.
// Values stay in inline style so they survive both light + dark mode without
// per-style CSS variables (the contrast against canvas/surface flips
// automatically via the surrounding tokens).

export type Tone =
  | 'neutral'
  | 'gray'
  | 'blue'
  | 'green'
  | 'amber'
  | 'orange'
  | 'red'
  | 'purple'
  | 'indigo';

export interface ToneColors {
  solid: string;        // background for `solid` style
  solidText: string;    // text on solid
  soft: string;         // background for `soft` style
  softText: string;     // text on soft (also used as `outline` border + text)
  dot: string;          // dot indicator color
}

export const TONES: Record<Tone, ToneColors> = {
  neutral: {
    solid: '#64748b',
    solidText: '#ffffff',
    soft: 'rgba(100, 116, 139, 0.12)',
    softText: '#475569',
    dot: '#94a3b8',
  },
  gray: {
    solid: '#94a3b8',
    solidText: '#ffffff',
    soft: 'rgba(148, 163, 184, 0.14)',
    softText: '#475569',
    dot: '#cbd5e1',
  },
  blue: {
    solid: '#0073ea',
    solidText: '#ffffff',
    soft: 'rgba(0, 115, 234, 0.10)',
    softText: '#0059b8',
    dot: '#3b82f6',
  },
  green: {
    solid: '#16a34a',
    solidText: '#ffffff',
    soft: 'rgba(22, 163, 74, 0.12)',
    softText: '#15803d',
    dot: '#22c55e',
  },
  amber: {
    solid: '#f59e0b',
    solidText: '#ffffff',
    soft: 'rgba(245, 158, 11, 0.13)',
    softText: '#b45309',
    dot: '#f59e0b',
  },
  orange: {
    solid: '#f97316',
    solidText: '#ffffff',
    soft: 'rgba(249, 115, 22, 0.13)',
    softText: '#c2410c',
    dot: '#fb923c',
  },
  red: {
    solid: '#dc2626',
    solidText: '#ffffff',
    soft: 'rgba(220, 38, 38, 0.12)',
    softText: '#b91c1c',
    dot: '#ef4444',
  },
  purple: {
    solid: '#9333ea',
    solidText: '#ffffff',
    soft: 'rgba(147, 51, 234, 0.12)',
    softText: '#7e22ce',
    dot: '#a855f7',
  },
  indigo: {
    solid: '#6366f1',
    solidText: '#ffffff',
    soft: 'rgba(99, 102, 241, 0.12)',
    softText: '#4f46e5',
    dot: '#818cf8',
  },
};
