'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  getIncompleteSessions,
  getSessionAttempts,
  deleteSession,
  type StoredSession,
} from '@/lib/storage'
import { Button, Card, CardContent, Icons } from '@/components/ui'

interface IncompleteSessionInfo {
  session: StoredSession
  questionsAnswered: number
}

function formatRelativeTime(dateStr: string): string {
  const time = new Date(dateStr).getTime()
  if (Number.isNaN(time)) {
    return 'recently'
  }
  const seconds = Math.floor((Date.now() - time) / 1000)
  if (seconds < 60) {
    return 'just now'
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${String(minutes)}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${String(hours)}h ago`
  }
  const days = Math.floor(hours / 24)
  return `${String(days)}d ago`
}

function sessionTypeLabel(type: StoredSession['sessionType']): string {
  switch (type) {
    case 'practice':
      return 'Practice'
    case 'exam':
      return 'Exam'
    case 'review':
      return 'Review'
  }
}

export function ResumeSessionBanner(): React.JSX.Element | null {
  const router = useRouter()
  const [info, setInfo] = useState<IncompleteSessionInfo | null>(null)
  const [isResuming, setIsResuming] = useState(false)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const actionTakenRef = useRef(false)

  useEffect(() => {
    const incomplete = getIncompleteSessions()
    if (incomplete.length === 0) {
      return
    }

    // Show the most recent incomplete session
    const session = incomplete[0]
    if (session === undefined) {
      return
    }
    const attempts = getSessionAttempts(session.id)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with localStorage on mount
    setInfo({ session, questionsAnswered: attempts.length })
  }, [])

  if (info === null) {
    return null
  }

  const { session, questionsAnswered } = info
  const progressPercent =
    session.totalQuestions > 0 ? Math.round((questionsAnswered / session.totalQuestions) * 100) : 0

  function handleResume(): void {
    if (actionTakenRef.current) {
      return
    }
    actionTakenRef.current = true
    setIsResuming(true)
    router.push(`/quiz/${session.id}`)
  }

  function handleDiscard(): void {
    if (actionTakenRef.current) {
      return
    }
    actionTakenRef.current = true
    setIsDiscarding(true)
    const deleted = deleteSession(session.id)
    if (deleted) {
      setInfo(null)
    } else {
      actionTakenRef.current = false
      setIsDiscarding(false)
    }
  }

  return (
    <Card
      variant="elevated"
      className="animate-slide-up border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30"
    >
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-sky-100 p-2 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400">
            <Icons.Play size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Resume {sessionTypeLabel(session.sessionType)} Session
            </h3>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
              {questionsAnswered} of {session.totalQuestions} questions answered (
              {String(progressPercent)}%) &middot; Started {formatRelativeTime(session.startedAt)}
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-sky-200 dark:bg-sky-800">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${String(progressPercent)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDiscard}
            disabled={isDiscarding || isResuming}
            className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
          >
            <Icons.Trash2 size={16} />
            Discard
          </Button>
          <Button size="sm" onClick={handleResume} isLoading={isResuming} disabled={isDiscarding}>
            <Icons.Play size={16} />
            Resume
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
