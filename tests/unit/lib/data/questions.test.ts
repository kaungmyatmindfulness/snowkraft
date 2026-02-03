/**
 * Unit tests for lib/data/questions.ts
 *
 * Tests the static question data loader functions.
 */

import { describe, it, expect, vi } from 'vitest'

// Mock all question data files (questions are split across 7 files in production)
// Put all mock data in questions-1.json, others return empty arrays
// NOTE: vi.mock calls are hoisted, so we must inline the data
vi.mock('@/assets/questions/questions-1.json', () => ({
  default: [
    {
      id: 1,
      questionText: 'What is Snowflake?',
      questionType: 'single',
      explanation: 'Snowflake is a cloud data platform.',
      domain: '1',
      topic: 'Architecture',
      difficulty: 'easy',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      answers: [
        {
          id: 101,
          questionId: 1,
          answerText: 'A cloud data platform',
          isCorrect: true,
          sortOrder: 0,
        },
        { id: 102, questionId: 1, answerText: 'A database tool', isCorrect: false, sortOrder: 1 },
      ],
    },
    {
      id: 2,
      questionText: 'What is a virtual warehouse in Snowflake?',
      questionType: 'single',
      explanation: 'Virtual warehouses provide compute resources.',
      domain: '1',
      topic: 'Warehouses',
      difficulty: 'medium',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      answers: [
        { id: 201, questionId: 2, answerText: 'A compute cluster', isCorrect: true, sortOrder: 0 },
        { id: 202, questionId: 2, answerText: 'A storage unit', isCorrect: false, sortOrder: 1 },
      ],
    },
    {
      id: 3,
      questionText: 'How do you grant access to a role?',
      questionType: 'multi',
      explanation: 'Use GRANT command to assign privileges.',
      domain: '2',
      topic: 'Security',
      difficulty: 'medium',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      answers: [
        {
          id: 301,
          questionId: 3,
          answerText: 'GRANT privilege TO ROLE',
          isCorrect: true,
          sortOrder: 0,
        },
        { id: 302, questionId: 3, answerText: 'Use RBAC model', isCorrect: true, sortOrder: 1 },
        { id: 303, questionId: 3, answerText: 'Email admin', isCorrect: false, sortOrder: 2 },
      ],
    },
    {
      id: 4,
      questionText: 'What is clustering in Snowflake?',
      questionType: 'single',
      explanation: 'Clustering organizes data for efficient queries.',
      domain: '3',
      topic: 'Performance',
      difficulty: 'hard',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      answers: [
        {
          id: 401,
          questionId: 4,
          answerText: 'Data organization technique',
          isCorrect: true,
          sortOrder: 0,
        },
        {
          id: 402,
          questionId: 4,
          answerText: 'A type of warehouse',
          isCorrect: false,
          sortOrder: 1,
        },
      ],
    },
    {
      id: 5,
      questionText: 'How do you load data into Snowflake?',
      questionType: 'single',
      explanation: 'Use COPY INTO command for data loading.',
      domain: '4',
      topic: 'Data Loading',
      difficulty: 'easy',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      answers: [
        { id: 501, questionId: 5, answerText: 'COPY INTO command', isCorrect: true, sortOrder: 0 },
        {
          id: 502,
          questionId: 5,
          answerText: 'INSERT command only',
          isCorrect: false,
          sortOrder: 1,
        },
      ],
    },
    {
      id: 6,
      questionText: 'What transformations are available in Snowflake?',
      questionType: 'multi',
      explanation: 'Snowflake supports various transformation methods.',
      domain: '5',
      topic: 'Transformations',
      difficulty: 'medium',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      answers: [
        { id: 601, questionId: 6, answerText: 'SQL transforms', isCorrect: true, sortOrder: 0 },
        { id: 602, questionId: 6, answerText: 'Stored procedures', isCorrect: true, sortOrder: 1 },
        { id: 603, questionId: 6, answerText: 'Manual edits', isCorrect: false, sortOrder: 2 },
      ],
    },
    {
      id: 7,
      questionText: 'How do you share data in Snowflake?',
      questionType: 'single',
      explanation: 'Data sharing enables secure data exchange.',
      domain: '6',
      topic: 'Data Sharing',
      difficulty: 'hard',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      answers: [
        {
          id: 701,
          questionId: 7,
          answerText: 'Create a share object',
          isCorrect: true,
          sortOrder: 0,
        },
        { id: 702, questionId: 7, answerText: 'Export to CSV', isCorrect: false, sortOrder: 1 },
      ],
    },
    {
      id: 8,
      questionText: 'Practice test question without domain',
      questionType: 'single',
      explanation: 'This is a practice question.',
      domain: null,
      topic: null,
      difficulty: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      answers: [
        { id: 801, questionId: 8, answerText: 'Answer A', isCorrect: true, sortOrder: 0 },
        { id: 802, questionId: 8, answerText: 'Answer B', isCorrect: false, sortOrder: 1 },
      ],
    },
    {
      id: 9,
      questionText: 'Another architecture question about Snowflake storage',
      questionType: 'single',
      explanation: 'Snowflake uses columnar storage.',
      domain: '1',
      topic: 'Architecture',
      difficulty: 'easy',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      answers: [
        { id: 901, questionId: 9, answerText: 'Columnar storage', isCorrect: true, sortOrder: 0 },
        { id: 902, questionId: 9, answerText: 'Row-based storage', isCorrect: false, sortOrder: 1 },
      ],
    },
    {
      id: 10,
      questionText: 'Warehouse sizing question',
      questionType: 'single',
      explanation: 'Choose warehouse size based on workload.',
      domain: '1',
      topic: 'Warehouses',
      difficulty: 'medium',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      answers: [
        { id: 1001, questionId: 10, answerText: 'XS to 6XL', isCorrect: true, sortOrder: 0 },
        { id: 1002, questionId: 10, answerText: 'Only small', isCorrect: false, sortOrder: 1 },
      ],
    },
  ],
}))
vi.mock('@/assets/questions/questions-2.json', () => ({ default: [] }))
vi.mock('@/assets/questions/questions-3.json', () => ({ default: [] }))
vi.mock('@/assets/questions/questions-4.json', () => ({ default: [] }))
vi.mock('@/assets/questions/questions-5.json', () => ({ default: [] }))

// Import functions after mocking
import {
  getAllQuestions,
  getQuestionById,
  listQuestions,
  getTotalQuestions,
  getQuestionsByDomain,
  getRandomQuestions,
  getQuestionsByIds,
  getAllTopics,
  getTopicsByDomain,
  listQuestionsEnhanced,
} from '@/lib/data/questions'

describe('lib/data/questions', () => {
  describe('getAllQuestions', () => {
    it('should return all questions', () => {
      const questions = getAllQuestions()
      expect(questions).toHaveLength(10)
      expect(questions[0]?.id).toBe(1)
    })

    it('should return questions with correct structure', () => {
      const questions = getAllQuestions()
      const firstQuestion = questions[0]

      expect(firstQuestion).toHaveProperty('id')
      expect(firstQuestion).toHaveProperty('questionText')
      expect(firstQuestion).toHaveProperty('questionType')
      expect(firstQuestion).toHaveProperty('explanation')
      expect(firstQuestion).toHaveProperty('domain')
      expect(firstQuestion).toHaveProperty('topic')
      expect(firstQuestion).toHaveProperty('difficulty')
      expect(firstQuestion).toHaveProperty('answers')
    })

    it('should return answers with correct structure', () => {
      const questions = getAllQuestions()
      const firstAnswer = questions[0]?.answers[0]

      expect(firstAnswer).toHaveProperty('id')
      expect(firstAnswer).toHaveProperty('questionId')
      expect(firstAnswer).toHaveProperty('answerText')
      expect(firstAnswer).toHaveProperty('isCorrect')
      expect(firstAnswer).toHaveProperty('sortOrder')
    })
  })

  describe('getQuestionById', () => {
    it('should return a question by ID', () => {
      const question = getQuestionById(1)
      expect(question).toBeDefined()
      expect(question?.id).toBe(1)
      expect(question?.questionText).toBe('What is Snowflake?')
    })

    it('should return undefined for non-existent ID', () => {
      const question = getQuestionById(999)
      expect(question).toBeUndefined()
    })

    it('should return undefined for negative ID', () => {
      const question = getQuestionById(-1)
      expect(question).toBeUndefined()
    })

    it('should return undefined for zero ID', () => {
      const question = getQuestionById(0)
      expect(question).toBeUndefined()
    })

    it('should return question with null domain', () => {
      const question = getQuestionById(8)
      expect(question).toBeDefined()
      expect(question?.domain).toBeNull()
      expect(question?.topic).toBeNull()
      expect(question?.difficulty).toBeNull()
    })
  })

  describe('listQuestions', () => {
    it('should return all questions when no filters provided', () => {
      const questions = listQuestions()
      expect(questions).toHaveLength(10)
    })

    it('should return all questions when filters is undefined', () => {
      const questions = listQuestions(undefined)
      expect(questions).toHaveLength(10)
    })

    it('should return all questions when filters is empty object', () => {
      const questions = listQuestions({})
      expect(questions).toHaveLength(10)
    })

    describe('domain filter', () => {
      it('should filter by domain', () => {
        const questions = listQuestions({ domain: '1' })
        expect(questions).toHaveLength(4) // IDs: 1, 2, 9, 10
        expect(questions.every((q) => q.domain === '1')).toBe(true)
      })

      it('should return empty array for non-existent domain', () => {
        const questions = listQuestions({ domain: '99' })
        expect(questions).toHaveLength(0)
      })

      it('should ignore empty string domain', () => {
        const questions = listQuestions({ domain: '' })
        expect(questions).toHaveLength(10)
      })
    })

    describe('difficulty filter', () => {
      it('should filter by easy difficulty', () => {
        const questions = listQuestions({ difficulty: 'easy' })
        expect(questions).toHaveLength(3) // IDs: 1, 5, 9
        expect(questions.every((q) => q.difficulty === 'easy')).toBe(true)
      })

      it('should filter by medium difficulty', () => {
        const questions = listQuestions({ difficulty: 'medium' })
        expect(questions).toHaveLength(4) // IDs: 2, 3, 6, 10
        expect(questions.every((q) => q.difficulty === 'medium')).toBe(true)
      })

      it('should filter by hard difficulty', () => {
        const questions = listQuestions({ difficulty: 'hard' })
        expect(questions).toHaveLength(2) // IDs: 4, 7
        expect(questions.every((q) => q.difficulty === 'hard')).toBe(true)
      })
    })

    describe('search filter', () => {
      it('should search by question text (case insensitive)', () => {
        const questions = listQuestions({ search: 'snowflake' })
        expect(questions.length).toBeGreaterThan(0)
        expect(questions.every((q) => q.questionText.toLowerCase().includes('snowflake'))).toBe(
          true
        )
      })

      it('should search with uppercase', () => {
        const questions = listQuestions({ search: 'SNOWFLAKE' })
        expect(questions.length).toBeGreaterThan(0)
      })

      it('should return empty array for no match', () => {
        const questions = listQuestions({ search: 'xyznonexistent' })
        expect(questions).toHaveLength(0)
      })

      it('should ignore empty search string', () => {
        const questions = listQuestions({ search: '' })
        expect(questions).toHaveLength(10)
      })

      it('should search partial words', () => {
        const questions = listQuestions({ search: 'warehouse' })
        expect(questions.length).toBeGreaterThan(0)
      })
    })

    describe('limit filter', () => {
      it('should limit results', () => {
        const questions = listQuestions({ limit: 3 })
        expect(questions).toHaveLength(3)
      })

      it('should return all if limit is greater than total', () => {
        const questions = listQuestions({ limit: 100 })
        expect(questions).toHaveLength(10)
      })

      it('should return empty array if limit is 0', () => {
        const questions = listQuestions({ limit: 0 })
        expect(questions).toHaveLength(0)
      })
    })

    describe('combined filters', () => {
      it('should combine domain and difficulty', () => {
        const questions = listQuestions({ domain: '1', difficulty: 'easy' })
        expect(questions).toHaveLength(2) // IDs: 1, 9
        expect(questions.every((q) => q.domain === '1' && q.difficulty === 'easy')).toBe(true)
      })

      it('should combine domain, difficulty, and limit', () => {
        const questions = listQuestions({ domain: '1', difficulty: 'easy', limit: 1 })
        expect(questions).toHaveLength(1)
      })

      it('should combine search with domain', () => {
        const questions = listQuestions({ domain: '1', search: 'warehouse' })
        expect(questions.length).toBeGreaterThan(0)
        expect(
          questions.every(
            (q) => q.domain === '1' && q.questionText.toLowerCase().includes('warehouse')
          )
        ).toBe(true)
      })

      it('should return empty when combined filters match nothing', () => {
        const questions = listQuestions({ domain: '1', difficulty: 'hard' })
        expect(questions).toHaveLength(0)
      })
    })
  })

  describe('getTotalQuestions', () => {
    it('should return total count of questions', () => {
      const total = getTotalQuestions()
      expect(total).toBe(10)
    })
  })

  describe('getQuestionsByDomain', () => {
    it('should return domain counts', () => {
      const domainCounts = getQuestionsByDomain()
      expect(domainCounts).toBeInstanceOf(Array)
    })

    it('should return correct count per domain', () => {
      const domainCounts = getQuestionsByDomain()

      // Domain 1 has 4 questions (IDs: 1, 2, 9, 10)
      const domain1 = domainCounts.find((d) => d.domain === '1')
      expect(domain1?.count).toBe(4)

      // Domain 2 has 1 question (ID: 3)
      const domain2 = domainCounts.find((d) => d.domain === '2')
      expect(domain2?.count).toBe(1)

      // Domain 3 has 1 question (ID: 4)
      const domain3 = domainCounts.find((d) => d.domain === '3')
      expect(domain3?.count).toBe(1)
    })

    it('should sort domains alphabetically', () => {
      const domainCounts = getQuestionsByDomain()
      const domains = domainCounts.map((d) => d.domain)

      for (let i = 1; i < domains.length; i++) {
        const prev = domains[i - 1]
        const curr = domains[i]
        if (prev !== undefined && curr !== undefined) {
          expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0)
        }
      }
    })

    it('should exclude questions with null domain', () => {
      const domainCounts = getQuestionsByDomain()
      // Total with domains should be 9 (question 8 has null domain)
      const totalCounted = domainCounts.reduce((sum, d) => sum + d.count, 0)
      expect(totalCounted).toBe(9)
    })
  })

  describe('getRandomQuestions', () => {
    it('should return requested number of questions', () => {
      const questions = getRandomQuestions(5)
      expect(questions).toHaveLength(5)
    })

    it('should return all questions if count exceeds total', () => {
      const questions = getRandomQuestions(100)
      expect(questions).toHaveLength(10)
    })

    it('should return empty array for count of 0', () => {
      const questions = getRandomQuestions(0)
      expect(questions).toHaveLength(0)
    })

    it('should return valid question objects', () => {
      const questions = getRandomQuestions(3)
      for (const q of questions) {
        expect(q).toHaveProperty('id')
        expect(q).toHaveProperty('questionText')
        expect(q).toHaveProperty('answers')
      }
    })

    it('should return unique questions', () => {
      const questions = getRandomQuestions(5)
      const ids = questions.map((q) => q.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    describe('domain filtering', () => {
      it('should filter by single domain', () => {
        const questions = getRandomQuestions(10, ['1'])
        expect(questions).toHaveLength(4) // Only 4 questions in domain 1
        expect(questions.every((q) => q.domain === '1')).toBe(true)
      })

      it('should filter by multiple domains', () => {
        const questions = getRandomQuestions(10, ['1', '2'])
        expect(questions).toHaveLength(5) // 4 in domain 1 + 1 in domain 2
        expect(questions.every((q) => q.domain === '1' || q.domain === '2')).toBe(true)
      })

      it('should return empty array for non-existent domain', () => {
        const questions = getRandomQuestions(10, ['99'])
        expect(questions).toHaveLength(0)
      })

      it('should return limited count even with domain filter', () => {
        const questions = getRandomQuestions(2, ['1'])
        expect(questions).toHaveLength(2)
        expect(questions.every((q) => q.domain === '1')).toBe(true)
      })

      it('should exclude questions with null domain when filtering', () => {
        const questions = getRandomQuestions(10, ['1', '2', '3', '4', '5', '6'])
        // Should not include question 8 which has null domain
        expect(questions.every((q) => q.domain !== null)).toBe(true)
      })

      it('should ignore empty domains array', () => {
        const questions = getRandomQuestions(10, [])
        expect(questions).toHaveLength(10)
      })
    })
  })

  describe('getQuestionsByIds', () => {
    it('should return questions for given IDs', () => {
      const questions = getQuestionsByIds([1, 2, 3])
      expect(questions).toHaveLength(3)
    })

    it('should preserve order of IDs', () => {
      const questions = getQuestionsByIds([3, 1, 2])
      expect(questions[0]?.id).toBe(3)
      expect(questions[1]?.id).toBe(1)
      expect(questions[2]?.id).toBe(2)
    })

    it('should skip non-existent IDs', () => {
      const questions = getQuestionsByIds([1, 999, 2])
      expect(questions).toHaveLength(2)
      expect(questions[0]?.id).toBe(1)
      expect(questions[1]?.id).toBe(2)
    })

    it('should return empty array for empty IDs', () => {
      const questions = getQuestionsByIds([])
      expect(questions).toHaveLength(0)
    })

    it('should return empty array for all invalid IDs', () => {
      const questions = getQuestionsByIds([999, 888, 777])
      expect(questions).toHaveLength(0)
    })

    it('should handle duplicate IDs', () => {
      const questions = getQuestionsByIds([1, 1, 2])
      expect(questions).toHaveLength(3)
      expect(questions[0]?.id).toBe(1)
      expect(questions[1]?.id).toBe(1)
      expect(questions[2]?.id).toBe(2)
    })
  })

  describe('getAllTopics', () => {
    it('should return array of unique topics', () => {
      const topics = getAllTopics()
      expect(topics).toBeInstanceOf(Array)
      const uniqueTopics = new Set(topics)
      expect(uniqueTopics.size).toBe(topics.length)
    })

    it('should exclude empty topics', () => {
      const topics = getAllTopics()
      // The function returns string[], so null is already excluded by type
      expect(topics.every((t) => t !== '')).toBe(true)
      expect(topics.length).toBeGreaterThan(0)
    })

    it('should be sorted alphabetically', () => {
      const topics = getAllTopics()
      for (let i = 1; i < topics.length; i++) {
        const prev = topics[i - 1]
        const curr = topics[i]
        if (prev !== undefined && curr !== undefined) {
          expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0)
        }
      }
    })

    it('should include expected topics', () => {
      const topics = getAllTopics()
      expect(topics).toContain('Architecture')
      expect(topics).toContain('Security')
      expect(topics).toContain('Performance')
    })
  })

  describe('getTopicsByDomain', () => {
    it('should return a Map', () => {
      const topicsByDomain = getTopicsByDomain()
      expect(topicsByDomain).toBeInstanceOf(Map)
    })

    it('should group topics by domain', () => {
      const topicsByDomain = getTopicsByDomain()
      const domain1Topics = topicsByDomain.get('1')

      expect(domain1Topics).toBeDefined()
      expect(domain1Topics).toContain('Architecture')
      expect(domain1Topics).toContain('Warehouses')
    })

    it('should return sorted topics per domain', () => {
      const topicsByDomain = getTopicsByDomain()
      const domain1Topics = topicsByDomain.get('1')

      if (domain1Topics) {
        for (let i = 1; i < domain1Topics.length; i++) {
          const prev = domain1Topics[i - 1]
          const curr = domain1Topics[i]
          if (prev !== undefined && curr !== undefined) {
            expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0)
          }
        }
      }
    })

    it('should exclude domains with null', () => {
      const topicsByDomain = getTopicsByDomain()
      // Question 8 has null domain, so no null key should exist
      expect(topicsByDomain.has('null')).toBe(false)
    })

    it('should have unique topics per domain', () => {
      const topicsByDomain = getTopicsByDomain()

      for (const [, topics] of topicsByDomain) {
        const uniqueTopics = new Set(topics)
        expect(uniqueTopics.size).toBe(topics.length)
      }
    })
  })

  describe('listQuestionsEnhanced', () => {
    describe('basic functionality', () => {
      it('should return paginated result structure', () => {
        const result = listQuestionsEnhanced({})

        expect(result).toHaveProperty('items')
        expect(result).toHaveProperty('totalCount')
        expect(result).toHaveProperty('page')
        expect(result).toHaveProperty('pageSize')
        expect(result).toHaveProperty('totalPages')
      })

      it('should use default page and pageSize', () => {
        const result = listQuestionsEnhanced({})

        expect(result.page).toBe(1)
        expect(result.pageSize).toBe(25)
      })

      it('should return all items when total is less than pageSize', () => {
        const result = listQuestionsEnhanced({})

        expect(result.items).toHaveLength(10)
        expect(result.totalCount).toBe(10)
        expect(result.totalPages).toBe(1)
      })
    })

    describe('pagination', () => {
      it('should respect custom page size', () => {
        const result = listQuestionsEnhanced({ pageSize: 3 })

        expect(result.items).toHaveLength(3)
        expect(result.totalCount).toBe(10)
        expect(result.totalPages).toBe(4) // ceil(10/3) = 4
      })

      it('should return correct items for page 2', () => {
        const result = listQuestionsEnhanced({ page: 2, pageSize: 3 })

        expect(result.items).toHaveLength(3)
        expect(result.page).toBe(2)
        // Should skip first 3 items
        expect(result.items[0]?.id).toBe(4)
      })

      it('should return remaining items on last page', () => {
        const result = listQuestionsEnhanced({ page: 4, pageSize: 3 })

        expect(result.items).toHaveLength(1) // 10 - (3*3) = 1
        expect(result.items[0]?.id).toBe(10)
      })

      it('should return empty items for page beyond total', () => {
        const result = listQuestionsEnhanced({ page: 10, pageSize: 3 })

        expect(result.items).toHaveLength(0)
        expect(result.totalCount).toBe(10)
      })
    })

    describe('domain filter', () => {
      it('should filter by domain', () => {
        const result = listQuestionsEnhanced({ domain: '1' })

        expect(result.totalCount).toBe(4)
        expect(result.items.every((q) => q.domain === '1')).toBe(true)
      })

      it('should ignore empty domain string', () => {
        const result = listQuestionsEnhanced({ domain: '' })

        expect(result.totalCount).toBe(10)
      })
    })

    describe('topic filter', () => {
      it('should filter by topic', () => {
        const result = listQuestionsEnhanced({ topic: 'Architecture' })

        expect(result.totalCount).toBe(2) // IDs: 1, 9
        expect(result.items.every((q) => q.topic === 'Architecture')).toBe(true)
      })

      it('should ignore empty topic string', () => {
        const result = listQuestionsEnhanced({ topic: '' })

        expect(result.totalCount).toBe(10)
      })

      it('should return empty for non-existent topic', () => {
        const result = listQuestionsEnhanced({ topic: 'NonExistent' })

        expect(result.totalCount).toBe(0)
        expect(result.items).toHaveLength(0)
      })
    })

    describe('difficulty filter', () => {
      it('should filter by difficulty', () => {
        const result = listQuestionsEnhanced({ difficulty: 'easy' })

        expect(result.totalCount).toBe(3)
        expect(result.items.every((q) => q.difficulty === 'easy')).toBe(true)
      })
    })

    describe('questionType filter', () => {
      it('should filter by single question type', () => {
        const result = listQuestionsEnhanced({ questionType: 'single' })

        expect(result.items.every((q) => q.questionType === 'single')).toBe(true)
      })

      it('should filter by multi question type', () => {
        const result = listQuestionsEnhanced({ questionType: 'multi' })

        expect(result.totalCount).toBe(2) // IDs: 3, 6
        expect(result.items.every((q) => q.questionType === 'multi')).toBe(true)
      })
    })

    describe('search filter', () => {
      it('should search question text case insensitively', () => {
        const result = listQuestionsEnhanced({ search: 'snowflake' })

        expect(result.totalCount).toBeGreaterThan(0)
        expect(result.items.every((q) => q.questionText.toLowerCase().includes('snowflake'))).toBe(
          true
        )
      })

      it('should ignore empty search string', () => {
        const result = listQuestionsEnhanced({ search: '' })

        expect(result.totalCount).toBe(10)
      })
    })

    describe('combined filters', () => {
      it('should combine domain and topic filters', () => {
        const result = listQuestionsEnhanced({ domain: '1', topic: 'Architecture' })

        expect(result.totalCount).toBe(2)
        expect(result.items.every((q) => q.domain === '1' && q.topic === 'Architecture')).toBe(true)
      })

      it('should combine all filters', () => {
        const result = listQuestionsEnhanced({
          domain: '1',
          topic: 'Architecture',
          difficulty: 'easy',
          questionType: 'single',
          search: 'What is Snowflake',
        })

        // Only question 1 matches all criteria (exact match on "What is Snowflake")
        expect(result.totalCount).toBe(1)
        expect(result.items[0]?.id).toBe(1)
      })

      it('should paginate filtered results', () => {
        const result = listQuestionsEnhanced({
          domain: '1',
          pageSize: 2,
          page: 2,
        })

        expect(result.totalCount).toBe(4)
        expect(result.items).toHaveLength(2)
        expect(result.totalPages).toBe(2)
      })

      it('should return empty when no questions match', () => {
        const result = listQuestionsEnhanced({
          domain: '1',
          difficulty: 'hard',
        })

        expect(result.totalCount).toBe(0)
        expect(result.items).toHaveLength(0)
        expect(result.totalPages).toBe(0)
      })
    })

    describe('edge cases', () => {
      it('should return empty array for page 0', () => {
        const result = listQuestionsEnhanced({ page: 0, pageSize: 3 })

        // page 0 produces startIndex = -3, slice(-3, 0) returns empty array
        expect(result.items).toHaveLength(0)
      })

      it('should handle negative page values', () => {
        const result = listQuestionsEnhanced({ page: -1, pageSize: 3 })

        // Negative page will produce items starting from a negative index
        expect(result.items).toBeDefined()
      })

      it('should calculate totalPages correctly', () => {
        const result = listQuestionsEnhanced({ pageSize: 4 })

        expect(result.totalPages).toBe(3) // ceil(10/4) = 3
      })
    })
  })
})
