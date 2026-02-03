/**
 * Unit tests for lib/storage/progress.ts
 * Tests mastery status calculations and progress tracking
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getLearnedQuestionIds,
  markAsLearned,
  getQuestionProgress,
  getProgressForQuestions,
  clearLearnedQuestions,
} from '@/lib/storage/progress'
import { saveAttempt, type StoredAttempt } from '@/lib/storage'

// Helper to create mock attempt
function createAttempt(questionId: number, isCorrect: boolean, attemptedAt: string): StoredAttempt {
  return {
    id: crypto.randomUUID(),
    sessionId: 'test-session',
    questionId,
    selectedAnswerIds: isCorrect ? [1] : [2],
    isCorrect,
    timeSpentSeconds: 10,
    timedOut: false,
    attemptedAt,
  }
}

describe('lib/storage/progress', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getLearnedQuestionIds', () => {
    it('should return empty set when no questions are learned', () => {
      const learned = getLearnedQuestionIds()
      expect(learned.size).toBe(0)
    })

    it('should return set with learned question IDs', () => {
      markAsLearned(1, true)
      markAsLearned(2, true)
      const learned = getLearnedQuestionIds()
      expect(learned.has(1)).toBe(true)
      expect(learned.has(2)).toBe(true)
      expect(learned.size).toBe(2)
    })
  })

  describe('markAsLearned', () => {
    it('should add question to learned set', () => {
      markAsLearned(1, true)
      const learned = getLearnedQuestionIds()
      expect(learned.has(1)).toBe(true)
    })

    it('should remove question from learned set', () => {
      markAsLearned(1, true)
      markAsLearned(1, false)
      const learned = getLearnedQuestionIds()
      expect(learned.has(1)).toBe(false)
    })

    it('should handle marking same question multiple times', () => {
      markAsLearned(1, true)
      markAsLearned(1, true)
      const learned = getLearnedQuestionIds()
      expect(learned.size).toBe(1)
    })
  })

  describe('getQuestionProgress', () => {
    it('should return unattempted status for new question', () => {
      const progress = getQuestionProgress(999)
      expect(progress.masteryStatus).toBe('unattempted')
      expect(progress.attemptCount).toBe(0)
      expect(progress.correctCount).toBe(0)
      expect(progress.lastAttemptedAt).toBeNull()
      expect(progress.markedAsLearned).toBe(false)
    })

    it('should return mastered status when manually marked as learned', () => {
      markAsLearned(1, true)
      const progress = getQuestionProgress(1)
      expect(progress.masteryStatus).toBe('mastered')
      expect(progress.markedAsLearned).toBe(true)
    })

    it('should return mastered status with 2+ correct streak', () => {
      // Create 2 consecutive correct attempts
      saveAttempt(createAttempt(1, true, '2024-01-01T00:00:00.000Z'))
      saveAttempt(createAttempt(1, true, '2024-01-02T00:00:00.000Z'))

      const progress = getQuestionProgress(1)
      expect(progress.masteryStatus).toBe('mastered')
      expect(progress.attemptCount).toBe(2)
      expect(progress.correctCount).toBe(2)
    })

    it('should return mastered status with 75%+ accuracy and 3+ attempts', () => {
      // Create 3 attempts with 75%+ accuracy (3 correct out of 4)
      saveAttempt(createAttempt(1, false, '2024-01-01T00:00:00.000Z'))
      saveAttempt(createAttempt(1, true, '2024-01-02T00:00:00.000Z'))
      saveAttempt(createAttempt(1, true, '2024-01-03T00:00:00.000Z'))
      saveAttempt(createAttempt(1, true, '2024-01-04T00:00:00.000Z'))

      const progress = getQuestionProgress(1)
      expect(progress.masteryStatus).toBe('mastered')
      expect(progress.attemptCount).toBe(4)
      expect(progress.correctCount).toBe(3)
    })

    it('should return incorrect status when any attempt was wrong and not mastered', () => {
      // One wrong attempt
      saveAttempt(createAttempt(1, false, '2024-01-01T00:00:00.000Z'))

      const progress = getQuestionProgress(1)
      expect(progress.masteryStatus).toBe('incorrect')
    })

    it('should return attempted status for single correct attempt', () => {
      // One correct attempt (not enough for mastery)
      saveAttempt(createAttempt(1, true, '2024-01-01T00:00:00.000Z'))

      const progress = getQuestionProgress(1)
      expect(progress.masteryStatus).toBe('attempted')
      expect(progress.attemptCount).toBe(1)
      expect(progress.correctCount).toBe(1)
    })

    it('should track lastAttemptedAt correctly', () => {
      saveAttempt(createAttempt(1, true, '2024-01-01T00:00:00.000Z'))
      saveAttempt(createAttempt(1, true, '2024-01-05T00:00:00.000Z'))

      const progress = getQuestionProgress(1)
      expect(progress.lastAttemptedAt).toBe('2024-01-05T00:00:00.000Z')
    })

    it('should calculate recent correct streak correctly', () => {
      // Wrong, then 2 correct - should be mastered (2+ correct streak)
      saveAttempt(createAttempt(1, false, '2024-01-01T00:00:00.000Z'))
      saveAttempt(createAttempt(1, true, '2024-01-02T00:00:00.000Z'))
      saveAttempt(createAttempt(1, true, '2024-01-03T00:00:00.000Z'))

      const progress = getQuestionProgress(1)
      expect(progress.masteryStatus).toBe('mastered')
    })

    it('should break streak on wrong answer', () => {
      // 2 correct, then wrong - streak broken
      saveAttempt(createAttempt(1, true, '2024-01-01T00:00:00.000Z'))
      saveAttempt(createAttempt(1, true, '2024-01-02T00:00:00.000Z'))
      saveAttempt(createAttempt(1, false, '2024-01-03T00:00:00.000Z'))

      const progress = getQuestionProgress(1)
      // 2/3 = 66.7% < 75%, so not mastered by accuracy
      // Recent streak is 0 (last was wrong)
      expect(progress.masteryStatus).toBe('incorrect')
    })
  })

  describe('getProgressForQuestions', () => {
    it('should return progress for multiple questions', () => {
      saveAttempt(createAttempt(1, true, '2024-01-01T00:00:00.000Z'))
      saveAttempt(createAttempt(1, true, '2024-01-02T00:00:00.000Z'))
      saveAttempt(createAttempt(2, false, '2024-01-01T00:00:00.000Z'))

      const progressMap = getProgressForQuestions([1, 2, 3])

      expect(progressMap.get(1)?.masteryStatus).toBe('mastered')
      expect(progressMap.get(2)?.masteryStatus).toBe('incorrect')
      expect(progressMap.get(3)?.masteryStatus).toBe('unattempted')
    })

    it('should handle empty question list', () => {
      const progressMap = getProgressForQuestions([])
      expect(progressMap.size).toBe(0)
    })

    it('should respect markedAsLearned in bulk operation', () => {
      markAsLearned(1, true)
      const progressMap = getProgressForQuestions([1])
      expect(progressMap.get(1)?.masteryStatus).toBe('mastered')
      expect(progressMap.get(1)?.markedAsLearned).toBe(true)
    })
  })

  describe('clearLearnedQuestions', () => {
    it('should clear all learned questions', () => {
      markAsLearned(1, true)
      markAsLearned(2, true)

      clearLearnedQuestions()

      const learned = getLearnedQuestionIds()
      expect(learned.size).toBe(0)
    })
  })
})
