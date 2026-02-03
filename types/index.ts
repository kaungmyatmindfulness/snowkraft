// Exam domains for SnowPro Core COF-C02
export const DOMAINS = {
  1: 'Snowflake AI Data Cloud Features & Architecture',
  2: 'Account Access & Security',
  3: 'Performance Concepts',
  4: 'Data Loading & Unloading',
  5: 'Data Transformations',
  6: 'Data Protection & Sharing',
} as const

export type DomainId = keyof typeof DOMAINS
export type DomainName = (typeof DOMAINS)[DomainId]

export type QuestionType = 'single' | 'multi'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type SessionType = 'practice' | 'exam' | 'review'

export interface Question {
  id: number
  questionText: string
  questionType: QuestionType
  explanation: string | null
  elaboratedExplanation?: string | null // Markdown-formatted detailed explanation
  domain: `${DomainId}` | null // null for practice test questions without domain
  topic: string | null
  difficulty: Difficulty | null
  createdAt: string
  updatedAt: string
}

export interface Answer {
  id: number
  questionId: number
  answerText: string
  isCorrect: boolean
  sortOrder: number
}

export interface QuestionWithAnswers extends Question {
  answers: Answer[]
}

export interface Attempt {
  id: number
  questionId: number
  selectedAnswers: number[]
  isCorrect: boolean
  timeSpentSeconds: number | null
  attemptedAt: string
}

export interface Session {
  id: string // UUID
  sessionType: SessionType
  totalQuestions: number
  correctAnswers: number
  timeSpentSeconds: number | null
  domainsFilter: string | null // JSON string
  startedAt: string
  completedAt: string | null
}

export interface QuizState {
  sessionId: string // UUID
  questions: QuestionWithAnswers[]
  currentIndex: number
  answers: Map<number, number[]>
  flagged: Set<number>
  startTime: Date
  isExamMode: boolean
}

export interface DomainStats {
  domain: string
  total: number
  correct: number
  accuracy: number
}

export interface OverviewStats {
  totalQuestions: number
  totalAttempts: number
  correctAttempts: number
  overallAccuracy: number
  totalSessions: number
  passedSessions: number
}

export interface ReviewStats {
  totalToReview: number
  wrongCount: number
  timedOutCount: number
  questionIds: number[]
}

// Progress tracking types
export type MasteryStatus = 'unattempted' | 'attempted' | 'incorrect' | 'mastered'

export interface QuestionProgress {
  questionId: number
  masteryStatus: MasteryStatus
  attemptCount: number
  correctCount: number
  lastAttemptedAt: string | null
  markedAsLearned: boolean
}

export interface QuestionFilterOptions {
  domain?: string
  topic?: string
  difficulty?: Difficulty
  questionType?: QuestionType
  search?: string
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}
