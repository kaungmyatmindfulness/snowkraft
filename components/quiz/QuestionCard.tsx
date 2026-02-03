'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import he from 'he'
import { cn } from '@/lib/utils'
import { AnswerOption } from './AnswerOption'
import { ExplanationText, getPlainExplanation } from './ExplanationText'
import { Card, Badge, Icons } from '@/components/ui'
import { DOMAINS, type QuestionWithAnswers } from '@/types'

interface QuestionCardProps {
  question: QuestionWithAnswers
  selectedAnswers: number[]
  onSelectAnswer: (answerId: number) => void
  showFeedback: boolean
  isFlagged: boolean
  onFlag: () => void
}

export function QuestionCard({
  question,
  selectedAnswers,
  onSelectAnswer,
  showFeedback,
  isFlagged,
  onFlag,
}: QuestionCardProps): React.JSX.Element {
  const domainName = DOMAINS[Number(question.domain) as keyof typeof DOMAINS]
  const questionRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  // Store refs for arrow key navigation using callback ref pattern
  const optionRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  const setOptionRef = useMemo(
    () => (index: number) => (el: HTMLButtonElement | null) => {
      if (el) {
        optionRefs.current.set(index, el)
      } else {
        optionRefs.current.delete(index)
      }
    },
    []
  )

  // Handle arrow key navigation between answer options
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (showFeedback) {
        return
      }

      const { key } = event
      if (key !== 'ArrowUp' && key !== 'ArrowDown') {
        return
      }

      const focusedElement = document.activeElement
      let currentIndex = -1
      optionRefs.current.forEach((el, idx) => {
        if (el === focusedElement) {
          currentIndex = idx
        }
      })

      if (currentIndex === -1) {
        return
      }

      event.preventDefault()

      let nextIndex: number
      if (key === 'ArrowDown') {
        nextIndex = currentIndex + 1 >= question.answers.length ? 0 : currentIndex + 1
      } else {
        nextIndex = currentIndex - 1 < 0 ? question.answers.length - 1 : currentIndex - 1
      }

      optionRefs.current.get(nextIndex)?.focus()
    },
    [showFeedback, question.answers.length]
  )

  const handleCopyQuestion = useCallback(async (): Promise<void> => {
    try {
      // Format question text
      const questionText = he.decode(question.questionText)

      // Format options with labels (A, B, C, etc.)
      const optionLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const options = question.answers
        .map((answer, index) => {
          const label = optionLabels[index] ?? String(index + 1)
          const answerText = he.decode(answer.answerText)
          const correctMarker = answer.isCorrect ? ' ✓' : ''
          return `${label}. ${answerText}${correctMarker}`
        })
        .join('\n')

      // Format explanation (prefer elaboratedExplanation if available)
      const explanationText = question.elaboratedExplanation ?? question.explanation
      const explanation =
        explanationText !== null && explanationText !== ''
          ? `\n\nExplanation:\n${getPlainExplanation(explanationText)}`
          : ''

      // Combine all parts
      const fullText = `Question:\n${questionText}\n\nOptions:\n${options}${explanation}`

      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.warn('[Clipboard] Copy failed:', error)
    }
  }, [
    question.questionText,
    question.answers,
    question.explanation,
    question.elaboratedExplanation,
  ])

  // Keyboard shortcut for copying question (E key)
  useEffect(() => {
    if (!showFeedback) {
      return
    }

    function handleKeyDown(event: KeyboardEvent): void {
      // Ignore if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.key.toLowerCase() === 'e') {
        event.preventDefault()
        void handleCopyQuestion()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showFeedback, handleCopyQuestion])

  // Announce to screen readers when feedback is shown
  useEffect(() => {
    if (showFeedback && questionRef.current) {
      const correctCount = question.answers.filter((a) => a.isCorrect).length
      const selectedCorrect = selectedAnswers.filter((id) =>
        Boolean(question.answers.find((a) => a.id === id)?.isCorrect)
      ).length

      // Create announcement for screen readers
      const announcement =
        selectedCorrect === correctCount && selectedAnswers.length === correctCount
          ? 'Correct! All answers are correct.'
          : 'Incorrect. Review the correct answers below.'

      // Use aria-live region
      const liveRegion = document.getElementById('quiz-announcer')
      if (liveRegion) {
        liveRegion.textContent = announcement
      }
    }
  }, [showFeedback, selectedAnswers, question.answers])

  return (
    <>
      {/* Screen reader announcer */}
      <div
        id="quiz-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      <Card
        ref={questionRef}
        variant="default"
        role="region"
        aria-labelledby={`question-${String(question.id)}`}
        className="animate-scale-in"
      >
        {/* Header with badges and flag */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">D{question.domain}</Badge>
            <Badge variant={question.questionType === 'multi' ? 'purple' : 'default'}>
              {question.questionType === 'multi' ? 'Select all that apply' : 'Single choice'}
            </Badge>
          </div>
          <button
            onClick={onFlag}
            aria-pressed={isFlagged}
            aria-label={isFlagged ? 'Remove flag from question' : 'Flag question for review'}
            className={cn(
              'rounded-lg p-2 transition-colors duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
              isFlagged
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-slate-700 dark:hover:text-gray-300'
            )}
          >
            <Icons.Flag size={18} />
          </button>
        </div>

        {/* Domain name */}
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{domainName}</p>

        {/* Question text */}
        <h2
          id={`question-${String(question.id)}`}
          data-testid="question-text"
          className="mb-6 text-lg/relaxed font-medium text-gray-900 dark:text-gray-100"
        >
          {he.decode(question.questionText)}
        </h2>

        {/* Answer options */}
        <div
          role={question.questionType === 'multi' ? 'group' : 'radiogroup'}
          aria-labelledby={`question-${String(question.id)}`}
          aria-describedby={`question-hint-${String(question.id)}`}
          className="space-y-3"
          onKeyDown={handleKeyDown}
        >
          <p id={`question-hint-${String(question.id)}`} className="sr-only">
            {question.questionType === 'multi'
              ? 'This is a multiple choice question. Select all answers that apply. Use arrow keys to navigate between options.'
              : 'This is a single choice question. Select one answer. Use arrow keys to navigate between options.'}
          </p>
          {question.answers.map((answer, index) => (
            <AnswerOption
              key={answer.id}
              ref={setOptionRef(index)}
              answer={answer}
              answerId={answer.id}
              isSelected={selectedAnswers.includes(answer.id)}
              onSelect={onSelectAnswer}
              showFeedback={showFeedback}
              isMulti={question.questionType === 'multi'}
              questionId={question.id}
              index={index}
            />
          ))}
        </div>

        {/* Explanation panel - prefer elaboratedExplanation if available */}
        {showFeedback &&
          (question.elaboratedExplanation ?? question.explanation) !== null &&
          (question.elaboratedExplanation ?? question.explanation) !== '' && (
            <div
              role="region"
              aria-label="Answer explanation"
              data-testid="feedback"
              className="animate-slide-up mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-900/20"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-sky-100 p-1.5 dark:bg-sky-900/40">
                  <Icons.Lightbulb size={18} className="text-sky-600 dark:text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="font-semibold text-sky-900 dark:text-sky-300">Explanation</h3>
                    <button
                      onClick={() => {
                        void handleCopyQuestion()
                      }}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-200',
                        copied
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-800/60'
                      )}
                      aria-label="Copy question"
                    >
                      {copied ? (
                        <>
                          <Icons.Check size={14} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Icons.Copy size={14} />
                          <span className="hidden sm:inline">Copy</span>
                          <kbd className="ml-1 hidden rounded-sm bg-sky-200/50 px-1 py-0.5 text-[10px] sm:inline dark:bg-sky-800/50">
                            E
                          </kbd>
                        </>
                      )}
                    </button>
                  </div>
                  <ExplanationText
                    text={question.elaboratedExplanation ?? question.explanation ?? ''}
                    className="text-sm/relaxed text-sky-800 dark:text-sky-200"
                  />
                </div>
              </div>
            </div>
          )}
      </Card>
    </>
  )
}
