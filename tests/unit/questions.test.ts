import { describe, it, expect } from 'vitest'
import {
  getAllQuestions,
  getQuestionById,
  getTotalQuestions,
  listQuestions,
  listQuestionsEnhanced,
  getRandomQuestions,
  getQuestionsByIds,
  getQuestionsByDomain,
  getAllTopics,
  getTopicsByDomain,
} from '@/lib/data/questions'
import type { Difficulty, QuestionType } from '@/types'

describe('lib/data/questions', () => {
  // ============================================================================
  // getAllQuestions
  // ============================================================================
  describe('getAllQuestions', () => {
    it('should return an array of questions', () => {
      const questions = getAllQuestions()

      expect(Array.isArray(questions)).toBe(true)
      expect(questions.length).toBeGreaterThan(0)
    })

    it('should return questions with the correct structure', () => {
      const questions = getAllQuestions()
      const firstQuestion = questions[0]

      expect(firstQuestion).toBeDefined()
      expect(firstQuestion).toHaveProperty('id')
      expect(firstQuestion).toHaveProperty('questionText')
      expect(firstQuestion).toHaveProperty('questionType')
      expect(firstQuestion).toHaveProperty('answers')
      expect(firstQuestion).toHaveProperty('domain')
      expect(firstQuestion).toHaveProperty('topic')
      expect(firstQuestion).toHaveProperty('difficulty')
      expect(firstQuestion).toHaveProperty('explanation')
    })

    it('should return questions with valid answer arrays', () => {
      const questions = getAllQuestions()

      for (const question of questions.slice(0, 10)) {
        expect(Array.isArray(question.answers)).toBe(true)
        expect(question.answers.length).toBeGreaterThan(0)

        for (const answer of question.answers) {
          expect(answer).toHaveProperty('id')
          expect(answer).toHaveProperty('answerText')
          expect(answer).toHaveProperty('isCorrect')
          expect(answer).toHaveProperty('sortOrder')
        }
      }
    })

    it('should return questions with valid question types', () => {
      const questions = getAllQuestions()
      const validTypes: QuestionType[] = ['single', 'multi']

      for (const question of questions) {
        expect(validTypes).toContain(question.questionType)
      }
    })

    it('should return the same reference on multiple calls', () => {
      const questions1 = getAllQuestions()
      const questions2 = getAllQuestions()

      // The underlying array reference should be stable
      expect(questions1).toBe(questions2)
    })
  })

  // ============================================================================
  // getQuestionById
  // ============================================================================
  describe('getQuestionById', () => {
    it('should return a question when given a valid ID', () => {
      const allQuestions = getAllQuestions()
      const firstQuestionId = allQuestions[0]?.id

      expect(firstQuestionId).toBeDefined()
      if (firstQuestionId === undefined) {
        return
      }

      const question = getQuestionById(firstQuestionId)

      expect(question).toBeDefined()
      expect(question?.id).toBe(firstQuestionId)
    })

    it('should return undefined for non-existent ID', () => {
      const question = getQuestionById(-999)

      expect(question).toBeUndefined()
    })

    it('should return undefined for zero ID', () => {
      const question = getQuestionById(0)

      expect(question).toBeUndefined()
    })

    it('should return the correct question with all properties', () => {
      const allQuestions = getAllQuestions()
      const targetQuestion = allQuestions[5]

      if (targetQuestion === undefined) {
        return
      }

      const foundQuestion = getQuestionById(targetQuestion.id)

      expect(foundQuestion).toEqual(targetQuestion)
    })

    it('should return question with answers array', () => {
      const allQuestions = getAllQuestions()
      const questionId = allQuestions[0]?.id

      if (questionId === undefined) {
        return
      }

      const question = getQuestionById(questionId)

      expect(question).toBeDefined()
      expect(Array.isArray(question?.answers)).toBe(true)
      expect(question?.answers.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // getTotalQuestions
  // ============================================================================
  describe('getTotalQuestions', () => {
    it('should return the total number of questions', () => {
      const total = getTotalQuestions()
      const allQuestions = getAllQuestions()

      expect(total).toBe(allQuestions.length)
    })

    it('should return a positive number', () => {
      const total = getTotalQuestions()

      expect(total).toBeGreaterThan(0)
    })

    it('should return a consistent value', () => {
      const total1 = getTotalQuestions()
      const total2 = getTotalQuestions()

      expect(total1).toBe(total2)
    })
  })

  // ============================================================================
  // listQuestions
  // ============================================================================
  describe('listQuestions', () => {
    it('should return all questions when no filters provided', () => {
      const result = listQuestions()
      const allQuestions = getAllQuestions()

      expect(result.length).toBe(allQuestions.length)
    })

    it('should return all questions when empty filters object provided', () => {
      const result = listQuestions({})
      const allQuestions = getAllQuestions()

      expect(result.length).toBe(allQuestions.length)
    })

    describe('domain filter', () => {
      it('should filter by domain', () => {
        const result = listQuestions({ domain: '1' })

        expect(result.length).toBeGreaterThan(0)
        for (const question of result) {
          expect(question.domain).toBe('1')
        }
      })

      it('should return empty array for non-existent domain', () => {
        const result = listQuestions({ domain: '999' })

        expect(result).toEqual([])
      })

      it('should ignore empty domain string', () => {
        const result = listQuestions({ domain: '' })
        const allQuestions = getAllQuestions()

        expect(result.length).toBe(allQuestions.length)
      })
    })

    describe('difficulty filter', () => {
      it('should filter by easy difficulty', () => {
        const result = listQuestions({ difficulty: 'easy' })

        expect(result.length).toBeGreaterThan(0)
        for (const question of result) {
          expect(question.difficulty).toBe('easy')
        }
      })

      it('should filter by medium difficulty', () => {
        const result = listQuestions({ difficulty: 'medium' })

        expect(result.length).toBeGreaterThan(0)
        for (const question of result) {
          expect(question.difficulty).toBe('medium')
        }
      })

      it('should filter by hard difficulty', () => {
        const result = listQuestions({ difficulty: 'hard' })

        for (const question of result) {
          expect(question.difficulty).toBe('hard')
        }
      })
    })

    describe('search filter', () => {
      it('should filter by search term (case insensitive)', () => {
        const result = listQuestions({ search: 'snowflake' })

        expect(result.length).toBeGreaterThan(0)
        for (const question of result) {
          expect(question.questionText.toLowerCase()).toContain('snowflake')
        }
      })

      it('should return empty array when search term not found', () => {
        const result = listQuestions({ search: 'xyznonexistentterm123' })

        expect(result).toEqual([])
      })

      it('should ignore empty search string', () => {
        const result = listQuestions({ search: '' })
        const allQuestions = getAllQuestions()

        expect(result.length).toBe(allQuestions.length)
      })
    })

    describe('limit filter', () => {
      it('should limit the number of results', () => {
        const result = listQuestions({ limit: 5 })

        expect(result.length).toBe(5)
      })

      it('should return all questions if limit exceeds total', () => {
        const allQuestions = getAllQuestions()
        const result = listQuestions({ limit: allQuestions.length + 100 })

        expect(result.length).toBe(allQuestions.length)
      })

      it('should return empty array when limit is 0', () => {
        const result = listQuestions({ limit: 0 })

        expect(result).toEqual([])
      })
    })

    describe('combined filters', () => {
      it('should apply multiple filters together', () => {
        const result = listQuestions({
          domain: '2',
          difficulty: 'easy',
          limit: 10,
        })

        expect(result.length).toBeLessThanOrEqual(10)
        for (const question of result) {
          expect(question.domain).toBe('2')
          expect(question.difficulty).toBe('easy')
        }
      })

      it('should apply search with domain filter', () => {
        const result = listQuestions({
          domain: '1',
          search: 'data',
        })

        for (const question of result) {
          expect(question.domain).toBe('1')
          expect(question.questionText.toLowerCase()).toContain('data')
        }
      })
    })
  })

  // ============================================================================
  // listQuestionsEnhanced
  // ============================================================================
  describe('listQuestionsEnhanced', () => {
    it('should return paginated result structure', () => {
      const result = listQuestionsEnhanced({})

      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('totalCount')
      expect(result).toHaveProperty('page')
      expect(result).toHaveProperty('pageSize')
      expect(result).toHaveProperty('totalPages')
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should default to page 1 and pageSize 25', () => {
      const result = listQuestionsEnhanced({})

      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(25)
      expect(result.items.length).toBeLessThanOrEqual(25)
    })

    it('should calculate totalPages correctly', () => {
      const result = listQuestionsEnhanced({ pageSize: 10 })

      expect(result.totalPages).toBe(Math.ceil(result.totalCount / 10))
    })

    describe('pagination', () => {
      it('should return correct items for page 1', () => {
        const result = listQuestionsEnhanced({ page: 1, pageSize: 10 })

        expect(result.items.length).toBeLessThanOrEqual(10)
        expect(result.page).toBe(1)
      })

      it('should return correct items for page 2', () => {
        const page1 = listQuestionsEnhanced({ page: 1, pageSize: 10 })
        const page2 = listQuestionsEnhanced({ page: 2, pageSize: 10 })

        expect(page2.page).toBe(2)
        // First item of page 2 should not be in page 1
        const firstPage2Item = page2.items[0]
        if (firstPage2Item !== undefined && page1.items.length > 0) {
          const page1Ids = new Set(page1.items.map((q) => q.id))
          expect(page1Ids.has(firstPage2Item.id)).toBe(false)
        }
      })

      it('should return empty items for page beyond totalPages', () => {
        const result = listQuestionsEnhanced({ page: 9999, pageSize: 25 })

        expect(result.items).toEqual([])
        expect(result.page).toBe(9999)
      })
    })

    describe('filters', () => {
      it('should filter by domain', () => {
        const result = listQuestionsEnhanced({ domain: '3' })

        expect(result.totalCount).toBeGreaterThan(0)
        for (const question of result.items) {
          expect(question.domain).toBe('3')
        }
      })

      it('should filter by topic', () => {
        const allQuestions = getAllQuestions()
        const questionWithTopic = allQuestions.find((q) => q.topic !== null && q.topic !== '')

        if (questionWithTopic?.topic === undefined || questionWithTopic.topic === null) {
          return
        }

        const result = listQuestionsEnhanced({ topic: questionWithTopic.topic })

        expect(result.totalCount).toBeGreaterThan(0)
        for (const question of result.items) {
          expect(question.topic).toBe(questionWithTopic.topic)
        }
      })

      it('should filter by questionType single', () => {
        const result = listQuestionsEnhanced({ questionType: 'single' })

        expect(result.totalCount).toBeGreaterThan(0)
        for (const question of result.items) {
          expect(question.questionType).toBe('single')
        }
      })

      it('should filter by questionType multi', () => {
        const result = listQuestionsEnhanced({ questionType: 'multi' })

        for (const question of result.items) {
          expect(question.questionType).toBe('multi')
        }
      })

      it('should filter by difficulty', () => {
        const result = listQuestionsEnhanced({ difficulty: 'medium' })

        expect(result.totalCount).toBeGreaterThan(0)
        for (const question of result.items) {
          expect(question.difficulty).toBe('medium')
        }
      })

      it('should filter by search term', () => {
        const result = listQuestionsEnhanced({ search: 'warehouse' })

        expect(result.totalCount).toBeGreaterThan(0)
        for (const question of result.items) {
          expect(question.questionText.toLowerCase()).toContain('warehouse')
        }
      })

      it('should combine multiple filters', () => {
        const result = listQuestionsEnhanced({
          domain: '1',
          difficulty: 'easy',
          pageSize: 5,
        })

        expect(result.items.length).toBeLessThanOrEqual(5)
        for (const question of result.items) {
          expect(question.domain).toBe('1')
          expect(question.difficulty).toBe('easy')
        }
      })
    })

    describe('edge cases', () => {
      it('should handle empty domain string', () => {
        const result = listQuestionsEnhanced({ domain: '' })
        const allQuestions = getAllQuestions()

        expect(result.totalCount).toBe(allQuestions.length)
      })

      it('should handle empty topic string', () => {
        const result = listQuestionsEnhanced({ topic: '' })
        const allQuestions = getAllQuestions()

        expect(result.totalCount).toBe(allQuestions.length)
      })

      it('should handle empty search string', () => {
        const result = listQuestionsEnhanced({ search: '' })
        const allQuestions = getAllQuestions()

        expect(result.totalCount).toBe(allQuestions.length)
      })
    })
  })

  // ============================================================================
  // getRandomQuestions
  // ============================================================================
  describe('getRandomQuestions', () => {
    it('should return the requested number of questions', () => {
      const result = getRandomQuestions(10)

      expect(result.length).toBe(10)
    })

    it('should return all questions if count exceeds total', () => {
      const allQuestions = getAllQuestions()
      const result = getRandomQuestions(allQuestions.length + 100)

      expect(result.length).toBe(allQuestions.length)
    })

    it('should return empty array when count is 0', () => {
      const result = getRandomQuestions(0)

      expect(result).toEqual([])
    })

    it('should return unique questions (no duplicates)', () => {
      const result = getRandomQuestions(50)
      const ids = result.map((q) => q.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should return valid question objects', () => {
      const result = getRandomQuestions(5)

      for (const question of result) {
        expect(question).toHaveProperty('id')
        expect(question).toHaveProperty('questionText')
        expect(question).toHaveProperty('answers')
      }
    })

    describe('domain filtering', () => {
      it('should filter by single domain', () => {
        const result = getRandomQuestions(20, ['2'])

        expect(result.length).toBeGreaterThan(0)
        for (const question of result) {
          expect(question.domain).toBe('2')
        }
      })

      it('should filter by multiple domains', () => {
        const result = getRandomQuestions(30, ['1', '3'])

        expect(result.length).toBeGreaterThan(0)
        for (const question of result) {
          expect(['1', '3']).toContain(question.domain)
        }
      })

      it('should return empty array for non-existent domain', () => {
        const result = getRandomQuestions(10, ['999'])

        expect(result).toEqual([])
      })

      it('should return empty array for empty domains array', () => {
        const result = getRandomQuestions(10, [])

        // Empty array means no filtering, should return questions
        expect(result.length).toBe(10)
      })

      it('should ignore undefined domains parameter', () => {
        const result = getRandomQuestions(10, undefined)

        expect(result.length).toBe(10)
      })

      it('should limit to available questions in filtered domains', () => {
        // Get all domain 6 questions (smallest domain typically)
        const domain6Questions = getAllQuestions().filter((q) => q.domain === '6')
        const result = getRandomQuestions(domain6Questions.length + 100, ['6'])

        expect(result.length).toBe(domain6Questions.length)
      })
    })

    describe('randomness', () => {
      it('should return different order on multiple calls (statistical test)', () => {
        // Get multiple samples and check they're not all identical
        const samples: string[] = []
        for (let i = 0; i < 5; i++) {
          const result = getRandomQuestions(10)
          samples.push(result.map((q) => q.id).join(','))
        }

        const uniqueSamples = new Set(samples)
        // At least 2 of 5 samples should be different (very high probability)
        expect(uniqueSamples.size).toBeGreaterThan(1)
      })
    })
  })

  // ============================================================================
  // getQuestionsByIds
  // ============================================================================
  describe('getQuestionsByIds', () => {
    it('should return questions in the order of provided IDs', () => {
      const allQuestions = getAllQuestions()
      const ids = [
        allQuestions[5]?.id ?? 0,
        allQuestions[2]?.id ?? 0,
        allQuestions[8]?.id ?? 0,
      ].filter((id) => id !== 0)

      const result = getQuestionsByIds(ids)

      expect(result.length).toBe(ids.length)
      for (let i = 0; i < ids.length; i++) {
        expect(result[i]?.id).toBe(ids[i])
      }
    })

    it('should return empty array for empty IDs array', () => {
      const result = getQuestionsByIds([])

      expect(result).toEqual([])
    })

    it('should skip non-existent IDs', () => {
      const allQuestions = getAllQuestions()
      const validId = allQuestions[0]?.id ?? 0
      const ids = [validId, -999, -888]

      const result = getQuestionsByIds(ids)

      expect(result.length).toBe(1)
      expect(result[0]?.id).toBe(validId)
    })

    it('should return empty array when all IDs are invalid', () => {
      const result = getQuestionsByIds([-1, -2, -3])

      expect(result).toEqual([])
    })

    it('should handle duplicate IDs by returning duplicates', () => {
      const allQuestions = getAllQuestions()
      const firstId = allQuestions[0]?.id

      if (firstId === undefined) {
        return
      }

      const result = getQuestionsByIds([firstId, firstId, firstId])

      expect(result.length).toBe(3)
      expect(result[0]?.id).toBe(firstId)
      expect(result[1]?.id).toBe(firstId)
      expect(result[2]?.id).toBe(firstId)
    })

    it('should preserve order even with mixed valid/invalid IDs', () => {
      const allQuestions = getAllQuestions()
      const id1 = allQuestions[0]?.id ?? 0
      const id2 = allQuestions[3]?.id ?? 0

      const result = getQuestionsByIds([id1, -999, id2, -888])

      expect(result.length).toBe(2)
      expect(result[0]?.id).toBe(id1)
      expect(result[1]?.id).toBe(id2)
    })
  })

  // ============================================================================
  // getQuestionsByDomain
  // ============================================================================
  describe('getQuestionsByDomain', () => {
    it('should return an array of domain counts', () => {
      const result = getQuestionsByDomain()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should return objects with domain and count properties', () => {
      const result = getQuestionsByDomain()

      for (const item of result) {
        expect(item).toHaveProperty('domain')
        expect(item).toHaveProperty('count')
        expect(typeof item.domain).toBe('string')
        expect(typeof item.count).toBe('number')
      }
    })

    it('should return domains sorted alphabetically', () => {
      const result = getQuestionsByDomain()
      const domains = result.map((r) => r.domain)
      const sortedDomains = [...domains].sort((a, b) => a.localeCompare(b))

      expect(domains).toEqual(sortedDomains)
    })

    it('should have counts that sum to total questions (excluding null domains)', () => {
      const result = getQuestionsByDomain()
      const totalFromDomains = result.reduce((sum, item) => sum + item.count, 0)
      const allQuestions = getAllQuestions()
      const questionsWithDomains = allQuestions.filter((q) => q.domain !== null)

      expect(totalFromDomains).toBe(questionsWithDomains.length)
    })

    it('should exclude questions with null domain', () => {
      const result = getQuestionsByDomain()

      for (const item of result) {
        expect(item.domain).not.toBeNull()
      }
    })

    it('should have positive counts for each domain', () => {
      const result = getQuestionsByDomain()

      for (const item of result) {
        expect(item.count).toBeGreaterThan(0)
      }
    })
  })

  // ============================================================================
  // getAllTopics
  // ============================================================================
  describe('getAllTopics', () => {
    it('should return an array of strings', () => {
      const result = getAllTopics()

      expect(Array.isArray(result)).toBe(true)
      for (const topic of result) {
        expect(typeof topic).toBe('string')
      }
    })

    it('should return sorted topics', () => {
      const result = getAllTopics()
      const sortedResult = [...result].sort()

      expect(result).toEqual(sortedResult)
    })

    it('should not include empty strings', () => {
      const result = getAllTopics()

      for (const topic of result) {
        expect(topic).not.toBe('')
      }
    })

    it('should return unique topics (no duplicates)', () => {
      const result = getAllTopics()
      const uniqueTopics = new Set(result)

      expect(uniqueTopics.size).toBe(result.length)
    })

    it('should match topics found in questions', () => {
      const result = getAllTopics()
      const allQuestions = getAllQuestions()
      const topicsFromQuestions = new Set<string>()

      for (const question of allQuestions) {
        if (question.topic !== null && question.topic !== '') {
          topicsFromQuestions.add(question.topic)
        }
      }

      expect(new Set(result)).toEqual(topicsFromQuestions)
    })
  })

  // ============================================================================
  // getTopicsByDomain
  // ============================================================================
  describe('getTopicsByDomain', () => {
    it('should return a Map', () => {
      const result = getTopicsByDomain()

      expect(result instanceof Map).toBe(true)
    })

    it('should have domain strings as keys', () => {
      const result = getTopicsByDomain()

      for (const key of result.keys()) {
        expect(typeof key).toBe('string')
      }
    })

    it('should have sorted string arrays as values', () => {
      const result = getTopicsByDomain()

      for (const topics of result.values()) {
        expect(Array.isArray(topics)).toBe(true)
        const sortedTopics = [...topics].sort()
        expect(topics).toEqual(sortedTopics)
      }
    })

    it('should not include empty topic strings', () => {
      const result = getTopicsByDomain()

      for (const topics of result.values()) {
        for (const topic of topics) {
          expect(topic).not.toBe('')
        }
      }
    })

    it('should have unique topics within each domain', () => {
      const result = getTopicsByDomain()

      for (const topics of result.values()) {
        const uniqueTopics = new Set(topics)
        expect(uniqueTopics.size).toBe(topics.length)
      }
    })

    it('should only include domains that have topics', () => {
      const result = getTopicsByDomain()
      const allQuestions = getAllQuestions()

      // Build expected map from questions
      const expectedDomains = new Set<string>()
      for (const question of allQuestions) {
        if (question.domain !== null && question.topic !== null && question.topic !== '') {
          expectedDomains.add(question.domain)
        }
      }

      expect(new Set(result.keys())).toEqual(expectedDomains)
    })

    it('should correctly group topics by their domains', () => {
      const result = getTopicsByDomain()
      const allQuestions = getAllQuestions()

      // Verify each topic is correctly assigned to its domain
      for (const [domain, topics] of result) {
        for (const topic of topics) {
          // Find at least one question with this domain and topic
          const questionWithTopic = allQuestions.find(
            (q) => q.domain === domain && q.topic === topic
          )
          expect(questionWithTopic).toBeDefined()
        }
      }
    })
  })

  // ============================================================================
  // Data Integrity Tests
  // ============================================================================
  describe('data integrity', () => {
    it('all questions should have at least one correct answer', () => {
      const allQuestions = getAllQuestions()

      for (const question of allQuestions) {
        const correctAnswers = question.answers.filter((a) => a.isCorrect)
        expect(correctAnswers.length).toBeGreaterThan(0)
      }
    })

    it('single-select questions should have exactly one correct answer', () => {
      const allQuestions = getAllQuestions()
      const singleQuestions = allQuestions.filter((q) => q.questionType === 'single')

      for (const question of singleQuestions) {
        const correctAnswers = question.answers.filter((a) => a.isCorrect)
        expect(correctAnswers.length).toBe(1)
      }
    })

    it('multi-select questions should have at least two correct answers', () => {
      const allQuestions = getAllQuestions()
      const multiQuestions = allQuestions.filter((q) => q.questionType === 'multi')

      for (const question of multiQuestions) {
        const correctAnswers = question.answers.filter((a) => a.isCorrect)
        expect(correctAnswers.length).toBeGreaterThanOrEqual(2)
      }
    })

    it('all questions should have unique IDs', () => {
      const allQuestions = getAllQuestions()
      const ids = allQuestions.map((q) => q.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(ids.length)
    })

    it('all answers should have unique IDs within a question', () => {
      const allQuestions = getAllQuestions()

      for (const question of allQuestions) {
        const answerIds = question.answers.map((a) => a.id)
        const uniqueAnswerIds = new Set(answerIds)
        expect(uniqueAnswerIds.size).toBe(answerIds.length)
      }
    })

    it('all questions should have at least 2 answers', () => {
      const allQuestions = getAllQuestions()

      for (const question of allQuestions) {
        expect(question.answers.length).toBeGreaterThanOrEqual(2)
      }
    })

    it('all domains should be valid (1-6 or null)', () => {
      const allQuestions = getAllQuestions()
      const validDomains = ['1', '2', '3', '4', '5', '6', null]

      for (const question of allQuestions) {
        expect(validDomains).toContain(question.domain)
      }
    })

    it('all difficulties should be valid or null', () => {
      const allQuestions = getAllQuestions()
      const validDifficulties: (Difficulty | null)[] = ['easy', 'medium', 'hard', null]

      for (const question of allQuestions) {
        expect(validDifficulties).toContain(question.difficulty)
      }
    })
  })
})
