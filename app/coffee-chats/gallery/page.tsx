import { getCoffeeChatAdminClient } from '@/lib/coffee-chats/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Selfie Gallery</h2>
        <p className="text-white/60 text-sm">
          {validPairs.length > 0
            ? `${validPairs.length} coffee chat${validPairs.length === 1 ? '' : 's'} captured so far.`
            : 'No selfies yet — be the first to upload one after your meeting!'}
        </p>
      </div>

      {validPairs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {validPairs.map((pair) => (
            <Card key={pair.id} className="border-border bg-background/50 overflow-hidden group">
              <CardContent className="p-0 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pair.selfieUrl}
                  alt="Coffee chat selfie"
                  className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
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
    </div>
  )
}
