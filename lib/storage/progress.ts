/**
 * Progress tracking for question mastery
 * Stores per-question learning state in localStorage
 */

import { getAttempts } from './index'
import { getStorage, setStorage } from './helpers'
import type { MasteryStatus, QuestionProgress } from '@/types'

const LEARNED_KEY = 'snowflake-quiz-learned'

// Get learned question IDs
export function getLearnedQuestionIds(): Set<number> {
  const ids = getStorage<number[]>(LEARNED_KEY, [])
  return new Set(ids)
}

// Mark a question as learned or not learned
export function markAsLearned(questionId: number, learned: boolean): void {
  const learnedIds = getLearnedQuestionIds()
  if (learned) {
    learnedIds.add(questionId)
  } else {
    learnedIds.delete(questionId)
  }
  setStorage(LEARNED_KEY, Array.from(learnedIds))
}

// Calculate mastery status based on attempts
function calculateMasteryStatus(
  attemptCount: number,
  correctCount: number,
  recentCorrectStreak: number,
  markedAsLearned: boolean
): MasteryStatus {
  if (markedAsLearned) {
    return 'mastered'
  }
  if (attemptCount === 0) {
    return 'unattempted'
  }

  // Mastered if: 2+ correct streak OR 75%+ accuracy with 3+ attempts
  if (recentCorrectStreak >= 2) {
    return 'mastered'
  }
  if (attemptCount >= 3 && correctCount / attemptCount >= 0.75) {
    return 'mastered'
  }

  // If any attempt was wrong and mastery criteria not met, mark as incorrect
  if (correctCount < attemptCount) {
    return 'incorrect'
  }

  return 'attempted'
}

// Get progress for a single question
export function getQuestionProgress(questionId: number): QuestionProgress {
  const attempts = getAttempts()
  const questionAttempts = attempts.filter((a) => a.questionId === questionId)
  const learnedIds = getLearnedQuestionIds()
  const markedAsLearned = learnedIds.has(questionId)

  if (questionAttempts.length === 0) {
    return {
      questionId,
      masteryStatus: markedAsLearned ? 'mastered' : 'unattempted',
      attemptCount: 0,
      correctCount: 0,
      lastAttemptedAt: null,
      markedAsLearned,
    }
  }

  // Sort by date descending to get recent streak
  const sorted = [...questionAttempts].sort(
    (a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
  )

  const attemptCount = sorted.length
  const correctCount = sorted.filter((a) => a.isCorrect).length
  // After descending sort, index 0 is the most recent attempt
  const mostRecentAttempt = sorted[0]
  const lastAttemptedAt = mostRecentAttempt?.attemptedAt ?? null

  // Calculate recent correct streak
  let recentCorrectStreak = 0
  for (const attempt of sorted) {
    if (attempt.isCorrect) {
      recentCorrectStreak++
    } else {
      break
    }
  }

  const masteryStatus = calculateMasteryStatus(
    attemptCount,
    correctCount,
    recentCorrectStreak,
    markedAsLearned
  )

  return {
    questionId,
    masteryStatus,
    attemptCount,
    correctCount,
    lastAttemptedAt,
    markedAsLearned,
  }
}

// Get progress for multiple questions (bulk operation)
export function getProgressForQuestions(questionIds: number[]): Map<number, QuestionProgress> {
  const attempts = getAttempts()
  const learnedIds = getLearnedQuestionIds()
  const progressMap = new Map<number, QuestionProgress>()

  // Group attempts by question ID
  const attemptsByQuestion = new Map<number, typeof attempts>()
  for (const attempt of attempts) {
    const existing = attemptsByQuestion.get(attempt.questionId) ?? []
    existing.push(attempt)
    attemptsByQuestion.set(attempt.questionId, existing)
  }

  for (const questionId of questionIds) {
    const questionAttempts = attemptsByQuestion.get(questionId) ?? []
    const markedAsLearned = learnedIds.has(questionId)

    if (questionAttempts.length === 0) {
      progressMap.set(questionId, {
        questionId,
        masteryStatus: markedAsLearned ? 'mastered' : 'unattempted',
        attemptCount: 0,
        correctCount: 0,
        lastAttemptedAt: null,
        markedAsLearned,
      })
      continue
    }

    const sorted = [...questionAttempts].sort(
      (a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
    )

    const attemptCount = sorted.length
    const correctCount = sorted.filter((a) => a.isCorrect).length
    const mostRecentAttempt = sorted[0]
    const lastAttemptedAt = mostRecentAttempt?.attemptedAt ?? null

    let recentCorrectStreak = 0
    for (const attempt of sorted) {
      if (attempt.isCorrect) {
        recentCorrectStreak++
      } else {
        break
      }
    }

    const masteryStatus = calculateMasteryStatus(
      attemptCount,
      correctCount,
      recentCorrectStreak,
      markedAsLearned
    )

    progressMap.set(questionId, {
      questionId,
      masteryStatus,
      attemptCount,
      correctCount,
      lastAttemptedAt,
      markedAsLearned,
    })
  }

  return progressMap
}

// Clear learned questions (for reset)
export function clearLearnedQuestions(): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(LEARNED_KEY)
}
