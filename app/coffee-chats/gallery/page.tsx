import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'

interface GalleryPair {
  id: string
  selfie_url: string
  date_met: string | null
  highlight_note: string | null
  round: { month: string } | null
}

export default async function GalleryPage() {
  const supabase = await createSupabaseServerClient()
  const admin = getSupabaseAdminClient()
  const dataClient = admin ?? supabase

  const { data: pairs } = await dataClient
    .from('cc_pairs')
    .select('id, selfie_url, date_met, highlight_note, round:cc_rounds(month)')
    .not('selfie_url', 'is', null)
    .eq('status', 'met')
    .order('created_at', { ascending: false })
    .limit(60)

  const validPairs = (pairs ?? []).filter(
    (p): p is GalleryPair => typeof p.selfie_url === 'string' && p.selfie_url.length > 0
  )

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
                  src={pair.selfie_url}
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
