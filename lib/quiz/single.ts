/**
 * Single question practice functions
 * Creates micro-sessions for practicing individual questions
 */

import { getQuestionById } from '@/lib/data/questions'
import { saveSession, saveAttempt, type StoredSession, type StoredAttempt } from '@/lib/storage'
import { isAnswerCorrect } from '@/lib/utils'

export interface PracticeQuestionParams {
  questionId: number
  selectedAnswerIds: number[]
  timeSpentSeconds?: number
}

export interface PracticeQuestionResult {
  isCorrect: boolean
  correctAnswerIds: number[]
  sessionId: string
}

/**
 * Practice a single question by creating a micro-session
 * and recording the attempt to localStorage
 */
export function practiceQuestion(params: PracticeQuestionParams): PracticeQuestionResult {
  const question = getQuestionById(params.questionId)
  if (question === undefined) {
    throw new Error(`Question ${String(params.questionId)} not found`)
  }

  // Get correct answer IDs
  const correctAnswerIds = question.answers.filter((a) => a.isCorrect).map((a) => a.id)

  // Check if answer is correct (exact set match)
  const isCorrect = isAnswerCorrect(params.selectedAnswerIds, correctAnswerIds)

  // Create a micro-session (session with 1 question)
  const sessionId = crypto.randomUUID()
  const now = new Date().toISOString()

  const session: StoredSession = {
    id: sessionId,
    sessionType: 'practice',
    totalQuestions: 1,
    correctAnswers: isCorrect ? 1 : 0,
    timeSpentSeconds: params.timeSpentSeconds ?? null,
    domainsFilter: question.domain !== null ? [question.domain] : null,
    questionIds: [params.questionId],
    startedAt: now,
    completedAt: now,
  }

  // Save session first
  saveSession(session)

  // Create and save the attempt
  const attempt: StoredAttempt = {
    id: crypto.randomUUID(),
    sessionId,
    questionId: params.questionId,
    selectedAnswerIds: params.selectedAnswerIds,
    isCorrect,
    timeSpentSeconds: params.timeSpentSeconds ?? null,
    timedOut: false,
    attemptedAt: now,
  }

  saveAttempt(attempt)

  return {
    isCorrect,
    correctAnswerIds,
    sessionId,
  }
}
