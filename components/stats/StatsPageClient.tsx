'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { getAllStats, type StoredSession, type WeakAreaStats } from '@/lib/storage'
import { ResetDataButton } from '@/components/stats/ResetDataButton'
import { formatTime, cn } from '@/lib/utils'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Progress,
  Badge,
  Icons,
  Spinner,
} from '@/components/ui'
import type { DomainStats, OverviewStats } from '@/types'

const DomainChart = dynamic(
  () => import('./DomainChart').then((mod) => ({ default: mod.DomainChart })),
  {
    loading: () => (
      <div className="flex h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    ),
    ssr: false,
  }
)

interface StatsPageClientProps {
  totalQuestions: number
}

export function StatsPageClient({ totalQuestions }: StatsPageClientProps): React.JSX.Element {
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [byDomain, setByDomain] = useState<DomainStats[]>([])
  const [weakAreas, setWeakAreas] = useState<WeakAreaStats[]>([])
  const [history, setHistory] = useState<StoredSession[]>([])

  useEffect(() => {
    // Reading from localStorage (external system) on mount
    // Using batched getAllStats reduces localStorage reads from 5 to 2
    /* eslint-disable react-hooks/set-state-in-effect -- syncing with localStorage */
    const stats = getAllStats(totalQuestions)
    setOverview(stats.overview)
    setByDomain(stats.byDomain)
    setWeakAreas(stats.weakAreas)
    setHistory(stats.history)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [totalQuestions])

  const handleReset = (): void => {
    // Reload all stats after reset using batched operation
    const stats = getAllStats(totalQuestions)
    setOverview(stats.overview)
    setByDomain(stats.byDomain)
    setWeakAreas(stats.weakAreas)
    setHistory(stats.history)
  }

  if (!overview) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-b-2 border-sky-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-slide-up flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Statistics</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Track your progress and identify areas to improve
          </p>
        </div>
        <div className="flex gap-2">
          <ResetDataButton onReset={handleReset} />
          <Link href="/">
            <Button variant="ghost" size="sm">
              <Icons.Home size={18} />
              Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="animate-slide-up stagger-1 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="stat-card">
          <div className="stat-card-icon bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
            <Icons.Hash size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {overview.totalQuestions}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Questions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <Icons.Zap size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {overview.totalAttempts}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Attempts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Icons.Target size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(overview.overallAccuracy)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Overall Accuracy</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Icons.Trophy size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {overview.passedSessions}/{overview.totalSessions}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Sessions Passed</div>
          </div>
        </div>
      </div>

      {/* Domain Performance */}
      {byDomain.length > 0 && (
        <Card variant="default" className="animate-slide-up stagger-2 dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <Icons.Layers size={20} className="text-sky-500" />
              Performance by Domain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DomainChart data={byDomain} />
          </CardContent>
        </Card>
      )}

      {/* Areas to Improve */}
      {weakAreas.length > 0 && (
        <Card variant="default" className="animate-slide-up stagger-3 dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <Icons.TrendingUp size={20} className="text-amber-500" />
              Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weakAreas.map((area, index) => (
                <div key={area.topic} className="group">
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                        index < 3
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="truncate pr-4 font-medium text-gray-900 dark:text-gray-100">
                          {area.topic}
                        </span>
                        <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                          {Math.round(area.accuracy)}%
                          <span className="ml-1 text-gray-400 dark:text-gray-500">
                            ({area.correct}/{area.total})
                          </span>
                        </span>
                      </div>
                      <Progress
                        value={area.accuracy}
                        size="sm"
                        variant={
                          area.accuracy < 50 ? 'danger' : area.accuracy < 75 ? 'warning' : 'success'
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      {history.length > 0 && (
        <Card variant="default" className="animate-slide-up stagger-4 dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <Icons.Clock size={20} className="text-purple-500" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500 dark:border-slate-600 dark:text-gray-400">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Score</th>
                    <th className="px-6 py-3 font-medium">Time</th>
                    <th className="px-6 py-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {history.map((session, index) => {
                    const accuracy =
                      session.totalQuestions > 0
                        ? session.correctAnswers / session.totalQuestions
                        : 0
                    const passed = accuracy >= 0.75
                    return (
                      <tr
                        key={session.id}
                        className={cn(
                          'border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50',
                          index === 0 && 'bg-sky-50/50 dark:bg-sky-900/20'
                        )}
                      >
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                          {new Date(session.completedAt ?? session.startedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={session.sessionType === 'exam' ? 'warning' : 'primary'}
                            size="sm"
                          >
                            {session.sessionType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                          <span className="font-medium">{session.correctAnswers}</span>
                          <span className="text-gray-400 dark:text-gray-500">
                            /{session.totalQuestions}
                          </span>
                          <span
                            className={cn(
                              'ml-2',
                              passed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-500 dark:text-red-400'
                            )}
                          >
                            ({Math.round(accuracy * 100)}%)
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {session.timeSpentSeconds !== null
                            ? formatTime(session.timeSpentSeconds)
                            : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={passed ? 'success' : 'danger'} size="sm">
                            {passed ? 'PASSED' : 'FAILED'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {history.length === 0 && (
        <Card variant="bordered" className="animate-slide-up py-12 text-center dark:bg-slate-800">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
              <Icons.BarChart size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                No sessions yet
              </h3>
              <p className="mb-4 text-gray-500 dark:text-gray-400">
                Start a practice quiz to see your statistics!
              </p>
              <Link href="/">
                <Button variant="primary">
                  <Icons.Play size={18} />
                  Start Quiz
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
