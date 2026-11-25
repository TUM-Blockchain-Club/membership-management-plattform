import { CoffeeChatRoundDetailView } from '@/app/dashboard/tabs/coffee-chats/CoffeeChatRoundDetailView'

type PageProps = {
  params: Promise<{
    roundId: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { roundId } = await params
  return <CoffeeChatRoundDetailView roundId={roundId} />
}
