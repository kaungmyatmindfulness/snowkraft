'use client'

import dynamic from 'next/dynamic'

const MarkdownRenderer = dynamic(
  () => import('@/components/study-guide/MarkdownRenderer').then((mod) => mod.MarkdownRenderer),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse rounded-sm bg-gray-100 dark:bg-slate-800" />,
  }
)

interface MarkdownRendererWrapperProps {
  content: string
}

export function MarkdownRendererWrapper({
  content,
}: MarkdownRendererWrapperProps): React.JSX.Element {
  return <MarkdownRenderer content={content} />
}
