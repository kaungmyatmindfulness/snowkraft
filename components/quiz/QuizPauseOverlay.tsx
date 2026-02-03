'use client'

import { useEffect, useRef, memo } from 'react'
import { Button, Icons } from '@/components/ui'
import { formatTime } from '@/lib/utils'

interface QuizPauseOverlayProps {
  elapsedTime: number
  questionsAnswered: number
  totalQuestions: number
  onResume: () => void
  onEnd: () => void
}

export const QuizPauseOverlay = memo(function QuizPauseOverlay({
  elapsedTime,
  questionsAnswered,
  totalQuestions,
  onResume,
  onEnd,
}: QuizPauseOverlayProps): React.JSX.Element {
  const resumeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus the resume button when overlay opens
  useEffect(() => {
    resumeButtonRef.current?.focus()
  }, [])

  // Handle Escape key to resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onResume()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onResume])

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="animate-scale-in mx-4 w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-800">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Icons.Pause size={32} className="text-amber-600 dark:text-amber-400" />
          </div>

          <h2 id="pause-title" className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Quiz Paused
          </h2>

          <p className="mb-6 text-gray-500 dark:text-gray-400">
            Take your time. Your progress is saved.
          </p>

          <div className="mb-6 space-y-2 rounded-xl bg-gray-50 p-4 dark:bg-slate-700/50">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Time elapsed</span>
              <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Questions answered</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {questionsAnswered} / {totalQuestions}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              ref={resumeButtonRef}
              onClick={onResume}
              variant="primary"
              className="w-full justify-center"
            >
              <Icons.Play size={18} />
              Resume Quiz
            </Button>

            <Button
              onClick={onEnd}
              variant="ghost"
              className="w-full justify-center text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Icons.X size={18} />
              End Quiz
            </Button>
          </div>

          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Press{' '}
            <kbd className="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-700">
              Esc
            </kbd>{' '}
            to resume
          </p>
        </div>
      </div>
    </div>
  )
})
QuizPauseOverlay.displayName = 'QuizPauseOverlay'
