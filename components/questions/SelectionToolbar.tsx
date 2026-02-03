'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState, useEffect } from 'react'
import { Button, Icons } from '@/components/ui'
import { startQuiz } from '@/lib/quiz/client'
import { getModifierKey } from '@/lib/utils'

interface SelectionToolbarProps {
  selectedIds: Set<number>
  totalCount: number
  allSelected: boolean
  onClear: () => void
  onSelectAll: () => void
  onStartQuiz?: () => void
}

export function SelectionToolbar({
  selectedIds,
  totalCount,
  allSelected,
  onClear,
  onSelectAll,
  onStartQuiz,
}: SelectionToolbarProps): React.JSX.Element | null {
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)

  const handleStartQuiz = useCallback(() => {
    if (selectedIds.size === 0) {
      return
    }

    setIsStarting(true)

    try {
      const result = startQuiz({
        type: 'practice',
        questionCount: selectedIds.size,
        specificQuestionIds: Array.from(selectedIds),
      })

      onStartQuiz?.()
      router.push(`/quiz/${result.sessionId}`)
    } catch {
      setIsStarting(false)
    }
  }, [selectedIds, onStartQuiz, router])

  const [modKey, setModKey] = useState('⌘')

  // Detect OS on mount for modifier key display
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: need to detect OS on client
    setModKey(getModifierKey().symbol)
  }, [])

  // Don't render if no items on page
  if (totalCount === 0) {
    return null
  }

  const count = selectedIds.size

  return (
    <div className="animate-slide-up fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg dark:border-slate-600 dark:bg-slate-800">
      <div className="flex items-center gap-2">
        <Icons.Check className="size-5 text-sky-500" aria-hidden="true" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {count === 0
            ? `${String(totalCount)} question${totalCount > 1 ? 's' : ''}`
            : `${String(count)} of ${String(totalCount)} selected`}
        </span>
      </div>

      <div className="h-4 w-px bg-gray-300 dark:bg-slate-600" />

      <Button variant="ghost" size="sm" onClick={allSelected ? onClear : onSelectAll}>
        {allSelected ? 'Deselect All' : 'Select All'}
        <kbd className="ml-1.5 rounded-sm bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-slate-700 dark:text-gray-400">
          {modKey}A
        </kbd>
      </Button>

      {count > 0 && (
        <>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>

          <Button variant="primary" size="sm" onClick={handleStartQuiz} isLoading={isStarting}>
            Start Practice Quiz
            <Icons.ChevronRight className="ml-1 size-4" aria-hidden="true" />
          </Button>
        </>
      )}
    </div>
  )
}
