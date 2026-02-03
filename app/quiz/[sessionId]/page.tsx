'use client'

import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/storage'
import { getQuestionsByIds } from '@/lib/data/questions'
import { shuffleArray } from '@/lib/utils'
import { QuizClient } from '@/components/quiz/QuizClient'
import { Button, Icons } from '@/components/ui'
import type { QuestionWithAnswers, Session } from '@/types'

export default function QuizPage(): React.JSX.Element {
  const params = useParams()
  const sessionId = params['sessionId'] as string

  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([])

  useEffect(() => {
    // Reading from localStorage (external system) on mount
    const storedSession = getSession(sessionId)

    if (storedSession === undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with localStorage
      setIsLoading(false)
      return
    }

    // Convert stored session to expected format
    const sessionData: Session = {
      id: storedSession.id,
      sessionType: storedSession.sessionType,
      totalQuestions: storedSession.totalQuestions,
      correctAnswers: storedSession.correctAnswers,
      timeSpentSeconds: storedSession.timeSpentSeconds,
      domainsFilter:
        storedSession.domainsFilter !== null ? JSON.stringify(storedSession.domainsFilter) : null,
      startedAt: storedSession.startedAt,
      completedAt: storedSession.completedAt,
    }

    setSession(sessionData)

    const loaded = getQuestionsByIds(storedSession.questionIds)
    const withShuffledAnswers = loaded.map((q) => ({
      ...q,
      answers: shuffleArray(q.answers),
    }))
    setQuestions(withShuffledAnswers)

    setIsLoading(false)
  }, [sessionId])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-b-2 border-sky-500"></div>
      </div>
    )
  }

  if (!session) {
    notFound()
  }

  // If session is already completed, redirect to results
  if (session.completedAt !== null) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Icons.CheckCircle size={48} className="text-emerald-500" />
        <div className="font-medium text-gray-700 dark:text-gray-200">
          This session has already been completed
        </div>
        <div className="flex gap-4">
          <Link href={`/quiz/${sessionId}/results`}>
            <Button variant="primary">
              <Icons.BarChart size={18} />
              View Results
            </Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">
              <Icons.Home size={18} />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Icons.AlertCircle size={48} className="text-gray-400 dark:text-gray-500" />
        <div className="text-gray-500 dark:text-gray-400">No questions found for this session</div>
        <Link href="/">
          <Button variant="secondary">
            <Icons.Home size={18} />
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }

  return <QuizClient session={session} questions={questions} />
}
