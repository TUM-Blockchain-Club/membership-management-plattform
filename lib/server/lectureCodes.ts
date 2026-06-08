import 'server-only'

import { randomBytes } from 'crypto'

export const LECTURE_ACTIVE_WINDOW_MS = 3 * 60 * 60 * 1000 // 3 hours
export const CODE_VALIDITY_MS = 30 * 1000 // 30 seconds — covers one rotation plus grace
export const CODE_ROTATION_MS = 15 * 1000 // 15 seconds

// 6 characters, uppercase letters + digits (no 0/O/1/I to reduce confusion).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const generateLectureCode = (length = 6): string => {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return out
}

export const isLectureWindowActive = (startedAt: string | null | undefined): boolean => {
  if (!startedAt) return false
  const started = Date.parse(startedAt)
  if (!Number.isFinite(started)) return false
  return Date.now() - started < LECTURE_ACTIVE_WINDOW_MS
}

export const isCodeWithinValidity = (
  codeAt: string | null | undefined
): boolean => {
  if (!codeAt) return false
  const issued = Date.parse(codeAt)
  if (!Number.isFinite(issued)) return false
  return Date.now() - issued < CODE_VALIDITY_MS
}
