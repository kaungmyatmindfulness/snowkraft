'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { cn, getModifierKey } from '@/lib/utils'
import { Icons } from './Icons'

interface ShortcutItem {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  title: string
  shortcuts: ShortcutItem[]
}

const globalShortcuts: ShortcutItem[] = [
  { keys: ['G', 'H'], description: 'Go to Home' },
  { keys: ['G', 'Q'], description: 'Go to Questions' },
  { keys: ['G', 'S'], description: 'Go to Stats' },
  { keys: ['G', 'R'], description: 'Go to Review' },
  { keys: ['T'], description: 'Toggle theme' },
  { keys: ['?'], description: 'Show keyboard help' },
]

function getHomeShortcuts(modKey: string): ShortcutItem[] {
  return [
    { keys: ['P'], description: 'Start Practice Quiz' },
    { keys: ['E'], description: 'Start Exam Simulation' },
    { keys: ['1', '2', '3', '4'], description: 'Question count (10/25/50/100)' },
    { keys: [modKey, '1-6'], description: 'Toggle domain filter' },
  ]
}

const questionsShortcuts: ShortcutItem[] = [
  { keys: ['/'], description: 'Focus search' },
  { keys: ['<'], description: 'Previous page' },
  { keys: ['>'], description: 'Next page' },
  { keys: ['Esc'], description: 'Clear search (when focused)' },
]

const quizShortcuts: ShortcutItem[] = [
  { keys: ['A', 'S', 'D', 'F'], description: 'Select answer 1-4' },
  { keys: ['Z', 'X'], description: 'Select answer 5-6' },
  { keys: ['Space'], description: 'Submit / Next' },
  { keys: ['P', 'ArrowLeft'], description: 'Previous question' },
  { keys: ['N', 'ArrowRight'], description: 'Next question' },
  { keys: ['F'], description: 'Flag question' },
]

function getShortcutGroupsForPath(pathname: string, modKey: string): ShortcutGroup[] {
  const groups: ShortcutGroup[] = []

  // Add page-specific shortcuts first
  if (pathname === '/') {
    groups.push({ title: 'Home', shortcuts: getHomeShortcuts(modKey) })
  } else if (pathname === '/questions') {
    groups.push({ title: 'Questions Browser', shortcuts: questionsShortcuts })
  } else if (pathname.startsWith('/quiz/') && !pathname.includes('/results')) {
    groups.push({ title: 'Quiz', shortcuts: quizShortcuts })
  }

  // Always add global shortcuts
  groups.push({ title: 'Navigation', shortcuts: globalShortcuts })

  return groups
}

export function GlobalKeyboardHelp(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [modKey, setModKey] = useState('Cmd')
  const pathname = usePathname()
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Detect OS on mount for modifier key display
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: need to detect OS on client
    setModKey(getModifierKey().key)
  }, [])

  const handleClose = useCallback((): void => {
    setIsOpen(false)
    // Restore focus to previous element
    if (previousFocusRef.current) {
      previousFocusRef.current.focus()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      // Ignore if in an input, textarea, or contenteditable
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Check for ? key (Shift + /)
      if (event.key === '?' && event.shiftKey) {
        event.preventDefault()
        previousFocusRef.current = document.activeElement as HTMLElement
        setIsOpen(true)
        return
      }

      // Close on Escape
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClose])

  // Focus trap - focus the modal when it opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  const shortcutGroups = getShortcutGroupsForPath(pathname, modKey)

  if (!isOpen) {
    return <></>
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'relative mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800',
          'border border-gray-200 dark:border-slate-600',
          'flex max-h-[80vh] flex-col overflow-hidden',
          'animate-scale-in focus:outline-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2 dark:bg-sky-900/30">
              <Icons.Keyboard size={20} className="text-sky-600 dark:text-sky-400" />
            </div>
            <h2
              id="keyboard-help-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close keyboard shortcuts"
            className={cn(
              'rounded-lg p-2 transition-colors',
              'text-gray-400 dark:text-gray-500',
              'hover:bg-gray-100 dark:hover:bg-slate-700',
              'hover:text-gray-600 dark:hover:text-gray-300',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
            )}
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-sm font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <li key={index} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                    <div className="ml-4 flex shrink-0 gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className={cn(
                            'h-7 min-w-[28px] px-2',
                            'bg-gray-100 dark:bg-slate-700',
                            'text-gray-600 dark:text-gray-300',
                            'rounded-sm font-mono text-xs',
                            'flex items-center justify-center',
                            'border border-gray-200 dark:border-slate-600',
                            'shadow-sm'
                          )}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Press{' '}
            <kbd className="rounded-sm border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-300">
              Esc
            </kbd>{' '}
            to close
          </p>
        </div>
      </div>
    </div>
  )
}
