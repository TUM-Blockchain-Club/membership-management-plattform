'use client'

import { YEARBOOK_MAX_UPLOAD_BYTES, YEARBOOK_PHOTO_MAX_EDGE } from '@/lib/yearbook'

/** Sends a request to the yearbook API and throws the server's message on failure. */
export async function yearbookRequest<T = { ok: true }>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init })
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare the photo.'))), 'image/jpeg', quality)
  })
}

/**
 * Downscales a photo in the browser before upload so phone photos stay under the
 * upload limit. The server re-encodes again and strips all metadata.
 */
export async function prepareYearbookPhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error('Choose an image file.')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error("Your browser can't read this photo format. Try a JPEG or PNG.")
  }

  const scale = Math.min(1, YEARBOOK_PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the photo.')
  // JPEG has no transparency; print on white rather than black.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  let quality = 0.9
  let blob = await canvasToBlob(canvas, quality)
  while (blob.size > YEARBOOK_MAX_UPLOAD_BYTES && quality > 0.5) {
    quality -= 0.15
    blob = await canvasToBlob(canvas, quality)
  }
  if (blob.size > YEARBOOK_MAX_UPLOAD_BYTES) throw new Error('This photo is too large. Try a smaller one.')

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}

export function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'TBC'
  )
}

