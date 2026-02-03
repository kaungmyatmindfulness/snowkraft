'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import he from 'he'
import type { QuestionWithAnswers } from '@/types'
import { practiceQuestion } from '@/lib/quiz/single'
import { AnswerOption } from '@/components/quiz/AnswerOption'
import { ExplanationText, getPlainExplanation } from '@/components/quiz/ExplanationText'
import { Button, Icons, Badge, DomainBadge, DifficultyBadge } from '@/components/ui'
import { cn } from '@/lib/utils'

interface QuickQuizModalProps {
  question: QuestionWithAnswers
  onClose: () => void
  onComplete?: () => void
}

export function QuickQuizModal({
  question,
  onClose,
  onComplete,
}: QuickQuizModalProps): React.JSX.Element {
  const [selectedAnswerIds, setSelectedAnswerIds] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [startTime] = useState(() => Date.now())
  const [copied, setCopied] = useState(false)

  const isMulti = question.questionType === 'multi'
  const hasSelection = selectedAnswerIds.length > 0

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
  const handleArrowKeyNav = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (submitted) {
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
    [submitted, question.answers.length]
  )

  // Handle answer selection
  const handleSelectAnswer = useCallback(
    (answerId: number): void => {
      if (submitted) {
        return
      }

      if (isMulti) {
        // Toggle selection for multi-select
        setSelectedAnswerIds((prev) =>
          prev.includes(answerId) ? prev.filter((id) => id !== answerId) : [...prev, answerId]
        )
      } else {
        // Single select - replace
        setSelectedAnswerIds([answerId])
      }
    },
    [submitted, isMulti]
  )

  // Handle submit
  const handleSubmit = useCallback((): void => {
    if (!hasSelection || submitted) {
      return
    }

    const timeSpent = Math.floor((Date.now() - startTime) / 1000)

    const result = practiceQuestion({
      questionId: question.id,
      selectedAnswerIds,
      timeSpentSeconds: timeSpent,
    })

    setIsCorrect(result.isCorrect)
    setSubmitted(true)
    onComplete?.()
  }, [hasSelection, submitted, startTime, question.id, selectedAnswerIds, onComplete])

  // Handle try again
  const handleTryAgain = useCallback((): void => {
    setSelectedAnswerIds([])
    setSubmitted(false)
    setIsCorrect(false)
  }, [])

  // Handle copy explanation (prefer elaboratedExplanation)
  const handleCopyExplanation = useCallback(async (): Promise<void> => {
    const explanationText = question.elaboratedExplanation ?? question.explanation
    if (explanationText === null || explanationText === '') {
      return
    }
    try {
      const plainText = getPlainExplanation(explanationText)
      await navigator.clipboard.writeText(plainText)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.warn('[Clipboard] Copy failed:', error)
    }
  }, [question.explanation, question.elaboratedExplanation])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Don't handle shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = e.key.toLowerCase()

      // Escape to close
      if (key === 'escape') {
        e.preventDefault()
        onClose()
        return
      }

      // E to copy explanation (when submitted and has explanation)
      if (
        key === 'e' &&
        submitted &&
        (question.elaboratedExplanation ?? question.explanation) !== null &&
        (question.elaboratedExplanation ?? question.explanation) !== ''
      ) {
        e.preventDefault()
        void handleCopyExplanation()
        return
      }

      // If submitted, no answer selection shortcuts
      if (submitted) {
        return
      }

      // Keys a, s, d, f, z, x for selecting answers (home row + bottom row)
      const answerKeyMap: Record<string, number> = {
        a: 0,
        s: 1,
        d: 2,
        f: 3,
        z: 4,
        x: 5,
      }

      const answerIndex = answerKeyMap[key]
      if (answerIndex !== undefined) {
        const answer = question.answers[answerIndex]
        if (answer !== undefined) {
          e.preventDefault()
          handleSelectAnswer(answer.id)
        }
        return
      }

      // Space or Enter to submit
      if ((key === ' ' || key === 'enter') && hasSelection) {
        e.preventDefault()
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    question.answers,
    question.explanation,
    question.elaboratedExplanation,
    submitted,
    hasSelection,
    handleSelectAnswer,
    handleSubmit,
    handleCopyExplanation,
    onClose,
  ])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-quiz-title"
    >
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 id="quick-quiz-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Quick Practice
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200"
            aria-label="Close modal (Escape)"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Question metadata */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {question.domain !== null && <DomainBadge domain={question.domain} />}
          {question.difficulty !== null && <DifficultyBadge difficulty={question.difficulty} />}
          <Badge variant="default">{isMulti ? 'Select all that apply' : 'Single answer'}</Badge>
        </div>

        {/* Question text */}
        <div className="mb-6">
          <p className="text-lg/relaxed text-gray-800 dark:text-gray-200">
            {he.decode(question.questionText)}
          </p>
        </div>

        {/* Answer options */}
        <div className="mb-6 space-y-3" onKeyDown={handleArrowKeyNav}>
          {question.answers.map((answer, index) => (
            <AnswerOption
              key={answer.id}
              ref={setOptionRef(index)}
              answer={answer}
              answerId={answer.id}
              isSelected={selectedAnswerIds.includes(answer.id)}
              onSelect={handleSelectAnswer}
              showFeedback={submitted}
              isMulti={isMulti}
              questionId={question.id}
              index={index}
            />
          ))}
        </div>

        {/* Feedback section */}
        {submitted && (
          <div
            className={cn(
              'mb-6 rounded-lg p-4',
              isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              {isCorrect ? (
                <>
                  <Icons.CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                    Correct!
                  </span>
                </>
              ) : (
                <>
                  <Icons.XCircle size={24} className="text-red-600 dark:text-red-400" />
                  <span className="font-semibold text-red-800 dark:text-red-200">Incorrect</span>
                </>
              )}
            </div>

            {(question.elaboratedExplanation ?? question.explanation) !== null && (
              <div className="mt-3 border-t border-gray-200 pt-3 dark:border-slate-600">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Icons.Lightbulb size={16} />
                    Explanation
                  </div>
                  <button
                    onClick={() => {
                      void handleCopyExplanation()
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-200',
                      copied
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                    )}
                    aria-label="Copy explanation"
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
                        <kbd className="ml-1 hidden rounded-sm bg-gray-200/50 px-1 py-0.5 text-[10px] sm:inline dark:bg-slate-600/50">
                          E
                        </kbd>
                      </>
                    )}
                  </button>
                </div>
                <ExplanationText
                  text={question.elaboratedExplanation ?? question.explanation ?? ''}
                  className="text-sm/relaxed text-gray-600 dark:text-gray-400"
                />
              </div>
            )}
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        {!submitted && (
          <div className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
            <span className="hidden sm:inline">
              Press{' '}
              {['A', 'S', 'D', 'F', 'Z', 'X'].slice(0, question.answers.length).map((key, i) => (
                <span key={key}>
                  <kbd className="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-slate-700">
                    {key}
                  </kbd>
                  {i < Math.min(question.answers.length, 6) - 1 && ' '}
                </span>
              ))}{' '}
              to select,{' '}
              <kbd className="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-slate-700">
                Space
              </kbd>{' '}
              to submit,{' '}
              <kbd className="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-slate-700">
                Esc
              </kbd>{' '}
              to close
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          {submitted ? (
            <>
              <Button variant="secondary" onClick={handleTryAgain}>
                <Icons.RotateCcw size={18} />
                Try Again
              </Button>
              <Button variant="primary" onClick={onClose}>
                Close
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={!hasSelection}>
                <Icons.CheckCircle size={18} />
                Check Answer
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
