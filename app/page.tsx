import type { Metadata } from 'next'
import { getTotalQuestions, getQuestionsByDomain } from '@/lib/data/questions'
import { QuizConfigForm } from '@/components/quiz/QuizConfigForm'
import { ResumeSessionBanner } from '@/components/quiz/ResumeSessionBanner'
import { ClientStats, ClientStatsFooter } from '@/components/stats/ClientStats'
import { Icons } from '@/components/ui'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'SnowPro Core Practice Quiz | Snowflake COF-C02 Certification Prep',
  description:
    'Free practice questions for the Snowflake SnowPro Core (COF-C02) certification exam. Practice mode and exam simulation available.',
  openGraph: {
    title: 'SnowPro Core Practice Quiz',
    description: 'Prepare for your Snowflake certification with confidence',
  },
}

export default function HomePage(): React.JSX.Element {
  const totalQuestions = getTotalQuestions()
  const domains = getQuestionsByDomain()

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="animate-slide-up py-8 text-center">
        <div className="animate-float mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-cyan-500 text-white shadow-lg">
          <Icons.Snowflake size={32} />
        </div>
        <h1 className="mb-3 text-4xl font-bold text-gray-900 dark:text-gray-100">
          SnowPro Core Practice
        </h1>
        <p className="mx-auto max-w-md text-lg text-gray-600 dark:text-gray-300">
          Prepare for the Snowflake COF-C02 certification exam with confidence
        </p>
      </div>

      {/* Resume ongoing session banner */}
      <ResumeSessionBanner />

      {/* Stats Cards (Client Component for localStorage stats) */}
      <ClientStats totalQuestions={totalQuestions} />

      {/* Quiz Mode Cards */}
      <QuizConfigForm domains={domains} totalQuestions={totalQuestions} />

      {/* Quick Stats Footer */}
      <ClientStatsFooter totalQuestions={totalQuestions} />
    </div>
  )
}
