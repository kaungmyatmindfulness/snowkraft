import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animate?: boolean
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animate = true,
}: SkeletonProps): React.JSX.Element {
  const baseStyles = 'bg-gray-200 dark:bg-slate-700'
  const animationStyles = animate ? 'animate-pulse' : ''

  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  const defaultSizes = {
    text: { height: '1em', width: '100%' },
    circular: { height: '40px', width: '40px' },
    rectangular: { height: '100px', width: '100%' },
  }

  const styles = {
    width: width ?? defaultSizes[variant].width,
    height: height ?? defaultSizes[variant].height,
  }

  return (
    <div
      className={cn(baseStyles, animationStyles, variants[variant], className)}
      style={styles}
      aria-hidden="true"
    />
  )
}

// Pre-composed skeleton patterns
export function SkeletonCard(): React.JSX.Element {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <Skeleton variant="rectangular" height={80} />
      <div className="flex gap-2">
        <Skeleton variant="text" width={80} height={32} className="rounded-lg" />
        <Skeleton variant="text" width={80} height={32} className="rounded-lg" />
      </div>
    </div>
  )
}

export function SkeletonQuestion(): React.JSX.Element {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton variant="text" width={60} height={24} className="rounded-full" />
        <Skeleton variant="text" width={120} height={24} className="rounded-full" />
      </div>
      <Skeleton variant="text" width="30%" height={14} />
      <Skeleton variant="text" width="100%" height={20} />
      <Skeleton variant="text" width="80%" height={20} />
      <div className="space-y-3 pt-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rectangular" height={56} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonStats(): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="stat-card">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="space-y-2">
            <Skeleton variant="text" width={60} height={24} />
            <Skeleton variant="text" width={80} height={14} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }): React.JSX.Element {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 border-b border-gray-200 pb-2 dark:border-slate-700">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="text" width={80} height={14} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {[1, 2, 3, 4, 5].map((j) => (
            <Skeleton key={j} variant="text" width={80} height={16} />
          ))}
        </div>
      ))}
    </div>
  )
}
