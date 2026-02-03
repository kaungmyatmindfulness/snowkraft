import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getStudyGuideBySlug,
  getAllStudyGuideSlugs,
  getAllStudyGuides,
  parseDomainFromSlug,
  getPartsForDomain,
} from '@/lib/data/study-guides'
import { Card } from '@/components/ui/Card'
import { Icons } from '@/components/ui'
import { cn } from '@/lib/utils'
import { MarkdownRendererWrapper } from '@/components/study-guide/MarkdownRendererWrapper'

export const dynamic = 'force-static'
export const revalidate = false

interface StudyGuidePageProps {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams(): { slug: string }[] {
  const slugs = getAllStudyGuideSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: StudyGuidePageProps): Promise<Metadata> {
  const { slug } = await params
  const guide = getStudyGuideBySlug(slug)

  if (guide === undefined) {
    return {
      title: 'Study Guide Not Found',
    }
  }

  const title =
    guide.partTitle !== undefined
      ? `${guide.title} - ${guide.partTitle} | SnowPro Core Study Guide`
      : `${guide.title} | SnowPro Core Study Guide`

  return {
    title,
    description: guide.description,
  }
}

export default async function StudyGuidePage({
  params,
}: StudyGuidePageProps): Promise<React.JSX.Element> {
  const { slug } = await params
  const guide = getStudyGuideBySlug(slug)

  if (guide === undefined) {
    notFound()
  }

  const domainNumber = parseDomainFromSlug(slug)

  // Build sidebar items: domain parts when viewing a domain, top-level list otherwise
  const sidebarItems: { slug: string; title: string }[] =
    domainNumber !== null
      ? getPartsForDomain(domainNumber).map((p) => ({ slug: p.slug, title: p.title }))
      : getAllStudyGuides().map((g) => ({ slug: g.slug, title: g.title }))

  const sidebarHeading = domainNumber !== null ? guide.title : 'Study Guides'

  return (
    <div className="flex gap-8">
      {/* Sidebar - hidden on mobile, visible on lg+ */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <nav className="sticky top-24">
          <Card variant="bordered" padding="sm">
            <div className="mb-2 p-2">
              <h2 className="text-sm font-semibold tracking-wider text-gray-900 uppercase dark:text-gray-100">
                {sidebarHeading}
              </h2>
            </div>
            <ul className="space-y-1">
              {sidebarItems.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/study-guide/${item.slug}`}
                    className={cn(
                      'block rounded-lg px-3 py-2 text-sm transition-colors',
                      item.slug === slug
                        ? 'bg-sky-100 font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200'
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/study-guide"
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400"
          >
            <Icons.ChevronLeft size={16} />
            Back to Study Guides
          </Link>

          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {guide.title}
          </h1>
          {guide.partTitle !== undefined && (
            <h2 className="mb-2 text-xl font-semibold text-gray-700 dark:text-gray-300">
              {guide.partTitle}
            </h2>
          )}
          <p className="text-lg text-gray-600 dark:text-gray-400">{guide.description}</p>
        </div>

        {/* Content Card */}
        <Card variant="bordered" padding="lg">
          <MarkdownRendererWrapper content={guide.content} />
        </Card>
      </main>
    </div>
  )
}
