'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { QuestionWithAnswers, QuestionProgress } from '@/types'
import { getProgressForQuestions, markAsLearned } from '@/lib/storage/progress'
import { QuestionFilters, type QuestionFiltersHandle } from './QuestionFilters'
import { QuestionBrowseCard } from './QuestionBrowseCard'
import { SelectionToolbar } from './SelectionToolbar'
import { Pagination } from '@/components/ui/Pagination'

const FlashcardModal = dynamic(
  () => import('@/components/questions/FlashcardModal').then((mod) => mod.FlashcardModal),
  { ssr: false }
)

const QuickQuizModal = dynamic(
  () => import('@/components/questions/QuickQuizModal').then((mod) => mod.QuickQuizModal),
  { ssr: false }
)

interface QuestionsPageClientProps {
  questions: QuestionWithAnswers[]
  allMatchingIds: number[]
  pagination: {
    page: number
    totalPages: number
    totalCount: number
    pageSize: number
  }
  topics: string[]
  topicsByDomain: Map<string, string[]>
  progressFilter: string | undefined
}

export function QuestionsPageClient({
  questions,
  allMatchingIds,
  pagination,
  topics,
  topicsByDomain,
  progressFilter,
}: QuestionsPageClientProps): React.JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filtersRef = useRef<QuestionFiltersHandle>(null)

  const [progress, setProgress] = useState<Map<number, QuestionProgress>>(new Map())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [quickQuizQuestion, setQuickQuizQuestion] = useState<QuestionWithAnswers | null>(null)
  const [studyQuestion, setStudyQuestion] = useState<QuestionWithAnswers | null>(null)

  // Load progress from localStorage on mount
  useEffect(() => {
    const questionIds = questions.map((q) => q.id)
    const progressData = getProgressForQuestions(questionIds)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with localStorage
    setProgress(progressData)
  }, [questions])

  // Filter questions by progress (client-side)
  const filteredQuestions = useMemo(() => {
    if (progressFilter === undefined || progressFilter === '') {
      return questions
    }

    return questions.filter((q) => {
      const questionProgress = progress.get(q.id)
      const status = questionProgress?.masteryStatus ?? 'unattempted'
      return status === progressFilter
    })
  }, [questions, progress, progressFilter])

  const handleSelect = useCallback((questionId: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }, [])

  const handleQuickQuiz = useCallback((question: QuestionWithAnswers) => {
    setQuickQuizQuestion(question)
  }, [])

  const handleStudy = useCallback((question: QuestionWithAnswers) => {
    setStudyQuestion(question)
  }, [])

  const handleMarkLearned = useCallback(
    (questionId: number, learned: boolean) => {
      markAsLearned(questionId, learned)
      // Refresh progress
      const questionIds = questions.map((q) => q.id)
      const progressData = getProgressForQuestions(questionIds)
      setProgress(progressData)
    },
    [questions]
  )

  const handleCloseQuickQuiz = useCallback(() => {
    setQuickQuizQuestion(null)
    // Refresh progress after practice
    const questionIds = questions.map((q) => q.id)
    const progressData = getProgressForQuestions(questionIds)
    setProgress(progressData)
  }, [questions])

  const handleCloseStudy = useCallback(() => {
    setStudyQuestion(null)
    // Refresh progress in case they marked as learned
    const questionIds = questions.map((q) => q.id)
    const progressData = getProgressForQuestions(questionIds)
    setProgress(progressData)
  }, [questions])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(allMatchingIds)
    setSelectedIds(allIds)
  }, [allMatchingIds])

  const allSelected = allMatchingIds.length > 0 && allMatchingIds.every((id) => selectedIds.has(id))

  // Pagination navigation helpers
  const goToPage = useCallback(
    (page: number): void => {
      const params = new URLSearchParams(searchParams.toString())
      if (page === 1) {
        params.delete('page')
      } else {
        params.set('page', String(page))
      }
      router.push(`/questions?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handlePrevPage = useCallback((): void => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1)
    }
  }, [pagination.page, goToPage])

  const handleNextPage = useCallback((): void => {
    if (pagination.page < pagination.totalPages) {
      goToPage(pagination.page + 1)
    }
  }, [pagination.page, pagination.totalPages, goToPage])

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Don't trigger shortcuts when modals are open
      if (quickQuizQuestion !== null || studyQuestion !== null) {
        return
      }

      // Check if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      // Handle search focus with /
      if (e.key === '/' && !isTyping) {
        e.preventDefault()
        filtersRef.current?.focusSearch()
        return
      }

      // Handle Escape key
      if (e.key === 'Escape') {
        // If search is focused, clear and blur
        if (filtersRef.current?.isSearchFocused() === true) {
          e.preventDefault()
          filtersRef.current.clearSearch()
          return
        }

        // If not in any input, clear all filters
        if (!isTyping) {
          e.preventDefault()
          filtersRef.current?.clearAllFilters()
          return
        }
      }

      // Pagination shortcuts (only when not typing)
      if (!isTyping) {
        // Select all: Cmd/Ctrl+A
        if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
          e.preventDefault()
          if (allSelected) {
            handleClearSelection()
          } else {
            handleSelectAll()
          }
          return
        }

        // Previous page: [ or ,
        if (e.key === '[' || e.key === ',') {
          e.preventDefault()
          handlePrevPage()
          return
        }

        // Next page: ] or .
        if (e.key === ']' || e.key === '.') {
          e.preventDefault()
          handleNextPage()
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    quickQuizQuestion,
    studyQuestion,
    handlePrevPage,
    handleNextPage,
    handleSelectAll,
    handleClearSelection,
    allSelected,
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Questions</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredQuestions.length} of {pagination.totalCount} questions
        </div>
      </div>

      <div className="card dark:bg-slate-800">
        <QuestionFilters ref={filtersRef} topics={topics} topicsByDomain={topicsByDomain} />

        {filteredQuestions.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No questions found matching your filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <QuestionBrowseCard
                key={question.id}
                question={question}
                progress={progress.get(question.id)}
                isSelected={selectedIds.has(question.id)}
                onSelect={handleSelect}
                onQuickQuiz={handleQuickQuiz}
                onStudy={handleStudy}
                onMarkLearned={handleMarkLearned}
              />
            ))}
          </div>
        )}

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          pageSize={pagination.pageSize}
          showKeyboardHints
        />
      </div>

      {/* Quick Quiz Modal */}
      {quickQuizQuestion !== null && (
        <QuickQuizModal question={quickQuizQuestion} onClose={handleCloseQuickQuiz} />
      )}

      {/* Flashcard/Study Mode Modal */}
      {studyQuestion !== null && (
        <FlashcardModal
          question={studyQuestion}
          onClose={handleCloseStudy}
          isLearned={progress.get(studyQuestion.id)?.markedAsLearned ?? false}
          onMarkLearned={(learned) => {
            handleMarkLearned(studyQuestion.id, learned)
          }}
        />
      )}

      <SelectionToolbar
        selectedIds={selectedIds}
        totalCount={allMatchingIds.length}
        allSelected={allSelected}
        onClear={handleClearSelection}
        onSelectAll={handleSelectAll}
      />
    </div>
  )
}
