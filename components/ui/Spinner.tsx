import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const SPINNER_SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
} as const

export function Spinner({
  size = 'md',
  className,
  label = 'Loading',
}: SpinnerProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('flex items-center justify-center', className)}
    >
      <div
        className={cn(
          'animate-spin rounded-full border-gray-200 border-t-sky-500',
          SPINNER_SIZES[size]
        )}
        style={{ borderTopColor: 'currentColor' }}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  label?: string
}

export function LoadingOverlay({
  isLoading,
  children,
  label = 'Loading',
}: LoadingOverlayProps): React.JSX.Element {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm"
          role="status"
          aria-label={label}
        >
          <Spinner size="lg" />
        </div>
      )}
    </div>
  )
}

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({
  message = 'Loading...',
  size = 'md',
}: LoadingStateProps): React.JSX.Element {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
      <Spinner size={size} />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}
