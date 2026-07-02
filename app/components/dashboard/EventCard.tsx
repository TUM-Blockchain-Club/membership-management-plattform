import {
  CalendarDaysIcon,
  EyeIcon,
  ExternalLinkIcon,
  GlobeIcon,
  MessageCircleIcon,
  PencilIcon,
  StarIcon,
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
  isPending?: boolean
  onApply?: () => void
  canEdit?: boolean
  onEdit?: () => void
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
  imageLinkUrl: string | null
  attendingNames: string[]
  canEdit?: boolean
  onEdit?: () => void
  // Interest / application features
  tallyUrl: string | null
  whatsappUrl: string | null
  interestCount: number
  isInterested: boolean
  onToggleInterest?: () => void
  onViewInterestedMembers?: () => void
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
  isPending,
  onApply,
  canEdit,
  onEdit,
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
        {((showParticipantsButton && onViewParticipants) || (canEdit && onEdit)) && (
          <CardAction>
            <div className="flex items-center gap-0.5">
              {canEdit && onEdit && (
                <Button variant="ghost" size="icon-sm" onClick={onEdit} title="Edit event">
                  <PencilIcon />
                  <span className="sr-only">Edit event</span>
                </Button>
              )}
              {showParticipantsButton && onViewParticipants && (
                <Button variant="ghost" size="icon-sm" onClick={onViewParticipants} title="View participants">
                  <EyeIcon />
                  <span className="sr-only">View participants</span>
                </Button>
              )}
            </div>
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
          <Button
            variant={isApplied ? 'destructive' : isPending ? 'secondary' : 'default'}
            size="sm"
            onClick={onApply}
            disabled={isPending}
          >
            <UserRoundCheckIcon data-icon="inline-start" />
            {isApplied ? 'Registered' : isPending ? 'Pending' : 'Apply'}
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
  imageLinkUrl,
  attendingNames,
  canEdit,
  onEdit,
  tallyUrl,
  whatsappUrl,
  interestCount,
  isInterested,
  onToggleInterest,
  onViewInterestedMembers,
}: ExternalEventCardProps) {
  const frameClass = priorityFrameClass(priority)
  const image = imageUrl ? (
    <div className="relative aspect-square w-full overflow-hidden bg-card">
      <Image
        src={imageUrl}
        alt=""
        fill
        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
        className="object-contain p-2"
        unoptimized
      />
    </div>
  ) : null

  return (
    <div className={cn('h-full rounded-xl', frameClass)}>
      <Card className={cn('h-full', frameClass && 'ring-0')} size="sm">
        {imageLinkUrl && image ? (
          <a href={imageLinkUrl} target="_blank" rel="noreferrer" className="block">
            {image}
          </a>
        ) : (
          image
        )}

        <CardHeader>
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{title}</CardTitle>
              <CardDescription className="truncate">{location}</CardDescription>
            </div>
          </div>
          {(imageLinkUrl || (canEdit && onEdit)) && (
            <CardAction>
              <div className="flex items-center gap-0.5">
                {imageLinkUrl && (
                  <Button variant="ghost" size="icon-sm" asChild title="Open event website">
                    <a href={imageLinkUrl} target="_blank" rel="noreferrer">
                      <GlobeIcon />
                      <span className="sr-only">Open event website</span>
                    </a>
                  </Button>
                )}
                {canEdit && onEdit && (
                  <Button variant="ghost" size="icon-sm" onClick={onEdit} title="Edit event">
                    <PencilIcon />
                    <span className="sr-only">Edit event</span>
                  </Button>
                )}
              </div>
            </CardAction>
          )}
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

          {attendingNames.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-col gap-3">
                <PeopleSummary label="Attending" names={attendingNames} />
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-2">
          {/* Interest count + toggle — always visible */}
          <div className="flex w-full items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 tabular-nums"
              onClick={onViewInterestedMembers}
              title="See who's interested"
            >
              <UsersIcon className="size-4 shrink-0" />
              {interestCount} interested
            </Button>
            {onToggleInterest && (
              <Button
                variant={isInterested ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleInterest}
                aria-pressed={isInterested}
                className="ml-auto"
              >
                <StarIcon
                  data-icon="inline-start"
                  className={cn('size-4', isInterested && 'fill-current')}
                />
                {isInterested ? 'Interested' : "I'm Interested"}
              </Button>
            )}
          </div>

          {(tallyUrl || whatsappUrl) && (
            // Apply + WhatsApp row — shown whenever at least one link is set
            <div className="flex w-full gap-2">
              {tallyUrl && (
                <Button asChild size="sm" className="flex-1">
                  <a href={tallyUrl} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon data-icon="inline-start" />
                    Apply Now
                  </a>
                </Button>
              )}
              {whatsappUrl && (
                <Button asChild variant="outline" size="sm" className="flex-1" title="Join WhatsApp group">
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">
                    <MessageCircleIcon data-icon="inline-start" />
                    WhatsApp
                  </a>
                </Button>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
