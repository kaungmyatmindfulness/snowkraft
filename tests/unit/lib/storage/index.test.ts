import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { QuestionWithAnswers } from '@/types'

// Mock getQuestionById from questions module
vi.mock('@/lib/data/questions', () => ({
  getQuestionById: vi.fn(),
}))

import { getQuestionById } from '@/lib/data/questions'
import {
  getSessions,
  getSession,
  saveSession,
  getCompletedSessions,
  getAttempts,
  getSessionAttempts,
  saveAttempt,
  getOverallStats,
  getStatsByDomain,
  getWeakAreas,
  getSessionHistory,
  getSessionResults,
  getReviewStats,
  getReviewableQuestions,
  resetAllData,
  type StoredSession,
  type StoredAttempt,
} from '@/lib/storage/index'

// Helper to create mock sessions
function createMockSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id: 'session-1',
    sessionType: 'practice',
    totalQuestions: 10,
    correctAnswers: 7,
    timeSpentSeconds: 600,
    domainsFilter: null,
    questionIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    startedAt: '2024-01-01T10:00:00.000Z',
    completedAt: '2024-01-01T10:10:00.000Z',
    ...overrides,
  }
}

// Helper to create mock attempts
function createMockAttempt(overrides: Partial<StoredAttempt> = {}): StoredAttempt {
  return {
    id: 'attempt-1',
    sessionId: 'session-1',
    questionId: 1,
    selectedAnswerIds: [1],
    isCorrect: true,
    timeSpentSeconds: 30,
    timedOut: false,
    attemptedAt: '2024-01-01T10:01:00.000Z',
    ...overrides,
  }
}

// Helper to create mock questions
function createMockQuestion(overrides: Partial<QuestionWithAnswers> = {}): QuestionWithAnswers {
  return {
    id: 1,
    questionText: 'Sample question?',
    questionType: 'single',
    explanation: 'Sample explanation',
    domain: '1',
    topic: 'Architecture',
    difficulty: 'medium',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    answers: [
      { id: 1, questionId: 1, answerText: 'Answer A', isCorrect: true, sortOrder: 0 },
      { id: 2, questionId: 1, answerText: 'Answer B', isCorrect: false, sortOrder: 1 },
    ],
    ...overrides,
  }
}

describe('Storage Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===== Session Operations =====
  describe('getSessions', () => {
    it('should return empty array when no sessions exist', () => {
      const sessions = getSessions()
      expect(sessions).toEqual([])
    })

    it('should return all saved sessions', () => {
      const session1 = createMockSession({ id: 'session-1' })
      const session2 = createMockSession({ id: 'session-2' })

      saveSession(session1)
      saveSession(session2)

      const sessions = getSessions()
      expect(sessions).toHaveLength(2)
      expect(sessions[0]?.id).toBe('session-1')
      expect(sessions[1]?.id).toBe('session-2')
    })
  })

  describe('getSession', () => {
    it('should return undefined for non-existent session', () => {
      const session = getSession('non-existent')
      expect(session).toBeUndefined()
    })

    it('should return the correct session by ID', () => {
      const mockSession = createMockSession({ id: 'test-session' })
      saveSession(mockSession)

      const session = getSession('test-session')
      expect(session).toEqual(mockSession)
    })
  })

  describe('saveSession', () => {
    it('should save a new session', () => {
      const mockSession = createMockSession()
      saveSession(mockSession)

      const sessions = getSessions()
      expect(sessions).toHaveLength(1)
      expect(sessions[0]).toEqual(mockSession)
    })

    it('should update an existing session', () => {
      const mockSession = createMockSession({ correctAnswers: 5 })
      saveSession(mockSession)

      const updatedSession = { ...mockSession, correctAnswers: 8 }
      saveSession(updatedSession)

      const sessions = getSessions()
      expect(sessions).toHaveLength(1)
      expect(sessions[0]?.correctAnswers).toBe(8)
    })

    it('should not duplicate sessions when updating', () => {
      const session1 = createMockSession({ id: 'session-1' })
      const session2 = createMockSession({ id: 'session-2' })

      saveSession(session1)
      saveSession(session2)
      saveSession({ ...session1, correctAnswers: 10 })

      const sessions = getSessions()
      expect(sessions).toHaveLength(2)
    })
  })

  describe('getCompletedSessions', () => {
    it('should return empty array when no sessions exist', () => {
      const completed = getCompletedSessions()
      expect(completed).toEqual([])
    })

    it('should only return sessions with completedAt set', () => {
      const completedSession = createMockSession({
        id: 'completed',
        completedAt: '2024-01-01T10:10:00.000Z',
      })
      const incompleteSession = createMockSession({
        id: 'incomplete',
        completedAt: null,
      })

      saveSession(completedSession)
      saveSession(incompleteSession)

      const completed = getCompletedSessions()
      expect(completed).toHaveLength(1)
      expect(completed[0]?.id).toBe('completed')
    })
  })

  // ===== Attempt Operations =====
  describe('getAttempts', () => {
    it('should return empty array when no attempts exist', () => {
      const attempts = getAttempts()
      expect(attempts).toEqual([])
    })

    it('should return all saved attempts', () => {
      const attempt1 = createMockAttempt({ id: 'attempt-1' })
      const attempt2 = createMockAttempt({ id: 'attempt-2' })

      saveAttempt(attempt1)
      saveAttempt(attempt2)

      const attempts = getAttempts()
      expect(attempts).toHaveLength(2)
    })
  })

  describe('getSessionAttempts', () => {
    it('should return empty array when no attempts for session', () => {
      const attempts = getSessionAttempts('non-existent')
      expect(attempts).toEqual([])
    })

    it('should return only attempts for the specified session', () => {
      const attempt1 = createMockAttempt({ id: 'a1', sessionId: 'session-1' })
      const attempt2 = createMockAttempt({ id: 'a2', sessionId: 'session-1' })
      const attempt3 = createMockAttempt({ id: 'a3', sessionId: 'session-2' })

      saveAttempt(attempt1)
      saveAttempt(attempt2)
      saveAttempt(attempt3)

      const sessionAttempts = getSessionAttempts('session-1')
      expect(sessionAttempts).toHaveLength(2)
      expect(sessionAttempts.every((a) => a.sessionId === 'session-1')).toBe(true)
    })
  })

  describe('saveAttempt', () => {
    it('should add attempt to the list', () => {
      const mockAttempt = createMockAttempt()
      saveAttempt(mockAttempt)

      const attempts = getAttempts()
      expect(attempts).toHaveLength(1)
      expect(attempts[0]).toEqual(mockAttempt)
    })

    it('should append new attempts (not update)', () => {
      const attempt1 = createMockAttempt({ id: 'attempt-1' })
      const attempt2 = createMockAttempt({ id: 'attempt-1' }) // Same ID

      saveAttempt(attempt1)
      saveAttempt(attempt2)

      const attempts = getAttempts()
      expect(attempts).toHaveLength(2) // Both are saved (attempts are append-only)
    })
  })

  // ===== Stats Operations =====
  describe('getOverallStats', () => {
    it('should return default stats when no data exists', () => {
      const stats = getOverallStats(100)

      expect(stats).toEqual({
        totalQuestions: 100,
        totalAttempts: 0,
        correctAttempts: 0,
        overallAccuracy: 0,
        totalSessions: 0,
        passedSessions: 0,
      })
    })

    it('should calculate correct stats from attempts and sessions', () => {
      // Save completed sessions
      const passingSession = createMockSession({
        id: 'passing',
        totalQuestions: 10,
        correctAnswers: 8, // 80% - passing
        completedAt: '2024-01-01T10:10:00.000Z',
      })
      const failingSession = createMockSession({
        id: 'failing',
        totalQuestions: 10,
        correctAnswers: 5, // 50% - failing
        completedAt: '2024-01-01T11:10:00.000Z',
      })
      saveSession(passingSession)
      saveSession(failingSession)

      // Save attempts
      saveAttempt(createMockAttempt({ id: 'a1', isCorrect: true }))
      saveAttempt(createMockAttempt({ id: 'a2', isCorrect: true }))
      saveAttempt(createMockAttempt({ id: 'a3', isCorrect: false }))

      const stats = getOverallStats(100)

      expect(stats.totalQuestions).toBe(100)
      expect(stats.totalAttempts).toBe(3)
      expect(stats.correctAttempts).toBe(2)
      expect(stats.overallAccuracy).toBeCloseTo(66.67, 1)
      expect(stats.totalSessions).toBe(2)
      expect(stats.passedSessions).toBe(1)
    })

    it('should not count incomplete sessions', () => {
      const incompleteSession = createMockSession({
        id: 'incomplete',
        completedAt: null,
      })
      saveSession(incompleteSession)

      const stats = getOverallStats(100)
      expect(stats.totalSessions).toBe(0)
    })

    it('should handle edge case of session with 0 questions', () => {
      const zeroQuestionSession = createMockSession({
        id: 'zero',
        totalQuestions: 0,
        correctAnswers: 0,
        completedAt: '2024-01-01T10:10:00.000Z',
      })
      saveSession(zeroQuestionSession)

      const stats = getOverallStats(100)
      expect(stats.totalSessions).toBe(1)
      expect(stats.passedSessions).toBe(0) // Division by 0 case - should not pass
    })
  })

  describe('getStatsByDomain', () => {
    beforeEach(() => {
      vi.mocked(getQuestionById).mockImplementation((id: number) => {
        const questions: Record<number, QuestionWithAnswers> = {
          1: createMockQuestion({ id: 1, domain: '1' }),
          2: createMockQuestion({ id: 2, domain: '1' }),
          3: createMockQuestion({ id: 3, domain: '2' }),
          4: createMockQuestion({ id: 4, domain: null }), // No domain
        }
        return questions[id]
      })
    })

    it('should return empty array when no attempts exist', () => {
      const stats = getStatsByDomain()
      expect(stats).toEqual([])
    })

    it('should calculate stats grouped by domain', () => {
      saveAttempt(createMockAttempt({ id: 'a1', questionId: 1, isCorrect: true }))
      saveAttempt(createMockAttempt({ id: 'a2', questionId: 2, isCorrect: false }))
      saveAttempt(createMockAttempt({ id: 'a3', questionId: 3, isCorrect: true }))

      const stats = getStatsByDomain()

      expect(stats).toHaveLength(2)

      const domain1Stats = stats.find((s) => s.domain === '1')
      expect(domain1Stats).toEqual({
        domain: '1',
        total: 2,
        correct: 1,
        accuracy: 50,
      })

      const domain2Stats = stats.find((s) => s.domain === '2')
      expect(domain2Stats).toEqual({
        domain: '2',
        total: 1,
        correct: 1,
        accuracy: 100,
      })
    })

    it('should skip questions without domain', () => {
      saveAttempt(createMockAttempt({ id: 'a1', questionId: 4, isCorrect: true }))

      const stats = getStatsByDomain()
      expect(stats).toEqual([])
    })

    it('should skip attempts for unknown questions', () => {
      saveAttempt(createMockAttempt({ id: 'a1', questionId: 999, isCorrect: true }))

      const stats = getStatsByDomain()
      expect(stats).toEqual([])
    })

    it('should sort by domain', () => {
      saveAttempt(createMockAttempt({ id: 'a1', questionId: 3, isCorrect: true })) // domain 2
      saveAttempt(createMockAttempt({ id: 'a2', questionId: 1, isCorrect: true })) // domain 1

      const stats = getStatsByDomain()
      expect(stats[0]?.domain).toBe('1')
      expect(stats[1]?.domain).toBe('2')
    })
  })

  describe('getWeakAreas', () => {
    beforeEach(() => {
      vi.mocked(getQuestionById).mockImplementation((id: number) => {
        const questions: Record<number, QuestionWithAnswers> = {
          1: createMockQuestion({ id: 1, domain: '1', topic: 'Architecture' }),
          2: createMockQuestion({ id: 2, domain: '1', topic: 'Virtual Warehouses' }),
          3: createMockQuestion({ id: 3, domain: '2', topic: null }), // Falls back to domain
        }
        return questions[id]
      })
    })

    it('should return empty array when no attempts exist', () => {
      const weakAreas = getWeakAreas()
      expect(weakAreas).toEqual([])
    })

    it('should filter by minimum attempts', () => {
      // Only 2 attempts for topic, minAttempts default is 3
      saveAttempt(createMockAttempt({ id: 'a1', questionId: 1, isCorrect: false }))
      saveAttempt(createMockAttempt({ id: 'a2', questionId: 1, isCorrect: false }))

      const weakAreas = getWeakAreas(3, 5)
      expect(weakAreas).toEqual([])
    })

    it('should return topics sorted by accuracy (lowest first)', () => {
      // Architecture: 1/4 = 25%
      saveAttempt(createMockAttempt({ id: 'a1', questionId: 1, isCorrect: false }))
      saveAttempt(createMockAttempt({ id: 'a2', questionId: 1, isCorrect: false }))
      saveAttempt(createMockAttempt({ id: 'a3', questionId: 1, isCorrect: false }))
      saveAttempt(createMockAttempt({ id: 'a4', questionId: 1, isCorrect: true }))

      // Virtual Warehouses: 2/3 = 66.7%
      saveAttempt(createMockAttempt({ id: 'a5', questionId: 2, isCorrect: true }))
      saveAttempt(createMockAttempt({ id: 'a6', questionId: 2, isCorrect: true }))
      saveAttempt(createMockAttempt({ id: 'a7', questionId: 2, isCorrect: false }))

      const weakAreas = getWeakAreas(3, 5)

      expect(weakAreas).toHaveLength(2)
      expect(weakAreas[0]?.topic).toBe('Architecture')
      expect(weakAreas[0]?.accuracy).toBe(25)
      expect(weakAreas[1]?.topic).toBe('Virtual Warehouses')
    })

    it('should limit results', () => {
      // Create 3 topics with different accuracies
      vi.mocked(getQuestionById).mockImplementation((id: number) => {
        const questions: Record<number, QuestionWithAnswers> = {
          1: createMockQuestion({ id: 1, topic: 'Topic A' }),
          2: createMockQuestion({ id: 2, topic: 'Topic B' }),
          3: createMockQuestion({ id: 3, topic: 'Topic C' }),
        }
        return questions[id]
      })

      // 3 attempts for each topic
      for (let i = 0; i < 3; i++) {
        const a1 = createMockAttempt({
          id: `a1-${String(i)}`,
          questionId: 1,
          isCorrect: false,
        })
        const a2 = createMockAttempt({
          id: `a2-${String(i)}`,
          questionId: 2,
          isCorrect: false,
        })
        const a3 = createMockAttempt({
          id: `a3-${String(i)}`,
          questionId: 3,
          isCorrect: false,
        })
        saveAttempt(a1)
        saveAttempt(a2)
        saveAttempt(a3)
      }

      const weakAreas = getWeakAreas(3, 2)
      expect(weakAreas).toHaveLength(2)
    })

    it('should use domain as fallback when topic is null', () => {
      // 3 attempts for question with null topic
      saveAttempt(createMockAttempt({ id: 'a1', questionId: 3, isCorrect: false }))
      saveAttempt(createMockAttempt({ id: 'a2', questionId: 3, isCorrect: false }))
      saveAttempt(createMockAttempt({ id: 'a3', questionId: 3, isCorrect: true }))

      const weakAreas = getWeakAreas(3, 5)
      expect(weakAreas).toHaveLength(1)
      expect(weakAreas[0]?.topic).toBe('2') // Falls back to domain
    })
  })

  describe('getSessionHistory', () => {
    it('should return empty array when no completed sessions', () => {
      const history = getSessionHistory()
      expect(history).toEqual([])
    })

    it('should return completed sessions sorted by completedAt (newest first)', () => {
      const session1 = createMockSession({
        id: 'older',
        completedAt: '2024-01-01T10:00:00.000Z',
      })
      const session2 = createMockSession({
        id: 'newer',
        completedAt: '2024-01-02T10:00:00.000Z',
      })

      saveSession(session1)
      saveSession(session2)

      const history = getSessionHistory()
      expect(history[0]?.id).toBe('newer')
      expect(history[1]?.id).toBe('older')
    })

    it('should limit results when limit is provided', () => {
      for (let i = 0; i < 5; i++) {
        saveSession(
          createMockSession({
            id: `session-${String(i)}`,
            completedAt: `2024-01-0${String(i + 1)}T10:00:00.000Z`,
          })
        )
      }

      const history = getSessionHistory(3)
      expect(history).toHaveLength(3)
    })

    it('should not filter incomplete sessions', () => {
      const incompleteSession = createMockSession({
        id: 'incomplete',
        completedAt: null,
      })
      saveSession(incompleteSession)

      const history = getSessionHistory()
      expect(history).toEqual([])
    })

    it('should return all sessions when limit is undefined', () => {
      for (let i = 0; i < 5; i++) {
        saveSession(
          createMockSession({
            id: `session-${String(i)}`,
            completedAt: `2024-01-0${String(i + 1)}T10:00:00.000Z`,
          })
        )
      }

      const history = getSessionHistory()
      expect(history).toHaveLength(5)
    })
  })

  describe('getSessionResults', () => {
    beforeEach(() => {
      vi.mocked(getQuestionById).mockImplementation((id: number) => {
        const questions: Record<number, QuestionWithAnswers> = {
          1: createMockQuestion({
            id: 1,
            domain: '1',
            answers: [
              { id: 1, questionId: 1, answerText: 'Correct Answer', isCorrect: true, sortOrder: 0 },
              { id: 2, questionId: 1, answerText: 'Wrong Answer', isCorrect: false, sortOrder: 1 },
            ],
          }),
          2: createMockQuestion({
            id: 2,
            domain: '2',
            answers: [
              { id: 3, questionId: 2, answerText: 'Right One', isCorrect: true, sortOrder: 0 },
              { id: 4, questionId: 2, answerText: 'Wrong One', isCorrect: false, sortOrder: 1 },
            ],
          }),
        }
        return questions[id]
      })
    })

    it('should return null for non-existent session', () => {
      const results = getSessionResults('non-existent')
      expect(results).toBeNull()
    })

    it('should return session with domain breakdown', () => {
      const session = createMockSession({ id: 'test-session' })
      saveSession(session)

      saveAttempt(
        createMockAttempt({
          id: 'a1',
          sessionId: 'test-session',
          questionId: 1,
          isCorrect: true,
        })
      )
      saveAttempt(
        createMockAttempt({
          id: 'a2',
          sessionId: 'test-session',
          questionId: 2,
          isCorrect: false,
        })
      )

      const results = getSessionResults('test-session')

      expect(results).not.toBeNull()
      expect(results?.session.id).toBe('test-session')
      expect(results?.domainBreakdown).toHaveLength(2)
    })

    it('should include incorrect questions with selected and correct answers', () => {
      const session = createMockSession({ id: 'test-session' })
      saveSession(session)

      // Incorrect attempt - selected wrong answer (id: 2)
      saveAttempt(
        createMockAttempt({
          id: 'a1',
          sessionId: 'test-session',
          questionId: 1,
          selectedAnswerIds: [2],
          isCorrect: false,
        })
      )

      const results = getSessionResults('test-session')

      expect(results?.incorrectQuestions).toHaveLength(1)
      expect(results?.incorrectQuestions[0]?.selectedAnswers).toEqual([
        { id: 2, answerText: 'Wrong Answer' },
      ])
      expect(results?.incorrectQuestions[0]?.correctAnswers).toEqual([
        { id: 1, answerText: 'Correct Answer' },
      ])
    })

    it('should not include correct questions in incorrect list', () => {
      const session = createMockSession({ id: 'test-session' })
      saveSession(session)

      saveAttempt(
        createMockAttempt({
          id: 'a1',
          sessionId: 'test-session',
          questionId: 1,
          isCorrect: true,
        })
      )

      const results = getSessionResults('test-session')
      expect(results?.incorrectQuestions).toHaveLength(0)
    })

    it('should skip unknown questions in results', () => {
      const session = createMockSession({ id: 'test-session' })
      saveSession(session)

      saveAttempt(
        createMockAttempt({
          id: 'a1',
          sessionId: 'test-session',
          questionId: 999, // Unknown
          isCorrect: false,
        })
      )

      const results = getSessionResults('test-session')
      expect(results?.incorrectQuestions).toHaveLength(0)
      expect(results?.domainBreakdown).toHaveLength(0)
    })
  })

  // ===== Review Operations =====
  describe('getReviewStats', () => {
    it('should return empty stats when no attempts exist', () => {
      const stats = getReviewStats()

      expect(stats).toEqual({
        totalToReview: 0,
        wrongCount: 0,
        timedOutCount: 0,
        questionIds: [],
      })
    })

    it('should count unique wrong questions', () => {
      // Same question answered wrong twice
      saveAttempt(createMockAttempt({ id: 'a1', questionId: 1, isCorrect: false }))
      saveAttempt(createMockAttempt({ id: 'a2', questionId: 1, isCorrect: false }))
      saveAttempt(createMockAttempt({ id: 'a3', questionId: 2, isCorrect: false }))

      const stats = getReviewStats()

      expect(stats.wrongCount).toBe(2) // Unique question IDs
      expect(stats.totalToReview).toBe(2)
    })

    it('should count unique timed out questions', () => {
      const attempt1 = createMockAttempt({
        id: 'a1',
        questionId: 1,
        isCorrect: false,
        timedOut: true,
      })
      const attempt2 = createMockAttempt({
        id: 'a2',
        questionId: 2,
        isCorrect: true,
        timedOut: true,
      })
      saveAttempt(attempt1)
      saveAttempt(attempt2)

      const stats = getReviewStats()

      expect(stats.timedOutCount).toBe(2)
    })

    it('should combine wrong and timed out in totalToReview', () => {
      // Wrong only
      const wrongAttempt = createMockAttempt({
        id: 'a1',
        questionId: 1,
        isCorrect: false,
        timedOut: false,
      })
      // Timed out only
      const timedOutAttempt = createMockAttempt({
        id: 'a2',
        questionId: 2,
        isCorrect: true,
        timedOut: true,
      })
      // Both wrong and timed out
      const bothAttempt = createMockAttempt({
        id: 'a3',
        questionId: 3,
        isCorrect: false,
        timedOut: true,
      })
      saveAttempt(wrongAttempt)
      saveAttempt(timedOutAttempt)
      saveAttempt(bothAttempt)

      const stats = getReviewStats()

      expect(stats.totalToReview).toBe(3)
      expect(stats.questionIds).toHaveLength(3)
      expect(stats.questionIds).toContain(1)
      expect(stats.questionIds).toContain(2)
      expect(stats.questionIds).toContain(3)
    })

    it('should not double-count question that is both wrong and timed out', () => {
      saveAttempt(createMockAttempt({ id: 'a1', questionId: 1, isCorrect: false, timedOut: true }))

      const stats = getReviewStats()

      expect(stats.totalToReview).toBe(1)
      expect(stats.wrongCount).toBe(1)
      expect(stats.timedOutCount).toBe(1)
    })
  })

  describe('getReviewableQuestions', () => {
    it('should return empty array when no reviewable questions', () => {
      saveAttempt(createMockAttempt({ isCorrect: true, timedOut: false }))

      const reviewable = getReviewableQuestions()
      expect(reviewable).toEqual([])
    })

    it('should return questions with wrong or timed out attempts', () => {
      saveAttempt(
        createMockAttempt({
          id: 'a1',
          questionId: 1,
          isCorrect: false,
          attemptedAt: '2024-01-01T10:00:00.000Z',
        })
      )
      saveAttempt(
        createMockAttempt({
          id: 'a2',
          questionId: 2,
          isCorrect: true,
          timedOut: true,
          attemptedAt: '2024-01-01T11:00:00.000Z',
        })
      )

      const reviewable = getReviewableQuestions()

      expect(reviewable).toHaveLength(2)
    })

    it('should accumulate wrongCount and timedOutCount', () => {
      saveAttempt(
        createMockAttempt({
          id: 'a1',
          questionId: 1,
          isCorrect: false,
          timedOut: false,
          attemptedAt: '2024-01-01T10:00:00.000Z',
        })
      )
      saveAttempt(
        createMockAttempt({
          id: 'a2',
          questionId: 1,
          isCorrect: false,
          timedOut: true,
          attemptedAt: '2024-01-01T11:00:00.000Z',
        })
      )

      const reviewable = getReviewableQuestions()

      expect(reviewable).toHaveLength(1)
      expect(reviewable[0]?.wrongCount).toBe(2)
      expect(reviewable[0]?.timedOutCount).toBe(1)
    })

    it('should sort by lastAttemptedAt (most recent first)', () => {
      saveAttempt(
        createMockAttempt({
          id: 'a1',
          questionId: 1,
          isCorrect: false,
          attemptedAt: '2024-01-01T10:00:00.000Z',
        })
      )
      saveAttempt(
        createMockAttempt({
          id: 'a2',
          questionId: 2,
          isCorrect: false,
          attemptedAt: '2024-01-02T10:00:00.000Z',
        })
      )

      const reviewable = getReviewableQuestions()

      expect(reviewable[0]?.questionId).toBe(2) // Most recent
      expect(reviewable[1]?.questionId).toBe(1)
    })

    it('should update lastAttemptedAt to most recent attempt', () => {
      saveAttempt(
        createMockAttempt({
          id: 'a1',
          questionId: 1,
          isCorrect: false,
          attemptedAt: '2024-01-01T10:00:00.000Z',
        })
      )
      saveAttempt(
        createMockAttempt({
          id: 'a2',
          questionId: 1,
          isCorrect: false,
          attemptedAt: '2024-01-02T10:00:00.000Z',
        })
      )

      const reviewable = getReviewableQuestions()

      expect(reviewable[0]?.lastAttemptedAt).toBe('2024-01-02T10:00:00.000Z')
    })
  })

  // ===== Reset Operations =====
  describe('resetAllData', () => {
    it('should clear all sessions and attempts', () => {
      saveSession(createMockSession())
      saveAttempt(createMockAttempt())

      expect(getSessions()).toHaveLength(1)
      expect(getAttempts()).toHaveLength(1)

      resetAllData()

      expect(getSessions()).toEqual([])
      expect(getAttempts()).toEqual([])
    })

    it('should not throw when data is already empty', () => {
      expect(() => {
        resetAllData()
      }).not.toThrow()
    })
  })

  // ===== Edge Cases =====
  describe('Edge Cases', () => {
    it('should handle malformed JSON in localStorage gracefully', () => {
      // Directly set malformed data
      localStorage.setItem('snowflake-quiz-sessions', 'not valid json')

      const sessions = getSessions()
      expect(sessions).toEqual([])
    })

    it('should handle empty string in localStorage', () => {
      localStorage.setItem('snowflake-quiz-sessions', '')

      const sessions = getSessions()
      expect(sessions).toEqual([])
    })

    it('should handle null in localStorage', () => {
      // getItem returns null for non-existent keys
      const sessions = getSessions()
      expect(sessions).toEqual([])
    })
  })
})
