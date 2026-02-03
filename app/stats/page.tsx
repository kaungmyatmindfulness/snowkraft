import type { Metadata } from 'next'
import { getTotalQuestions } from '@/lib/data/questions'
import { StatsPageClient } from '@/components/stats/StatsPageClient'

export const metadata: Metadata = {
  title: 'Statistics | SnowPro Core Practice Quiz',
  description:
    'Track your study progress, view performance by domain, and identify areas to improve.',
}

export default function StatsPage(): React.JSX.Element {
  const totalQuestions = getTotalQuestions()

  return <StatsPageClient totalQuestions={totalQuestions} />
}
