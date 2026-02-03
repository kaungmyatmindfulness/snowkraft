'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { submitAnswer, endSession } from '@/lib/quiz/client'
import { QuestionCard } from '@/components/quiz/QuestionCard'
import { QuizProgress } from '@/components/quiz/QuizProgress'
import { Timer } from '@/components/quiz/Timer'
import { QuestionTimer } from '@/components/quiz/QuestionTimer'
import { KeyboardShortcuts } from '@/components/quiz/KeyboardShortcuts'
import { QuizPauseOverlay } from '@/components/quiz/QuizPauseOverlay'
import { Button, Card, Icons } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { QuestionWithAnswers, Session } from '@/types'

interface QuizClientProps {
  session: Session
  questions: QuestionWithAnswers[]
}

export function QuizClient({ session, questions }: QuizClientProps): React.JSX.Element {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Map<number, number[]>>(new Map())
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [showFeedback, setShowFeedback] = useState(false)
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<number>>(new Set())
  const [startTime] = useState(() => Date.now())
  const [questionStartTime, setQuestionStartTime] = useState(() => Date.now())

  // Pause state (practice mode only)
  const [isPaused, setIsPaused] = useState(false)
  const [pausedDuration, setPausedDuration] = useState(0) // Total accumulated pause time in ms
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null)
  const [questionPausedDuration, setQuestionPausedDuration] = useState(0) // Pause time for current question
  const [elapsedTimeAtPause, setElapsedTimeAtPause] = useState(0) // Elapsed time when paused (for overlay)

  // Number key navigation state (exam mode only)
  const [numberInput, setNumberInput] = useState('')
  const [showGoToIndicator, setShowGoToIndicator] = useState(false)
  const numberInputTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isExamMode = session.sessionType === 'exam'
  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length

  // Refs for keyboard handler to avoid frequent re-subscriptions
  const stateRef = useRef({
    currentQuestion,
    currentIndex,
    totalQuestions,
    selectedAnswers,
    showFeedback,
    isExamMode,
    isPaused,
  })

  // Keep stateRef updated (runs every render, no deps needed)
  useEffect(() => {
    stateRef.current = {
      currentQuestion,
      currentIndex,
      totalQuestions,
      selectedAnswers,
      showFeedback,
      isExamMode,
      isPaused,
    }
  })

  const handleSelectAnswer = useCallback(
    (answerId: number): void => {
      if (showFeedback && !isExamMode) {
        return
      }
      if (currentQuestion === undefined) {
        return
      }

      const current = selectedAnswers.get(currentQuestion.id) ?? []

      if (currentQuestion.questionType === 'single') {
        setSelectedAnswers(new Map(selectedAnswers).set(currentQuestion.id, [answerId]))
      } else {
        const updated = current.includes(answerId)
          ? current.filter((id) => id !== answerId)
          : [...current, answerId]
        setSelectedAnswers(new Map(selectedAnswers).set(currentQuestion.id, updated))
      }
    },
    [showFeedback, isExamMode, currentQuestion, selectedAnswers]
  )

  const handleSubmitAnswer = useCallback((): void => {
    if (currentQuestion === undefined) {
      return
    }

    const selected = selectedAnswers.get(currentQuestion.id) ?? []
    if (selected.length === 0) {
      return
    }

    const timeSpent = Math.floor((Date.now() - questionStartTime - questionPausedDuration) / 1000)

    try {
      setIsSubmitting(true)
      submitAnswer({
        sessionId: session.id,
        questionId: currentQuestion.id,
        selectedAnswerIds: selected,
        timeSpentSeconds: timeSpent,
      })
    } catch (error) {
      console.error('[Quiz] Failed to submit answer:', error)
    } finally {
      setIsSubmitting(false)
    }

    // Track submitted questions in exam mode for visual feedback
    if (isExamMode) {
      setSubmittedQuestions((prev) => new Set(prev).add(currentQuestion.id))
    }

    if (!isExamMode) {
      setShowFeedback(true)
    }
  }, [
    currentQuestion,
    selectedAnswers,
    questionStartTime,
    questionPausedDuration,
    session.id,
    isExamMode,
  ])

  // Auto-submit skipped question as failed
  const autoSubmitSkipped = useCallback(
    (questionId: number): void => {
      const selected = selectedAnswers.get(questionId) ?? []
      // If question hasn't been answered, submit it as failed (skipped)
      if (selected.length === 0) {
        const timeSpent = Math.floor(
          (Date.now() - questionStartTime - questionPausedDuration) / 1000
        )
        try {
          submitAnswer({
            sessionId: session.id,
            questionId: questionId,
            selectedAnswerIds: [],
            timeSpentSeconds: timeSpent,
          })
        } catch (error) {
          console.error('[Quiz] Failed to auto-submit skipped question:', error)
        }
      }
    },
    [selectedAnswers, questionStartTime, questionPausedDuration, session.id]
  )

  const handleNext = useCallback((): void => {
    if (currentIndex >= totalQuestions - 1) {
      return
    }

    if (!currentQuestion) {
      return
    }

    const currentSelected = selectedAnswers.get(currentQuestion.id) ?? []
    const hasAnswer = currentSelected.length > 0

    // Practice mode: show feedback before advancing
    if (!isExamMode && hasAnswer && !showFeedback) {
      handleSubmitAnswer()
      return // Stay on question to show feedback
    }

    // Auto-submit if no answer selected (skipped)
    if (!hasAnswer) {
      autoSubmitSkipped(currentQuestion.id)
    } else if (isExamMode) {
      // Exam mode: submit and advance
      handleSubmitAnswer()
    }

    setCurrentIndex(currentIndex + 1)
    setShowFeedback(false)
    setQuestionStartTime(Date.now())
    setQuestionPausedDuration(0)
  }, [
    currentIndex,
    totalQuestions,
    currentQuestion,
    selectedAnswers,
    isExamMode,
    showFeedback,
    autoSubmitSkipped,
    handleSubmitAnswer,
  ])

  const handlePrevious = useCallback((): void => {
    if (currentIndex > 0) {
      // Auto-submit current question as skipped if not answered
      if (currentQuestion) {
        autoSubmitSkipped(currentQuestion.id)
      }
      setCurrentIndex(currentIndex - 1)
      setShowFeedback(false)
      setQuestionStartTime(Date.now())
      setQuestionPausedDuration(0)
    }
  }, [currentIndex, currentQuestion, autoSubmitSkipped])

  const handleFlag = useCallback((): void => {
    if (currentQuestion === undefined) {
      return
    }

    const newFlagged = new Set(flagged)
    if (newFlagged.has(currentQuestion.id)) {
      newFlagged.delete(currentQuestion.id)
    } else {
      newFlagged.add(currentQuestion.id)
    }
    setFlagged(newFlagged)
  }, [currentQuestion, flagged])

  // Pause handler (practice mode only)
  const handlePause = useCallback((): void => {
    if (isExamMode || isPaused) {
      return
    }
    const now = Date.now()
    setElapsedTimeAtPause(Math.floor((now - startTime - pausedDuration) / 1000))
    setIsPaused(true)
    setPauseStartTime(now)
  }, [isExamMode, isPaused, startTime, pausedDuration])

  // Resume handler
  const handleResume = useCallback((): void => {
    if (!isPaused || pauseStartTime === null) {
      return
    }
    const pauseDelta = Date.now() - pauseStartTime
    setPausedDuration((prev) => prev + pauseDelta)
    setQuestionPausedDuration((prev) => prev + pauseDelta)
    setIsPaused(false)
    setPauseStartTime(null)
  }, [isPaused, pauseStartTime])

  const handleFinish = useCallback((): void => {
    const totalTime = Math.floor((Date.now() - startTime - pausedDuration) / 1000)
    setIsSubmitting(true)
    endSession(session.id, totalTime)
    router.push(`/quiz/${session.id}/results`)
  }, [startTime, pausedDuration, session.id, router])

  const handleTimeUp = useCallback((): void => {
    handleFinish()
  }, [handleFinish])

  // Handle number key input for question navigation (exam mode)
  const handleNumberInput = useCallback(
    (digit: string): void => {
      // Clear any existing timeout
      if (numberInputTimeoutRef.current) {
        clearTimeout(numberInputTimeoutRef.current)
      }

      // Append the digit to the current input
      const newInput = numberInput + digit
      setNumberInput(newInput)
      setShowGoToIndicator(true)

      // Set a timeout to process the input after 800ms of inactivity
      numberInputTimeoutRef.current = setTimeout(() => {
        const questionNumber = parseInt(newInput, 10)

        // Validate and jump to question
        if (questionNumber >= 1 && questionNumber <= totalQuestions) {
          // Auto-submit current question as skipped if not answered
          if (currentQuestion) {
            autoSubmitSkipped(currentQuestion.id)
          }
          setCurrentIndex(questionNumber - 1)
          setQuestionStartTime(Date.now())
        }

        // Reset the input and hide indicator
        setNumberInput('')
        // Fade out the indicator after showing the jump result briefly
        setTimeout(() => {
          setShowGoToIndicator(false)
        }, 300)
      }, 800)
    },
    [numberInput, totalQuestions, currentQuestion, autoSubmitSkipped]
  )

  // Stable callback refs for keyboard handlers to avoid frequent re-subscriptions
  const handlersRef = useRef({
    handleSubmitAnswer,
    handleSelectAnswer,
    handleNext,
    handlePrevious,
    handleFlag,
    handleFinish,
    handlePause,
    handleResume,
    handleNumberInput,
  })

  // Keep handlersRef updated (runs every render, no deps needed)
  useEffect(() => {
    handlersRef.current = {
      handleSubmitAnswer,
      handleSelectAnswer,
      handleNext,
      handlePrevious,
      handleFlag,
      handleFinish,
      handlePause,
      handleResume,
      handleNumberInput,
    }
  })

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (numberInputTimeoutRef.current) {
        clearTimeout(numberInputTimeoutRef.current)
      }
    }
  }, [])

  // Prevent browser back button from accidentally quitting the session
  useEffect(() => {
    // Push a dummy state to create history entry we can intercept
    window.history.pushState({ quizSession: true }, '')

    const handlePopState = (): void => {
      // User pressed back button - push state again to stay on page
      // and show confirmation via beforeunload
      window.history.pushState({ quizSession: true }, '')

      // Show a native-like confirmation by triggering pause in practice mode
      if (!isExamMode) {
        handlePause()
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      // Show browser's native "Leave site?" dialog
      e.preventDefault()
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isExamMode, handlePause])

  // Keyboard shortcuts - uses refs for stable single subscription
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Don't handle shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const state = stateRef.current
      const handlers = handlersRef.current

      // Handle pause state first
      if (state.isPaused) {
        if (e.key === 'Escape') {
          e.preventDefault()
          handlers.handleResume()
        }
        return
      }

      if (!state.currentQuestion) {
        return
      }

      const key = e.key.toLowerCase()
      const currentSelected = state.selectedAnswers.get(state.currentQuestion.id) ?? []
      const answered = currentSelected.length > 0

      // Number keys for question navigation (exam mode only)
      if (state.isExamMode && /^[0-9]$/.test(e.key)) {
        e.preventDefault()
        handlers.handleNumberInput(e.key)
        return
      }

      // Keys a, s, d, f, z, x, c, v to select answers (home row + bottom row)
      const answerKeyMap: Record<string, number> = {
        a: 0,
        s: 1,
        d: 2,
        f: 3,
        z: 4,
        x: 5,
        c: 6,
        v: 7,
      }
      const answerIndex = answerKeyMap[key]
      if (answerIndex !== undefined) {
        const answer = state.currentQuestion.answers[answerIndex]
        if (answer !== undefined) {
          e.preventDefault()
          handlers.handleSelectAnswer(answer.id)
        }
        return
      }

      switch (key) {
        case ' ':
          e.preventDefault()
          if (state.showFeedback) {
            // If feedback is showing, space goes to next question or finishes quiz
            if (state.currentIndex < state.totalQuestions - 1) {
              handlers.handleNext()
            } else {
              // On last question with feedback showing, finish quiz
              handlers.handleFinish()
            }
          } else if (answered) {
            // If answer selected but not submitted, space submits
            handlers.handleSubmitAnswer()
            // In exam mode, also advance to next question
            if (state.isExamMode && state.currentIndex < state.totalQuestions - 1) {
              handlers.handleNext()
            }
          }
          break

        case 'enter':
          // Submit answer if we have selections and not showing feedback
          if (answered && !state.showFeedback && !state.isExamMode) {
            e.preventDefault()
            handlers.handleSubmitAnswer()
          }
          break

        case 'arrowleft':
        case 'p':
          // Previous question
          if (state.currentIndex > 0) {
            e.preventDefault()
            handlers.handlePrevious()
          }
          break

        case 'arrowright':
        case 'n':
          // Next question
          if (state.currentIndex < state.totalQuestions - 1) {
            e.preventDefault()
            handlers.handleNext()
          }
          break

        case 'g':
          // Flag question
          e.preventDefault()
          handlers.handleFlag()
          break

        case 'escape':
          // Pause/resume quiz (practice mode only)
          if (!state.isExamMode) {
            e.preventDefault()
            handlers.handlePause()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, []) // Empty deps - single subscription using refs

  // Memoize allAnswered to prevent 100 Map lookups on every render
  const allAnswered = useMemo(
    () => questions.every((q) => (selectedAnswers.get(q.id)?.length ?? 0) > 0),
    [questions, selectedAnswers]
  )

  if (!currentQuestion) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Icons.AlertCircle size={48} className="text-gray-400 dark:text-gray-500" />
        <div className="text-gray-500 dark:text-gray-400">No questions found</div>
        <Link href="/">
          <Button variant="secondary">
            <Icons.Home size={18} />
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }

  const currentSelected = selectedAnswers.get(currentQuestion.id) ?? []
  const isLastQuestion = currentIndex === totalQuestions - 1

  return (
    <div className="animate-slide-up mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <QuizProgress
          current={currentIndex + 1}
          total={totalQuestions}
          answered={selectedAnswers.size}
          flagged={flagged.size}
        />
        <div className="flex items-center gap-3">
          <QuestionTimer key={currentQuestion.id} isPaused={showFeedback || isPaused} />
          <KeyboardShortcuts />
          {isExamMode && <Timer totalSeconds={115 * 60} onTimeUp={handleTimeUp} />}
          {!isExamMode && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePause}
                variant="ghost"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Pause quiz"
              >
                <Icons.Pause size={18} />
              </Button>
              <Button
                onClick={handleFinish}
                variant="ghost"
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                aria-label="End quiz"
              >
                <Icons.X size={18} />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Question Card */}
      <QuestionCard
        question={currentQuestion}
        selectedAnswers={currentSelected}
        onSelectAnswer={handleSelectAnswer}
        showFeedback={showFeedback}
        isFlagged={flagged.has(currentQuestion.id)}
        onFlag={handleFlag}
      />

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button onClick={handlePrevious} disabled={currentIndex === 0} variant="secondary">
          <Icons.ChevronLeft size={18} />
          Previous
        </Button>

        <div className="flex gap-2">
          {isLastQuestion && (allAnswered || isExamMode || showFeedback) && (
            <Button onClick={handleFinish} isLoading={isSubmitting} variant="success">
              <Icons.Trophy size={18} />
              Finish Quiz
            </Button>
          )}
        </div>

        <Button onClick={handleNext} disabled={isLastQuestion} variant="secondary">
          Next
          <Icons.ChevronRight size={18} />
        </Button>
      </div>

      {/* Question Navigator (Exam Mode) */}
      {isExamMode && (
        <Card variant="bordered" className="mt-6 p-4 dark:bg-slate-800" padding="none">
          <div className="mb-3 flex items-center justify-between px-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <div className="flex items-center gap-2">
              <Icons.Layers size={16} />
              Question Navigator
            </div>
            {/* Go to question indicator */}
            {showGoToIndicator && numberInput && (
              <div className="flex animate-pulse items-center gap-2 rounded-lg border border-sky-200 bg-sky-100 px-3 py-1.5 dark:border-sky-700 dark:bg-sky-900/40">
                <span className="text-xs text-sky-600 dark:text-sky-400">Go to:</span>
                <span className="font-mono font-bold text-sky-700 dark:text-sky-300">
                  {numberInput}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 px-2 pb-2">
            {questions.map((q, i) => {
              const isSubmitted = submittedQuestions.has(q.id)
              const isSelected = selectedAnswers.has(q.id)
              const isFlagged = flagged.has(q.id)
              const isCurrent = i === currentIndex

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    // Auto-submit current question as skipped if not answered
                    autoSubmitSkipped(currentQuestion.id)
                    setCurrentIndex(i)
                    setQuestionStartTime(Date.now())
                  }}
                  className={cn(
                    'size-9 rounded-lg text-sm font-medium transition-[background-color,color,transform,box-shadow] duration-200',
                    isCurrent
                      ? 'scale-105 bg-sky-500 text-white shadow-md'
                      : isSubmitted
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50'
                        : isSelected
                          ? 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50'
                          : isFlagged
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                  )}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-4 border-t border-gray-200 px-2 pt-2 text-xs text-gray-500 dark:border-slate-600 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/30" />
              Saved
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-violet-100 dark:bg-violet-900/30" />
              Selected
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-amber-100 dark:bg-amber-900/30" />
              Flagged
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-gray-100 dark:bg-slate-700" />
              Unanswered
            </div>
          </div>
        </Card>
      )}

      {/* Pause Overlay (practice mode only) */}
      {isPaused && !isExamMode && (
        <QuizPauseOverlay
          elapsedTime={elapsedTimeAtPause}
          questionsAnswered={selectedAnswers.size}
          totalQuestions={totalQuestions}
          onResume={handleResume}
          onEnd={handleFinish}
        />
      )}
    </div>
  )
}
