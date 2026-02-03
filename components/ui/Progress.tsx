import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animated?: boolean
}

const BASE_TRACK_STYLES = 'w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden'

const PROGRESS_SIZES = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
} as const

const BAR_VARIANTS = {
  default: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
} as const

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      variant = 'default',
      size = 'md',
      showLabel = false,
      animated = true,
      ...props
    },
    ref
  ): React.JSX.Element => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    // Auto-select variant based on percentage if using default
    const autoVariant =
      variant === 'default'
        ? percentage >= 75
          ? 'success'
          : percentage >= 50
            ? 'warning'
            : 'danger'
        : variant

    return (
      <div className={cn('w-full', className)} {...props}>
        {showLabel && (
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
        <div
          ref={ref}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${String(Math.round(percentage))}% complete`}
          className={cn(BASE_TRACK_STYLES, PROGRESS_SIZES[size])}
        >
          <div
            className={cn(
              'size-full origin-left rounded-full',
              BAR_VARIANTS[autoVariant],
              animated && 'transition-transform duration-500 ease-out'
            )}
            style={{ transform: `scaleX(${String(percentage / 100)})` }}
          />
        </div>
      </div>
    )
  }
)

Progress.displayName = 'Progress'

// Circular progress variant
export interface CircularProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showValue?: boolean
}

const CIRCULAR_VARIANTS = {
  default: 'text-sky-500',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  danger: 'text-red-500',
} as const

const CircularProgress = forwardRef<HTMLDivElement, CircularProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      size = 80,
      strokeWidth = 8,
      variant = 'default',
      showValue = true,
      ...props
    },
    ref
  ): React.JSX.Element => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (percentage / 100) * circumference

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn('relative inline-flex items-center justify-center', className)}
        {...props}
      >
        <svg width={size} height={size} className="-rotate-90 transform">
          <circle
            cx={String(size / 2)}
            cy={String(size / 2)}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-slate-700"
          />
          <circle
            cx={String(size / 2)}
            cy={String(size / 2)}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            className={cn(
              CIRCULAR_VARIANTS[variant],
              'transition-[stroke-dashoffset] duration-500 ease-out'
            )}
            style={{
              strokeDasharray: String(circumference),
              strokeDashoffset: String(offset),
            }}
          />
        </svg>
        {showValue && (
          <span className="absolute text-lg font-semibold text-gray-900 dark:text-gray-100">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    )
  }
)

CircularProgress.displayName = 'CircularProgress'

export { Progress, CircularProgress }
