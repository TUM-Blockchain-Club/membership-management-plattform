import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getSignupError, type CoffeeChatRoundSummary } from '@/lib/coffee-chats'

export function CoffeeChatNextRoundNotice({ round, isSignedUp, profileIsComplete, onJoin, pending = false }: {
  round: CoffeeChatRoundSummary
  isSignedUp: boolean
  profileIsComplete: boolean
  onJoin?: () => void
  pending?: boolean
}) {
  const closed = Boolean(getSignupError({status:round.status,signupDeadline:round.signupDeadline}))
  const month = new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${round.month}-01T12:00:00Z`))
  return <div id="next-round" className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
    <p className="font-medium">{isSignedUp ? `You’re signed up for ${month}` : closed ? `${month} signups have closed` : `${month} signups are open`}</p>
    {round.signupDeadline && <p className="text-xs text-muted-foreground">Signup deadline: {new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin',timeZoneName:'short'}).format(new Date(round.signupDeadline))}</p>}
    {!isSignedUp && !closed && (profileIsComplete && onJoin
      ? <Button size="sm" onClick={onJoin} disabled={pending}>{pending ? 'Joining…' : 'Join next round'}</Button>
      : <Button size="sm" variant="outline" asChild><Link href={profileIsComplete ? '/coffee-chats#next-round' : '/coffee-chats/setup'}>{profileIsComplete ? 'Join next round' : 'Set preferences to join'}</Link></Button>)}
  </div>
}
