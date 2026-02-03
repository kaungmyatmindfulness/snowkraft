'use client'

import { useState, useEffect } from 'react'
import { getOverallStats as getStorageStats } from '@/lib/storage'
import { Icons } from '@/components/ui'

interface ClientStatsProps {
  totalQuestions: number
}

export function ClientStats({ totalQuestions }: ClientStatsProps): React.JSX.Element {
  const [stats, setStats] = useState<{
    overallAccuracy: number
    totalSessions: number
    passedSessions: number
  } | null>(null)

  useEffect(() => {
    // Reading from localStorage (external system) on mount
    const storageStats = getStorageStats(totalQuestions)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with localStorage
    setStats({
      overallAccuracy: storageStats.overallAccuracy,
      totalSessions: storageStats.totalSessions,
      passedSessions: storageStats.passedSessions,
    })
  }, [totalQuestions])

  // Show loading state or zeros on server
  const accuracy = stats?.overallAccuracy ?? 0
  const sessions = stats?.totalSessions ?? 0

  return (
    <>
      {/* Stats Cards */}
      <div className="animate-slide-up stagger-1 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stat-card">
          <div className="stat-card-icon bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
            <Icons.Hash size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {totalQuestions}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Questions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Icons.Target size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(accuracy)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Overall Accuracy</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <Icons.Trophy size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sessions}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Sessions Completed</div>
          </div>
        </div>
      </div>
    </>
  )
}

export function ClientStatsFooter({ totalQuestions }: ClientStatsProps): React.JSX.Element | null {
  const [stats, setStats] = useState<{
    totalSessions: number
    passedSessions: number
  } | null>(null)

  useEffect(() => {
    // Reading from localStorage (external system) on mount
    const storageStats = getStorageStats(totalQuestions)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with localStorage
    setStats({
      totalSessions: storageStats.totalSessions,
      passedSessions: storageStats.passedSessions,
    })
  }, [totalQuestions])

  if (stats === null || stats.totalSessions === 0) {
    return null
  }

  return (
    <div className="animate-slide-up stagger-3 py-4 text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow-sm dark:bg-slate-800 dark:text-gray-300">
        <Icons.TrendingUp size={16} className="text-emerald-500" />
        <span>
          You&apos;ve passed{' '}
          <span className="font-semibold text-emerald-600">{stats.passedSessions}</span> of{' '}
          {stats.totalSessions} sessions
        </span>
      </div>
    </div>
  )
}
