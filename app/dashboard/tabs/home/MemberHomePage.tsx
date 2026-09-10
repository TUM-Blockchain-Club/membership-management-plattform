'use client'

import Link from 'next/link'
import Image from 'next/image'
import { use } from 'react'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleIcon,
  CoffeeIcon,
  HexagonIcon,
  MapPinIcon,
} from 'lucide-react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Progress } from '@/components/ui/progress'
import { getCoffeeChatNextStep, type CoffeeChatHomeData } from '@/lib/coffee-chats'

const PROFILE_CHECKLIST = [
  { key: 'Picture', label: 'Profile photo' },
  { key: 'Area of Expertise', label: 'Area of expertise' },
  { key: 'Linkedin', label: 'LinkedIn' },
] as const

function hasValue(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
}

function firstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] || 'Member'
}

function initials(name: string | null | undefined) {
  return name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'TBC'
}

function formatMonth(value: string | null | undefined) {
  if (!value) return null
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return value

  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function getCoffeeChatOverview(data: CoffeeChatHomeData | null) {
  if (!data) {
    return {
      action: 'Open Coffee Chats',
      description: 'Check the current round and update your matching preferences.',
      href: '/coffee-chats',
      label: 'Coffee Chats',
    }
  }

  const activeMatch = data.match && (
    data.match.pair.status !== 'met' ||
    !data.openRound ||
    data.match.round.month >= data.openRound.month
  ) ? data.match : null
  const nextStep = getCoffeeChatNextStep({
    hasMatch: Boolean(activeMatch),
    isProfileComplete: data.isProfileComplete,
    isSignedUp: data.isSignedUp,
    matchIsComplete: activeMatch?.pair.status === 'met',
    roundIsOpen: Boolean(data.openRound),
  })
  const round = activeMatch?.round ?? data.openRound

  const descriptions = {
    completed: 'Your meeting is logged. See your match details and shared memories.',
    idle: 'Your preferences are ready. The next round will appear here when it opens.',
    join: `Your preferences are ready. Join the ${formatMonth(round?.month) ?? 'current'} round.`,
    match: `Your ${formatMonth(round?.month) ?? 'Coffee Chat'} match is ready.`,
    preferences: 'Add your interests and favourite spots so we can find a fitting match.',
    waiting: 'You are signed up. We will notify you as soon as your match is ready.',
  }

  return {
    action: nextStep.kind === 'match'
      ? 'View your match'
      : nextStep.kind === 'preferences'
        ? 'Set preferences'
        : 'Open Coffee Chats',
    description: descriptions[nextStep.kind],
    href: nextStep.kind === 'match' || nextStep.kind === 'completed'
      ? '/coffee-chats/my-match'
      : nextStep.href ?? '/coffee-chats',
    label: nextStep.label,
  }
}

export function MemberHomePage({
  coffeeChatData,
  currentTime,
}: {
  coffeeChatData: CoffeeChatHomeData | null
  currentTime: string
}) {
  const dashboard = use(DashboardContext)!
  const member = dashboard.member
  const checklist = PROFILE_CHECKLIST.map((item) => ({
    ...item,
    complete: hasValue(member?.[item.key]),
  }))
  const completedProfileItems = checklist.filter((item) => item.complete).length
  const profileProgress = Math.round((completedProfileItems / checklist.length) * 100)
  const coffeeChat = getCoffeeChatOverview(coffeeChatData)
  const pictureUrl = dashboard.getPictureUrl(member?.Picture)
  const now = Date.parse(currentTime)
  const upcomingEvents = dashboard.events.filter((event) => {
    const end = Date.parse(event.end_at)
    return Number.isNaN(end) || end >= now
  }).slice(0, 2)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {firstName(member?.Name)}
        </h1>
        <div className="flex flex-wrap gap-2">
          {member?.Role && <Badge variant="secondary">{member.Role}</Badge>}
          {member?.Department && <Badge variant="outline">{member.Department}</Badge>}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="h-full ring-sidebar-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CoffeeIcon aria-hidden="true" />
              Coffee Chats
            </CardTitle>
            <CardDescription>Your next step in the monthly member matching.</CardDescription>
            <CardAction>
              <Badge variant="secondary">{coffeeChat.label}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="max-w-2xl text-base leading-relaxed text-foreground">
              {coffeeChat.description}
            </p>
          </CardContent>
          <CardFooter className="mt-auto justify-end border-sidebar-border bg-muted/30">
            <Button asChild>
              <Link href={coffeeChat.href}>
                {coffeeChat.action}
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="h-full ring-sidebar-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                {pictureUrl && <AvatarImage src={pictureUrl} alt={member?.Name || 'Member'} />}
                <AvatarFallback>{initials(member?.Name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2">
                  Your profile
                </CardTitle>
                <CardDescription>{completedProfileItems} of {checklist.length} key details completed</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <Progress value={profileProgress} aria-label={`Profile ${profileProgress}% complete`} />
            <ul className="flex flex-col gap-2">
              {checklist.map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  {item.complete
                    ? <CheckCircle2Icon className="size-4 text-foreground" aria-hidden="true" />
                    : <CircleIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
                  <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="mt-auto justify-end border-sidebar-border bg-muted/30">
            <Button asChild variant="outline">
              <Link href="/profile">
                Edit profile
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="h-full ring-sidebar-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDaysIcon aria-hidden="true" />
              Upcoming events
            </CardTitle>
            <CardDescription>The next two opportunities to meet and build with the community.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => {
                const location = event.city || event.location
                const eventSummary = (
                  <article className="flex gap-3 rounded-lg bg-muted/40 p-3 ring-1 ring-sidebar-border transition-colors group-hover:bg-muted/60">
                    {event.image_url && (
                      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-32">
                        <Image
                          src={event.image_url}
                          alt=""
                          fill
                          sizes="128px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium text-foreground">{event.title}</p>
                        {event.event_type && <Badge variant="outline">{event.event_type}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dashboard.formatEventDate(event.start_at, event.end_at)}
                      </p>
                      {location && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPinIcon className="size-4" aria-hidden="true" />
                          {location}
                        </p>
                      )}
                    </div>
                  </article>
                )

                return event.event_link_url ? (
                  <a
                    key={event.id}
                    href={event.event_link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {eventSummary}
                  </a>
                ) : (
                  <div key={event.id}>{eventSummary}</div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events yet.</p>
            )}
          </CardContent>
          <CardFooter className="mt-auto justify-end border-sidebar-border bg-muted/30">
            <Button asChild variant="outline">
              <Link href="/events">
                View all events
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="h-full ring-sidebar-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HexagonIcon aria-hidden="true" />
              Membership NFT
            </CardTitle>
            <CardDescription>Your digital TUM Blockchain Club membership collectible.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Apply for your NFT or follow the review and minting status of your existing request.
            </p>
          </CardContent>
          <CardFooter className="mt-auto justify-end border-sidebar-border bg-muted/30">
            <Button asChild variant="outline">
              <Link href="/nft-status">
                View NFT status
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  )
}
