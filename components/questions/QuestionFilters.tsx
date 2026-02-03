'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useRef, useImperativeHandle, forwardRef } from 'react'
import { DOMAINS } from '@/types'

interface QuestionFiltersProps {
  topics?: string[]
  topicsByDomain?: Map<string, string[]>
}

export interface QuestionFiltersHandle {
  focusSearch: () => void
  clearSearch: () => void
  clearAllFilters: () => void
  isSearchFocused: () => boolean
}

export const QuestionFilters = forwardRef<QuestionFiltersHandle, QuestionFiltersProps>(
  function QuestionFilters({ topics = [], topicsByDomain }, ref): React.JSX.Element {
    const router = useRouter()
    const searchParams = useSearchParams()
    const searchInputRef = useRef<HTMLInputElement>(null)

    const search = searchParams.get('search') ?? ''
    const domain = searchParams.get('domain') ?? ''
    const difficulty = searchParams.get('difficulty') ?? ''
    const topic = searchParams.get('topic') ?? ''
    const questionType = searchParams.get('type') ?? ''
    const progress = searchParams.get('progress') ?? ''

    const updateParams = useCallback(
      (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
        // Reset page when filters change
        params.delete('page')
        router.push(`/questions?${params.toString()}`)
      },
      [router, searchParams]
    )

    const clearAllFilters = useCallback(() => {
      router.push('/questions')
    }, [router])

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        focusSearch: () => {
          searchInputRef.current?.focus()
        },
        clearSearch: () => {
          if (search !== '') {
            updateParams('search', '')
          }
          searchInputRef.current?.blur()
        },
        clearAllFilters,
        isSearchFocused: () => {
          return document.activeElement === searchInputRef.current
        },
      }),
      [search, updateParams, clearAllFilters]
    )

    // Get topics for selected domain, or all topics if no domain selected
    const availableTopics = useMemo(() => {
      if (domain && topicsByDomain) {
        return topicsByDomain.get(domain) ?? []
      }
      return topics
    }, [domain, topics, topicsByDomain])

    // Check if any filters are active
    const hasActiveFilters =
      search !== '' ||
      domain !== '' ||
      difficulty !== '' ||
      topic !== '' ||
      questionType !== '' ||
      progress !== ''

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      updateParams('search', e.target.value)
    }

    const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
      updateParams('topic', e.target.value)
    }

    const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
      updateParams('difficulty', e.target.value)
    }

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
      updateParams('type', e.target.value)
    }

    const handleProgressChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
      updateParams('progress', e.target.value)
    }

    return (
      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Search input */}
          <div className="relative min-w-[200px] flex-1">
            <label htmlFor="question-search" className="sr-only">
              Search questions
            </label>
            <input
              ref={searchInputRef}
              id="question-search"
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={handleSearchChange}
              className="input w-full pr-10"
              aria-label="Search questions"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-sm border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-400">
              /
            </span>
          </div>

          {/* Domain filter */}
          <div>
            <label htmlFor="domain-filter" className="sr-only">
              Filter by domain
            </label>
            <select
              id="domain-filter"
              value={domain}
              onChange={(e) => {
                updateParams('domain', e.target.value)
                // Clear topic when domain changes
                if (topic) {
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete('topic')
                  params.delete('page')
                  if (e.target.value) {
                    params.set('domain', e.target.value)
                  } else {
                    params.delete('domain')
                  }
                  router.push(`/questions?${params.toString()}`)
                }
              }}
              className="input w-auto"
              aria-label="Filter by domain"
            >
              <option value="">All Domains</option>
              {(Object.entries(DOMAINS) as [string, string][]).map(([id, name]) => (
                <option key={id} value={id}>
                  D{id}: {name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic filter */}
          <div>
            <label htmlFor="topic-filter" className="sr-only">
              Filter by topic
            </label>
            <select
              id="topic-filter"
              value={topic}
              onChange={handleTopicChange}
              className="input w-auto max-w-[200px]"
              disabled={availableTopics.length === 0}
              aria-label="Filter by topic"
            >
              <option value="">All Topics</option>
              {availableTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty filter */}
          <div>
            <label htmlFor="difficulty-filter" className="sr-only">
              Filter by difficulty
            </label>
            <select
              id="difficulty-filter"
              value={difficulty}
              onChange={handleDifficultyChange}
              className="input w-auto"
              aria-label="Filter by difficulty"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Question Type filter */}
          <div>
            <label htmlFor="type-filter" className="sr-only">
              Filter by question type
            </label>
            <select
              id="type-filter"
              value={questionType}
              onChange={handleTypeChange}
              className="input w-auto"
              aria-label="Filter by question type"
            >
              <option value="">All Types</option>
              <option value="single">Single Choice</option>
              <option value="multi">Multi-Select</option>
            </select>
          </div>

          {/* Progress filter */}
          <div>
            <label htmlFor="progress-filter" className="sr-only">
              Filter by progress
            </label>
            <select
              id="progress-filter"
              value={progress}
              onChange={handleProgressChange}
              className="input w-auto"
              aria-label="Filter by progress"
            >
              <option value="">All Progress</option>
              <option value="unattempted">Not Attempted</option>
              <option value="attempted">Attempted</option>
              <option value="incorrect">Needs Review</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>

          {/* Clear Filters button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>
    )
  }
)
