/**
 * Static questions data loader
 * Loads questions from JSON at build time
 */

import { z } from 'zod'
import questions1 from '@/assets/questions/questions-1.json'
import questions2 from '@/assets/questions/questions-2.json'
import questions3 from '@/assets/questions/questions-3.json'
import questions4 from '@/assets/questions/questions-4.json'
import questions5 from '@/assets/questions/questions-5.json'
import type { QuestionWithAnswers, Difficulty, QuestionType } from '@/types'

// Merge all question files (each contains 100 questions)
const questionsData = [...questions1, ...questions2, ...questions3, ...questions4, ...questions5]
import { shuffleArray } from '@/lib/utils'

// Zod schema for runtime validation of question data
const AnswerSchema = z.object({
  id: z.number(),
  questionId: z.number().optional(), // Not present in JSON, added by TypeScript types
  answerText: z.string(),
  isCorrect: z.boolean(),
  sortOrder: z.number(),
})

const QuestionSchema = z.object({
  id: z.number(),
  questionText: z.string(),
  questionType: z.enum(['single', 'multi']),
  explanation: z.string().nullable(),
  elaboratedExplanation: z.string().nullable().optional(),
  domain: z.string().nullable(),
  topic: z.string().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable(),
  createdAt: z.string().optional(), // Not present in JSON
  updatedAt: z.string().optional(), // Not present in JSON
  answers: z.array(AnswerSchema),
})

const QuestionsArraySchema = z.array(QuestionSchema)

// Validate and parse questions data at build time
const allQuestions = QuestionsArraySchema.parse(questionsData) as QuestionWithAnswers[]

// Map for O(1) question lookups by ID
const questionMap = new Map(allQuestions.map((q) => [q.id, q]))

// ============================================================================
// Pre-computed Search Index
// ============================================================================

/**
 * Extended question type with pre-computed lowercase search text.
 * The _searchText field is a private optimization (underscore convention)
 * to avoid calling toLowerCase() on every search operation.
 */
interface IndexedQuestion extends QuestionWithAnswers {
  _searchText: string
}

// Pre-compute lowercase search text once at module load time
const indexedQuestions: IndexedQuestion[] = allQuestions.map((q) => ({
  ...q,
  _searchText: q.questionText.toLowerCase(),
}))

// ============================================================================
// Pre-computed Indexes (built once at module load time)
// ============================================================================

// Index: questions grouped by domain (using IndexedQuestion for search optimization)
const questionsByDomainIndex = new Map<string, IndexedQuestion[]>()
// Index: questions grouped by difficulty (using IndexedQuestion for search optimization)
const questionsByDifficultyIndex = new Map<string, IndexedQuestion[]>()
// Index: all unique topics
const allTopicsSet = new Set<string>()
// Index: topics grouped by domain
const topicsByDomainIndex = new Map<string, Set<string>>()

// Build all indexes in a single pass through the indexed questions
for (const q of indexedQuestions) {
  // Domain index
  if (q.domain !== null) {
    const existing = questionsByDomainIndex.get(q.domain) ?? []
    existing.push(q)
    questionsByDomainIndex.set(q.domain, existing)
  }

  // Difficulty index
  if (q.difficulty !== null) {
    const existing = questionsByDifficultyIndex.get(q.difficulty) ?? []
    existing.push(q)
    questionsByDifficultyIndex.set(q.difficulty, existing)
  }

  // Topics
  if (q.topic !== null && q.topic !== '') {
    allTopicsSet.add(q.topic)
    if (q.domain !== null) {
      const domainTopics = topicsByDomainIndex.get(q.domain) ?? new Set()
      domainTopics.add(q.topic)
      topicsByDomainIndex.set(q.domain, domainTopics)
    }
  }
}

// Pre-compute domain counts (sorted by domain) - O(1) access
const domainCountsCache: { domain: string; count: number }[] = Array.from(
  questionsByDomainIndex.entries()
)
  .map(([domain, questions]) => ({ domain, count: questions.length }))
  .sort((a, b) => a.domain.localeCompare(b.domain))

// Pre-compute sorted topics array - O(1) access
const allTopicsSortedCache: string[] = Array.from(allTopicsSet).sort()

// Pre-compute topics by domain map (with sorted arrays) - O(1) access per domain
const topicsByDomainCache = new Map<string, string[]>()
for (const [domain, topics] of topicsByDomainIndex) {
  topicsByDomainCache.set(domain, Array.from(topics).sort())
}

// ============================================================================
// Core Getters
// ============================================================================

/**
 * Get all questions
 */
export function getAllQuestions(): QuestionWithAnswers[] {
  return allQuestions
}

/**
 * Get a single question by ID
 */
export function getQuestionById(id: number): QuestionWithAnswers | undefined {
  return questionMap.get(id)
}

/**
 * Get total number of questions
 */
export function getTotalQuestions(): number {
  return allQuestions.length
}

// ============================================================================
// Filtering & Listing
// ============================================================================

/**
 * List questions with optional filtering
 * Optimized to use pre-computed indexes when filtering by domain or difficulty
 * Uses pre-computed _searchText for efficient text search
 */
export function listQuestions(filters?: {
  domain?: string
  difficulty?: Difficulty
  search?: string
  limit?: number
}): QuestionWithAnswers[] {
  // Start with the most selective index if available
  let result: IndexedQuestion[]

  const hasDomainFilter = filters?.domain !== undefined && filters.domain !== ''
  const hasDifficultyFilter = filters?.difficulty !== undefined

  if (hasDomainFilter && !hasDifficultyFilter && filters.domain !== undefined) {
    // Use domain index as starting point
    result = [...(questionsByDomainIndex.get(filters.domain) ?? [])]
  } else if (hasDifficultyFilter && !hasDomainFilter && filters.difficulty !== undefined) {
    // Use difficulty index as starting point
    result = [...(questionsByDifficultyIndex.get(filters.difficulty) ?? [])]
  } else {
    // No single index optimization, start with all questions
    result = [...indexedQuestions]
    if (hasDomainFilter) {
      result = result.filter((q) => q.domain === filters.domain)
    }
    if (hasDifficultyFilter) {
      result = result.filter((q) => q.difficulty === filters.difficulty)
    }
  }

  if (filters?.search !== undefined && filters.search !== '') {
    const searchLower = filters.search.toLowerCase()
    // Use pre-computed _searchText instead of calling toLowerCase() on each question
    result = result.filter((q) => q._searchText.includes(searchLower))
  }

  if (filters?.limit !== undefined) {
    result = result.slice(0, filters.limit)
  }

  return result
}

/**
 * Enhanced list with pagination and more filters
 * Optimized to use pre-computed indexes when filtering by domain or difficulty
 * Uses pre-computed _searchText for efficient text search
 */
export function listQuestionsEnhanced(filters: {
  domain?: string
  topic?: string
  difficulty?: Difficulty
  questionType?: QuestionType
  search?: string
  page?: number
  pageSize?: number
}): {
  items: QuestionWithAnswers[]
  allMatchingIds: number[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
} {
  const { domain, topic, difficulty, questionType, search, page = 1, pageSize = 25 } = filters

  const hasDomainFilter = domain !== undefined && domain !== ''
  const hasDifficultyFilter = difficulty !== undefined

  // Start with the most selective index if available
  let filtered: IndexedQuestion[]

  if (hasDomainFilter && !hasDifficultyFilter) {
    // Use domain index as starting point
    filtered = [...(questionsByDomainIndex.get(domain) ?? [])]
  } else if (hasDifficultyFilter && !hasDomainFilter) {
    // Use difficulty index as starting point
    filtered = [...(questionsByDifficultyIndex.get(difficulty) ?? [])]
  } else {
    // No single index optimization, start with all questions
    filtered = [...indexedQuestions]
    if (hasDomainFilter) {
      filtered = filtered.filter((q) => q.domain === domain)
    }
    if (hasDifficultyFilter) {
      filtered = filtered.filter((q) => q.difficulty === difficulty)
    }
  }

  // Apply remaining filters
  if (topic !== undefined && topic !== '') {
    filtered = filtered.filter((q) => q.topic === topic)
  }

  if (questionType !== undefined) {
    filtered = filtered.filter((q) => q.questionType === questionType)
  }

  if (search !== undefined && search !== '') {
    const searchLower = search.toLowerCase()
    // Use pre-computed _searchText instead of calling toLowerCase() on each question
    filtered = filtered.filter((q) => q._searchText.includes(searchLower))
  }

  const allMatchingIds = filtered.map((q) => q.id)
  const totalCount = filtered.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (page - 1) * pageSize
  const items = filtered.slice(startIndex, startIndex + pageSize)

  return {
    items,
    allMatchingIds,
    totalCount,
    page,
    pageSize,
    totalPages,
  }
}

// ============================================================================
// Ordered Selection (for Exam Mode)
// ============================================================================

/**
 * Get questions in order by their position in the array (1-indexed ranges)
 * Used for exam mode with question sets (1-100, 101-200, etc.)
 */
export function getQuestionsInRange(startIndex: number, endIndex: number): QuestionWithAnswers[] {
  // Convert from 1-indexed to 0-indexed
  const start = Math.max(0, startIndex - 1)
  const end = Math.min(allQuestions.length, endIndex)
  return allQuestions.slice(start, end)
}

/**
 * Get random questions from a specific range, optionally filtered by domains
 * Combines question set filtering with domain filtering for practice mode
 * @param startIndex - 1-indexed start of range (inclusive)
 * @param endIndex - 1-indexed end of range (inclusive)
 * @param questionCount - number of questions to return (0 = all matching)
 * @param domains - optional domain filter
 */
export function getRandomQuestionsInRange(
  startIndex: number,
  endIndex: number,
  questionCount: number,
  domains?: string[]
): QuestionWithAnswers[] {
  // Get questions in the specified range first
  const rangeQuestions = getQuestionsInRange(startIndex, endIndex)

  // Apply domain filter if provided
  let pool: QuestionWithAnswers[]
  if (domains !== undefined && domains.length > 0) {
    pool = rangeQuestions.filter((q) => q.domain !== null && domains.includes(q.domain))
  } else {
    pool = rangeQuestions
  }

  // If questionCount is 0, return all matching (shuffled)
  const count = questionCount === 0 ? pool.length : Math.min(questionCount, pool.length)

  if (count === 0) {
    return []
  }
  if (count === pool.length) {
    return shuffleArray([...pool])
  }

  // Partial Fisher-Yates for efficient random selection
  const result = [...pool]
  const n = pool.length
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (n - i))
    ;[result[i], result[j]] = [result[j], result[i]] as [QuestionWithAnswers, QuestionWithAnswers]
  }
  return result.slice(0, count)
}

// ============================================================================
// Random Selection
// ============================================================================

/**
 * Get random questions, optionally filtered by domains
 * Optimized to use pre-computed domain index when filtering
 * Uses partial Fisher-Yates shuffle for O(k) complexity instead of O(n)
 */
export function getRandomQuestions(
  questionCount: number,
  domains?: string[]
): QuestionWithAnswers[] {
  let pool: IndexedQuestion[]

  if (domains !== undefined && domains.length > 0) {
    // Use domain indexes to build the pool more efficiently
    const firstDomain = domains[0]
    if (domains.length === 1 && firstDomain !== undefined) {
      // Single domain - direct index lookup
      pool = questionsByDomainIndex.get(firstDomain) ?? []
    } else {
      // Multiple domains - combine from indexes
      pool = []
      for (const domain of domains) {
        const domainQuestions = questionsByDomainIndex.get(domain)
        if (domainQuestions) {
          pool.push(...domainQuestions)
        }
      }
    }
  } else {
    pool = indexedQuestions
  }

  const n = pool.length
  const k = Math.min(questionCount, n)

  if (k === 0) {
    return []
  }
  if (k === n) {
    return shuffleArray([...pool])
  }

  // Partial Fisher-Yates: only shuffle first k elements - O(k) instead of O(n)
  const result = [...pool]
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (n - i))
    ;[result[i], result[j]] = [result[j], result[i]] as [IndexedQuestion, IndexedQuestion]
  }
  return result.slice(0, k)
}

// ============================================================================
// Batch Retrieval
// ============================================================================

/**
 * Get questions by IDs (preserving order)
 */
export function getQuestionsByIds(ids: number[]): QuestionWithAnswers[] {
  return ids
    .map((id) => questionMap.get(id))
    .filter((q): q is QuestionWithAnswers => q !== undefined)
}

// ============================================================================
// Domain & Topic Statistics
// ============================================================================

/**
 * Get question counts grouped by domain
 * Questions with null domain are excluded from domain-based grouping
 * Uses pre-computed index for O(1) access
 */
export function getQuestionsByDomain(): { domain: string; count: number }[] {
  return domainCountsCache
}

/**
 * Get all unique topics from questions
 * Uses pre-computed index for O(1) access
 */
export function getAllTopics(): string[] {
  return allTopicsSortedCache
}

/**
 * Get topics grouped by domain
 * Uses pre-computed index for O(1) access
 */
export function getTopicsByDomain(): Map<string, string[]> {
  return topicsByDomainCache
}

/**
 * Get all questions for a specific domain
 * Uses pre-computed index for O(1) lookup
 */
export function getQuestionsForDomain(domain: string): QuestionWithAnswers[] {
  return questionsByDomainIndex.get(domain) ?? []
}

/**
 * Get all questions for a specific difficulty
 * Uses pre-computed index for O(1) lookup
 */
export function getQuestionsForDifficulty(difficulty: Difficulty): QuestionWithAnswers[] {
  return questionsByDifficultyIndex.get(difficulty) ?? []
}

/**
 * Get topics by domain as a plain object (alternative to Map version)
 * Uses pre-computed index for O(1) access
 */
export function getTopicsByDomainRecord(): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [domain, topics] of topicsByDomainCache) {
    result[domain] = topics
  }
  return result
}
