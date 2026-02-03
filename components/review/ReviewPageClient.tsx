'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import he from 'he'
import {
  getReviewStats,
  getReviewQuestionDetails,
  removeQuestionFromReview,
  type ReviewQuestionDetail,
} from '@/lib/storage'
import { startQuiz, EXAM_QUESTION_SETS } from '@/lib/quiz/client'
import { cn, shuffleArray } from '@/lib/utils'
import { ExplanationText } from '@/components/quiz/ExplanationText'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  DomainBadge,
  Icons,
} from '@/components/ui'
import type { ReviewStats } from '@/types'

interface ReviewQuestionModalProps {
  item: ReviewQuestionDetail
  currentIndex: number
  totalCount: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onRemove: () => void
}

function ReviewQuestionModal({
  item,
  currentIndex,
  totalCount,
  onClose,
  onPrev,
  onNext,
  onRemove,
}: ReviewQuestionModalProps): React.JSX.Element {
  const { question, selectedAnswerIds } = item
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < totalCount - 1
  const contentRef = useRef<HTMLDivElement>(null)

  // Scroll to top when navigating to a different question
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [item.questionId])

  // Keyboard: Escape to close, Arrow keys to navigate, R to remove
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft' && hasPrev) {
        event.preventDefault()
        onPrev()
      } else if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault()
        onNext()
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        onRemove()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, onPrev, onNext, onRemove, hasPrev, hasNext])

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
      aria-labelledby="review-modal-title"
      onClick={onClose}
    >
      <div
        ref={contentRef}
        className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800"
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {question.domain !== null && <DomainBadge domain={`D${question.domain}`} size="sm" />}
            <Badge variant={question.questionType === 'multi' ? 'purple' : 'default'}>
              {question.questionType === 'multi' ? 'Multi-select' : 'Single choice'}
            </Badge>
            {item.wrongCount > 0 && (
              <Badge variant="danger" size="sm" className="flex items-center gap-1">
                <Icons.XCircle size={12} />
                {item.wrongCount}x wrong
              </Badge>
            )}
            {item.timedOutCount > 0 && (
              <Badge variant="warning" size="sm" className="flex items-center gap-1">
                <Icons.Clock size={12} />
                {item.timedOutCount}x timed out
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close review modal"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Question text */}
        <h2
          id="review-modal-title"
          className="mb-6 text-lg/relaxed font-medium text-gray-900 dark:text-gray-100"
        >
          {he.decode(question.questionText)}
        </h2>

        {/* Answer Options */}
        <div className="mb-4 space-y-2">
          {question.answers
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((answer, answerIndex) => {
              const isSelected = selectedAnswerIds.includes(answer.id)
              const isCorrect = answer.isCorrect
              const optionLetter = String.fromCharCode(65 + answerIndex)
              return (
                <div
                  key={answer.id}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border p-3 text-sm',
                    isCorrect && isSelected
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                      : isCorrect
                        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                        : isSelected
                          ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                          : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-700/50'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      isCorrect
                        ? 'bg-emerald-200 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300'
                        : isSelected
                          ? 'bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-300'
                          : 'bg-gray-200 text-gray-600 dark:bg-slate-600 dark:text-gray-300'
                    )}
                  >
                    {optionLetter}
                  </span>
                  <span
                    className={cn(
                      'flex-1',
                      isCorrect
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : isSelected
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {answer.answerText}
                  </span>
                  {isCorrect && (
                    <Icons.CheckCircle
                      size={16}
                      className="shrink-0 text-emerald-500 dark:text-emerald-400"
                    />
                  )}
                  {isSelected && !isCorrect && (
                    <Icons.XCircle size={16} className="shrink-0 text-red-500 dark:text-red-400" />
                  )}
                </div>
              )
            })}
        </div>

        {/* Summary Boxes */}
        <div className="grid gap-2 text-sm">
          {selectedAnswerIds.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <Icons.XCircle size={16} className="mt-0.5 shrink-0 text-red-500 dark:text-red-400" />
              <div>
                <span className="font-medium text-red-700 dark:text-red-300">Your answer:</span>
                <ul className="mt-1 space-y-1">
                  {question.answers
                    .filter((a) => selectedAnswerIds.includes(a.id))
                    .map((a) => (
                      <li key={a.id} className="text-red-600 dark:text-red-400">
                        • {a.answerText}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
            <Icons.CheckCircle
              size={16}
              className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400"
            />
            <div>
              <span className="font-medium text-emerald-700 dark:text-emerald-300">Correct:</span>
              <ul className="mt-1 space-y-1">
                {question.answers
                  .filter((a) => a.isCorrect)
                  .map((a) => (
                    <li key={a.id} className="text-emerald-600 dark:text-emerald-400">
                      • {a.answerText}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Explanation */}
        {(question.elaboratedExplanation ?? question.explanation) !== null &&
          (question.elaboratedExplanation ?? question.explanation) !== '' && (
            <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-900/20">
              <div className="flex items-start gap-2">
                <Icons.Lightbulb
                  size={16}
                  className="mt-0.5 shrink-0 text-sky-500 dark:text-sky-400"
                />
                <ExplanationText
                  text={question.elaboratedExplanation ?? question.explanation ?? ''}
                  className="text-sm text-gray-700 dark:text-gray-200"
                />
              </div>
            </div>
          )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-slate-700">
          {/* Remove button */}
          <button
            onClick={onRemove}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Icons.Trash2 size={16} />
            <span className="hidden sm:inline">Remove from Review</span>
            <span className="sm:hidden">Remove</span>
          </button>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Previous question"
              className={cn(
                'rounded-lg p-2 transition-colors',
                hasPrev
                  ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
                  : 'cursor-not-allowed text-gray-300 dark:text-gray-600'
              )}
            >
              <Icons.ChevronLeft size={20} />
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentIndex + 1} / {totalCount}
            </span>
            <button
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next question"
              className={cn(
                'rounded-lg p-2 transition-colors',
                hasNext
                  ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
                  : 'cursor-not-allowed text-gray-300 dark:text-gray-600'
              )}
            >
              <Icons.ChevronRight size={20} />
            </button>
          </div>

          {/* Close button */}
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-gray-400 sm:inline dark:text-gray-500">
              ← → navigate · R remove
            </span>
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReviewPageClient(): React.JSX.Element {
  const router = useRouter()
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [questions, setQuestions] = useState<ReviewQuestionDetail[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Filter state
  const [domainFilter, setDomainFilter] = useState<string[]>([])
  const [questionSetFilter, setQuestionSetFilter] = useState<number[]>([])
  const [reasonFilter, setReasonFilter] = useState<'all' | 'wrong' | 'timedOut'>('all')
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | '1' | '2-3' | '4+'>('all')

  // Filter questions based on current filters
  const filteredQuestions = useMemo(() => {
    return questions.filter((item) => {
      // Domain filter
      if (domainFilter.length > 0 && !domainFilter.includes(item.question.domain ?? '')) {
        return false
      }
      // Question set filter (derived from question ID)
      const set = Math.ceil(item.questionId / 100)
      if (questionSetFilter.length > 0 && !questionSetFilter.includes(set)) {
        return false
      }
      // Reason filter
      if (reasonFilter === 'wrong' && item.wrongCount === 0) {
        return false
      }
      if (reasonFilter === 'timedOut' && item.timedOutCount === 0) {
        return false
      }
      // Frequency filter
      const totalCount = item.wrongCount + item.timedOutCount
      if (frequencyFilter === '1' && totalCount !== 1) {
        return false
      }
      if (frequencyFilter === '2-3' && (totalCount < 2 || totalCount > 3)) {
        return false
      }
      if (frequencyFilter === '4+' && totalCount < 4) {
        return false
      }
      return true
    })
  }, [questions, domainFilter, questionSetFilter, reasonFilter, frequencyFilter])

  const hasActiveFilters =
    domainFilter.length > 0 ||
    questionSetFilter.length > 0 ||
    reasonFilter !== 'all' ||
    frequencyFilter !== 'all'

  const clearAllFilters = useCallback((): void => {
    setDomainFilter([])
    setQuestionSetFilter([])
    setReasonFilter('all')
    setFrequencyFilter('all')
  }, [])

  useEffect(() => {
    // Reading from localStorage (external system) on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with localStorage
    setStats(getReviewStats())
    setQuestions(getReviewQuestionDetails())
  }, [])

  const handleCloseModal = useCallback((): void => {
    setSelectedIndex(null)
  }, [])

  const handlePrevQuestion = useCallback((): void => {
    setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))
  }, [])

  const handleNextQuestion = useCallback((): void => {
    setSelectedIndex((prev) =>
      prev !== null && prev < filteredQuestions.length - 1 ? prev + 1 : prev
    )
  }, [filteredQuestions.length])

  const handleRemoveQuestion = useCallback((): void => {
    if (selectedIndex === null) {
      return
    }

    const currentQuestion = filteredQuestions[selectedIndex]
    if (currentQuestion === undefined) {
      return
    }

    const confirmed = window.confirm(
      'Remove this question from review? Your wrong/timed-out attempts will be deleted.'
    )
    if (!confirmed) {
      return
    }

    // Remove the question from review
    removeQuestionFromReview(currentQuestion.questionId)

    // Refresh state
    setStats(getReviewStats())
    setQuestions(getReviewQuestionDetails())

    // Close modal
    setSelectedIndex(null)
  }, [selectedIndex, filteredQuestions])

  const handleStartReview = (): void => {
    if (filteredQuestions.length === 0) {
      return
    }

    setIsStarting(true)

    const filteredIds = filteredQuestions.map((q) => q.questionId)
    const shuffledIds = shuffleArray(filteredIds)
    const result = startQuiz({
      type: 'review',
      questionCount: shuffledIds.length,
      specificQuestionIds: shuffledIds,
    })

    router.push(`/quiz/${result.sessionId}`)
  }

  if (stats === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-b-2 border-sky-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-slide-up flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Review Questions</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Practice questions you got wrong or ran out of time on
          </p>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm">
            <Icons.Home size={18} />
            Home
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="animate-slide-up stagger-1 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <div className="stat-card-icon bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <Icons.RotateCcw size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalToReview}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total to Review</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <Icons.XCircle size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.wrongCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Answered Wrong</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Icons.Clock size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.timedOutCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Timed Out</div>
          </div>
        </div>
      </div>

      {/* Start Review Button */}
      {stats.totalToReview > 0 && (
        <div className="animate-slide-up stagger-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartReview}
            disabled={isStarting || filteredQuestions.length === 0}
            className="w-full sm:w-auto"
          >
            {isStarting ? (
              <>
                <div className="size-4 animate-spin rounded-full border-b-2 border-white"></div>
                Starting...
              </>
            ) : (
              <>
                <Icons.Play size={20} />
                Start Review Quiz ({filteredQuestions.length} questions)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Filter Section */}
      {stats.totalToReview > 0 && (
        <Card variant="default" className="animate-slide-up stagger-2 dark:bg-slate-800">
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Domain Filter */}
              <div>
                <label className="mb-2 block text-xs text-gray-500 dark:text-gray-400">
                  Domain
                </label>
                <div className="flex flex-wrap gap-2">
                  {['1', '2', '3', '4', '5', '6'].map((domain) => (
                    <button
                      key={domain}
                      onClick={() => {
                        setDomainFilter((prev) =>
                          prev.includes(domain)
                            ? prev.filter((d) => d !== domain)
                            : [...prev, domain]
                        )
                      }}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                        domainFilter.includes(domain)
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                      )}
                    >
                      D{domain}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Set Filter */}
              <div>
                <label className="mb-2 block text-xs text-gray-500 dark:text-gray-400">
                  Question Set
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXAM_QUESTION_SETS.map(({ set, range }) => (
                    <button
                      key={set}
                      onClick={() => {
                        setQuestionSetFilter((prev) =>
                          prev.includes(set) ? prev.filter((s) => s !== set) : [...prev, set]
                        )
                      }}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                        questionSetFilter.includes(set)
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                      )}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Filter */}
              <div>
                <label className="mb-2 block text-xs text-gray-500 dark:text-gray-400">
                  Review Reason
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'wrong', label: 'Wrong only' },
                    { value: 'timedOut', label: 'Timed out only' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setReasonFilter(option.value as 'all' | 'wrong' | 'timedOut')
                      }}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                        reasonFilter === option.value
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency Filter */}
              <div>
                <label className="mb-2 block text-xs text-gray-500 dark:text-gray-400">
                  Frequency
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: '1', label: '1×' },
                    { value: '2-3', label: '2-3×' },
                    { value: '4+', label: '4+×' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFrequencyFilter(option.value as 'all' | '1' | '2-3' | '4+')
                      }}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                        frequencyFilter === option.value
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions List */}
      {questions.length > 0 && (
        <Card variant="default" className="animate-slide-up stagger-3 dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <Icons.BookOpen size={20} className="text-purple-500" />
              Questions to Review
              {hasActiveFilters && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  (showing {filteredQuestions.length} of {questions.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent padding="none">
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredQuestions.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No questions match the current filters
                </div>
              ) : (
                filteredQuestions.map((item, index) => {
                  const { question } = item
                  const decodedText = he.decode(question.questionText)
                  const previewText =
                    decodedText.length > 120 ? decodedText.substring(0, 120) + '...' : decodedText

                  return (
                    <button
                      key={item.questionId}
                      type="button"
                      onClick={() => {
                        setSelectedIndex(index)
                      }}
                      className={cn(
                        'w-full px-6 py-4 text-left transition-colors',
                        'hover:bg-gray-50 dark:hover:bg-slate-700/50',
                        'focus:ring-2 focus:ring-sky-500 focus:outline-none focus:ring-inset'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="mb-2 text-sm text-gray-900 dark:text-gray-100">
                            {previewText}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {question.domain !== null && (
                              <DomainBadge domain={`D${question.domain}`} size="sm" />
                            )}
                            {item.wrongCount > 0 && (
                              <Badge variant="danger" size="sm" className="flex items-center gap-1">
                                <Icons.XCircle size={12} />
                                {item.wrongCount}x wrong
                              </Badge>
                            )}
                            {item.timedOutCount > 0 && (
                              <Badge
                                variant="warning"
                                size="sm"
                                className="flex items-center gap-1"
                              >
                                <Icons.Clock size={12} />
                                {item.timedOutCount}x timed out
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              Last attempt: {new Date(item.lastAttemptedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-gray-400 dark:text-gray-500">
                          <Icons.ChevronRight size={20} />
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stats.totalToReview === 0 && (
        <Card variant="bordered" className="animate-slide-up py-12 text-center dark:bg-slate-800">
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                'flex size-16 items-center justify-center rounded-full',
                'bg-emerald-100 dark:bg-emerald-900/30'
              )}
            >
              <Icons.CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                No questions to review
              </h3>
              <p className="mb-4 text-gray-500 dark:text-gray-400">
                Great job! You haven&apos;t missed any questions yet. Keep practicing to build your
                review queue.
              </p>
              <Link href="/">
                <Button variant="primary">
                  <Icons.Play size={18} />
                  Start Practice Quiz
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Review Question Modal */}
      {selectedIndex !== null && filteredQuestions[selectedIndex] !== undefined && (
        <ReviewQuestionModal
          item={filteredQuestions[selectedIndex]}
          currentIndex={selectedIndex}
          totalCount={filteredQuestions.length}
          onClose={handleCloseModal}
          onPrev={handlePrevQuestion}
          onNext={handleNextQuestion}
          onRemove={handleRemoveQuestion}
        />
      )}
    </div>
  )
}
