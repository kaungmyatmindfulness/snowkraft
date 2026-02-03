'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { formatTime, cn } from '@/lib/utils'
import { Icons } from '@/components/ui'

interface TimerProps {
  totalSeconds: number
  onTimeUp: () => void
}

export const Timer = memo(function Timer({
  totalSeconds,
  onTimeUp,
}: TimerProps): React.JSX.Element {
  const [remaining, setRemaining] = useState(totalSeconds)
  const announcedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (remaining <= 0) {
      onTimeUp()
      return
    }

    const timer = setInterval(() => {
      setRemaining((prev) => prev - 1)
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [remaining, onTimeUp])

  // Announce time milestones to screen readers
  useEffect(() => {
    const milestones = [1800, 900, 600, 300, 120, 60] // 30, 15, 10, 5, 2, 1 minutes
    const currentMilestone = milestones.find((m) => remaining <= m && !announcedRef.current.has(m))

    if (currentMilestone !== undefined) {
      announcedRef.current.add(currentMilestone)
      const minutes = Math.ceil(remaining / 60)
      const announcement =
        remaining <= 60 ? `Less than one minute remaining` : `${String(minutes)} minutes remaining`

      const liveRegion = document.getElementById('timer-announcer')
      if (liveRegion !== null) {
        liveRegion.textContent = announcement
      }
    }
  }, [remaining])

  const isWarning = remaining <= 600 // 10 minutes
  const isCritical = remaining <= 120 // 2 minutes

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <>
      {/* Screen reader announcer for time milestones */}
      <div
        id="timer-announcer"
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />

      <div
        role="timer"
        aria-label={`Time remaining: ${String(minutes)} minutes and ${String(seconds)} seconds`}
        aria-live={isCritical ? 'assertive' : 'off'}
        className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-lg font-semibold transition-[background-color,color,box-shadow] duration-300',
          isCritical
            ? 'animate-pulse bg-red-100 text-red-700 shadow-md shadow-red-200 dark:bg-red-900/30 dark:text-red-400 dark:shadow-red-900/50'
            : isWarning
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200'
        )}
      >
        <Icons.Clock size={20} className={cn(isCritical && 'animate-spin')} aria-hidden="true" />
        <span>{formatTime(remaining)}</span>
      </div>
    </>
  )
})
Timer.displayName = 'Timer'
