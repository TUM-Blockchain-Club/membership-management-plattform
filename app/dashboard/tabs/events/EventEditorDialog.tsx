'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { CameraIcon, SaveIcon } from 'lucide-react'
import type { DashboardEvent } from '@/app/components/dashboard/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

export type EventEditorDraft = {
  title: string
  event_type: string
  priority: string
  external_status: string
  city: string
  format: string
  image_url: string
  image_link_url: string
  interested_names: string
  attending_names: string
}

type EventEditorDialogProps = {
  event: DashboardEvent | null
  open: boolean
  saving: boolean
  uploading: boolean
  onOpenChange: (open: boolean) => void
  onSave: (eventId: string | number, draft: EventEditorDraft) => Promise<void>
  onUploadImage: (eventId: string | number, file: File) => Promise<string | null>
}

const namesToText = (names: string[]) => names.join(', ')

const toDraft = (event: DashboardEvent): EventEditorDraft => ({
  title: event.title,
  event_type: event.event_type ?? '',
  priority: event.priority ?? 'none',
  external_status: event.external_status ?? '',
  city: event.city ?? event.location ?? '',
  format: event.format ?? '',
  image_url: event.image_url ?? '',
  image_link_url: event.image_link_url ?? '',
  interested_names: namesToText(event.interested_names),
  attending_names: namesToText(event.attending_names),
})

export function EventEditorDialog({
  event,
  open,
  saving,
  uploading,
  onOpenChange,
  onSave,
  onUploadImage,
}: EventEditorDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<EventEditorDraft | null>(event ? toDraft(event) : null)

  const updateDraft = (field: keyof EventEditorDraft, value: string) => {
    setDraft((current) => current ? { ...current, [field]: value } : current)
  }

  const handleUpload = async (file: File) => {
    if (!event) return
    const imageUrl = await onUploadImage(event.id, file)
    if (imageUrl) updateDraft('image_url', imageUrl)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Edit external event</DialogTitle>
          <DialogDescription>{event?.title ?? 'External event'}</DialogDescription>
        </DialogHeader>

        {draft && (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <FieldGroup>
              {draft.image_url && (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={draft.image_url}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 640px, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <Spinner data-icon="inline-start" /> : <CameraIcon data-icon="inline-start" />}
                  {uploading ? 'Uploading...' : 'Upload image'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) void handleUpload(file)
                  }}
                />
              </div>

              <Field>
                <FieldLabel htmlFor="event-title">Title</FieldLabel>
                <Input id="event-title" value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="event-city">City</FieldLabel>
                  <Input id="event-city" value={draft.city} onChange={(event) => updateDraft('city', event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="event-type">Type</FieldLabel>
                  <Input id="event-type" value={draft.event_type} onChange={(event) => updateDraft('event_type', event.target.value)} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel>Priority</FieldLabel>
                  <Select value={draft.priority} onValueChange={(value) => updateDraft('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="P1">P1</SelectItem>
                        <SelectItem value="P2">P2</SelectItem>
                        <SelectItem value="P3">P3</SelectItem>
                        <SelectItem value="P4">P4</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="event-status">Status</FieldLabel>
                  <Input id="event-status" value={draft.external_status} onChange={(event) => updateDraft('external_status', event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="event-format">Format</FieldLabel>
                  <Input id="event-format" value={draft.format} onChange={(event) => updateDraft('format', event.target.value)} />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="event-image-url">Image URL</FieldLabel>
                <Input id="event-image-url" value={draft.image_url} onChange={(event) => updateDraft('image_url', event.target.value)} />
              </Field>

              <Field>
                <FieldLabel htmlFor="event-image-link">Image link</FieldLabel>
                <Input id="event-image-link" value={draft.image_link_url} onChange={(event) => updateDraft('image_link_url', event.target.value)} />
              </Field>

              <Field>
                <FieldLabel htmlFor="event-interested">Interested</FieldLabel>
                <Textarea id="event-interested" value={draft.interested_names} onChange={(event) => updateDraft('interested_names', event.target.value)} />
              </Field>

              <Field>
                <FieldLabel htmlFor="event-attending">Attending</FieldLabel>
                <Textarea id="event-attending" value={draft.attending_names} onChange={(event) => updateDraft('attending_names', event.target.value)} />
              </Field>
            </FieldGroup>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button onClick={() => event && draft && void onSave(event.id, draft)} disabled={saving || uploading || !draft?.title.trim()}>
            {saving ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
