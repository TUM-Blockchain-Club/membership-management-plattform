import { coffeeChatsDemoEnabled, demoGallery } from '@/lib/coffee-chats'
import { getCoffeeChatAdminClient } from '@/lib/server/coffeeChats'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CoffeeChatsGalleryView, type GalleryItem } from '@/app/dashboard/tabs/coffee-chats/CoffeeChatsGalleryView'

interface GalleryPair {
  id: string
  selfie_path: string
  date_met: string | null
  highlight_note: string | null
  round: { month: string } | { month: string }[] | null
}

export default async function GalleryPage() {
  if (coffeeChatsDemoEnabled) {
    const demoItems: GalleryItem[] = demoGallery.map((pair) => ({
      id: pair.id,
      selfieUrl: pair.selfie_url,
      highlight_note: pair.highlight_note,
      round: pair.round,
    }))
    return <CoffeeChatsGalleryView pairs={demoItems} />
  }

  const admin = getCoffeeChatAdminClient()
  if (!admin) {
    return (
      <Card className="max-w-lg">
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

  const validPairs: GalleryItem[] = (
    await Promise.all(
      ((pairs ?? []) as unknown as GalleryPair[]).map(async (pair) => {
        const { data } = await admin.storage
          .from('coffee-chat-selfies')
          .createSignedUrl(pair.selfie_path, 60 * 60)
        if (!data?.signedUrl) return null

        const round = Array.isArray(pair.round) ? pair.round[0] ?? null : pair.round
        return {
          id: pair.id,
          selfieUrl: data.signedUrl,
          highlight_note: pair.highlight_note,
          round,
        }
      }),
    )
  ).filter((pair): pair is GalleryItem => pair !== null)

  return <CoffeeChatsGalleryView pairs={validPairs} />
}
