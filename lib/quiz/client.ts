/**
 * Client-side quiz functions
 * All quiz data is stored in browser localStorage
 */

import {
  getRandomQuestions,
  getQuestionById,
  getQuestionsByIds,
  getQuestionsInRange,
  getRandomQuestionsInRange,
} from '@/lib/data/questions'
import {
  saveSession,
  saveAttempt,
  getSession,
  getExistingAttempt,
  updateAttempt,
  type StoredSession,
  type StoredAttempt,
} from '@/lib/storage'
import { isAnswerCorrect } from '@/lib/utils'

export type ExamQuestionSet = 1 | 2 | 3 | 4 | 5

// Exam question sets (5 sets of 100 questions each)
export const EXAM_QUESTION_SETS: { set: ExamQuestionSet; label: string; range: string }[] = [
  { set: 1, label: 'Set 1', range: '1-100' },
  { set: 2, label: 'Set 2', range: '101-200' },
  { set: 3, label: 'Set 3', range: '201-300' },
  { set: 4, label: 'Set 4', range: '301-400' },
  { set: 5, label: 'Set 5', range: '401-500' },
]

export interface StartQuizParams {
  type: 'practice' | 'exam' | 'review'
  questionCount: number // 0 means "no limit" (all matching questions)
  domains?: string[]
  specificQuestionIds?: number[]
  examQuestionSet?: ExamQuestionSet // For exam mode: 1=1-100, 2=101-200, etc.
  practiceQuestionSet?: ExamQuestionSet // For practice mode: filter by question set range
}

export interface StartQuizResult {
  sessionId: string
  questions: number[]
}

export interface SubmitAnswerParams {
  sessionId: string
  questionId: number
  selectedAnswerIds: number[]
  timeSpentSeconds?: number
}

export interface SubmitAnswerResult {
  isCorrect: boolean
  correctAnswerIds: number[]
}

/**
 * Start a new quiz session
 */
export function startQuiz(params: StartQuizParams): StartQuizResult {
  const sessionId = crypto.randomUUID()

  // Get questions based on mode
  let questionIds: number[]
  if (params.specificQuestionIds !== undefined && params.specificQuestionIds.length > 0) {
    // Use specific question IDs (for review mode)
    const questions = getQuestionsByIds(params.specificQuestionIds)
    questionIds = questions.map((q) => q.id)
  } else if (params.type === 'exam' && params.examQuestionSet !== undefined) {
    // Exam mode with question set - use ordered questions (not shuffled)
    const setIndex = params.examQuestionSet
    const startIndex = (setIndex - 1) * 100 + 1 // 1, 101, 201, 301, 401
    const endIndex = setIndex * 100 // 100, 200, 300, 400, 500
    const questions = getQuestionsInRange(startIndex, endIndex)
    questionIds = questions.map((q) => q.id)
  } else if (params.practiceQuestionSet !== undefined) {
    // Practice mode with question set filter (optional domain filter)
    const setIndex = params.practiceQuestionSet
    const startIndex = (setIndex - 1) * 100 + 1
    const endIndex = setIndex * 100
    const questions = getRandomQuestionsInRange(
      startIndex,
      endIndex,
      params.questionCount, // 0 = all matching
      params.domains
    )
    questionIds = questions.map((q) => q.id)
  } else {
    // Get random questions (practice mode without question set filter)
    // questionCount = 0 means "no limit"
    const count = params.questionCount === 0 ? Infinity : params.questionCount
    const questions = getRandomQuestions(count, params.domains)
    questionIds = questions.map((q) => q.id)
  }

  // Create session
  const session: StoredSession = {
    id: sessionId,
    sessionType: params.type,
    totalQuestions: questionIds.length,
    correctAnswers: 0,
    timeSpentSeconds: null,
    domainsFilter: params.domains ?? null,
    questionIds,
    startedAt: new Date().toISOString(),
    completedAt: null,
  }

  saveSession(session)

  return { sessionId, questions: questionIds }
}

/**
 * Submit an answer for a question
 */
export function submitAnswer(params: SubmitAnswerParams): SubmitAnswerResult {
  const question = getQuestionById(params.questionId)
  if (question === undefined) {
    throw new Error(`Question ${String(params.questionId)} not found`)
  }

  // Get correct answer IDs
  const correctAnswerIds = question.answers.filter((a) => a.isCorrect).map((a) => a.id)

  // Check if answer is correct (exact set match)
  const isCorrect = isAnswerCorrect(params.selectedAnswerIds, correctAnswerIds)

  // Check if there's an existing attempt for this question in this session
  const existingAttempt = getExistingAttempt(params.sessionId, params.questionId)

  if (existingAttempt !== undefined) {
    // Update existing attempt
    const wasCorrect = existingAttempt.isCorrect
    existingAttempt.selectedAnswerIds = params.selectedAnswerIds
    existingAttempt.isCorrect = isCorrect
    existingAttempt.timeSpentSeconds = params.timeSpentSeconds ?? existingAttempt.timeSpentSeconds
    existingAttempt.attemptedAt = new Date().toISOString()

    updateAttempt(existingAttempt)

    // Update session correct count only if the correctness changed
    if (wasCorrect !== isCorrect) {
      const session = getSession(params.sessionId)
      if (session !== undefined) {
        if (isCorrect) {
          session.correctAnswers += 1
        } else {
          session.correctAnswers -= 1
        }
        saveSession(session)
      }
    }
  } else {
    // Record a new attempt
    const attempt: StoredAttempt = {
      id: crypto.randomUUID(),
      sessionId: params.sessionId,
      questionId: params.questionId,
      selectedAnswerIds: params.selectedAnswerIds,
      isCorrect,
      timeSpentSeconds: params.timeSpentSeconds ?? null,
      timedOut: false, // Deprecated: kept for backwards compatibility
      attemptedAt: new Date().toISOString(),
    }

    saveAttempt(attempt)

    // Update session correct count if correct
    if (isCorrect) {
      const session = getSession(params.sessionId)
      if (session !== undefined) {
        session.correctAnswers += 1
        saveSession(session)
      }
    }
  }

  return { isCorrect, correctAnswerIds }
}

/**
 * End a quiz session
 */
export function endSession(sessionId: string, timeSpentSeconds?: number): void {
  const session = getSession(sessionId)
  if (session === undefined) {
    throw new Error(`Session ${sessionId} not found`)
  }

  session.completedAt = new Date().toISOString()
  session.timeSpentSeconds = timeSpentSeconds ?? null

  saveSession(session)
}
