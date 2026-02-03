import type { Metadata } from 'next'
import { ReviewPageClient } from '@/components/review/ReviewPageClient'

export const metadata: Metadata = {
  title: 'Review Questions | SnowPro Core Practice Quiz',
  description: 'Practice questions you got wrong or ran out of time on.',
}

export default function ReviewPage(): React.JSX.Element {
  return <ReviewPageClient />
}
