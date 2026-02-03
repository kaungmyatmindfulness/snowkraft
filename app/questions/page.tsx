import type { Metadata } from 'next'
import { listQuestionsEnhanced, getAllTopics, getTopicsByDomain } from '@/lib/data/questions'
import { QuestionsPageClient } from '@/components/questions/QuestionsPageClient'
import type { Difficulty, QuestionType } from '@/types'

export const metadata: Metadata = {
  title: 'Question Browser | SnowPro Core Practice Quiz',
  description:
    'Browse and search all SnowPro Core practice questions by domain, topic, and difficulty.',
}

interface QuestionsPageProps {
  searchParams: Promise<{
    search?: string
    domain?: string
    difficulty?: string
    topic?: string
    type?: string
    progress?: string
    page?: string
  }>
}

export default async function QuestionsPage({
  searchParams,
}: QuestionsPageProps): Promise<React.JSX.Element> {
  const params = await searchParams
  const { search, domain, difficulty, topic, type, progress, page } = params

  const currentPage = page !== undefined && page !== '' ? parseInt(page, 10) : 1

  const result = listQuestionsEnhanced({
    ...(domain !== undefined && domain !== '' ? { domain } : {}),
    ...(difficulty !== undefined && difficulty !== ''
      ? { difficulty: difficulty as Difficulty }
      : {}),
    ...(topic !== undefined && topic !== '' ? { topic } : {}),
    ...(type !== undefined && type !== '' ? { questionType: type as QuestionType } : {}),
    ...(search !== undefined && search !== '' ? { search } : {}),
    page: currentPage,
    pageSize: 25,
  })

  const topics = getAllTopics()
  const topicsByDomain = getTopicsByDomain()

  return (
    <QuestionsPageClient
      questions={result.items}
      allMatchingIds={result.allMatchingIds}
      pagination={{
        page: result.page,
        totalPages: result.totalPages,
        totalCount: result.totalCount,
        pageSize: result.pageSize,
      }}
      topics={topics}
      topicsByDomain={topicsByDomain}
      progressFilter={progress}
    />
  )
}
