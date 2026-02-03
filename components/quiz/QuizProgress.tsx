import { memo } from 'react'
import { Icons } from '@/components/ui'

interface QuizProgressProps {
  current: number
  total: number
  answered: number
  flagged: number
}

export const QuizProgress = memo(function QuizProgress({
  current,
  total,
  answered,
  flagged,
}: QuizProgressProps): React.JSX.Element {
  const progress = (answered / total) * 100
  const progressLabel = `${String(answered)} of ${String(total)} questions answered (${String(Math.round(progress))}%)`

  return (
    <div className="flex items-center gap-4" data-testid="quiz-progress">
      {/* Question counter */}
      <div
        className="text-sm font-medium text-gray-700 dark:text-gray-200"
        aria-label={`Currently on question ${String(current)} of ${String(total)}`}
      >
        <span className="font-semibold text-gray-900 dark:text-gray-100">{current}</span>
        <span className="mx-1 text-gray-400 dark:text-gray-500">/</span>
        <span>{total}</span>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={answered}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={progressLabel}
        className="h-2.5 max-w-xs flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700"
      >
        <div
          className="size-full origin-left rounded-full bg-linear-to-r from-sky-500 to-cyan-500 transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${String(progress / 100)})` }}
        />
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-3 text-sm">
        <div
          className="flex items-center gap-1.5 text-emerald-600"
          aria-label={`${String(answered)} questions answered`}
        >
          <Icons.CheckCircle size={16} aria-hidden="true" />
          <span className="font-medium">{answered}</span>
        </div>
        {flagged > 0 && (
          <div
            className="flex items-center gap-1.5 text-amber-600"
            aria-label={`${String(flagged)} questions flagged for review`}
          >
            <Icons.Flag size={16} aria-hidden="true" />
            <span className="font-medium">{flagged}</span>
          </div>
        )}
      </div>
    </div>
  )
})

QuizProgress.displayName = 'QuizProgress'
