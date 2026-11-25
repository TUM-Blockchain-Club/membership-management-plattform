import { PartyPopperIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { CoffeeChatPartner } from '@/lib/coffee-chats'

export function CoffeeChatPartnerSummary({ partners, meetDeadline }: { partners: CoffeeChatPartner[]; meetDeadline?: string | null }) {
  return <div className="space-y-3">
    <p className="flex items-center gap-2 font-medium"><PartyPopperIcon className="size-4 text-amber-400" aria-hidden="true" />You’re paired with</p>
    <div className="flex flex-wrap gap-x-6 gap-y-3">
      {partners.map(partner => <div key={partner.id} className="flex min-w-0 items-center gap-3">
        <Avatar className="size-11 shrink-0"><AvatarImage src={partner.picture || undefined} alt={partner.name} /><AvatarFallback>{partner.name.trim().split(/\s+/).map(part => Array.from(part)[0]).slice(0,2).join('').toUpperCase()}</AvatarFallback></Avatar>
        <div className="min-w-0"><p className="font-medium break-words">{partner.name}</p>{partner.department && <p className="text-xs text-muted-foreground">{partner.department}</p>}</div>
      </div>)}
    </div>
    {meetDeadline && <p className="text-xs text-muted-foreground">Meet by {new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Berlin'}).format(new Date(meetDeadline))}</p>}
  </div>
}
