'use client'

import { useState } from 'react'
import { resetAllData } from '@/lib/storage'
import { Button, Icons } from '@/components/ui'

interface ResetDataButtonProps {
  onReset?: () => void
}

export function ResetDataButton({ onReset }: ResetDataButtonProps): React.JSX.Element {
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = (): void => {
    if (window.confirm('Reset all quiz data? This cannot be undone.')) {
      setIsResetting(true)
      resetAllData()
      onReset?.()
      setIsResetting(false)
    }
  }

  return (
    <Button onClick={handleReset} disabled={isResetting} variant="danger" size="sm">
      <Icons.XCircle size={18} />
      Reset Data
    </Button>
  )
}
