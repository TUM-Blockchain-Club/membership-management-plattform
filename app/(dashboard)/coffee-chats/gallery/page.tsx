import { getCoffeeChatAdminClient } from '@/lib/coffee-chats/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { ImagesIcon } from 'lucide-react'

interface GalleryPair {
  id: string
  selfie_path: string
  date_met: string | null
  highlight_note: string | null
  round: { month: string } | { month: string }[] | null
}

export default async function GalleryPage() {
  const admin = getCoffeeChatAdminClient()
  if (!admin) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Gallery unavailable</CardTitle>
          <CardDescription>The server-side Supabase client is not configured.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { data: pairs } = await admin
    .from('cc_pairs')
    .select('id, selfie_path, date_met, highlight_note, round:cc_rounds(month)')
    .not('selfie_path', 'is', null)
    .eq('status', 'met')
    .order('created_at', { ascending: false })
    .limit(60)

  const validPairs = (
    await Promise.all(
      ((pairs ?? []) as unknown as GalleryPair[]).map(async (pair) => {
        const { data } = await admin.storage
          .from('coffee-chat-selfies')
          .createSignedUrl(pair.selfie_path, 60 * 60)
        if (!data?.signedUrl) return null

        const round = Array.isArray(pair.round) ? pair.round[0] ?? null : pair.round
        return { ...pair, round, selfieUrl: data.signedUrl }
      }),
    )
  ).filter((pair) => pair !== null)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">Coffee Chat gallery</h3>
        <p className="text-sm text-muted-foreground">
          {validPairs.length > 0
            ? `${validPairs.length} coffee chat${validPairs.length === 1 ? '' : 's'} captured so far.`
            : 'No selfies yet — be the first to upload one after your meeting!'}
        </p>
      </div>

      {validPairs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {validPairs.map((pair) => (
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

      {validPairs.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ImagesIcon /></EmptyMedia>
            <EmptyTitle>No selfies yet</EmptyTitle>
            <EmptyDescription>
              Photos appear here after members complete a Coffee Chat and choose to share one.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
