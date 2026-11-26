'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { LogOutIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { YEARBOOK_MAX_QUOTE_LENGTH, type YearbookHomeData, type YearbookParticipation } from '@/lib/yearbook'
import { YearbookMemberPhoto } from './YearbookMemberPhoto'
import { EMPTY_PHOTO_VALUE, YearbookPhotoField, type YearbookPhotoValue } from './YearbookPhotoField'
import { yearbookRequest } from './yearbookClient'

export function YearbookMyPage({
  viewer,
  participation,
  receivedCount,
  writable,
  onChanged,
}: {
  viewer: YearbookHomeData['viewer']
  participation: YearbookParticipation
  receivedCount: number
  writable: boolean
  onChanged: () => void
}) {
  const [quote, setQuote] = useState(participation.quote ?? '')
  const [portrait, setPortrait] = useState<YearbookPhotoValue>(EMPTY_PHOTO_VALUE)
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const busy = saving || leaving
  const previewPortrait = portrait.previewUrl ?? (portrait.removed ? viewer.pictureUrl : participation.portraitUrl ?? viewer.pictureUrl)
  const dirty = quote !== (participation.quote ?? '') || portrait.file !== null || portrait.removed

  async function save() {
    setSaving(true)
    try {
      const form = new FormData()
      form.set('quote', quote)
      if (portrait.file) form.set('portrait', portrait.file)
      if (portrait.removed) form.set('removePortrait', 'true')
      await yearbookRequest('/api/yearbook/profile', { method: 'POST', body: form })
      toast.success('Your yearbook page is saved.')
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your page.')
    } finally {
      setSaving(false)
    }
  }

  async function leave() {
    setLeaving(true)
    try {
      await yearbookRequest('/api/yearbook/participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'leave' }),
      })
      toast.success('You left the yearbook.')
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not leave the yearbook.')
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Your page</CardTitle>
          <CardDescription>This is what goes next to the messages about you in the printed yearbook.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <YearbookPhotoField
            label="Yearbook photo"
            description={
              participation.portraitUrl
                ? 'Your yearbook photo. Location data was removed on upload.'
                : 'If you skip this, we use your profile picture.'
            }
            currentUrl={participation.portraitUrl}
            value={portrait}
            onChange={setPortrait}
            onError={(message) => toast.error(message)}
            disabled={!writable || busy}
            aspect="aspect-square max-w-64"
          />
          <Field>
            <FieldLabel htmlFor="yearbook-quote">Your quote</FieldLabel>
            <Textarea
              id="yearbook-quote"
              value={quote}
              onChange={(event) => setQuote(event.target.value)}
              maxLength={YEARBOOK_MAX_QUOTE_LENGTH}
              rows={3}
              disabled={!writable || busy}
              placeholder="A motto, a favourite saying or your best TBC moment"
            />
            <FieldDescription className="flex justify-end tabular-nums">
              {quote.length}/{YEARBOOK_MAX_QUOTE_LENGTH}
            </FieldDescription>
          </Field>
        </CardContent>
        {writable && (
          <CardFooter className="flex flex-wrap justify-between gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground" disabled={busy}>
                  <LogOutIcon data-icon="inline-start" />
                  Leave yearbook
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave the yearbook?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your page, quote and yearbook photo are removed and you won&apos;t be printed. Messages you wrote stay
                    saved but are left out of the print unless you join again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Stay</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={leave}>Leave yearbook</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={save} disabled={busy || !dirty}>{saving ? 'Saving…' : 'Save page'}</Button>
          </CardFooter>
        )}
      </Card>

      <Card className="bg-muted/20">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            {receivedCount === 0
              ? 'No messages about you yet. They will appear here as members write them.'
              : `${receivedCount} message${receivedCount === 1 ? '' : 's'} written about you so far.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-background p-6 text-center">
            <YearbookMemberPhoto
              name={viewer.name}
              src={previewPortrait}
              rounded="lg"
              className="size-32 text-2xl"
            />
            <p className="text-lg font-semibold">{viewer.name}</p>
            {quote.trim() ? (
              <p className="max-w-sm text-sm italic text-muted-foreground">&ldquo;{quote.trim()}&rdquo;</p>
            ) : (
              <p className="text-sm text-muted-foreground">Add a quote to make your page yours.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
