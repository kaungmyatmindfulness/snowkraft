'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter, notFound } from 'next/navigation'
import Link from 'next/link'
import he from 'he'
import { getSessionResults, type SessionResults } from '@/lib/storage'
import { startQuiz } from '@/lib/quiz/client'
import { DomainChart } from '@/components/stats/DomainChart'
import { ExplanationText } from '@/components/quiz/ExplanationText'
import { getPassingStatus, formatTime, cn } from '@/lib/utils'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CircularProgress,
  Icons,
} from '@/components/ui'

export default function ResultsPage(): React.JSX.Element {
  const params = useParams()
  const sessionId = params['sessionId'] as string
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [results, setResults] = useState<SessionResults | null>(null)
  const [isPracticeWrongPending, startPracticeWrongTransition] = useTransition()

  useEffect(() => {
    // Reading from localStorage (external system) on mount
    const sessionResults = getSessionResults(sessionId)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with localStorage
    setResults(sessionResults)

    setIsLoading(false)
  }, [sessionId])

  function handlePracticeWrongAnswers(): void {
    if (results === null || results.incorrectQuestions.length === 0) {
      return
    }

    startPracticeWrongTransition(() => {
      const incorrectQuestionIds = results.incorrectQuestions.map((item) => item.question.id)
      const { sessionId: newSessionId } = startQuiz({
        type: 'review',
        questionCount: incorrectQuestionIds.length,
        specificQuestionIds: incorrectQuestionIds,
      })
      router.push(`/quiz/${newSessionId}`)
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-b-2 border-sky-500"></div>
      </div>
    )
  }

  if (!results) {
    notFound()
  }

  const { session, domainBreakdown, incorrectQuestions } = results
  const accuracy = session.totalQuestions > 0 ? session.correctAnswers / session.totalQuestions : 0
  const passed = getPassingStatus(session.correctAnswers, session.totalQuestions)

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="animate-slide-up text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Quiz Results</h1>
        <p className="text-gray-600 dark:text-gray-300">
          {session.sessionType === 'exam' ? 'Exam Simulation' : 'Practice Quiz'}
        </p>
      </div>

      {/* Main Score Card */}
      <Card
        variant="elevated"
        className={cn(
          'animate-scale-in border-2 text-center dark:bg-slate-800',
          passed
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:border-emerald-700 dark:from-emerald-900/20 dark:to-green-900/20'
            : 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50 dark:border-red-700 dark:from-red-900/20 dark:to-rose-900/20'
        )}
      >
        <div className="py-4">
          <div className="relative mb-6 flex justify-center">
            <CircularProgress
              value={accuracy * 100}
              size={160}
              strokeWidth={12}
              variant={passed ? 'success' : 'danger'}
              showValue={false}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                data-testid="score-percentage"
                className={cn(
                  'text-5xl font-bold',
                  passed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {Math.round(accuracy * 100)}%
              </div>
            </div>
          </div>

          <div className="mb-4 text-xl text-gray-700 dark:text-gray-200">
            <span className="font-semibold">{session.correctAnswers}</span>
            {' / '}
            <span>{session.totalQuestions}</span>
            {' correct'}
          </div>

          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold',
              passed
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            )}
          >
            {passed ? (
              <>
                <Icons.CheckCircle size={20} />
                <span>PASSED</span>
              </>
            ) : (
              <>
                <Icons.XCircle size={20} />
                <span>NOT PASSED</span>
              </>
            )}
            <span className="text-sm opacity-75">(75% required)</span>
          </div>

          {session.timeSpentSeconds !== null && session.timeSpentSeconds > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
              <Icons.Clock size={18} />
              <span>Time: {formatTime(session.timeSpentSeconds)}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Domain Performance */}
      {domainBreakdown.length > 0 && (
        <Card variant="default" className="animate-slide-up stagger-1 dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <Icons.BarChart size={20} className="text-sky-500" />
              Performance by Domain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DomainChart data={domainBreakdown} />
          </CardContent>
        </Card>
      )}

      {/* Incorrect Answers */}
      {incorrectQuestions.length > 0 && (
        <Card variant="default" className="animate-slide-up stagger-2 dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <Icons.AlertCircle size={20} className="text-red-500 dark:text-red-400" />
              Incorrect Answers
              <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-sm font-normal text-gray-500 dark:bg-red-900/30 dark:text-gray-400">
                {incorrectQuestions.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incorrectQuestions.map((item, index) => (
                <div
                  key={item.question.id}
                  className="rounded-xl border border-gray-200 p-4 transition-colors hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-3 font-medium text-gray-900 dark:text-gray-100">
                        {he.decode(item.question.questionText)}
                      </p>
                      {/* All Options */}
                      <div className="mb-3 space-y-2">
                        {item.question.answers
                          .slice()
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((answer, answerIndex) => {
                            const isSelected = item.selectedAnswers.some((s) => s.id === answer.id)
                            const isCorrect = answer.isCorrect
                            const optionLetter = String.fromCharCode(65 + answerIndex)
                            return (
                              <div
                                key={answer.id}
                                className={cn(
                                  'flex items-start gap-2 rounded-lg border p-2 text-sm',
                                  isCorrect && isSelected
                                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                                    : isCorrect
                                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                                      : isSelected
                                        ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                                        : 'border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-700/50'
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
                                  <Icons.XCircle
                                    size={16}
                                    className="shrink-0 text-red-500 dark:text-red-400"
                                  />
                                )}
                              </div>
                            )
                          })}
                      </div>
                      {/* Summary */}
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-2 dark:bg-red-900/20">
                          <Icons.XCircle
                            size={16}
                            className="mt-0.5 shrink-0 text-red-500 dark:text-red-400"
                          />
                          <div>
                            <span className="font-medium text-red-700 dark:text-red-300">
                              Your answer:
                            </span>
                            <ul className="mt-1 space-y-1">
                              {item.selectedAnswers.map((a) => (
                                <li key={a.id} className="text-red-600 dark:text-red-400">
                                  • {a.answerText}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/20">
                          <Icons.CheckCircle
                            size={16}
                            className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400"
                          />
                          <div>
                            <span className="font-medium text-emerald-700 dark:text-emerald-300">
                              Correct:
                            </span>
                            <ul className="mt-1 space-y-1">
                              {item.correctAnswers.map((a) => (
                                <li key={a.id} className="text-emerald-600 dark:text-emerald-400">
                                  • {a.answerText}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      {(item.question.elaboratedExplanation ?? item.question.explanation) !==
                        null &&
                        (item.question.elaboratedExplanation ?? item.question.explanation) !==
                          '' && (
                          <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-900/20">
                            <div className="flex items-start gap-2">
                              <Icons.Lightbulb
                                size={16}
                                className="mt-0.5 shrink-0 text-sky-500 dark:text-sky-400"
                              />
                              <ExplanationText
                                text={
                                  item.question.elaboratedExplanation ??
                                  item.question.explanation ??
                                  ''
                                }
                                className="text-sm text-gray-700 dark:text-gray-200"
                              />
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="animate-slide-up stagger-3 flex flex-wrap justify-center gap-4">
        <Link href="/">
          <Button variant="secondary" size="lg">
            <Icons.Home size={18} />
            Back to Home
          </Button>
        </Link>
        {incorrectQuestions.length > 0 && (
          <Button
            variant="outline"
            size="lg"
            onClick={handlePracticeWrongAnswers}
            isLoading={isPracticeWrongPending}
          >
            <Icons.RotateCcw size={18} />
            Practice Wrong Answers ({incorrectQuestions.length})
          </Button>
        )}
        <Link href="/stats">
          <Button variant="primary" size="lg">
            <Icons.BarChart size={18} />
            View Stats
          </Button>
        </Link>
      </div>
    </div>
  )
}
