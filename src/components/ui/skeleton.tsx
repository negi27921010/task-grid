import { cn } from '@/lib/utils/cn';

type SkeletonShape = 'line' | 'circle' | 'rectangle';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
}

const shapeClasses: Record<SkeletonShape, string> = {
  line: 'h-4 w-full rounded',
  circle: 'rounded-full',
  rectangle: 'rounded-md',
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
        'animate-pulse bg-gray-200',
        shapeClasses[shape],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}
