/**
 * LocalStorage-based storage for user quiz data
 * All user progress is stored client-side
 */

import type { QuestionWithAnswers, DomainStats, OverviewStats, ReviewStats } from '@/types'
import { getQuestionById } from '@/lib/data/questions'
import {
  getStorage,
  setStorage,
  getStorageCached,
  setStorageCached,
  flushStorage,
  invalidateCache,
} from './helpers'

// Re-export cache utilities for external use
export { flushStorage, invalidateCache }

// Storage keys
const STORAGE_KEYS = {
  SESSIONS: 'snowflake-quiz-sessions',
  ATTEMPTS: 'snowflake-quiz-attempts',
} as const

// Types for stored data
export interface StoredSession {
  id: string
  sessionType: 'practice' | 'exam' | 'review'
  totalQuestions: number
  correctAnswers: number
  timeSpentSeconds: number | null
  domainsFilter: string[] | null
  questionIds: number[]
  startedAt: string
  completedAt: string | null
}

export interface StoredAttempt {
  id: string
  sessionId: string
  questionId: number
  selectedAnswerIds: number[]
  isCorrect: boolean
  timeSpentSeconds: number | null
  timedOut: boolean
  attemptedAt: string
}

// Session lookup map cache for O(1) access
let sessionMapCache: Map<string, StoredSession> | null = null

/**
 * Get the session lookup map (creates from sessions array if not cached)
 * @returns Map from session ID to session object
 */
function getSessionMap(): Map<string, StoredSession> {
  if (sessionMapCache === null) {
    const sessions = getStorageCached<StoredSession[]>(STORAGE_KEYS.SESSIONS, [])
    sessionMapCache = new Map(sessions.map((s) => [s.id, s]))
  }
  return sessionMapCache
}

/**
 * Fast O(1) session lookup using the session map cache
 * @param sessionId - The session ID to look up
 * @returns The session or undefined if not found
 */
export function getSessionFast(sessionId: string): StoredSession | undefined {
  return getSessionMap().get(sessionId)
}

/**
 * Invalidate the session map cache (called when sessions are modified)
 */
function invalidateSessionMapCache(): void {
  sessionMapCache = null
}

/**
 * Aggregate attempt data by domain
 * @returns Map of domain ID to {total, correct} counts
 */
function aggregateDomainStats(
  attempts: StoredAttempt[]
): Map<string, { total: number; correct: number }> {
  const domainMap = new Map<string, { total: number; correct: number }>()
  for (const attempt of attempts) {
    const question = getQuestionById(attempt.questionId)
    const domain = question?.domain
    if (domain === undefined || domain === null) {
      continue
    }
    const stats = domainMap.get(domain) ?? { total: 0, correct: 0 }
    stats.total += 1
    if (attempt.isCorrect) {
      stats.correct += 1
    }
    domainMap.set(domain, stats)
  }
  return domainMap
}

// Session operations
export function getSessions(): StoredSession[] {
  return getStorage<StoredSession[]>(STORAGE_KEYS.SESSIONS, [])
}

export function getSession(sessionId: string): StoredSession | undefined {
  const sessions = getSessions()
  return sessions.find((s) => s.id === sessionId)
}

export function saveSession(session: StoredSession): void {
  invalidateSessionMapCache() // Invalidate cache before modification
  const sessions = getSessions()
  const existingIndex = sessions.findIndex((s) => s.id === session.id)
  if (existingIndex >= 0) {
    sessions[existingIndex] = session
  } else {
    sessions.push(session)
  }
  setStorage(STORAGE_KEYS.SESSIONS, sessions)
}

export function getCompletedSessions(): StoredSession[] {
  return getSessions().filter((s) => s.completedAt !== null)
}

export function getIncompleteSessions(): StoredSession[] {
  return getSessions()
    .filter((s) => s.completedAt === null)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
}

export function deleteSession(sessionId: string): boolean {
  const sessions = getSessions().filter((s) => s.id !== sessionId)
  const sessionsOk = setStorage(STORAGE_KEYS.SESSIONS, sessions)
  if (!sessionsOk) {
    return false
  }
  // Only remove attempts if sessions write succeeded to avoid inconsistent state
  const attempts = getAttempts().filter((a) => a.sessionId !== sessionId)
  const attemptsOk = setStorage(STORAGE_KEYS.ATTEMPTS, attempts)
  // Invalidate caches after successful writes
  invalidateSessionMapCache()
  invalidateCache()
  return attemptsOk
}

// Attempt operations
export function getAttempts(): StoredAttempt[] {
  return getStorage<StoredAttempt[]>(STORAGE_KEYS.ATTEMPTS, [])
}

export function getSessionAttempts(sessionId: string): StoredAttempt[] {
  return getAttempts().filter((a) => a.sessionId === sessionId)
}

export function saveAttempt(attempt: StoredAttempt): void {
  const attempts = getAttempts()
  attempts.push(attempt)
  setStorage(STORAGE_KEYS.ATTEMPTS, attempts)
}

export function getExistingAttempt(
  sessionId: string,
  questionId: number
): StoredAttempt | undefined {
  const attempts = getAttempts()
  return attempts.find((a) => a.sessionId === sessionId && a.questionId === questionId)
}

export function updateAttempt(attempt: StoredAttempt): void {
  const attempts = getAttempts()
  const index = attempts.findIndex((a) => a.id === attempt.id)
  if (index >= 0) {
    attempts[index] = attempt
    setStorage(STORAGE_KEYS.ATTEMPTS, attempts)
  }
}

// Stats operations
export function getOverallStats(totalQuestions: number): OverviewStats {
  const attempts = getAttempts()
  const sessions = getCompletedSessions()

  const totalAttempts = attempts.length
  const correctAttempts = attempts.filter((a) => a.isCorrect).length

  const passThreshold = 0.75
  const passedSessions = sessions.filter(
    (s) => s.totalQuestions > 0 && s.correctAnswers / s.totalQuestions >= passThreshold
  )

  return {
    totalQuestions,
    totalAttempts,
    correctAttempts,
    overallAccuracy: totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0,
    totalSessions: sessions.length,
    passedSessions: passedSessions.length,
  }
}

export function getStatsByDomain(): DomainStats[] {
  const attempts = getAttempts()
  const domainMap = aggregateDomainStats(attempts)

  return Array.from(domainMap.entries())
    .map(([domain, stats]) => ({
      domain,
      total: stats.total,
      correct: stats.correct,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain))
}

export interface WeakAreaStats {
  topic: string
  total: number
  correct: number
  accuracy: number
}

export function getWeakAreas(minAttempts = 3, limit = 5): WeakAreaStats[] {
  const attempts = getAttempts()
  const topicMap = new Map<string, { total: number; correct: number }>()

  for (const attempt of attempts) {
    const question = getQuestionById(attempt.questionId)
    if (question === undefined) {
      continue
    }

    // Use topic if available, fallback to domain, skip if both are null
    const topicKey = question.topic ?? question.domain ?? 'Uncategorized'
    const stats = topicMap.get(topicKey) ?? { total: 0, correct: 0 }
    stats.total += 1
    if (attempt.isCorrect) {
      stats.correct += 1
    }
    topicMap.set(topicKey, stats)
  }

  return Array.from(topicMap.entries())
    .map(([topic, stats]) => ({
      topic,
      total: stats.total,
      correct: stats.correct,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }))
    .filter((item) => item.total >= minAttempts)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit)
}

export function getSessionHistory(historyLimit?: number): StoredSession[] {
  const sessions = getCompletedSessions().sort((a, b) => {
    const aTime = a.completedAt !== null ? new Date(a.completedAt).getTime() : 0
    const bTime = b.completedAt !== null ? new Date(b.completedAt).getTime() : 0
    return bTime - aTime
  })

  if (historyLimit !== undefined && historyLimit > 0) {
    return sessions.slice(0, historyLimit)
  }

  return sessions
}

// Session results
export interface SessionResults {
  session: StoredSession
  domainBreakdown: DomainStats[]
  incorrectQuestions: {
    question: QuestionWithAnswers
    selectedAnswers: { id: number; answerText: string }[]
    correctAnswers: { id: number; answerText: string }[]
  }[]
}

export function getSessionResults(sessionId: string): SessionResults | null {
  const session = getSession(sessionId)
  if (session === undefined) {
    return null
  }

  const attempts = getSessionAttempts(sessionId)

  // Calculate domain breakdown using shared helper
  const domainMap = aggregateDomainStats(attempts)

  const domainBreakdown: DomainStats[] = Array.from(domainMap.entries())
    .map(([domain, stats]) => ({
      domain,
      total: stats.total,
      correct: stats.correct,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain))

  // Get incorrect questions
  const incorrectAttempts = attempts.filter((a) => !a.isCorrect)
  const incorrectQuestions = incorrectAttempts
    .map((attempt) => {
      const question = getQuestionById(attempt.questionId)
      if (question === undefined) {
        return null
      }

      return {
        question,
        selectedAnswers: question.answers
          .filter((a) => attempt.selectedAnswerIds.includes(a.id))
          .map((a) => ({ id: a.id, answerText: a.answerText })),
        correctAnswers: question.answers
          .filter((a) => a.isCorrect)
          .map((a) => ({ id: a.id, answerText: a.answerText })),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return { session, domainBreakdown, incorrectQuestions }
}

// Review questions operations
export function getReviewStats(): ReviewStats {
  const attempts = getAttempts()

  // Get all attempts that were wrong or timed out
  const wrongAttempts = attempts.filter((a) => !a.isCorrect)
  const timedOutAttempts = attempts.filter((a) => a.timedOut)

  // Get unique question IDs that need review (wrong OR timed out)
  const reviewQuestionIds = new Set<number>()
  const wrongQuestionIds = new Set<number>()
  const timedOutQuestionIds = new Set<number>()

  for (const attempt of wrongAttempts) {
    reviewQuestionIds.add(attempt.questionId)
    wrongQuestionIds.add(attempt.questionId)
  }

  for (const attempt of timedOutAttempts) {
    reviewQuestionIds.add(attempt.questionId)
    timedOutQuestionIds.add(attempt.questionId)
  }

  return {
    totalToReview: reviewQuestionIds.size,
    wrongCount: wrongQuestionIds.size,
    timedOutCount: timedOutQuestionIds.size,
    questionIds: Array.from(reviewQuestionIds),
  }
}

export function getReviewableQuestions(): {
  questionId: number
  wrongCount: number
  timedOutCount: number
  lastAttemptedAt: string
}[] {
  const attempts = getAttempts()

  // Group attempts by question ID
  const questionStats = new Map<
    number,
    { wrongCount: number; timedOutCount: number; lastAttemptedAt: string }
  >()

  for (const attempt of attempts) {
    if (!attempt.isCorrect || attempt.timedOut) {
      const existing = questionStats.get(attempt.questionId) ?? {
        wrongCount: 0,
        timedOutCount: 0,
        lastAttemptedAt: attempt.attemptedAt,
      }

      if (!attempt.isCorrect) {
        existing.wrongCount += 1
      }
      if (attempt.timedOut) {
        existing.timedOutCount += 1
      }

      // Update last attempted if more recent
      if (attempt.attemptedAt > existing.lastAttemptedAt) {
        existing.lastAttemptedAt = attempt.attemptedAt
      }

      questionStats.set(attempt.questionId, existing)
    }
  }

  // Convert to array and sort by last attempted (most recent first)
  return Array.from(questionStats.entries())
    .map(([questionId, stats]) => ({
      questionId,
      ...stats,
    }))
    .sort((a, b) => b.lastAttemptedAt.localeCompare(a.lastAttemptedAt))
}

// Get detailed review question data with user's last attempt
export interface ReviewQuestionDetail {
  questionId: number
  question: QuestionWithAnswers
  selectedAnswerIds: number[]
  wrongCount: number
  timedOutCount: number
  lastAttemptedAt: string
}

export function getReviewQuestionDetails(): ReviewQuestionDetail[] {
  const attempts = getAttempts()

  // Group attempts by question ID, tracking wrong/timed out counts and last attempt
  const questionData = new Map<
    number,
    {
      wrongCount: number
      timedOutCount: number
      lastAttemptedAt: string
      lastSelectedAnswerIds: number[]
    }
  >()

  for (const attempt of attempts) {
    if (!attempt.isCorrect || attempt.timedOut) {
      const existing = questionData.get(attempt.questionId)

      if (existing === undefined) {
        questionData.set(attempt.questionId, {
          wrongCount: attempt.isCorrect ? 0 : 1,
          timedOutCount: attempt.timedOut ? 1 : 0,
          lastAttemptedAt: attempt.attemptedAt,
          lastSelectedAnswerIds: attempt.selectedAnswerIds,
        })
      } else {
        if (!attempt.isCorrect) {
          existing.wrongCount += 1
        }
        if (attempt.timedOut) {
          existing.timedOutCount += 1
        }
        // Update last attempt if more recent
        if (attempt.attemptedAt > existing.lastAttemptedAt) {
          existing.lastAttemptedAt = attempt.attemptedAt
          existing.lastSelectedAnswerIds = attempt.selectedAnswerIds
        }
      }
    }
  }

  // Convert to array with full question data
  const results: ReviewQuestionDetail[] = []

  for (const [questionId, data] of questionData.entries()) {
    const question = getQuestionById(questionId)
    if (question !== undefined) {
      results.push({
        questionId,
        question,
        selectedAnswerIds: data.lastSelectedAnswerIds,
        wrongCount: data.wrongCount,
        timedOutCount: data.timedOutCount,
        lastAttemptedAt: data.lastAttemptedAt,
      })
    }
  }

  // Sort by last attempted (most recent first)
  return results.sort((a, b) => b.lastAttemptedAt.localeCompare(a.lastAttemptedAt))
}

// Remove a question from review by deleting its wrong/timed-out attempts
export function removeQuestionFromReview(questionId: number): void {
  const attempts = getAttempts()
  const filtered = attempts.filter(
    (a) => !(a.questionId === questionId && (!a.isCorrect || a.timedOut))
  )
  setStorage(STORAGE_KEYS.ATTEMPTS, filtered)
}

// =============================================================================
// Batched Stats - Single function to get all stats with minimal localStorage reads
// =============================================================================

/**
 * Snapshot of all stats data
 * Returned by getAllStats for efficient batched access
 */
export interface StatsSnapshot {
  overview: OverviewStats
  byDomain: DomainStats[]
  weakAreas: WeakAreaStats[]
  history: StoredSession[]
}

/**
 * Get all stats in a single batched operation
 * Reduces localStorage reads from 5 to 2 (one for attempts, one for sessions)
 *
 * @param totalQuestions - Total number of questions in the quiz database
 * @param historyLimit - Maximum number of history entries to return (default 10)
 * @param weakAreasMinAttempts - Minimum attempts required for a topic to appear in weak areas (default 3)
 * @param weakAreasLimit - Maximum number of weak areas to return (default 5)
 * @returns StatsSnapshot containing overview, byDomain, weakAreas, and history
 */
export function getAllStats(
  totalQuestions: number,
  historyLimit = 10,
  weakAreasMinAttempts = 3,
  weakAreasLimit = 5
): StatsSnapshot {
  // Single read for each storage key using cached functions
  const attempts = getStorageCached<StoredAttempt[]>(STORAGE_KEYS.ATTEMPTS, [])
  const sessions = getStorageCached<StoredSession[]>(STORAGE_KEYS.SESSIONS, [])

  const completedSessions = sessions.filter((s) => s.completedAt !== null)

  // Compute all stats from cached data
  const overview = computeOverviewStats(attempts, completedSessions, totalQuestions)
  const byDomain = computeDomainStats(attempts)
  const weakAreas = computeWeakAreas(attempts, weakAreasMinAttempts, weakAreasLimit)
  const history = completedSessions
    .sort((a, b) => {
      const aTime = a.completedAt !== null ? new Date(a.completedAt).getTime() : 0
      const bTime = b.completedAt !== null ? new Date(b.completedAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, historyLimit)

  return { overview, byDomain, weakAreas, history }
}

/**
 * Compute overview stats from pre-loaded data
 * @param attempts - Array of stored attempts (pre-loaded)
 * @param completedSessions - Array of completed sessions (pre-loaded)
 * @param totalQuestions - Total number of questions in database
 * @returns OverviewStats object
 */
function computeOverviewStats(
  attempts: StoredAttempt[],
  completedSessions: StoredSession[],
  totalQuestions: number
): OverviewStats {
  const totalAttempts = attempts.length
  const correctAttempts = attempts.filter((a) => a.isCorrect).length

  const passThreshold = 0.75
  const passedSessions = completedSessions.filter(
    (s) => s.totalQuestions > 0 && s.correctAnswers / s.totalQuestions >= passThreshold
  )

  return {
    totalQuestions,
    totalAttempts,
    correctAttempts,
    overallAccuracy: totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0,
    totalSessions: completedSessions.length,
    passedSessions: passedSessions.length,
  }
}

/**
 * Compute domain stats from pre-loaded attempts
 * @param attempts - Array of stored attempts (pre-loaded)
 * @returns Array of DomainStats sorted by domain
 */
function computeDomainStats(attempts: StoredAttempt[]): DomainStats[] {
  const domainMap = aggregateDomainStats(attempts)

  return Array.from(domainMap.entries())
    .map(([domain, stats]) => ({
      domain,
      total: stats.total,
      correct: stats.correct,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain))
}

/**
 * Compute weak areas from pre-loaded attempts
 * @param attempts - Array of stored attempts (pre-loaded)
 * @param minAttempts - Minimum attempts required for a topic to be included
 * @param limit - Maximum number of weak areas to return
 * @returns Array of WeakAreaStats sorted by accuracy (lowest first)
 */
function computeWeakAreas(
  attempts: StoredAttempt[],
  minAttempts: number,
  limit: number
): WeakAreaStats[] {
  const topicMap = new Map<string, { total: number; correct: number }>()

  for (const attempt of attempts) {
    const question = getQuestionById(attempt.questionId)
    if (question === undefined) {
      continue
    }

    // Use topic if available, fallback to domain, skip if both are null
    const topicKey = question.topic ?? question.domain ?? 'Uncategorized'
    const stats = topicMap.get(topicKey) ?? { total: 0, correct: 0 }
    stats.total += 1
    if (attempt.isCorrect) {
      stats.correct += 1
    }
    topicMap.set(topicKey, stats)
  }

  return Array.from(topicMap.entries())
    .map(([topic, stats]) => ({
      topic,
      total: stats.total,
      correct: stats.correct,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }))
    .filter((item) => item.total >= minAttempts)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit)
}

// =============================================================================
// Batched Operations - Reduces localStorage I/O by using in-memory cache
// =============================================================================

/**
 * Get sessions using cached storage (for batched operations)
 * @returns Array of stored sessions
 */
export function getSessionsCached(): StoredSession[] {
  return getStorageCached<StoredSession[]>(STORAGE_KEYS.SESSIONS, [])
}

/**
 * Get attempts using cached storage (for batched operations)
 * @returns Array of stored attempts
 */
export function getAttemptsCached(): StoredAttempt[] {
  return getStorageCached<StoredAttempt[]>(STORAGE_KEYS.ATTEMPTS, [])
}

/**
 * Save session using cached storage (writes to cache, not localStorage)
 * Call flushStorage() after all batched operations are complete
 * @param session - The session to save
 */
export function saveSessionBatched(session: StoredSession): void {
  invalidateSessionMapCache() // Invalidate lookup cache
  const sessions = getSessionsCached()
  const existingIndex = sessions.findIndex((s) => s.id === session.id)
  if (existingIndex >= 0) {
    sessions[existingIndex] = session
  } else {
    sessions.push(session)
  }
  setStorageCached(STORAGE_KEYS.SESSIONS, sessions)
}

/**
 * Save attempt using cached storage (writes to cache, not localStorage)
 * Call flushStorage() after all batched operations are complete
 * @param attempt - The attempt to save
 */
export function saveAttemptBatched(attempt: StoredAttempt): void {
  const attempts = getAttemptsCached()
  attempts.push(attempt)
  setStorageCached(STORAGE_KEYS.ATTEMPTS, attempts)
}

/**
 * Update attempt using cached storage (writes to cache, not localStorage)
 * Call flushStorage() after all batched operations are complete
 * @param attempt - The attempt to update
 */
export function updateAttemptBatched(attempt: StoredAttempt): void {
  const attempts = getAttemptsCached()
  const index = attempts.findIndex((a) => a.id === attempt.id)
  if (index >= 0) {
    attempts[index] = attempt
    setStorageCached(STORAGE_KEYS.ATTEMPTS, attempts)
  }
}

export interface SubmitAnswerBatchedParams {
  sessionId: string
  questionId: number
  selectedAnswerIds: number[]
  isCorrect: boolean
  timeSpentSeconds: number | null
  timedOut: boolean
}

export interface SubmitAnswerBatchedResult {
  success: boolean
  attemptId: string
  isNewAttempt: boolean
}

/**
 * Submit an answer using batched storage operations
 * Reduces localStorage I/O from 6 operations to 2 by using in-memory cache
 * Call flushStorage() after all batched operations are complete
 *
 * @param params - The answer submission parameters
 * @returns Result indicating success and whether this was a new attempt
 */
export function submitAnswerBatched(params: SubmitAnswerBatchedParams): SubmitAnswerBatchedResult {
  const { sessionId, questionId, selectedAnswerIds, isCorrect, timeSpentSeconds, timedOut } = params
  const now = new Date().toISOString()

  // Use cached reads
  const attempts = getAttemptsCached()

  // Check if an attempt already exists for this session/question
  const existingAttemptIndex = attempts.findIndex(
    (a) => a.sessionId === sessionId && a.questionId === questionId
  )

  if (existingAttemptIndex >= 0) {
    // Update existing attempt
    const existingAttempt = attempts[existingAttemptIndex]
    if (existingAttempt !== undefined) {
      existingAttempt.selectedAnswerIds = selectedAnswerIds
      existingAttempt.isCorrect = isCorrect
      existingAttempt.timeSpentSeconds = timeSpentSeconds
      existingAttempt.timedOut = timedOut
      existingAttempt.attemptedAt = now

      setStorageCached(STORAGE_KEYS.ATTEMPTS, attempts)

      return {
        success: true,
        attemptId: existingAttempt.id,
        isNewAttempt: false,
      }
    }
  }

  // Create new attempt
  const attemptId = crypto.randomUUID()
  const newAttempt: StoredAttempt = {
    id: attemptId,
    sessionId,
    questionId,
    selectedAnswerIds,
    isCorrect,
    timeSpentSeconds,
    timedOut,
    attemptedAt: now,
  }

  attempts.push(newAttempt)
  setStorageCached(STORAGE_KEYS.ATTEMPTS, attempts)

  // Update session correct count if this is a new correct answer
  const session = getSessionFast(sessionId)
  if (session !== undefined && isCorrect) {
    session.correctAnswers += 1
    saveSessionBatched(session)
  }

  return {
    success: true,
    attemptId,
    isNewAttempt: true,
  }
}

/**
 * Get an existing attempt for a session/question using cached storage
 * @param sessionId - The session ID
 * @param questionId - The question ID
 * @returns The attempt or undefined if not found
 */
export function getExistingAttemptCached(
  sessionId: string,
  questionId: number
): StoredAttempt | undefined {
  const attempts = getAttemptsCached()
  return attempts.find((a) => a.sessionId === sessionId && a.questionId === questionId)
}

// Reset all user data
export function resetAllData(): void {
  if (typeof window === 'undefined') {
    return
  }
  // Invalidate all caches
  invalidateSessionMapCache()
  invalidateCache() // Clear the storage cache
  localStorage.removeItem(STORAGE_KEYS.SESSIONS)
  localStorage.removeItem(STORAGE_KEYS.ATTEMPTS)
}
