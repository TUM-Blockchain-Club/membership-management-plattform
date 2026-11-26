'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { InfoIcon, Trash2Icon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import {
  YEARBOOK_MAX_ENTRY_LENGTH,
  type YearbookMemberSummary,
  type YearbookWrittenEntry,
} from '@/lib/yearbook'
import { YearbookMemberPhoto } from './YearbookMemberPhoto'
import { EMPTY_PHOTO_VALUE, YearbookPhotoField, type YearbookPhotoValue } from './YearbookPhotoField'
import { yearbookRequest } from './yearbookClient'

export function YearbookEntryDialog({
  member,
  entry,
  writable,
  onClose,
  onSaved,
}: {
  member: YearbookMemberSummary
  entry: YearbookWrittenEntry | null
  writable: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [body, setBody] = useState(entry?.body ?? '')
  const [photo, setPhoto] = useState<YearbookPhotoValue>(EMPTY_PHOTO_VALUE)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const busy = saving || deleting
  const firstName = member.name.split(' ')[0]
  const trimmedLength = body.trim().length
  const dirty = body !== (entry?.body ?? '') || photo.file !== null || photo.removed

  async function save() {
    setSaving(true)
    try {
      const form = new FormData()
      form.set('subjectId', String(member.id))
      form.set('body', body)
      if (photo.file) form.set('photo', photo.file)
      if (photo.removed) form.set('removePhoto', 'true')
      await yearbookRequest('/api/yearbook/entries', { method: 'POST', body: form })
      toast.success(entry ? `Updated your message for ${firstName}.` : `Saved your message for ${firstName}.`)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your message.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!entry) return
    setDeleting(true)
    try {
      await yearbookRequest(`/api/yearbook/entries/${entry.id}`, { method: 'DELETE' })
      toast.success(`Deleted your message for ${firstName}.`)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete your message.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden p-0" showCloseButton={!busy}>
        <DialogHeader className="shrink-0 border-b p-5 pr-12">
          <div className="flex items-center gap-3">
            <YearbookMemberPhoto name={member.name} src={member.pictureUrl} className="size-11 text-sm" />
            <div className="min-w-0 text-left">
              <DialogTitle className="truncate">{entry ? 'Your message for' : 'Write for'} {member.name}</DialogTitle>
              <DialogDescription className="truncate">{member.department || 'TBC member'}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {!member.isParticipant && (
            <Alert>
              <InfoIcon />
              <AlertDescription>
                {firstName} hasn&apos;t joined the yearbook yet. Your message is saved and will only be printed if they join.
              </AlertDescription>
            </Alert>
          )}

          <Field>
            <FieldLabel htmlFor="yearbook-entry-body">Message</FieldLabel>
            <Textarea
              id="yearbook-entry-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={YEARBOOK_MAX_ENTRY_LENGTH}
              rows={6}
              disabled={!writable || busy}
              placeholder={`A memory, an inside joke or what you'll miss about ${firstName}…`}
            />
            <FieldDescription className="flex justify-between gap-3">
              <span>
                {member.isParticipant
                  ? `${firstName} can read it on their yearbook page before it goes to print.`
                  : 'Keep it kind: it ends up in print.'}
              </span>
              <span className="tabular-nums">{body.length}/{YEARBOOK_MAX_ENTRY_LENGTH}</span>
            </FieldDescription>
          </Field>

          <YearbookPhotoField
            label="Photo (optional)"
            description="A picture of the two of you or a shared memory. Location data is removed on upload."
            currentUrl={entry?.photoUrl ?? null}
            value={photo}
            onChange={setPhoto}
            onError={(message) => toast.error(message)}
            disabled={!writable || busy}
          />
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 sm:justify-between">
          {entry && writable ? (
            <Button variant="outline" className="text-destructive" onClick={remove} disabled={busy}>
              <Trash2Icon data-icon="inline-start" />
              {deleting ? 'Deleting…' : 'Delete message'}
            </Button>
          ) : <span />}
          {writable ? (
            <Button onClick={save} disabled={busy || trimmedLength === 0 || !dirty}>
              {saving ? 'Saving…' : entry ? 'Save changes' : 'Save message'}
            </Button>
          ) : (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
