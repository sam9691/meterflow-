import clsx from 'clsx';

export function Skeleton({ className }) {
  return <div className={clsx('skeleton', className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="card">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 'h-64' }) {
  return (
    <div className={clsx('card', height)}>
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  );
}
