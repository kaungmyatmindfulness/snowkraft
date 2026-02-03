'use client'

import { forwardRef, memo, useCallback } from 'react'
import he from 'he'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui'
import type { Answer } from '@/types'

// Helper functions to simplify nested ternaries
function getIndicatorStyles(
  showFeedback: boolean,
  isCorrect: boolean,
  isSelected: boolean
): string {
  if (showFeedback) {
    if (isCorrect && isSelected) {
      return 'border-emerald-500 bg-emerald-500'
    }
    if (isCorrect) {
      return 'border-amber-500 bg-amber-500'
    }
    if (isSelected) {
      return 'border-red-500 bg-red-500'
    }
  }
  if (isSelected) {
    return 'border-sky-500 bg-sky-500'
  }
  return 'border-gray-300 dark:border-slate-500 group-hover:border-gray-400 dark:group-hover:border-slate-400'
}

function getLetterBadgeStyles(
  showFeedback: boolean,
  isCorrect: boolean,
  isSelected: boolean
): string {
  if (showFeedback) {
    if (isCorrect && isSelected) {
      return 'bg-emerald-500 text-white'
    }
    if (isCorrect) {
      return 'bg-amber-500 text-white'
    }
    if (isSelected) {
      return 'bg-red-500 text-white'
    }
  }
  if (isSelected) {
    return 'bg-sky-500 text-white'
  }
  return 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
}

interface AnswerOptionProps {
  answer: Answer
  answerId: number
  isSelected: boolean
  onSelect: (answerId: number) => void
  showFeedback: boolean
  isMulti: boolean
  questionId: number
  index: number
}

export const AnswerOption = memo(
  forwardRef<HTMLButtonElement, AnswerOptionProps>(function AnswerOption(
    { answer, answerId, isSelected, onSelect, showFeedback, isMulti, questionId, index },
    ref
  ) {
    const handleClick = useCallback(() => {
      onSelect(answerId)
    }, [onSelect, answerId])

    const getStyles = (): string => {
      if (showFeedback) {
        if (answer.isCorrect && isSelected) {
          // Correct and selected - green
          return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200'
        }
        if (answer.isCorrect && !isSelected) {
          // Correct but missed - amber
          return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200'
        }
        if (isSelected) {
          // Selected but incorrect - red
          return 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200'
        }
        return 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
      }
      if (isSelected) {
        return 'border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/20'
      }
      return 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700'
    }

    const optionLetter = String.fromCharCode(65 + index) // A, B, C, D...

    // Determine the state for screen readers
    const getAriaLabel = (): string => {
      const baseLabel = `Option ${optionLetter}: ${he.decode(answer.answerText)}`
      if (showFeedback) {
        if (answer.isCorrect && isSelected) {
          return `${baseLabel}. Correct answer, you selected this.`
        }
        if (answer.isCorrect && !isSelected) {
          return `${baseLabel}. Correct answer, you missed this.`
        }
        if (isSelected) {
          return `${baseLabel}. Incorrect, you should not have selected this.`
        }
        return baseLabel
      }
      return `${baseLabel}${isSelected ? '. Currently selected.' : ''}`
    }

    const renderIndicatorIcon = (): React.ReactNode => {
      if (showFeedback) {
        if (answer.isCorrect && isSelected) {
          return <Icons.Check className="size-3.5 text-white" strokeWidth={3} aria-hidden="true" />
        }
        if (answer.isCorrect && !isSelected) {
          return <Icons.Plus className="size-3.5 text-white" strokeWidth={3} aria-hidden="true" />
        }
        if (isSelected) {
          return <Icons.X className="size-3.5 text-white" strokeWidth={3} aria-hidden="true" />
        }
        return null
      }
      if (isSelected) {
        return <Icons.Check className="size-3.5 text-white" strokeWidth={3} aria-hidden="true" />
      }
      return null
    }

    return (
      <button
        ref={ref}
        type="button"
        role={isMulti ? 'checkbox' : 'radio'}
        aria-checked={isSelected}
        aria-label={getAriaLabel()}
        aria-describedby={
          showFeedback ? `feedback-${String(questionId)}-${String(answer.id)}` : undefined
        }
        onClick={handleClick}
        disabled={showFeedback}
        data-testid="answer-option"
        className={cn(
          'flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
          getStyles()
        )}
      >
        {/* Option indicator (checkbox/radio) */}
        <div
          className={cn(
            'mt-0.5 flex size-6 shrink-0 items-center justify-center border-2 transition-colors duration-200',
            isMulti ? 'rounded-md' : 'rounded-full',
            getIndicatorStyles(showFeedback, answer.isCorrect, isSelected)
          )}
          aria-hidden="true"
        >
          {(isSelected || (showFeedback && answer.isCorrect)) && renderIndicatorIcon()}
        </div>

        {/* Option letter badge */}
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-sm text-xs font-semibold',
            getLetterBadgeStyles(showFeedback, answer.isCorrect, isSelected)
          )}
          aria-hidden="true"
        >
          {optionLetter}
        </span>

        {/* Answer text */}
        <span className="flex-1 leading-relaxed">{he.decode(answer.answerText)}</span>

        {/* Screen reader feedback text */}
        {showFeedback && (
          <span id={`feedback-${String(questionId)}-${String(answer.id)}`} className="sr-only">
            {answer.isCorrect ? 'Correct answer' : isSelected ? 'Incorrect answer' : ''}
          </span>
        )}
      </button>
    )
  })
)

AnswerOption.displayName = 'AnswerOption'
