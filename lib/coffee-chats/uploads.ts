export const MAX_SELFIE_BYTES = 5 * 1024 * 1024

export type SelfieImageType = {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  extension: 'jpg' | 'png' | 'webp'
}

const INVALID_IMAGE_MESSAGE = 'The selected file is not a valid JPEG, PNG, or WebP image.'

export function validateSelfieUpload(bytes: Uint8Array, declaredType: string): SelfieImageType {
  if (bytes.byteLength > MAX_SELFIE_BYTES) {
    throw new Error('Selfies must be 5 MB or smaller.')
  }

  const detected = detectImageType(bytes)

  if (!detected || detected.contentType !== declaredType) {
    throw new Error(INVALID_IMAGE_MESSAGE)
  }

  return detected
}

function detectImageType(bytes: Uint8Array): SelfieImageType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpg' }
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType: 'image/png', extension: 'png' }
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return { contentType: 'image/webp', extension: 'webp' }
  }

  return null
}
