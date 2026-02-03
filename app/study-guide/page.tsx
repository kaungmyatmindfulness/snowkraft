import Link from 'next/link'
import { getAllStudyGuides } from '@/lib/data/study-guides'
import { Card, CardHeader, CardTitle, CardContent, DomainBadge, Icons } from '@/components/ui'

export const dynamic = 'force-static'

/**
 * Get the appropriate icon for a study guide based on its slug
 */
function getStudyGuideIcon(slug: string): React.JSX.Element {
  if (slug.startsWith('domain-')) {
    return <Icons.Layers size={24} className="text-purple-500" />
  }
  // Exam guide pages
  return <Icons.FileText size={24} className="text-amber-500" />
}

/**
 * Get the domain badge key from a slug (e.g., 'domain-1' -> 'D1')
 */
function getDomainKey(slug: string): string | null {
  const match = /^domain-(\d+)/.exec(slug)
  const domainNumber = match?.[1]
  if (domainNumber !== undefined) {
    return `D${domainNumber}`
  }
  return null
}

/**
 * Get stagger animation class based on index
 */
function getStaggerClass(index: number): string {
  const staggerMap: Record<number, string> = {
    0: 'stagger-1',
    1: 'stagger-2',
    2: 'stagger-3',
    3: 'stagger-4',
  }
  return staggerMap[index % 4] ?? 'stagger-1'
}

export default function StudyGuidePage(): React.JSX.Element {
  const studyGuides = getAllStudyGuides()

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="animate-slide-up">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-cyan-500 text-white shadow-lg">
            <Icons.BookOpen size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Study Guides</h1>
        </div>
        <p className="max-w-2xl text-gray-600 dark:text-gray-300">
          Comprehensive study materials for the SnowPro Core (COF-C02) certification exam. Master
          each domain with detailed guides covering key concepts, best practices, and exam-specific
          tips.
        </p>
      </div>

      {/* Study Guide Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {studyGuides.map((guide, index) => {
          const domainKey = getDomainKey(guide.slug)

          return (
            <Link
              key={guide.slug}
              href={`/study-guide/${guide.slug}`}
              className={`animate-slide-up ${getStaggerClass(index)}`}
            >
              <Card
                variant="interactive"
                className="h-full border border-transparent transition-colors hover:border-sky-500 dark:bg-slate-800 dark:hover:border-sky-400"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700">
                        {getStudyGuideIcon(guide.slug)}
                      </div>
                      <CardTitle className="text-base">{guide.title}</CardTitle>
                    </div>
                    {domainKey !== null && <DomainBadge domain={domainKey} size="sm" />}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                    {guide.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Footer Navigation */}
      <div className="animate-slide-up stagger-4 flex justify-center pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400"
        >
          <Icons.Home size={16} />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
