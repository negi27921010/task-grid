'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[#066fd1] text-white hover:bg-[#0559a8] shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]',
  secondary: 'bg-white text-[#1f2937] hover:bg-[#f3f4f6] border border-[#e5e7eb] shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]',
  ghost: 'text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#1f2937]',
  destructive: 'bg-[#d63939] text-white hover:bg-[#c02d2d] shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-[30px] px-2 text-xs gap-1',
  md: 'h-[34px] px-3 text-sm gap-1.5',
  lg: 'h-[38px] px-4 text-sm gap-2',
  icon: 'h-[34px] w-[34px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#066fd1]/25 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
