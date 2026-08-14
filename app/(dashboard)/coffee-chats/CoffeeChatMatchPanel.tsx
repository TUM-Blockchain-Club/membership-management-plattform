'use client'

import { useRef, useState, useTransition } from 'react'
import { CameraIcon, CheckCircleIcon, CoffeeIcon, MapPinIcon, StarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { CoffeeChatMatch } from '@/lib/coffee-chats/home'
import { dateToCalendarDate } from '@/lib/coffee-chats/rounds'
import { isCoffeeChatsDemoClient } from '@/lib/coffee-chats/demo'

export function CoffeeChatMatchPanel({ initialMatch }: { initialMatch: CoffeeChatMatch }) {
  const [match, setMatch] = useState(initialMatch)
  const [rating, setRating] = useState(initialMatch.pair.rating ? String(initialMatch.pair.rating) : '')
  const [highlightNote, setHighlightNote] = useState(initialMatch.pair.highlightNote ?? '')
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const postMeetingSelfieRef = useRef<HTMLInputElement>(null)
  const hasMet = match.pair.status === 'met'

  function submitMeeting(intent: 'complete-meeting' | 'upload-selfie', file = selfieFile) {
    startTransition(async () => {
      if (isCoffeeChatsDemoClient()) {
        setMatch((current) => ({
          ...current,
          pair: {
            ...current.pair,
            status: intent === 'complete-meeting' ? 'met' : current.pair.status,
            rating: rating ? Number(rating) : current.pair.rating,
            highlightNote: highlightNote.trim() || current.pair.highlightNote,
          },
        }))
        toast.success(intent === 'complete-meeting' ? 'Demo meeting completed.' : 'Demo selfie selected.')
        return
      }

      const form = new FormData()
      form.append('pairId', match.pair.id)
      form.append('intent', intent)
      if (intent === 'complete-meeting') {
        form.append('dateMet', dateToCalendarDate(new Date()))
        if (rating) form.append('rating', rating)
        if (highlightNote.trim()) form.append('highlightNote', highlightNote.trim())
      }
      if (file) form.append('selfie', file)

      const response = await fetch('/api/coffee-chats/log-meeting', { method: 'POST', body: form })
      const json = await response.json() as { ok?: boolean; error?: string; selfieUrl?: string }

      if (!response.ok || !json.ok) {
        toast.error(json.error ?? 'We could not save the meeting. Please try again.')
        return
      }

      setMatch((current) => ({
        ...current,
        pair: {
          ...current.pair,
          status: intent === 'complete-meeting' ? 'met' : current.pair.status,
          selfieUrl: json.selfieUrl ?? current.pair.selfieUrl,
          rating: rating ? Number(rating) : current.pair.rating,
          highlightNote: highlightNote.trim() || current.pair.highlightNote,
        },
      }))
      setSelfieFile(null)
      toast.success(intent === 'complete-meeting' ? 'Meeting completed.' : 'Selfie uploaded.')
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">Your match</h3>
          <p className="text-sm text-muted-foreground">
            You already have enough context to send a message and find a time to meet.
          </p>
        </div>
        <Badge variant={hasMet ? 'default' : 'secondary'}>{hasMet ? 'Met' : 'Ready to meet'}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {match.partners.map((partner) => (
          <Card key={partner.id}>
            <CardHeader>
              <CardTitle>{partner.name}</CardTitle>
              {partner.department && <CardDescription>{partner.department}</CardDescription>}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {partner.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {partner.interests.map((interest) => (
                    <Badge key={interest} variant="outline">{interest}</Badge>
                  ))}
                </div>
              )}
              {partner.favouriteCoffee && (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CoffeeIcon aria-hidden="true" />
                  <span>Usually orders <span className="text-foreground">{partner.favouriteCoffee}</span>.</span>
                </p>
              )}
              {partner.favouriteSpots.length > 0 && (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPinIcon aria-hidden="true" />
                  <span>Likes <span className="text-foreground">{partner.favouriteSpots.join(', ')}</span>.</span>
                </p>
              )}
              {partner.funFact && (
                <p className="text-sm text-muted-foreground">
                  Fun fact: <span className="text-foreground">{partner.funFact}</span>
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {match.pair.icebreakers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation starters</CardTitle>
            <CardDescription>Pick one if you want an easy first message.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm text-muted-foreground">
              {match.pair.icebreakers.map((question) => <li key={question}>{question}</li>)}
            </ol>
          </CardContent>
        </Card>
      )}

      {match.pair.selfieUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Your Coffee Chat selfie</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Private, short-lived Supabase URL cannot use a static Next Image host allowlist. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={match.pair.selfieUrl}
              alt={`Coffee Chat from the ${match.round.month} round`}
              className="aspect-video w-full max-w-xl rounded-xl object-cover"
            />
          </CardContent>
        </Card>
      )}

      {!hasMet && (
        <Card>
          <CardHeader>
            <CardTitle>Complete the meeting</CardTitle>
            <CardDescription>
              This is the only action that marks the Coffee Chat as completed. Rating, highlight, and selfie are optional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Rating (optional)</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={rating}
                  onValueChange={setRating}
                  aria-label="Coffee Chat rating"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <ToggleGroupItem key={value} value={String(value)} aria-label={`${value} star${value === 1 ? '' : 's'}`}>
                      <StarIcon data-icon="inline-start" className={Number(rating) >= value ? 'fill-current' : undefined} />
                      {value}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>

              <Field>
                <FieldLabel htmlFor="coffee-chat-highlight">Highlight (optional)</FieldLabel>
                <Textarea
                  id="coffee-chat-highlight"
                  value={highlightNote}
                  onChange={(event) => setHighlightNote(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="What was the most interesting thing you talked about?"
                />
                <FieldDescription>{highlightNote.length}/500 characters</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="coffee-chat-selfie">Selfie (optional)</FieldLabel>
                <Input
                  id="coffee-chat-selfie"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setSelfieFile(event.target.files?.[0] ?? null)}
                />
                <FieldDescription>JPEG, PNG, or WebP up to 5 MB.</FieldDescription>
              </Field>

              <Button onClick={() => submitMeeting('complete-meeting')} disabled={isPending} size="lg" className="w-full sm:w-fit">
                {isPending ? <Spinner data-icon="inline-start" /> : <CheckCircleIcon data-icon="inline-start" />}
                {isPending ? 'Completing…' : 'Mark meeting complete'}
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {hasMet && !match.pair.selfieUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Add a selfie</CardTitle>
            <CardDescription>The meeting is already complete. Uploading a photo will not change its status.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              ref={postMeetingSelfieRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setSelfieFile(event.target.files?.[0] ?? null)}
              aria-label="Select Coffee Chat selfie"
            />
            <Button
              variant="outline"
              onClick={() => submitMeeting('upload-selfie')}
              disabled={isPending || !selfieFile}
              className="w-full sm:w-fit"
            >
              {isPending ? <Spinner data-icon="inline-start" /> : <CameraIcon data-icon="inline-start" />}
              {isPending ? 'Uploading…' : 'Upload selfie'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
