'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlusIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { prepareYearbookPhoto } from './yearbookClient'

export type YearbookPhotoValue = {
  /** Newly chosen, already resized photo. */
  file: File | null
  /** Object URL for previewing `file`; owned and revoked by YearbookPhotoField. */
  previewUrl: string | null
  /** The saved photo should be removed. */
  removed: boolean
}

export const EMPTY_PHOTO_VALUE: YearbookPhotoValue = { file: null, previewUrl: null, removed: false }

/** Photo picker with preview. Shows the saved photo until it is replaced or removed. */
export function YearbookPhotoField({
  label,
  description,
  currentUrl,
  value,
  onChange,
  onError,
  disabled,
  aspect = 'aspect-[4/3]',
}: {
  label: string
  description?: string
  currentUrl: string | null
  value: YearbookPhotoValue
  onChange: (value: YearbookPhotoValue) => void
  onError: (message: string) => void
  disabled?: boolean
  aspect?: string
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preparing, setPreparing] = useState(false)
  const latestPreview = useRef<string | null>(null)
  useEffect(() => {
    latestPreview.current = value.previewUrl
  }, [value.previewUrl])
  // Release the last local preview when the field goes away.
  useEffect(() => () => {
    if (latestPreview.current) URL.revokeObjectURL(latestPreview.current)
  }, [])

  const shownUrl = value.previewUrl ?? (value.removed ? null : currentUrl)

  function replaceValue(next: YearbookPhotoValue) {
    if (value.previewUrl && value.previewUrl !== next.previewUrl) URL.revokeObjectURL(value.previewUrl)
    onChange(next)
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setPreparing(true)
    try {
      const prepared = await prepareYearbookPhoto(file)
      replaceValue({ file: prepared, previewUrl: URL.createObjectURL(prepared), removed: false })
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not use that photo.')
    } finally {
      setPreparing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div
        className={cn(
          'relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/30',
          aspect,
        )}
      >
        {shownUrl ? (
          // Local object URLs and signed URLs cannot use next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
            <ImagePlusIcon className="size-6" />
            No photo yet
          </div>
        )}
        {preparing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Spinner />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || preparing}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || preparing}
          onClick={() => inputRef.current?.click()}
        >
          {shownUrl ? <RefreshCwIcon data-icon="inline-start" /> : <ImagePlusIcon data-icon="inline-start" />}
          {shownUrl ? 'Replace photo' : 'Add photo'}
        </Button>
        {shownUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || preparing}
            onClick={() => replaceValue({ file: null, previewUrl: null, removed: Boolean(currentUrl) })}
          >
            <Trash2Icon data-icon="inline-start" />
            Remove
          </Button>
        )}
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}
