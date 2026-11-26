'use client'

import { format } from 'date-fns'
import { MessageSquareHeartIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { YearbookReceivedEntry } from '@/lib/yearbook'
import { YearbookMemberPhoto } from './YearbookMemberPhoto'

export function YearbookReceived({ entries }: { entries: YearbookReceivedEntry[] }) {
  if (entries.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><MessageSquareHeartIcon /></EmptyMedia>
          <EmptyTitle>No messages yet</EmptyTitle>
          <EmptyDescription>
            When other members write about you, their messages show up here. Writing for others is a good way to start.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="columns-1 gap-4 sm:columns-2 [&>*]:mb-4">
      {entries.map((entry) => (
        <Card key={entry.id} className="break-inside-avoid gap-3 py-4">
          <CardContent className="flex flex-col gap-3 px-4">
            <div className="flex items-center gap-3">
              <YearbookMemberPhoto name={entry.author.name} src={entry.author.pictureUrl} className="size-9 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.author.name}</p>
                <time className="text-xs text-muted-foreground" dateTime={entry.updatedAt}>
                  {format(new Date(entry.updatedAt), 'd MMM yyyy')}
                </time>
              </div>
              {!entry.isPrintable && (
                <Badge variant="outline" className="text-muted-foreground" title="The author has not joined the yearbook">
                  Not printed
                </Badge>
              )}
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed">{entry.body}</p>
            {entry.photoUrl && (
              // Signed Supabase URLs cannot use the static next/image allowlist.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.photoUrl} alt={`Photo from ${entry.author.name}`} loading="lazy" className="w-full rounded-md object-cover" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
