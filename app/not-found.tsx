import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <EmptyState
        icon="AlertCircle"
        title="Page Not Found"
        description="The page you're looking for doesn't exist or has been moved."
      />
      <Link href="/">
        <Button variant="primary">
          <Icons.Home size={18} />
          Back to Home
        </Button>
      </Link>
    </div>
  )
}
