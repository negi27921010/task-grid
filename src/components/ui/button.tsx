'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Button — Antigravity-aligned primitive.
 *
 * Variants:
 *  • primary     — solid accent, pill radius, branded glow on hover (CTA)
 *  • secondary   — outlined surface, medium radius (default page actions)
 *  • tertiary    — filled neutral surface (in-table / dense actions)
 *  • ghost       — text-only, hover bg-hover (toolbar icons)
 *  • destructive — solid red, pill radius (delete / destructive CTAs)
 *  • link        — text accent, underline on hover (inline action)
 *
 * Sizes: sm | md | lg | xl | icon. `md` is default and unchanged from v1.
 *
 * Backwards-compat: all previous props, variants, sizes, and the HTMLButton
 * attribute surface are preserved. `xl` and `tertiary`/`link` are additive.
 */

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'destructive'
  | 'link';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-[var(--text-on-accent)] shadow-[var(--shadow-sm)] ' +
    'hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-glow)] ' +
    'active:bg-[var(--accent-pressed)] active:shadow-[var(--shadow-xs)]',
  secondary:
    'bg-surface text-text border border-border-color shadow-[var(--shadow-xs)] ' +
    'hover:bg-hover hover:border-border-strong hover:shadow-[var(--shadow-sm)] ' +
    'active:bg-[var(--pressed)]',
  tertiary:
    'bg-[var(--neutral-100)] text-text ' +
    'hover:bg-[var(--neutral-200)] active:bg-[var(--neutral-300)]',
  ghost:
    'text-text-muted hover:bg-hover hover:text-text active:bg-[var(--pressed)]',
  destructive:
    'bg-[var(--brand-red)] text-white shadow-[var(--shadow-sm)] ' +
    'hover:bg-[#ff2d29] hover:shadow-[0_8px_24px_rgba(252,65,61,0.25)] ' +
    'active:bg-[#d83a36]',
  link:
    'text-[var(--accent)] underline-offset-4 hover:underline hover:text-[var(--accent-hover)] ' +
    'px-0 shadow-none bg-transparent',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-[var(--radius-pill)]',
  md: 'h-9 px-4 text-sm gap-1.5 rounded-[var(--radius-pill)]',
  lg: 'h-10 px-5 text-sm gap-2 rounded-[var(--radius-pill)]',
  xl: 'h-12 px-7 text-base gap-2 rounded-[var(--radius-pill)]',
  icon: 'h-9 w-9 rounded-[var(--radius-pill)]',
};

// Non-pill variants override the size's pill radius (secondary/tertiary/ghost
// look tight in dense tables; only branded CTAs use pills).
const variantShape: Partial<Record<ButtonVariant, string>> = {
  secondary: 'rounded-[var(--radius-md)]',
  tertiary: 'rounded-[var(--radius-md)]',
  ghost: 'rounded-[var(--radius-md)]',
  link: 'rounded-[var(--radius-sm)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium select-none',
        'focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        'transition-[background-color,border-color,color,box-shadow,transform]',
        'duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]',
        'active:scale-[0.98]',
        sizes[size],
        variants[variant],
        variantShape[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
