'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ErrorState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps): React.JSX.Element {
  useEffect(() => {
    // Log error to console (add Sentry or similar for production error tracking)
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <ErrorState
        title="Something went wrong"
        description="An unexpected error occurred. Please try again or return to the home page."
        onRetry={reset}
      />
      <Link href="/" className="mt-4">
        <Button variant="ghost">
          <Icons.Home size={18} />
          Go Home
        </Button>
      </Link>
    </div>
  )
}
