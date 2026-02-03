import { LoadingState } from '@/components/ui/Spinner'

export default function Loading(): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingState message="Loading..." size="lg" />
    </div>
  )
}
