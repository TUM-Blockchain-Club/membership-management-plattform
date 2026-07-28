'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CheckIcon,
  CoffeeIcon,
  Settings2Icon,
  SparklesIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { CoffeeChatMatchPanel } from './CoffeeChatMatchPanel'
import { getCoffeeChatNextStep } from '@/lib/coffee-chats/experience'
import type { CoffeeChatHomeData } from '@/lib/coffee-chats/home'

function formatMonth(value: string): string {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value))
}

export function CoffeeChatCurrentRound({ initialData }: { initialData: CoffeeChatHomeData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSignedUp, setIsSignedUp] = useState(initialData.isSignedUp)
  const match = initialData.match
  const activeMatch = match && (
    match.pair.status !== 'met' ||
    !initialData.openRound ||
    match.round.month >= initialData.openRound.month
  )
    ? match
    : null
  const nextStep = getCoffeeChatNextStep({
    hasMatch: Boolean(activeMatch),
    isProfileComplete: initialData.isProfileComplete,
    isSignedUp,
    matchIsComplete: activeMatch?.pair.status === 'met',
    roundIsOpen: Boolean(initialData.openRound),
  })
  const completedSteps = [
    initialData.isProfileComplete,
    isSignedUp || Boolean(activeMatch),
    Boolean(activeMatch),
    activeMatch?.pair.status === 'met',
  ].filter(Boolean).length
  const displayRound = activeMatch?.round ?? initialData.openRound

  function handleSignup() {
    startTransition(async () => {
      const response = await fetch('/api/coffee-chats/signup', { method: 'POST' })
      const json = await response.json() as { ok?: boolean; alreadySignedUp?: boolean; error?: string }

      if (!response.ok || !json.ok) {
        toast.error(json.error ?? 'We could not add you to this round. Please try again.')
        return
      }

      setIsSignedUp(true)
      toast.success(
        json.alreadySignedUp
          ? 'You are already signed up for this round.'
          : 'You are in. We will email you when your match is ready.',
      )
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {displayRound ? `${formatMonth(displayRound.month)} round` : 'Current round'}
          </CardTitle>
          <CardDescription>
            {initialData.firstName ? `${initialData.firstName}, here is` : 'Here is'} your next Coffee Chat step.
          </CardDescription>
          <CardAction>
            <Badge variant={nextStep.kind === 'completed' ? 'default' : 'secondary'}>
              {nextStep.label}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Progress
            value={completedSteps * 25}
            aria-label={`${completedSteps} of 4 Coffee Chat steps completed`}
          />
          <ol className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {['Preferences', 'Joined', 'Matched', 'Met'].map((label, index) => {
              const isComplete = index < completedSteps
              const isCurrent = index === completedSteps && completedSteps < 4
              return (
                <li key={label} className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs"
                    aria-hidden="true"
                  >
                    {isComplete ? <CheckIcon /> : index + 1}
                  </span>
                  <span className={isCurrent || isComplete ? 'text-foreground' : undefined}>{label}</span>
                </li>
              )
            })}
          </ol>

          {displayRound?.meetDeadline && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClockIcon aria-hidden="true" />
              Meet by {formatDate(displayRound.meetDeadline)}
            </p>
          )}
        </CardContent>
      </Card>

      {nextStep.kind === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Start with matching preferences</CardTitle>
            <CardDescription>
              Choose at least one interest. Three to five interests usually produce a more useful match.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/coffee-chats/setup">
                <Settings2Icon data-icon="inline-start" />
                Set matching preferences
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {nextStep.kind === 'join' && initialData.openRound && (
        <Card>
          <CardHeader>
            <CardTitle>Join the {formatMonth(initialData.openRound.month)} round</CardTitle>
            <CardDescription>
              We will create the pairings after signup closes and send your match by email.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {initialData.openRound.signupDeadline && (
              <p className="text-sm text-muted-foreground">
                Signup closes {formatDate(initialData.openRound.signupDeadline)}.
              </p>
            )}
            <Button onClick={handleSignup} disabled={isPending} size="lg" className="w-full sm:w-fit">
              {isPending ? <Spinner data-icon="inline-start" /> : <CoffeeIcon data-icon="inline-start" />}
              {isPending ? 'Joining…' : 'Join this round'}
            </Button>
          </CardContent>
        </Card>
      )}

      {nextStep.kind === 'waiting' && (
        <Card>
          <CardHeader>
            <CardTitle>You are signed up</CardTitle>
            <CardDescription>
              There is nothing else to do right now. We will email you as soon as your match is ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <SparklesIcon aria-hidden="true" />
              Pairing is pending.
            </p>
          </CardContent>
        </Card>
      )}

      {(nextStep.kind === 'match' || nextStep.kind === 'completed') && activeMatch && (
        <CoffeeChatMatchPanel initialMatch={activeMatch} />
      )}

      {nextStep.kind === 'idle' && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CoffeeIcon /></EmptyMedia>
            <EmptyTitle>No round is open</EmptyTitle>
            <EmptyDescription>
              Your preferences are ready. The next Coffee Chat round normally opens at the start of the month.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link href="/coffee-chats/setup">Review preferences</Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  )
}
