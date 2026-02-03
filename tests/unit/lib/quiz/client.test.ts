/**
 * Unit tests for lib/quiz/client.ts
 * Tests quiz session management functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startQuiz, submitAnswer, endSession } from '@/lib/quiz/client'
import { getSession, getAttempts, getSessions } from '@/lib/storage'
import type { QuestionWithAnswers } from '@/types'

// Mock questions data for predictable tests
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
      {
        id: 104,
        questionId: 1,
        answerText: 'An on-premise solution',
        isCorrect: false,
        sortOrder: 4,
      },
    ],
  },
  {
    id: 2,
    questionText: 'Which of the following are Snowflake features?',
    questionType: 'multi',
    explanation: 'Snowflake supports multiple features.',
    domain: '1',
    topic: 'Features',
    difficulty: 'medium',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    answers: [
      { id: 201, questionId: 2, answerText: 'Time Travel', isCorrect: true, sortOrder: 1 },
      { id: 202, questionId: 2, answerText: 'Zero-Copy Cloning', isCorrect: true, sortOrder: 2 },
      { id: 203, questionId: 2, answerText: 'Stored Procedures', isCorrect: false, sortOrder: 3 },
      { id: 204, questionId: 2, answerText: 'Data Sharing', isCorrect: true, sortOrder: 4 },
    ],
  },
  {
    id: 3,
    questionText: 'What is a role in Snowflake?',
    questionType: 'single',
    explanation: 'Roles manage access control.',
    domain: '2',
    topic: 'Security',
    difficulty: 'easy',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    answers: [
      {
        id: 301,
        questionId: 3,
        answerText: 'An access control entity',
        isCorrect: true,
        sortOrder: 1,
      },
      { id: 302, questionId: 3, answerText: 'A database object', isCorrect: false, sortOrder: 2 },
      { id: 303, questionId: 3, answerText: 'A table type', isCorrect: false, sortOrder: 3 },
      { id: 304, questionId: 3, answerText: 'A warehouse size', isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    id: 4,
    questionText: 'What is a virtual warehouse?',
    questionType: 'single',
    explanation: 'Virtual warehouses provide compute resources.',
    domain: '3',
    topic: 'Performance',
    difficulty: 'medium',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    answers: [
      {
        id: 401,
        questionId: 4,
        answerText: 'Compute cluster for queries',
        isCorrect: true,
        sortOrder: 1,
      },
      { id: 402, questionId: 4, answerText: 'Storage location', isCorrect: false, sortOrder: 2 },
      { id: 403, questionId: 4, answerText: 'Network interface', isCorrect: false, sortOrder: 3 },
      { id: 404, questionId: 4, answerText: 'User account', isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    id: 5,
    questionText: 'How do you load data into Snowflake?',
    questionType: 'single',
    explanation: 'COPY INTO is the primary command.',
    domain: '4',
    topic: 'Data Loading',
    difficulty: 'easy',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    answers: [
      {
        id: 501,
        questionId: 5,
        answerText: 'Using COPY INTO command',
        isCorrect: true,
        sortOrder: 1,
      },
      { id: 502, questionId: 5, answerText: 'Using INSERT only', isCorrect: false, sortOrder: 2 },
      {
        id: 503,
        questionId: 5,
        answerText: 'Using UPDATE statement',
        isCorrect: false,
        sortOrder: 3,
      },
      { id: 504, questionId: 5, answerText: 'Manual entry only', isCorrect: false, sortOrder: 4 },
    ],
  },
]

// Mock the questions module
vi.mock('@/lib/data/questions', () => ({
  getRandomQuestions: vi.fn((count: number, domains?: string[]) => {
    let pool = [...mockQuestions]
    if (domains !== undefined && domains.length > 0) {
      pool = pool.filter((q) => q.domain !== null && domains.includes(q.domain))
    }
    return pool.slice(0, Math.min(count, pool.length))
  }),
  getQuestionById: vi.fn((id: number) => {
    return mockQuestions.find((q) => q.id === id)
  }),
  getQuestionsByIds: vi.fn((ids: number[]) => {
    return ids.map((id) => mockQuestions.find((q) => q.id === id)).filter((q) => q !== undefined)
  }),
  getQuestionsInRange: vi.fn((startIndex: number, endIndex: number) => {
    return mockQuestions.slice(0, Math.min(endIndex - startIndex + 1, mockQuestions.length))
  }),
}))

describe('lib/quiz/client', () => {
  beforeEach(() => {
    // localStorage is cleared by setup.ts beforeEach
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('startQuiz', () => {
    describe('practice mode with different question counts', () => {
      it('should create a practice quiz with 3 questions', () => {
        const result = startQuiz({
          type: 'practice',
          questionCount: 3,
        })

        expect(result.sessionId).toBeDefined()
        expect(result.sessionId).toMatch(/^test-uuid-/)
        expect(result.questions).toHaveLength(3)

        // Verify session was saved
        const session = getSession(result.sessionId)
        expect(session).toBeDefined()
        expect(session?.sessionType).toBe('practice')
        expect(session?.totalQuestions).toBe(3)
        expect(session?.correctAnswers).toBe(0)
        expect(session?.completedAt).toBeNull()
      })

      it('should create a practice quiz with 5 questions (all available)', () => {
        const result = startQuiz({
          type: 'practice',
          questionCount: 5,
        })

        expect(result.questions).toHaveLength(5)

        const session = getSession(result.sessionId)
        expect(session?.totalQuestions).toBe(5)
      })

      it('should limit questions to available pool when requesting more than exist', () => {
        const result = startQuiz({
          type: 'practice',
          questionCount: 100, // More than mock questions available
        })

        // Should only get what's available (5 mock questions)
        expect(result.questions).toHaveLength(5)
      })
    })

    describe('domain filtering', () => {
      it('should filter questions by single domain', () => {
        const result = startQuiz({
          type: 'practice',
          questionCount: 10,
          domains: ['1'], // Domain 1 has 2 questions in mock data
        })

        expect(result.questions).toHaveLength(2)

        // Verify all questions are from domain 1
        const session = getSession(result.sessionId)
        expect(session?.domainsFilter).toEqual(['1'])
      })

      it('should filter questions by multiple domains', () => {
        const result = startQuiz({
          type: 'practice',
          questionCount: 10,
          domains: ['1', '2'], // Domain 1 has 2, Domain 2 has 1
        })

        expect(result.questions).toHaveLength(3)

        const session = getSession(result.sessionId)
        expect(session?.domainsFilter).toEqual(['1', '2'])
      })

      it('should return empty array when filtering by non-existent domain', () => {
        const result = startQuiz({
          type: 'practice',
          questionCount: 10,
          domains: ['99'], // Non-existent domain
        })

        expect(result.questions).toHaveLength(0)
        expect(result.sessionId).toBeDefined()
      })

      it('should not filter when domains array is empty', () => {
        const result = startQuiz({
          type: 'practice',
          questionCount: 5,
          domains: [],
        })

        expect(result.questions).toHaveLength(5)
      })
    })

    describe('review mode with specific question IDs', () => {
      it('should create a review quiz with specific question IDs', () => {
        const result = startQuiz({
          type: 'review',
          questionCount: 2,
          specificQuestionIds: [1, 3],
        })

        expect(result.questions).toHaveLength(2)
        expect(result.questions).toContain(1)
        expect(result.questions).toContain(3)

        const session = getSession(result.sessionId)
        expect(session?.sessionType).toBe('review')
        expect(session?.questionIds).toEqual([1, 3])
      })

      it('should filter out non-existent question IDs', () => {
        const result = startQuiz({
          type: 'review',
          questionCount: 5,
          specificQuestionIds: [1, 999, 3, 888], // 999 and 888 don't exist
        })

        expect(result.questions).toHaveLength(2)
        expect(result.questions).toContain(1)
        expect(result.questions).toContain(3)
      })

      it('should use random questions when specificQuestionIds is empty', () => {
        const result = startQuiz({
          type: 'review',
          questionCount: 3,
          specificQuestionIds: [],
        })

        expect(result.questions).toHaveLength(3)
      })

      it('should prioritize specificQuestionIds over questionCount', () => {
        const result = startQuiz({
          type: 'review',
          questionCount: 100, // Ignored when specificQuestionIds is provided
          specificQuestionIds: [1, 2],
        })

        expect(result.questions).toHaveLength(2)
      })
    })

    describe('exam mode', () => {
      it('should create an exam session', () => {
        const result = startQuiz({
          type: 'exam',
          questionCount: 5,
        })

        expect(result.sessionId).toBeDefined()
        expect(result.questions).toHaveLength(5)

        const session = getSession(result.sessionId)
        expect(session?.sessionType).toBe('exam')
      })
    })

    describe('session persistence', () => {
      it('should persist session to localStorage', () => {
        const result = startQuiz({
          type: 'practice',
          questionCount: 2,
        })

        const sessions = getSessions()
        expect(sessions).toHaveLength(1)
        expect(sessions[0]?.id).toBe(result.sessionId)
      })

      it('should include startedAt timestamp', () => {
        const before = new Date().toISOString()
        const result = startQuiz({
          type: 'practice',
          questionCount: 2,
        })
        const after = new Date().toISOString()

        const session = getSession(result.sessionId)
        expect(session).toBeDefined()
        const startedAt = session?.startedAt ?? ''
        expect(startedAt).not.toBe('')
        expect(startedAt >= before).toBe(true)
        expect(startedAt <= after).toBe(true)
      })
    })
  })

  describe('submitAnswer', () => {
    let sessionId: string

    beforeEach(() => {
      // Create a session for testing
      const result = startQuiz({
        type: 'practice',
        questionCount: 5,
      })
      sessionId = result.sessionId
    })

    describe('single-select questions', () => {
      it('should return isCorrect=true for correct answer', () => {
        const result = submitAnswer({
          sessionId,
          questionId: 1,
          selectedAnswerIds: [101], // Correct answer
        })

        expect(result.isCorrect).toBe(true)
        expect(result.correctAnswerIds).toEqual([101])
      })

      it('should return isCorrect=false for incorrect answer', () => {
        const result = submitAnswer({
          sessionId,
          questionId: 1,
          selectedAnswerIds: [102], // Incorrect answer
        })

        expect(result.isCorrect).toBe(false)
        expect(result.correctAnswerIds).toEqual([101])
      })

      it('should update session correctAnswers count on correct answer', () => {
        submitAnswer({
          sessionId,
          questionId: 1,
          selectedAnswerIds: [101],
        })

        const session = getSession(sessionId)
        expect(session?.correctAnswers).toBe(1)
      })

      it('should not update session correctAnswers count on incorrect answer', () => {
        submitAnswer({
          sessionId,
          questionId: 1,
          selectedAnswerIds: [102],
        })

        const session = getSession(sessionId)
        expect(session?.correctAnswers).toBe(0)
      })
    })

    describe('multi-select questions', () => {
      it('should return isCorrect=true when all correct answers are selected', () => {
        const result = submitAnswer({
          sessionId,
          questionId: 2,
          selectedAnswerIds: [201, 202, 204], // All three correct answers
        })

        expect(result.isCorrect).toBe(true)
        expect(result.correctAnswerIds).toContain(201)
        expect(result.correctAnswerIds).toContain(202)
        expect(result.correctAnswerIds).toContain(204)
        expect(result.correctAnswerIds).toHaveLength(3)
      })

      it('should return isCorrect=false when missing some correct answers', () => {
        const result = submitAnswer({
          sessionId,
          questionId: 2,
          selectedAnswerIds: [201, 202], // Missing 204
        })

        expect(result.isCorrect).toBe(false)
      })

      it('should return isCorrect=false when selecting extra incorrect answers', () => {
        const result = submitAnswer({
          sessionId,
          questionId: 2,
          selectedAnswerIds: [201, 202, 203, 204], // 203 is incorrect
        })

        expect(result.isCorrect).toBe(false)
      })

      it('should return isCorrect=false when only incorrect answers are selected', () => {
        const result = submitAnswer({
          sessionId,
          questionId: 2,
          selectedAnswerIds: [203], // Only incorrect answer
        })

        expect(result.isCorrect).toBe(false)
      })

      it('should handle empty selection as incorrect', () => {
        const result = submitAnswer({
          sessionId,
          questionId: 2,
          selectedAnswerIds: [],
        })

        expect(result.isCorrect).toBe(false)
      })
    })

    describe('attempt recording', () => {
      it('should record attempt in localStorage', () => {
        submitAnswer({
          sessionId,
          questionId: 1,
          selectedAnswerIds: [101],
        })

        const attempts = getAttempts()
        expect(attempts).toHaveLength(1)
        expect(attempts[0]?.questionId).toBe(1)
        expect(attempts[0]?.selectedAnswerIds).toEqual([101])
        expect(attempts[0]?.isCorrect).toBe(true)
        expect(attempts[0]?.sessionId).toBe(sessionId)
      })

      it('should record timeSpentSeconds when provided', () => {
        submitAnswer({
          sessionId,
          questionId: 1,
          selectedAnswerIds: [101],
          timeSpentSeconds: 45,
        })

        const attempts = getAttempts()
        expect(attempts[0]?.timeSpentSeconds).toBe(45)
      })

      it('should always set timedOut to false (deprecated feature)', () => {
        submitAnswer({
          sessionId,
          questionId: 1,
          selectedAnswerIds: [101],
        })

        const attempts = getAttempts()
        expect(attempts[0]?.timedOut).toBe(false)
      })

      it('should include attemptedAt timestamp', () => {
        const before = new Date().toISOString()
        submitAnswer({
          sessionId,
          questionId: 1,
          selectedAnswerIds: [101],
        })
        const after = new Date().toISOString()

        const attempts = getAttempts()
        expect(attempts).toHaveLength(1)
        const attemptedAt = attempts[0]?.attemptedAt ?? ''
        expect(attemptedAt).not.toBe('')
        expect(attemptedAt >= before).toBe(true)
        expect(attemptedAt <= after).toBe(true)
      })

      it('should record multiple attempts for different questions', () => {
        submitAnswer({
          sessionId,
          questionId: 1,
          selectedAnswerIds: [101],
        })

        submitAnswer({
          sessionId,
          questionId: 3,
          selectedAnswerIds: [302], // Wrong answer
        })

        const attempts = getAttempts()
        expect(attempts).toHaveLength(2)

        const session = getSession(sessionId)
        expect(session?.correctAnswers).toBe(1) // Only first was correct
      })
    })

    describe('error cases', () => {
      it('should throw error for invalid question ID', () => {
        expect(() =>
          submitAnswer({
            sessionId,
            questionId: 9999, // Non-existent
            selectedAnswerIds: [101],
          })
        ).toThrow('Question 9999 not found')
      })
    })
  })

  describe('endSession', () => {
    let sessionId: string

    beforeEach(() => {
      const result = startQuiz({
        type: 'practice',
        questionCount: 3,
      })
      sessionId = result.sessionId
    })

    it('should mark session as completed', () => {
      endSession(sessionId)

      const session = getSession(sessionId)
      expect(session?.completedAt).not.toBeNull()
    })

    it('should set completedAt to current timestamp', () => {
      const before = new Date().toISOString()
      endSession(sessionId)
      const after = new Date().toISOString()

      const session = getSession(sessionId)
      expect(session).toBeDefined()
      const completedAt = session?.completedAt ?? ''
      expect(completedAt).not.toBe('')
      expect(completedAt >= before).toBe(true)
      expect(completedAt <= after).toBe(true)
    })

    it('should record timeSpentSeconds when provided', () => {
      endSession(sessionId, 300)

      const session = getSession(sessionId)
      expect(session?.timeSpentSeconds).toBe(300)
    })

    it('should set timeSpentSeconds to null when not provided', () => {
      endSession(sessionId)

      const session = getSession(sessionId)
      expect(session?.timeSpentSeconds).toBeNull()
    })

    it('should throw error for invalid session ID', () => {
      expect(() => {
        endSession('non-existent-session-id')
      }).toThrow('Session non-existent-session-id not found')
    })

    it('should preserve other session data when ending', () => {
      // Submit some answers first
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [101], // Correct
      })
      submitAnswer({
        sessionId,
        questionId: 3,
        selectedAnswerIds: [302], // Incorrect
      })

      endSession(sessionId, 120)

      const session = getSession(sessionId)
      expect(session?.correctAnswers).toBe(1)
      expect(session?.totalQuestions).toBe(3)
      expect(session?.sessionType).toBe('practice')
      expect(session?.timeSpentSeconds).toBe(120)
      expect(session?.completedAt).not.toBeNull()
    })
  })

  describe('integration: full quiz flow', () => {
    it('should handle a complete practice quiz flow', () => {
      // Start quiz
      const { sessionId, questions } = startQuiz({
        type: 'practice',
        questionCount: 3,
      })

      expect(questions).toHaveLength(3)

      // Submit answers
      const q0 = questions[0]
      const q1 = questions[1]
      const q2 = questions[2]
      if (q0 === undefined || q1 === undefined || q2 === undefined) {
        throw new Error('Expected 3 questions')
      }
      const results = [
        submitAnswer({
          sessionId,
          questionId: q0,
          selectedAnswerIds: [101], // Correct for question 1
          timeSpentSeconds: 30,
        }),
        submitAnswer({
          sessionId,
          questionId: q1,
          selectedAnswerIds: [201, 202, 204], // Correct for question 2 (multi-select)
          timeSpentSeconds: 45,
        }),
        submitAnswer({
          sessionId,
          questionId: q2,
          selectedAnswerIds: [302], // Wrong for question 3
          timeSpentSeconds: 20,
        }),
      ]

      expect(results[0]?.isCorrect).toBe(true)
      expect(results[1]?.isCorrect).toBe(true)
      expect(results[2]?.isCorrect).toBe(false)

      // End session
      endSession(sessionId, 95)

      // Verify final state
      const session = getSession(sessionId)
      expect(session?.correctAnswers).toBe(2)
      expect(session?.totalQuestions).toBe(3)
      expect(session?.timeSpentSeconds).toBe(95)
      expect(session?.completedAt).not.toBeNull()

      const attempts = getAttempts()
      expect(attempts).toHaveLength(3)
    })

    it('should handle a review quiz with specific questions', () => {
      // Start review quiz with specific questions
      const { sessionId, questions } = startQuiz({
        type: 'review',
        questionCount: 5, // Ignored
        specificQuestionIds: [1, 3],
      })

      expect(questions).toEqual([1, 3])

      // Submit answers
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [101],
      })
      submitAnswer({
        sessionId,
        questionId: 3,
        selectedAnswerIds: [301],
      })

      endSession(sessionId)

      const session = getSession(sessionId)
      expect(session?.sessionType).toBe('review')
      expect(session?.correctAnswers).toBe(2)
      expect(session?.totalQuestions).toBe(2)
    })
  })

  describe('answer resubmission', () => {
    let sessionId: string

    beforeEach(() => {
      const result = startQuiz({ type: 'practice', questionCount: 5 })
      sessionId = result.sessionId
    })

    it('should not increment score when resubmitting same correct answer', () => {
      // First submission - correct
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [101],
      })

      let session = getSession(sessionId)
      expect(session?.correctAnswers).toBe(1)

      // Resubmit same correct answer
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [101],
      })

      session = getSession(sessionId)
      expect(session?.correctAnswers).toBe(1) // Should still be 1
    })

    it('should increment score when changing from wrong to correct', () => {
      // First submission - wrong
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [102],
      })

      let session = getSession(sessionId)
      expect(session?.correctAnswers).toBe(0)

      // Resubmit with correct answer
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [101],
      })

      session = getSession(sessionId)
      expect(session?.correctAnswers).toBe(1)
    })

    it('should decrement score when changing from correct to wrong', () => {
      // First submission - correct
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [101],
      })

      let session = getSession(sessionId)
      expect(session?.correctAnswers).toBe(1)

      // Resubmit with wrong answer
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [102],
      })

      session = getSession(sessionId)
      expect(session?.correctAnswers).toBe(0)
    })

    it('should not change score when resubmitting same wrong answer', () => {
      // First submission - wrong
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [102],
      })

      let session = getSession(sessionId)
      expect(session?.correctAnswers).toBe(0)

      // Resubmit same wrong answer
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [102],
      })

      session = getSession(sessionId)
      expect(session?.correctAnswers).toBe(0)
    })

    it('should update attempt record on resubmission', () => {
      // First submission
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [102],
        timeSpentSeconds: 10,
      })

      // Resubmit with different answer and time
      submitAnswer({
        sessionId,
        questionId: 1,
        selectedAnswerIds: [101],
        timeSpentSeconds: 20,
      })

      const attempts = getAttempts()
      const questionAttempts = attempts.filter(
        (a) => a.questionId === 1 && a.sessionId === sessionId
      )

      // Should only have one attempt (updated, not new)
      expect(questionAttempts).toHaveLength(1)
      expect(questionAttempts[0]?.selectedAnswerIds).toEqual([101])
      expect(questionAttempts[0]?.isCorrect).toBe(true)
      expect(questionAttempts[0]?.timeSpentSeconds).toBe(20)
    })
  })

  describe('exam mode with question sets', () => {
    it('should use questions 1-100 for examQuestionSet 1', () => {
      const { questions } = startQuiz({
        type: 'exam',
        questionCount: 100,
        examQuestionSet: 1,
      })

      // Should get questions in order, not shuffled
      // The first question ID should be from the 1-100 range
      expect(questions.length).toBeGreaterThan(0)
      expect(questions.length).toBeLessThanOrEqual(100)
    })

    it('should use questions 101-200 for examQuestionSet 2', () => {
      const { questions } = startQuiz({
        type: 'exam',
        questionCount: 100,
        examQuestionSet: 2,
      })

      expect(questions.length).toBeGreaterThan(0)
      expect(questions.length).toBeLessThanOrEqual(100)
    })

    it('should create exam session with correct type', () => {
      const { sessionId } = startQuiz({
        type: 'exam',
        questionCount: 100,
        examQuestionSet: 1,
      })

      const session = getSession(sessionId)
      expect(session?.sessionType).toBe('exam')
    })

    it('should use ordered questions (not shuffled) in exam mode', () => {
      // Start two exam sessions with same question set
      const result1 = startQuiz({
        type: 'exam',
        questionCount: 100,
        examQuestionSet: 1,
      })

      const result2 = startQuiz({
        type: 'exam',
        questionCount: 100,
        examQuestionSet: 1,
      })

      // Both should have same question order
      expect(result1.questions).toEqual(result2.questions)
    })
  })
})
