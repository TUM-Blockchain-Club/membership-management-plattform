'use client'

import Link from 'next/link'
import { use } from 'react'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleIcon,
  CoffeeIcon,
  HexagonIcon,
  MapPinIcon,
  UserRoundIcon,
} from 'lucide-react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
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
        <Card>
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
          <CardContent>
            <p className="max-w-2xl text-base leading-relaxed text-foreground">
              {coffeeChat.description}
            </p>
          </CardContent>
          <CardFooter className="justify-end">
            <Button asChild>
              <Link href={coffeeChat.href}>
                {coffeeChat.action}
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRoundIcon aria-hidden="true" />
              Your profile
            </CardTitle>
            <CardDescription>{completedProfileItems} of {checklist.length} key details completed</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
          <CardFooter className="justify-end">
            <Button asChild variant="outline">
              <Link href="/profile">
                Edit profile
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.5fr)]">
        <Card className="lg:row-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDaysIcon aria-hidden="true" />
              Upcoming events
            </CardTitle>
            <CardDescription>The next two opportunities to meet and build with the community.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => {
                const location = event.city || event.location

                return (
                  <article key={event.id} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
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
                  </article>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events yet.</p>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button asChild variant="outline">
              <Link href="/events">
                View all events
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HexagonIcon aria-hidden="true" />
              Membership NFT
            </CardTitle>
            <CardDescription>Your digital TUM Blockchain Club membership collectible.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Apply for your NFT or follow the review and minting status of your existing request.
            </p>
          </CardContent>
          <CardFooter className="justify-end">
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
