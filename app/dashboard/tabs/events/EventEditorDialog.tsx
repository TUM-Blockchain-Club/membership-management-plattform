'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { CameraIcon, ImageIcon, SaveIcon } from 'lucide-react'
import type { DashboardEvent } from '@/app/components/dashboard/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field'
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

export type EventEditorDraft = {
  title: string
  start_date: string
  end_date: string
  event_types: string[]
  priority: string
  external_status: string
  city: string
  formats: string[]
  image_url: string
  event_link_url: string
}

type EventEditorDialogProps = {
  event: DashboardEvent | null
  mode: 'create' | 'edit'
  open: boolean
  saving: boolean
  uploading: boolean
  onOpenChange: (open: boolean) => void
  onSave: (eventId: string | number | null, draft: EventEditorDraft) => Promise<DashboardEvent | null>
  onUploadImage: (eventId: string | number, file: File) => Promise<string | null>
}

const STATUS_OPTIONS = ['Uncertain', 'Announced', 'Registration Open', 'Registration Closed', 'Canceled', 'Past']
const TYPE_OPTIONS = ['Conference', 'Hackathon']
const FORMAT_OPTIONS = ['Co-Working', 'Virtual', 'In-Person', 'Hybrid']
const PRIORITY_OPTIONS = [
  { value: 'P1', label: 'P1 🚀' },
  { value: 'P2', label: 'P2 🔥' },
  { value: 'P3', label: 'P3 😁' },
  { value: 'P4', label: 'P4 🧐' },
]

const dateInputValue = (value: string) => {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

const splitStoredOptions = (value: string | null, options: string[]) => {
  const selected = new Set(
    (value ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  )

  return options.filter((option) => selected.has(option))
}

const emptyDraft = (): EventEditorDraft => ({
  title: '',
  start_date: '',
  end_date: '',
  event_types: [],
  priority: 'none',
  external_status: 'none',
  city: '',
  formats: [],
  image_url: '',
  event_link_url: '',
})

const toDraft = (event: DashboardEvent | null): EventEditorDraft => {
  if (!event) return emptyDraft()

  return {
    title: event.title,
    start_date: dateInputValue(event.start_at),
    end_date: dateInputValue(event.end_at),
    event_types: splitStoredOptions(event.event_type, TYPE_OPTIONS),
    priority: event.priority ?? 'none',
    external_status: event.external_status ?? 'none',
    city: event.city ?? event.location ?? '',
    formats: splitStoredOptions(event.format, FORMAT_OPTIONS),
    image_url: event.image_url ?? '',
    event_link_url: event.event_link_url ?? '',
  }
}

function MultiChoiceField({
  label,
  description,
  options,
  value,
  onChange,
}: {
  label: string
  description: string
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  const toggle = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...value, option])
      return
    }

    onChange(value.filter((item) => item !== option))
  }

  return (
    <FieldSet>
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <Field key={option} orientation="horizontal" className="rounded-lg border p-3">
            <Checkbox
              checked={value.includes(option)}
              onCheckedChange={(checked) => toggle(option, checked === true)}
            />
            <FieldContent>
              <FieldLabel>{option}</FieldLabel>
            </FieldContent>
          </Field>
        ))}
      </div>
    </FieldSet>
  )
}

export function EventEditorDialog({
  event,
  mode,
  open,
  saving,
  uploading,
  onOpenChange,
  onSave,
  onUploadImage,
}: EventEditorDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<EventEditorDraft>(() => toDraft(event))
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const isCreate = mode === 'create'

  const updateDraft = <FieldName extends keyof EventEditorDraft>(field: FieldName, value: EventEditorDraft[FieldName]) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const handleUpload = async (file: File) => {
    if (!event) {
      setPendingImageFile(file)
      return
    }

    const imageUrl = await onUploadImage(event.id, file)
    if (imageUrl) updateDraft('image_url', imageUrl)
  }

  const handleSave = async () => {
    const savedEvent = await onSave(event?.id ?? null, draft)
    if (savedEvent && pendingImageFile) {
      await onUploadImage(savedEvent.id, pendingImageFile)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{isCreate ? 'Create external event' : 'Edit external event'}</DialogTitle>
          <DialogDescription>{isCreate ? 'Add a new conference or hackathon.' : event?.title ?? 'External event'}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <FieldGroup>
            <div className="relative mx-auto flex aspect-square w-full max-w-72 items-center justify-center overflow-hidden rounded-xl border bg-muted sm:max-w-80">
              {draft.image_url ? (
                <Image
                  src={draft.image_url}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 320px, 288px"
                  className="object-contain p-3"
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon />
                  <span className="text-sm">No image selected</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Spinner data-icon="inline-start" /> : <CameraIcon data-icon="inline-start" />}
                {uploading ? 'Uploading...' : pendingImageFile ? 'Image selected' : 'Upload image'}
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

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="event-start-date">Start date</FieldLabel>
                <Input id="event-start-date" type="date" value={draft.start_date} onChange={(event) => updateDraft('start_date', event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-end-date">End date</FieldLabel>
                <Input id="event-end-date" type="date" value={draft.end_date} onChange={(event) => updateDraft('end_date', event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-city">City</FieldLabel>
                <Input id="event-city" value={draft.city} onChange={(event) => updateDraft('city', event.target.value)} />
              </Field>
            </div>

            <MultiChoiceField
              label="Type"
              description="Choose conference, hackathon, both, or leave empty."
              options={TYPE_OPTIONS}
              value={draft.event_types}
              onChange={(next) => updateDraft('event_types', next)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select value={draft.external_status} onValueChange={(value) => updateDraft('external_status', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">None</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Priority</FieldLabel>
                <Select value={draft.priority} onValueChange={(value) => updateDraft('priority', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">None</SelectItem>
                      {PRIORITY_OPTIONS.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <MultiChoiceField
              label="Format"
              description="Choose one or more formats, or leave empty."
              options={FORMAT_OPTIONS}
              value={draft.formats}
              onChange={(next) => updateDraft('formats', next)}
            />

            <Field>
              <FieldLabel htmlFor="event-link">Event link</FieldLabel>
              <Input id="event-link" value={draft.event_link_url} onChange={(event) => updateDraft('event_link_url', event.target.value)} />
            </Field>
          </FieldGroup>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || uploading || !draft.title.trim() || !draft.start_date}>
            {saving ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
            {saving ? 'Saving...' : isCreate ? 'Create event' : 'Save changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
