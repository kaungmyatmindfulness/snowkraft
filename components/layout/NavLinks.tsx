'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icons } from '@/components/ui'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: Icons.Home },
  { href: '/study-guide', label: 'Study', icon: Icons.GraduationCap },
  { href: '/questions', label: 'Questions', icon: Icons.BookOpen },
  { href: '/review', label: 'Review', icon: Icons.RotateCcw },
  { href: '/stats', label: 'Stats', icon: Icons.BarChart },
] as const

export function NavLinks(): React.JSX.Element {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1">
      {NAV_LINKS.map((link) => {
        const Icon = link.icon
        const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
              isActive
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-700 dark:hover:text-gray-100'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            <span className="hidden sm:inline">{link.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
