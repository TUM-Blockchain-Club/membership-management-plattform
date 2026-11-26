import { BookHeartIcon } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

/** Shown while the yearbook is not set up on this server (missing service role key or database tables). */
export function YearbookUnavailable({ message }: { message: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon"><BookHeartIcon /></EmptyMedia>
        <EmptyTitle>{message}</EmptyTitle>
        <EmptyDescription>
          Nothing is lost. The IT team needs to finish the setup before members can join and write messages.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
