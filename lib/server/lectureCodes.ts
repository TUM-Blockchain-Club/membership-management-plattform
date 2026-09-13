import 'server-only'

export const LECTURE_ACTIVE_WINDOW_MS = 3 * 60 * 60 * 1000

export const isLectureWindowActive = (startedAt: string | null | undefined): boolean => {
  if (!startedAt) return false
  const started = Date.parse(startedAt)
  if (!Number.isFinite(started)) return false
  const age = Date.now() - started
  return age >= 0 && age < LECTURE_ACTIVE_WINDOW_MS
}
