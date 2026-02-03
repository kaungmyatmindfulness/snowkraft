'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { Icons } from './Icons'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  basePath?: string
  showKeyboardHints?: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  basePath = '/questions',
  showKeyboardHints = false,
}: PaginationProps): React.JSX.Element | null {
  const router = useRouter()
  const searchParams = useSearchParams()

  const goToPage = useCallback(
    (page: number): void => {
      const params = new URLSearchParams(searchParams.toString())
      if (page === 1) {
        params.delete('page')
      } else {
        params.set('page', String(page))
      }
      router.push(`${basePath}?${params.toString()}`)
    },
    [router, searchParams, basePath]
  )

  const handleFirstPage = useCallback((): void => {
    goToPage(1)
  }, [goToPage])

  const handlePrevPage = useCallback((): void => {
    goToPage(currentPage - 1)
  }, [goToPage, currentPage])

  const handleNextPage = useCallback((): void => {
    goToPage(currentPage + 1)
  }, [goToPage, currentPage])

  const handleLastPage = useCallback((): void => {
    goToPage(totalPages)
  }, [goToPage, totalPages])

  // Memoize page numbers calculation (must be before early return to follow Rules of Hooks)
  const pageNumbers = useMemo((): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5 // Number of page buttons to show

    if (totalPages <= showPages + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage <= 3) {
        // Near start
        for (let i = 2; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Near end
        pages.push('ellipsis')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Middle
        pages.push('ellipsis')
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push('ellipsis')
        pages.push(totalPages)
      }
    }

    return pages
  }, [currentPage, totalPages])

  if (totalPages <= 1) {
    return null
  }

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-slate-600">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium text-gray-900 dark:text-gray-100">{startItem}</span>
        {' - '}
        <span className="font-medium text-gray-900 dark:text-gray-100">{endItem}</span>
        {' of '}
        <span className="font-medium text-gray-900 dark:text-gray-100">{totalCount}</span>
      </div>

      <div className="flex items-center gap-1">
        {/* First page */}
        <button
          onClick={handleFirstPage}
          disabled={currentPage === 1}
          className="rounded-lg p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
          aria-label="First page"
        >
          <Icons.ChevronsLeft className="size-4" />
        </button>

        {/* Previous page */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="rounded-lg p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
          aria-label="Previous page"
        >
          <span className="flex items-center gap-1">
            <Icons.ChevronLeft className="size-4" />
            {showKeyboardHints && (
              <span className="rounded-sm border border-gray-300 bg-gray-100 px-1 text-xs text-gray-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-400">
                [
              </span>
            )}
          </span>
        </button>

        {/* Page numbers */}
        <div className="mx-2 flex items-center gap-1">
          {pageNumbers.map((pageNum, index) =>
            pageNum === 'ellipsis' ? (
              <span
                key={`ellipsis-${String(index)}`}
                className="px-2 text-gray-400 dark:text-gray-500"
              >
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => {
                  goToPage(pageNum)
                }}
                className={`h-9 min-w-[36px] rounded-lg px-3 text-sm font-medium transition-colors ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
                }`}
                aria-label={`Page ${String(pageNum)}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            )
          )}
        </div>

        {/* Next page */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="rounded-lg p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
          aria-label="Next page"
        >
          <span className="flex items-center gap-1">
            {showKeyboardHints && (
              <span className="rounded-sm border border-gray-300 bg-gray-100 px-1 text-xs text-gray-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-400">
                ]
              </span>
            )}
            <Icons.ChevronRight className="size-4" />
          </span>
        </button>

        {/* Last page */}
        <button
          onClick={handleLastPage}
          disabled={currentPage === totalPages}
          className="rounded-lg p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700"
          aria-label="Last page"
        >
          <Icons.ChevronsRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
