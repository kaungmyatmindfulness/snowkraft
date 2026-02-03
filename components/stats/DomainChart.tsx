'use client'

import { memo, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { DOMAINS } from '@/types'

const CHART_MARGIN = { left: 20, right: 20 } as const

interface DomainData {
  domain: string
  total: number
  correct: number
  accuracy: number
}

interface DomainChartProps {
  data: DomainData[]
}

interface ChartDataItem {
  name: string
  fullName: string
  accuracy: number
  correct: number
  total: number
}

interface PayloadItem {
  payload: ChartDataItem
}

interface CustomTooltipProps {
  active?: boolean
  payload?: PayloadItem[]
}

const CustomTooltip = memo(function CustomTooltip({
  active,
  payload,
}: CustomTooltipProps): React.JSX.Element | null {
  if (active === true && payload !== undefined && payload.length > 0) {
    const payloadItem = payload[0]
    if (payloadItem === undefined) {
      return null
    }
    const item = payloadItem.payload
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-slate-600 dark:bg-slate-800">
        <p className="font-medium text-gray-900 dark:text-gray-100">{item.fullName}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {String(item.correct)}/{String(item.total)} correct ({String(item.accuracy)}%)
        </p>
      </div>
    )
  }
  return null
})
CustomTooltip.displayName = 'CustomTooltip'

const getBarColor = (accuracy: number): string => {
  if (accuracy >= 75) {
    return '#22c55e'
  } // green-500
  if (accuracy >= 50) {
    return '#f59e0b'
  } // amber-500
  return '#ef4444' // red-500
}

export const DomainChart = memo(function DomainChart({
  data,
}: DomainChartProps): React.JSX.Element {
  const chartData = useMemo(
    () =>
      data.map((item) => {
        const domainNum = Number(item.domain) as 1 | 2 | 3 | 4 | 5 | 6
        return {
          name: `D${item.domain}`,
          fullName: DOMAINS[domainNum],
          // accuracy is already 0-100 from queries
          accuracy: Math.round(item.accuracy),
          correct: item.correct,
          total: item.total,
        }
      }),
    [data]
  )

  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={CHART_MARGIN}>
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${String(v)}%`} />
          <YAxis type="category" dataKey="name" width={40} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${String(index)}`} fill={getBarColor(entry.accuracy)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-sm bg-green-500" />
          <span className="text-gray-600 dark:text-gray-300">75%+ (Pass)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-sm bg-amber-500" />
          <span className="text-gray-600 dark:text-gray-300">50-74%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-sm bg-red-500" />
          <span className="text-gray-600 dark:text-gray-300">&lt;50%</span>
        </div>
      </div>
    </div>
  )
})
DomainChart.displayName = 'DomainChart'
