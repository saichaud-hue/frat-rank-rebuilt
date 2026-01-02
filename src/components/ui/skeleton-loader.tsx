import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'avatar' | 'card' | 'row' | 'list';
  lines?: number;
}

export function SkeletonLoader({ className, variant = 'text', lines = 1 }: SkeletonLoaderProps) {
  if (variant === 'avatar') {
    return (
      <div className={cn('skeleton-avatar h-10 w-10', className)} />
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('skeleton-card h-32 w-full', className)} />
    );
  }

  if (variant === 'row') {
    return (
      <div className={cn('flex items-center gap-3 py-3', className)}>
        <div className="skeleton-avatar h-12 w-12 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="skeleton-text h-4 w-3/4" />
          <div className="skeleton-text h-3 w-1/2" />
        </div>
        <div className="skeleton h-10 w-10 rounded-full shrink-0" />
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-1', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLoader key={i} variant="row" />
        ))}
      </div>
    );
  }

  // Default: text lines
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            'skeleton-text',
            i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'
          )} 
        />
      ))}
    </div>
  );
}

// Page-level skeleton for feed/list pages
export function FeedSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="skeleton-text h-6 w-32" />
        <div className="skeleton-text h-4 w-24" />
      </div>
      
      {/* Filter pills skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-9 w-16 rounded-full shrink-0" />
        ))}
      </div>
      
      {/* List items skeleton */}
      <div className="space-y-1 mt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonLoader key={i} variant="row" />
        ))}
      </div>
    </div>
  );
}

// Card grid skeleton
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card h-40 w-full" />
      ))}
    </div>
  );
}

// Leaderboard skeleton
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="skeleton-text h-6 w-32" />
        <div className="skeleton-text h-4 w-24" />
      </div>
      
      {/* Filter pills */}
      <div className="flex gap-2 overflow-hidden -mx-4 px-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-9 w-16 rounded-full shrink-0" />
        ))}
      </div>
      
      {/* Podium skeleton */}
      <div className="flex justify-center items-end gap-2 py-6">
        <div className="skeleton h-24 w-20 rounded-2xl" />
        <div className="skeleton h-32 w-24 rounded-2xl" />
        <div className="skeleton h-20 w-20 rounded-2xl" />
      </div>
      
      {/* List */}
      <div className="space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonLoader key={i} variant="row" />
        ))}
      </div>
    </div>
  );
}
