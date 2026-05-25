import {
  CalendarDaysIcon,
  EyeIcon,
  type LucideIcon,
  MapPinIcon,
  TicketIcon,
  UserRoundCheckIcon,
  UsersIcon,
} from 'lucide-react'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type InternalEventCardProps = {
  title: string
  date: string
  time: string
  location: string
  description: string
  organizer: string
  maxAttendees: number | null
  currentAttendees: number | null
  hasApplyButton: boolean
  isApplied: boolean
  onApply?: () => void
  showParticipantsButton?: boolean
  onViewParticipants?: () => void
}

type ExternalEventCardProps = {
  title: string
  date: string
  location: string
  eventType: string | null
  priority: string | null
  status: string | null
  format: string | null
  imageUrl: string | null
  interestedNames: string[]
  attendingNames: string[]
}

function DetailRow({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
      <Icon className="shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  )
}

function PeopleSummary({ label, names }: { label: string; names: string[] }) {
  if (names.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="line-clamp-2 text-sm text-foreground">{names.join(', ')}</p>
    </div>
  )
}

function priorityFrameClass(priority: string | null) {
  const normalized = priority?.trim().toUpperCase()

  if (normalized === 'P1') {
    return 'bg-[linear-gradient(135deg,#f43f5e,#f97316,#eab308,#22c55e,#06b6d4,#6366f1,#a855f7)] p-px'
  }

  if (normalized === 'P2') {
    return 'bg-purple-500/70 p-px'
  }

  return ''
}

export function InternalEventCard({
  title,
  date,
  time,
  location,
  description,
  organizer,
  maxAttendees,
  currentAttendees,
  hasApplyButton,
  isApplied,
  onApply,
  showParticipantsButton,
  onViewParticipants,
}: InternalEventCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <CalendarDaysIcon />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{title}</CardTitle>
            <CardDescription className="truncate">{organizer}</CardDescription>
          </div>
        </div>
        {showParticipantsButton && onViewParticipants && (
          <CardAction>
            <Button variant="ghost" size="icon-sm" onClick={onViewParticipants} title="View participants">
              <EyeIcon />
              <span className="sr-only">View participants</span>
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <DetailRow icon={CalendarDaysIcon}>{date}</DetailRow>
          <DetailRow icon={TicketIcon}>{time}</DetailRow>
          <DetailRow icon={MapPinIcon}>{location}</DetailRow>
        </div>

        <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>
      </CardContent>

      <CardFooter className="justify-between gap-3">
        {maxAttendees ? (
          <Badge variant="secondary" className="tabular-nums">
            <UsersIcon data-icon="inline-start" />
            {currentAttendees || 0}/{maxAttendees}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No capacity limit</span>
        )}

        {hasApplyButton && (
          <Button variant={isApplied ? 'destructive' : 'default'} size="sm" onClick={onApply}>
            <UserRoundCheckIcon data-icon="inline-start" />
            {isApplied ? 'Deregister' : 'Apply'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export function ExternalEventCard({
  title,
  date,
  location,
  eventType,
  priority,
  status,
  format,
  imageUrl,
  interestedNames,
  attendingNames,
}: ExternalEventCardProps) {
  const frameClass = priorityFrameClass(priority)

  return (
    <div className={cn('h-full rounded-xl', frameClass)}>
      <Card className={cn('h-full', frameClass && 'ring-0')} size="sm">
        {imageUrl && (
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        <CardHeader>
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <TicketIcon />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{title}</CardTitle>
              <CardDescription className="truncate">{location}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {eventType && <Badge variant="secondary">{eventType}</Badge>}
            {status && <Badge variant="outline">{status}</Badge>}
            {format && <Badge variant="outline">{format}</Badge>}
          </div>

          <div className="flex flex-col gap-2">
            <DetailRow icon={CalendarDaysIcon}>{date}</DetailRow>
            <DetailRow icon={MapPinIcon}>{location}</DetailRow>
          </div>

          {(interestedNames.length > 0 || attendingNames.length > 0) && (
            <>
              <Separator />
              <div className="flex flex-col gap-3">
                <PeopleSummary label="Interested" names={interestedNames} />
                <PeopleSummary label="Attending" names={attendingNames} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
