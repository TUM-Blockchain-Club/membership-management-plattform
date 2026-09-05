'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { ImagesIcon } from 'lucide-react'

export interface GalleryItem {
  id: string
  selfieUrl: string
  highlight_note: string | null
  round: { month: string } | null
}

export function CoffeeChatsGalleryView({ pairs }: { pairs: GalleryItem[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">Coffee Chat gallery</h3>
        <p className="text-sm text-muted-foreground">
          {pairs.length > 0
            ? `${pairs.length} coffee chat${pairs.length === 1 ? '' : 's'} captured so far.`
            : 'No selfies yet — be the first to upload one after your meeting!'}
        </p>
      </div>

      {pairs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {pairs.map((pair) => (
            <Card key={pair.id} className="overflow-hidden py-0">
              <CardContent className="p-0 relative">
                {/* Private, short-lived Supabase URL cannot use a static Next Image host allowlist. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pair.selfieUrl}
                  alt={`Coffee Chat from ${pair.round?.month ?? 'a past round'}`}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-black/75 p-3">
                  {pair.round?.month && (
                    <p className="text-white text-xs font-medium">{pair.round.month}</p>
                  )}
                  {pair.highlight_note && (
                    <p className="text-white/80 text-xs mt-0.5 line-clamp-2">{pair.highlight_note}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pairs.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ImagesIcon /></EmptyMedia>
            <EmptyTitle>No selfies yet</EmptyTitle>
            <EmptyDescription>
              Photos appear here after members complete a Coffee Chat and upload a selfie.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
