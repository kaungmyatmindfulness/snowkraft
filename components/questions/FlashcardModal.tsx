'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ExplanationText, getPlainExplanation } from '@/components/quiz/ExplanationText'
import { Badge, Icons } from '@/components/ui'
import { DOMAINS, type QuestionWithAnswers } from '@/types'
import he from 'he'

interface FlashcardModalProps {
  question: QuestionWithAnswers
  onClose: () => void
  isLearned?: boolean
  onMarkLearned?: (learned: boolean) => void
}

export function FlashcardModal({
  question,
  onClose,
  isLearned = false,
  onMarkLearned,
}: FlashcardModalProps): React.JSX.Element {
  const [revealed, setRevealed] = useState(false)
  const [learned, setLearned] = useState(isLearned)
  const [copied, setCopied] = useState(false)

  const domainName = DOMAINS[Number(question.domain) as keyof typeof DOMAINS]

  const handleReveal = useCallback(() => {
    setRevealed(true)
  }, [])

  const handleLearnedChange = useCallback(
    (checked: boolean) => {
      setLearned(checked)
      onMarkLearned?.(checked)
    },
    [onMarkLearned]
  )

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

  // Keyboard shortcuts: Space/Enter to reveal, Esc to close, E to copy explanation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      // Ignore if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if ((event.key === ' ' || event.key === 'Enter') && !revealed) {
        event.preventDefault()
        handleReveal()
      } else if (
        event.key.toLowerCase() === 'e' &&
        revealed &&
        (question.elaboratedExplanation ?? question.explanation) !== null &&
        (question.elaboratedExplanation ?? question.explanation) !== ''
      ) {
        event.preventDefault()
        void handleCopyExplanation()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    onClose,
    handleReveal,
    revealed,
    question.explanation,
    question.elaboratedExplanation,
    handleCopyExplanation,
  ])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flashcard-title"
    >
      <div
        className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800"
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">D{question.domain}</Badge>
            <Badge variant={question.questionType === 'multi' ? 'purple' : 'default'}>
              {question.questionType === 'multi' ? 'Multi-select' : 'Single choice'}
            </Badge>
            {question.difficulty !== null && (
              <Badge
                variant={
                  question.difficulty === 'easy'
                    ? 'success'
                    : question.difficulty === 'medium'
                      ? 'warning'
                      : 'danger'
                }
              >
                {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close study modal"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Domain name */}
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{domainName}</p>

        {/* Question text */}
        <h2
          id="flashcard-title"
          className="mb-6 text-lg/relaxed font-medium text-gray-900 dark:text-gray-100"
        >
          {he.decode(question.questionText)}
        </h2>

        {/* Answers section */}
        <div className="space-y-3">
          {revealed ? (
            <>
              {/* Show all answers when revealed */}
              {question.answers.map((answer, index) => {
                const optionLetter = String.fromCharCode(65 + index)
                const isCorrect = answer.isCorrect

                return (
                  <div
                    key={answer.id}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border-2 p-4 transition-colors duration-200',
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-700/50'
                    )}
                  >
                    {/* Indicator */}
                    <div
                      className={cn(
                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-300 dark:border-slate-500'
                      )}
                    >
                      {isCorrect && (
                        <Icons.Check
                          className="size-3.5 text-white"
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Option letter */}
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-sm text-xs font-semibold',
                        isCorrect
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-slate-600 dark:text-gray-300'
                      )}
                    >
                      {optionLetter}
                    </span>

                    {/* Answer text */}
                    <span
                      className={cn(
                        'flex-1 leading-relaxed',
                        isCorrect
                          ? 'text-emerald-900 dark:text-emerald-200'
                          : 'text-gray-600 dark:text-gray-400'
                      )}
                    >
                      {he.decode(answer.answerText)}
                    </span>
                  </div>
                )
              })}
            </>
          ) : (
            <>
              {/* Hidden state: show answers as blurred/hidden */}
              <div className="space-y-3">
                {question.answers.map((answer, index) => {
                  const optionLetter = String.fromCharCode(65 + index)
                  return (
                    <div
                      key={answer.id}
                      className="flex items-start gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700/50"
                    >
                      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 dark:border-slate-500" />
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-slate-600 dark:text-gray-300">
                        {optionLetter}
                      </span>
                      <span className="flex-1 leading-relaxed text-gray-600 dark:text-gray-400">
                        {he.decode(answer.answerText)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Explanation panel (only shown when revealed) - prefer elaboratedExplanation */}
        {revealed &&
          (question.elaboratedExplanation ?? question.explanation) !== null &&
          (question.elaboratedExplanation ?? question.explanation) !== '' && (
            <div className="animate-slide-up mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-900/20">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-sky-100 p-1.5 dark:bg-sky-900/40">
                  <Icons.Lightbulb size={18} className="text-sky-600 dark:text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="font-semibold text-sky-900 dark:text-sky-300">Explanation</h3>
                    <button
                      onClick={() => {
                        void handleCopyExplanation()
                      }}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-200',
                        copied
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-800/60'
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

        {/* Footer actions */}
        <div className="mt-6 flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          {revealed ? (
            <>
              {/* Mark as Learned checkbox */}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={learned}
                  onChange={(e) => {
                    handleLearnedChange(e.target.checked)
                  }}
                  className="size-5 rounded-sm border-gray-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mark as learned
                </span>
                {learned && (
                  <Icons.CheckCircle size={18} className="text-emerald-500 dark:text-emerald-400" />
                )}
              </label>

              {/* Close button */}
              <button
                onClick={onClose}
                className="rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
              >
                Close
              </button>
            </>
          ) : (
            <>
              {/* Reveal answers button */}
              <div className="text-center sm:flex-1">
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  Think about the answer, then reveal
                </p>
              </div>
              <button
                onClick={handleReveal}
                className="w-full rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 sm:w-auto"
              >
                Reveal Answer
                <kbd className="ml-2 hidden rounded-sm bg-sky-500/50 px-1.5 py-0.5 text-xs sm:inline">
                  Space
                </kbd>
              </button>
            </>
          )}
        </div>

        {/* Keyboard hints */}
        <div className="mt-4 hidden justify-center gap-4 text-xs text-gray-400 sm:flex dark:text-gray-500">
          {!revealed && <span>Press Space or Enter to reveal</span>}
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  )
}
