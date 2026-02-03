import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
}

const BASE_STYLES = 'inline-flex items-center font-medium rounded-full'

const VARIANTS = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-sky-100 text-sky-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
} as const

const SIZES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
} as const

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(BASE_STYLES, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  )
)

Badge.displayName = 'Badge'

// Domain-specific badge with automatic coloring
export interface DomainBadgeProps extends Omit<BadgeProps, 'variant'> {
  domain: string
}

const domainColors: Record<string, BadgeProps['variant']> = {
  D1: 'primary',
  D2: 'success',
  D3: 'warning',
  D4: 'info',
  D5: 'purple',
  D6: 'danger',
}

const DomainBadge = forwardRef<HTMLSpanElement, DomainBadgeProps>(
  ({ domain, className, ...props }, ref) => {
    const domainKey = domain.split(':')[0]?.trim() ?? domain.substring(0, 2)
    const variant = domainColors[domainKey] ?? 'default'

    return (
      <Badge ref={ref} variant={variant} className={className} {...props}>
        {domain}
      </Badge>
    )
  }
)

DomainBadge.displayName = 'DomainBadge'

// Difficulty badge with automatic coloring
export interface DifficultyBadgeProps extends Omit<BadgeProps, 'variant'> {
  difficulty: 'easy' | 'medium' | 'hard'
}

const DIFFICULTY_VARIANTS: Record<string, BadgeProps['variant']> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
} as const

const DifficultyBadge = forwardRef<HTMLSpanElement, DifficultyBadgeProps>(
  ({ difficulty, className, ...props }, ref) => (
    <Badge
      ref={ref}
      variant={DIFFICULTY_VARIANTS[difficulty] ?? 'default'}
      className={className}
      {...props}
    >
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </Badge>
  )
)

DifficultyBadge.displayName = 'DifficultyBadge'

export { Badge, DomainBadge, DifficultyBadge }
