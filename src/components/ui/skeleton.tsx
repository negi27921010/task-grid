import { cn } from '@/lib/utils/cn';

type SkeletonShape = 'line' | 'circle' | 'rectangle';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
}

const shapeClasses: Record<SkeletonShape, string> = {
  line: 'h-4 w-full rounded-[var(--radius-sm)]',
  circle: 'rounded-full',
  rectangle: 'rounded-[var(--radius-md)]',
};

export function Skeleton({
  shape = 'line',
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'bg-[var(--neutral-100)] dark:bg-[var(--neutral-100)]',
        shapeClasses[shape],
        className,
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {/* Shimmer sweep — accent-tinted highlight */}
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(var(--accent-rgb), 0.06) 40%, rgba(var(--accent-rgb), 0.14) 50%, rgba(var(--accent-rgb), 0.06) 60%, transparent 100%)',
        }}
      />
    </div>
  );
}
