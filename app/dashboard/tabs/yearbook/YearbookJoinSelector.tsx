'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BookHeartIcon, CheckIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { YearbookEdition } from '@/lib/yearbook'
import { yearbookRequest } from './yearbookClient'

type Choice = 'join' | 'skip'

const OPTIONS: Array<{ value: Choice; title: string; description: string; icon: typeof CheckIcon }> = [
  {
    value: 'join',
    title: 'Yes, include me',
    description:
      'You get your own yearbook page with a photo, a quote and the messages other members write about you. You can write messages for anyone in TBC.',
    icon: CheckIcon,
  },
  {
    value: 'skip',
    title: 'Not this time',
    description: "You won't get a page and can't write messages. You can change your mind until the yearbook closes.",
    icon: XIcon,
  },
]

export function YearbookJoinSelector({ edition, participantCount }: { edition: YearbookEdition; participantCount: number }) {
  const router = useRouter()
  const [choice, setChoice] = useState<Choice | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, startTransition] = useTransition()
  const busy = saving || refreshing

  async function confirm() {
    if (choice === 'skip') {
      setSkipped(true)
      return
    }
    setSaving(true)
    try {
      await yearbookRequest('/api/yearbook/participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'join' }),
      })
      toast.success(`Welcome to ${edition.title}!`)
      startTransition(() => router.refresh())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not join the yearbook.')
    } finally {
      setSaving(false)
    }
  }

  if (skipped) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No problem, you&apos;re not in {edition.title}</CardTitle>
          <CardDescription>
            Nothing was saved. If you change your mind before the yearbook closes, you can still join.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={() => { setSkipped(false); setChoice('join') }}>
            I changed my mind
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookHeartIcon className="size-5 text-primary" />
          Would you like to be part of {edition.title}?
        </CardTitle>
        <CardDescription>
          Like a school yearbook: members write messages about each other and we print it at the end.
          {participantCount > 0 && ` ${participantCount} member${participantCount === 1 ? ' has' : 's have'} joined so far.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div role="radiogroup" aria-label="Join the yearbook" className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map(({ value, title, description, icon: Icon }) => {
            const selected = choice === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={busy}
                onClick={() => setChoice(value)}
                className={cn(
                  'flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
                  selected ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                    )}
                  >
                    {selected && <Icon className="size-3" />}
                  </span>
                  {title}
                </span>
                <span className="text-sm text-muted-foreground">{description}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Only pages of members who join are printed, with messages from other members who joined.
        </p>
        <Button onClick={confirm} disabled={!choice || busy}>
          {busy ? 'Saving…' : choice === 'skip' ? 'Confirm' : 'Join the yearbook'}
        </Button>
      </CardFooter>
    </Card>
  )
}
