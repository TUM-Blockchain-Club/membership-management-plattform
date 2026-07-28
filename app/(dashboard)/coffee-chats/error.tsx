'use client'

import { useEffect } from 'react'
import { AlertCircleIcon, RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

export default function CoffeeChatsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[coffee-chats] route failed', error)
  }, [error])

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon"><AlertCircleIcon /></EmptyMedia>
        <EmptyTitle>Coffee Chats could not be loaded</EmptyTitle>
        <EmptyDescription>
          Your data was not changed. Retry the page; if it still fails, contact the IT team.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={reset}>
          <RotateCcwIcon data-icon="inline-start" />
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  )
}

