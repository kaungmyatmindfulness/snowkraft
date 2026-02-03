'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Icons, ThemeToggle } from '@/components/ui'
import { NavLinks } from './NavLinks'

const GlobalKeyboardHelp = dynamic(
  () => import('@/components/ui/GlobalKeyboardHelp').then((mod) => mod.GlobalKeyboardHelp),
  { ssr: false }
)

interface LayoutShellProps {
  children: React.ReactNode
}

export function LayoutShell({ children }: LayoutShellProps): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Global Keyboard Help Modal */}
      <GlobalKeyboardHelp />

      {/* Header */}
      <header className="glass sticky top-0 z-50 h-14 border-b border-gray-200 dark:border-slate-700">
        <nav className="mx-auto h-full max-w-6xl px-4" aria-label="Main navigation">
          <div className="flex h-full items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 text-sky-600 transition-colors hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              <div className="rounded-lg bg-linear-to-br from-sky-500 to-cyan-500 p-1.5">
                <Icons.Snowflake size={20} className="text-white" />
              </div>
              <span className="hidden font-semibold text-gray-900 sm:inline dark:text-gray-100">
                SnowPro Core
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <NavLinks />

              {/* Theme Toggle */}
              <div className="ml-2 border-l border-gray-200 pl-2 dark:border-slate-600">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 py-6 dark:border-slate-700">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-gray-500 sm:flex-row dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Icons.Snowflake size={16} className="text-sky-500" aria-hidden="true" />
            <span>SnowPro Core COF-C02 Practice Quiz</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Not affiliated with Snowflake Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
