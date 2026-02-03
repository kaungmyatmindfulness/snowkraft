'use client'

import { memo } from 'react'
import he from 'he'
import type { QuestionWithAnswers, QuestionProgress, MasteryStatus } from '@/types'
import { QuestionProgressIndicator } from './QuestionProgress'
import { Icons } from '@/components/ui/Icons'

interface QuestionBrowseCardProps {
  question: QuestionWithAnswers
  progress: QuestionProgress | undefined
  isSelected: boolean
  onSelect: (questionId: number) => void
  onQuickQuiz: (question: QuestionWithAnswers) => void
  onStudy: (question: QuestionWithAnswers) => void
  onMarkLearned: (questionId: number, learned: boolean) => void
}

export const QuestionBrowseCard = memo(function QuestionBrowseCard({
  question,
  progress,
  isSelected,
  onSelect,
  onQuickQuiz,
  onStudy,
  onMarkLearned,
}: QuestionBrowseCardProps): React.JSX.Element {
  const masteryStatus: MasteryStatus = progress?.masteryStatus ?? 'unattempted'
  const isMarkedAsLearned = progress?.markedAsLearned ?? false

  // Border color based on mastery status
  const borderColors: Record<MasteryStatus, string> = {
    unattempted: 'border-l-gray-300 dark:border-l-gray-600',
    attempted: 'border-l-blue-500',
    incorrect: 'border-l-red-500',
    mastered: 'border-l-green-500',
  }

  const handleSelect = (): void => {
    onSelect(question.id)
  }

  const handleQuickQuiz = (): void => {
    onQuickQuiz(question)
  }

  const handleStudy = (): void => {
    onStudy(question)
  }

  const handleMarkLearned = (): void => {
    onMarkLearned(question.id, !isMarkedAsLearned)
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border border-gray-200 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700/50 ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-900/20' : ''}`}
    >
      {/* Left border indicator */}
      <div className={`border-l-4 ${borderColors[masteryStatus]} p-4`}>
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <div className="pt-0.5">
            <button
              onClick={handleSelect}
              className={`flex size-5 items-center justify-center rounded-sm border-2 transition-colors ${
                isSelected
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 hover:border-blue-500 dark:border-gray-600'
              }`}
              aria-label={isSelected ? 'Deselect question' : 'Select question'}
            >
              {isSelected && <Icons.Check className="size-3" />}
            </button>
          </div>

          {/* Question content */}
          <div className="min-w-0 flex-1">
            {/* Badges row */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {question.domain !== null && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                  D{question.domain}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  question.questionType === 'multi'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200'
                }`}
              >
                {question.questionType === 'multi' ? 'Multi-select' : 'Single'}
              </span>
              {question.difficulty && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    question.difficulty === 'easy'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : question.difficulty === 'medium'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}
                >
                  {question.difficulty}
                </span>
              )}

              {/* Progress indicator */}
              <div className="ml-auto">
                <QuestionProgressIndicator progress={progress} variant="badge" />
              </div>
            </div>

            {/* Question text */}
            <p className="mb-2 text-gray-900 dark:text-gray-100">
              {he.decode(question.questionText)}
            </p>

            {/* Topic */}
            {question.topic !== null && question.topic !== '' && (
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                Topic: {question.topic}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 dark:border-slate-700">
              <button
                onClick={handleQuickQuiz}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                <Icons.Zap className="size-4" />
                Quick Practice
              </button>

              <button
                onClick={handleStudy}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
              >
                <Icons.BookOpen className="size-4" />
                Study
              </button>

              <button
                onClick={handleMarkLearned}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isMarkedAsLearned
                    ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700'
                }`}
              >
                {isMarkedAsLearned ? (
                  <>
                    <Icons.CheckCircle className="size-4" />
                    Learned
                  </>
                ) : (
                  <>
                    <Icons.Circle className="size-4" />
                    Mark Learned
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

QuestionBrowseCard.displayName = 'QuestionBrowseCard'
