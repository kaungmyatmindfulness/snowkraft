import { cn } from '@/lib/utils'
import { Icons } from './Icons'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: keyof typeof Icons
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon = 'BookOpen',
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.JSX.Element {
  const Icon = Icons[icon]

  return (
    <div
      className={cn('flex flex-col items-center justify-center px-4 py-12 text-center', className)}
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
        <Icon size={32} className="text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description !== undefined && description !== '' && (
        <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading the content. Please try again.',
  onRetry,
  className,
}: ErrorStateProps): React.JSX.Element {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-4 py-12 text-center', className)}
      role="alert"
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <Icons.AlertCircle size={32} className="text-red-500 dark:text-red-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          <Icons.RotateCcw size={18} />
          Try Again
        </Button>
      )}
    </div>
  )
}
