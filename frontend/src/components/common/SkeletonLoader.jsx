export default function SkeletonLoader({ rows = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-4 rounded" style={{ width: `${85 - i * 10}%` }} />
          <div className="skeleton h-3 rounded" style={{ width: `${65 - i * 8}%` }} />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex justify-between">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-8 w-8 rounded-lg" />
      </div>
      <div className="skeleton h-8 w-32 rounded" />
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-card p-5">
      <div className="skeleton h-4 w-40 rounded mb-4" />
      <div className="skeleton h-48 md:h-64 w-full rounded-lg" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="skeleton h-4 w-40 rounded mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="skeleton h-4 w-16 rounded" />
          <div className="skeleton h-4 flex-1 rounded" />
          <div className="skeleton h-4 w-20 rounded" />
          <div className="skeleton h-4 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}
