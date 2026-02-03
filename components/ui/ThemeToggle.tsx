'use client'

import { useTheme } from '@/lib/theme'
import { Icons } from '@/components/ui'
import { cn } from '@/lib/utils'

export function ThemeToggle(): React.JSX.Element {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={cn(
        'relative h-8 w-14 rounded-full transition-colors duration-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
        isDark ? 'bg-gray-700' : 'bg-sky-100'
      )}
    >
      {/* Toggle knob */}
      <span
        className={cn(
          'absolute top-1 flex size-6 items-center justify-center rounded-full transition-[left,background-color,box-shadow] duration-300',
          isDark ? 'left-7 bg-gray-900' : 'left-1 bg-white shadow-md'
        )}
      >
        {/* Sun icon */}
        <Icons.Sun
          className={cn(
            'size-4 transition-[opacity,transform] duration-300',
            isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 text-amber-500 opacity-100'
          )}
        />
        {/* Moon icon */}
        <Icons.Moon
          className={cn(
            'absolute size-4 transition-[opacity,transform] duration-300',
            isDark
              ? 'scale-100 rotate-0 text-amber-300 opacity-100'
              : 'scale-0 -rotate-90 opacity-0'
          )}
        />
      </span>
    </button>
  )
}

// Simpler icon-only toggle
export function ThemeToggleIcon(): React.JSX.Element {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={cn(
        'rounded-lg p-2 transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
        'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
        'dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
      )}
    >
      {isDark ? <Icons.Sun className="size-5" /> : <Icons.Moon className="size-5" />}
    </button>
  )
}
