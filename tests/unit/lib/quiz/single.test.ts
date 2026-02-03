/**
 * Unit tests for lib/quiz/single.ts
 * Tests single question practice functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { practiceQuestion } from '@/lib/quiz/single'
import { getSessions, getAttempts } from '@/lib/storage'
import type { QuestionWithAnswers } from '@/types'

// Mock questions data
const mockQuestions: QuestionWithAnswers[] = [
  {
    id: 1,
    questionText: 'What is Snowflake?',
    questionType: 'single',
    explanation: 'Snowflake is a cloud data platform.',
    domain: '1',
    topic: 'Architecture',
    difficulty: 'easy',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    answers: [
      {
        id: 101,
        questionId: 1,
        answerText: 'A cloud data platform',
        isCorrect: true,
        sortOrder: 1,
      },
      { id: 102, questionId: 1, answerText: 'A database tool', isCorrect: false, sortOrder: 2 },
      { id: 103, questionId: 1, answerText: 'A spreadsheet', isCorrect: false, sortOrder: 3 },
    ],
  },
  {
    id: 2,
    questionText: 'Select all Snowflake features',
    questionType: 'multi',
    explanation: 'Snowflake has many features.',
    domain: '1',
    topic: 'Features',
    difficulty: 'medium',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    answers: [
      { id: 201, questionId: 2, answerText: 'Time Travel', isCorrect: true, sortOrder: 1 },
      { id: 202, questionId: 2, answerText: 'Zero-Copy Cloning', isCorrect: true, sortOrder: 2 },
      { id: 203, questionId: 2, answerText: 'Manual Indexing', isCorrect: false, sortOrder: 3 },
    ],
  },
  {
    id: 3,
    questionText: 'Question without domain',
    questionType: 'single',
    explanation: 'Test question.',
    domain: null,
    topic: null,
    difficulty: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    answers: [
      { id: 301, questionId: 3, answerText: 'Correct', isCorrect: true, sortOrder: 1 },
      { id: 302, questionId: 3, answerText: 'Incorrect', isCorrect: false, sortOrder: 2 },
    ],
  },
]

// Mock the questions module
vi.mock('@/lib/data/questions', () => ({
  getQuestionById: (id: number) => mockQuestions.find((q) => q.id === id),
}))

describe('lib/quiz/single', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('practiceQuestion', () => {
    it('should create session and attempt for correct answer', () => {
      const result = practiceQuestion({
        questionId: 1,
        selectedAnswerIds: [101], // Correct answer
        timeSpentSeconds: 15,
      })

      expect(result.isCorrect).toBe(true)
      expect(result.correctAnswerIds).toEqual([101])
      expect(result.sessionId).toBeDefined()

      // Verify session was created
      const sessions = getSessions()
      expect(sessions.length).toBe(1)
      expect(sessions[0]?.sessionType).toBe('practice')
      expect(sessions[0]?.totalQuestions).toBe(1)
      expect(sessions[0]?.correctAnswers).toBe(1)
      expect(sessions[0]?.domainsFilter).toEqual(['1'])
      expect(sessions[0]?.completedAt).not.toBeNull()

      // Verify attempt was created
      const attempts = getAttempts()
      expect(attempts.length).toBe(1)
      expect(attempts[0]?.isCorrect).toBe(true)
      expect(attempts[0]?.questionId).toBe(1)
      expect(attempts[0]?.timeSpentSeconds).toBe(15)
    })

    it('should create session and attempt for incorrect answer', () => {
      const result = practiceQuestion({
        questionId: 1,
        selectedAnswerIds: [102], // Incorrect answer
      })

      expect(result.isCorrect).toBe(false)
      expect(result.correctAnswerIds).toEqual([101])

      const sessions = getSessions()
      expect(sessions[0]?.correctAnswers).toBe(0)

      const attempts = getAttempts()
      expect(attempts[0]?.isCorrect).toBe(false)
    })

    it('should handle multi-select questions correctly', () => {
      // Select both correct answers
      const result = practiceQuestion({
        questionId: 2,
        selectedAnswerIds: [201, 202],
      })

      expect(result.isCorrect).toBe(true)
      expect(result.correctAnswerIds).toEqual([201, 202])
    })

    it('should mark incorrect for partial multi-select answers', () => {
      // Select only one of two correct answers
      const result = practiceQuestion({
        questionId: 2,
        selectedAnswerIds: [201],
      })

      expect(result.isCorrect).toBe(false)
    })

    it('should mark incorrect for extra selections in multi-select', () => {
      // Select correct answers plus wrong one
      const result = practiceQuestion({
        questionId: 2,
        selectedAnswerIds: [201, 202, 203],
      })

      expect(result.isCorrect).toBe(false)
    })

    it('should throw error for non-existent question', () => {
      expect(() => {
        practiceQuestion({
          questionId: 999,
          selectedAnswerIds: [1],
        })
      }).toThrow('Question 999 not found')
    })

    it('should handle question with null domain', () => {
      const result = practiceQuestion({
        questionId: 3,
        selectedAnswerIds: [301],
      })

      expect(result.isCorrect).toBe(true)

      const sessions = getSessions()
      expect(sessions[0]?.domainsFilter).toBeNull()
    })

    it('should default timeSpentSeconds to null when not provided', () => {
      practiceQuestion({
        questionId: 1,
        selectedAnswerIds: [101],
      })

      const sessions = getSessions()
      expect(sessions[0]?.timeSpentSeconds).toBeNull()

      const attempts = getAttempts()
      expect(attempts[0]?.timeSpentSeconds).toBeNull()
    })

    it('should set timedOut to false', () => {
      practiceQuestion({
        questionId: 1,
        selectedAnswerIds: [101],
      })

      const attempts = getAttempts()
      expect(attempts[0]?.timedOut).toBe(false)
    })
  })
})
