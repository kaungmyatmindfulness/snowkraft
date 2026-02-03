'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui'

interface ShortcutItem {
  keys: string[]
  description: string
}

const shortcuts: ShortcutItem[] = [
  { keys: ['A', 'S', 'D', 'F'], description: 'Select answer 1-4' },
  { keys: ['Z', 'X', 'C', 'V'], description: 'Select answer 5-8' },
  { keys: ['Space'], description: 'Submit / Next / Finish' },
  { keys: ['←', 'P'], description: 'Previous question' },
  { keys: ['→', 'N'], description: 'Next question' },
  { keys: ['G'], description: 'Flag question' },
  { keys: ['E'], description: 'Copy explanation' },
  { keys: ['Esc'], description: 'Pause / Resume quiz' },
]

export function KeyboardShortcuts(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        aria-expanded={isOpen}
        aria-label="Keyboard shortcuts"
        className={cn(
          'rounded-lg p-2 transition-colors duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
          isOpen
            ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-slate-700 dark:hover:text-gray-300'
        )}
      >
        <Icons.Keyboard size={18} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false)
            }}
          />

          {/* Dropdown */}
          <div className="animate-scale-in absolute top-full right-0 z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-slate-600 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-2 dark:border-slate-700">
              <Icons.Keyboard size={16} className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Keyboard Shortcuts
              </span>
            </div>
            <ul className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <li key={index} className="flex items-center gap-3 text-sm">
                  <div className="flex gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <kbd
                        key={keyIndex}
                        className="flex h-6 min-w-[24px] items-center justify-center rounded-sm border border-gray-200 bg-gray-100 px-1.5 font-mono text-xs text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-300"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                  <span className="flex-1 text-gray-600 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
