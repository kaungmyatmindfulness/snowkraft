'use client'

import { useState, useEffect, memo } from 'react'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui'

interface QuestionTimerProps {
  isPaused?: boolean
}

/**
 * Count-up timer displaying elapsed time on current question.
 * Color-coded pacing feedback:
 * - Green: under 1 minute (good pace)
 * - Yellow: 1-2 minutes (moderate)
 * - Red: 3+ minutes (taking too long)
 */
export const QuestionTimer = memo(function QuestionTimer({
  isPaused = false,
}: QuestionTimerProps): React.JSX.Element {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (isPaused) {
      return
    }

    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [isPaused])

  // Color thresholds based on elapsed time
  const isGoodPace = elapsed < 60 // Under 1 minute
  const isModerate = elapsed >= 60 && elapsed < 120 // 1-2 minutes
  const isSlow = elapsed >= 180 // 3+ minutes

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <div className="flex items-center gap-2">
      {/* Time display with pacing indicator */}
      <div
        role="timer"
        aria-label={`Time spent on question: ${String(minutes)} minutes and ${String(seconds)} seconds`}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-sm font-medium transition-colors duration-300',
          isSlow
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : isModerate
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              : isGoodPace
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
        )}
      >
        <Icons.Clock size={14} aria-hidden="true" />
        <span>
          {String(minutes).padStart(1, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
})
QuestionTimer.displayName = 'QuestionTimer'
