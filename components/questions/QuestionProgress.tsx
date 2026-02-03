import type { MasteryStatus, QuestionProgress as QuestionProgressType } from '@/types'
import { Icons } from '@/components/ui/Icons'

interface QuestionProgressProps {
  progress: QuestionProgressType | undefined
  variant?: 'badge' | 'compact' | 'detailed'
}

export function QuestionProgressIndicator({
  progress,
  variant = 'badge',
}: QuestionProgressProps): React.JSX.Element {
  if (!progress || progress.masteryStatus === 'unattempted') {
    return <span className="text-xs text-gray-400 dark:text-gray-500">Not attempted</span>
  }

  const { masteryStatus, attemptCount, correctCount, markedAsLearned } = progress

  // Color based on mastery status
  const statusColors: Record<MasteryStatus, string> = {
    unattempted: 'text-gray-400 dark:text-gray-500',
    attempted: 'text-blue-600 dark:text-blue-400',
    incorrect: 'text-red-600 dark:text-red-400',
    mastered: 'text-green-600 dark:text-green-400',
  }

  const statusBgColors: Record<MasteryStatus, string> = {
    unattempted: 'bg-gray-100 dark:bg-gray-800',
    attempted: 'bg-blue-100 dark:bg-blue-900/30',
    incorrect: 'bg-red-100 dark:bg-red-900/30',
    mastered: 'bg-green-100 dark:bg-green-900/30',
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${statusColors[masteryStatus]}`}>
        {masteryStatus === 'mastered' ? (
          <Icons.Check className="size-4" />
        ) : masteryStatus === 'incorrect' ? (
          <Icons.X className="size-4" />
        ) : (
          <Icons.Clock className="size-4" />
        )}
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <div className={`flex items-center gap-2 ${statusColors[masteryStatus]}`}>
          {masteryStatus === 'mastered' ? (
            <>
              <Icons.Check className="size-4" />
              <span>Mastered</span>
            </>
          ) : masteryStatus === 'incorrect' ? (
            <>
              <Icons.X className="size-4" />
              <span>Needs Review</span>
            </>
          ) : (
            <>
              <Icons.Clock className="size-4" />
              <span>In Progress</span>
            </>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {correctCount}/{attemptCount} correct
          {markedAsLearned && ' - Marked as learned'}
        </div>
      </div>
    )
  }

  // Default: badge variant
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${statusBgColors[masteryStatus]} ${statusColors[masteryStatus]}`}
    >
      {masteryStatus === 'mastered' ? (
        <Icons.Check className="size-3" />
      ) : masteryStatus === 'incorrect' ? (
        <Icons.X className="size-3" />
      ) : null}
      {correctCount}/{attemptCount}
    </span>
  )
}
