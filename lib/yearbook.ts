// Shared Yearbook types, limits and pure rules. Safe to import on the client.

export const YEARBOOK_MAX_ENTRY_LENGTH = 600
export const YEARBOOK_MAX_QUOTE_LENGTH = 200
export const YEARBOOK_MAX_TITLE_LENGTH = 80
/** Uploads are resized in the browser first; this stays under Vercel's 4.5 MB body limit. */
export const YEARBOOK_MAX_UPLOAD_BYTES = 4 * 1024 * 1024
/** Long edge after resizing. ~2400 px prints sharply at roughly 20 cm wide. */
export const YEARBOOK_PHOTO_MAX_EDGE = 2400
export const YEARBOOK_PHOTO_BUCKET = 'yearbook-photos'
/** Members with these statuses are no longer part of the club and cannot be written about. */
export const YEARBOOK_EXCLUDED_STATUSES = ['Left', 'Kicked out'] as const

export type YearbookEditionStatus = 'open' | 'closed'

export type YearbookEdition = {
  id: string
  title: string
  status: YearbookEditionStatus
  closesAt: string | null
  createdAt: string
}

export type YearbookMemberSummary = {
  id: number
  name: string
  department: string | null
  pictureUrl: string | null
  isParticipant: boolean
}

export type YearbookWrittenEntry = {
  id: string
  subjectId: number
  body: string
  photoUrl: string | null
  updatedAt: string
}

export type YearbookReceivedEntry = {
  id: string
  author: { id: number; name: string; pictureUrl: string | null }
  body: string
  photoUrl: string | null
  updatedAt: string
  /** False while the author has not joined (or has left); such messages are not printed. */
  isPrintable: boolean
}

export type YearbookParticipation = {
  joinedAt: string
  quote: string | null
  portraitUrl: string | null
}

export type YearbookHomeData = {
  viewer: { memberId: number; name: string; pictureUrl: string | null }
  canManage: boolean
  edition: YearbookEdition | null
  isWritable: boolean
  participation: YearbookParticipation | null
  participantCount: number
  members: YearbookMemberSummary[]
  written: YearbookWrittenEntry[]
  received: YearbookReceivedEntry[]
}

export type YearbookExportMessage = {
  id: string
  authorId: number
  authorName: string
  body: string
  photoUrl: string | null
  createdAt: string
  updatedAt: string
}

export type YearbookExportPage = {
  memberId: number
  name: string
  department: string | null
  quote: string | null
  /** Yearbook portrait if uploaded, otherwise the member profile picture. */
  portraitUrl: string | null
  messages: YearbookExportMessage[]
}

export type YearbookExport = {
  edition: YearbookEdition
  generatedAt: string
  participantCount: number
  messageCount: number
  pages: YearbookExportPage[]
}

export type YearbookAdminEntry = {
  id: string
  authorName: string
  subjectName: string
  body: string
  hasPhoto: boolean
  isPrintable: boolean
  updatedAt: string
}

export type YearbookAdminParticipant = {
  memberId: number
  name: string
  department: string | null
  joinedAt: string
  hasPortrait: boolean
  hasQuote: boolean
  printableReceived: number
  written: number
}

export type YearbookAdminData = {
  editions: Array<YearbookEdition & { participantCount: number; entryCount: number }>
  selected: YearbookEdition | null
  participants: YearbookAdminParticipant[]
  entries: YearbookAdminEntry[]
  stats: { participants: number; entries: number; printableEntries: number; photos: number }
}

export class YearbookValidationError extends Error {}

export function isEditionWritable(
  edition: Pick<YearbookEdition, 'status' | 'closesAt'> | null,
  now = new Date(),
): boolean {
  if (!edition || edition.status !== 'open') return false
  return !edition.closesAt || new Date(edition.closesAt).getTime() > now.getTime()
}

export function parseEntryBody(value: unknown): string {
  const body = typeof value === 'string' ? value.trim() : ''
  if (!body) throw new YearbookValidationError('Write a message before saving.')
  if (body.length > YEARBOOK_MAX_ENTRY_LENGTH) {
    throw new YearbookValidationError(`Messages can be at most ${YEARBOOK_MAX_ENTRY_LENGTH} characters.`)
  }
  return body
}

export function parseQuote(value: unknown): string | null {
  const quote = typeof value === 'string' ? value.trim() : ''
  if (quote.length > YEARBOOK_MAX_QUOTE_LENGTH) {
    throw new YearbookValidationError(`Quotes can be at most ${YEARBOOK_MAX_QUOTE_LENGTH} characters.`)
  }
  return quote || null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function parseMemberId(value: unknown): number {
  const id = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isSafeInteger(id) || id <= 0) throw new YearbookValidationError('Choose a valid member.')
  return id
}

export function parseEditionInput(value: unknown): { title: string; closesAt: string | null } {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) throw new YearbookValidationError('Give the yearbook a title.')
  if (title.length > YEARBOOK_MAX_TITLE_LENGTH) {
    throw new YearbookValidationError(`Titles can be at most ${YEARBOOK_MAX_TITLE_LENGTH} characters.`)
  }
  return { title, closesAt: parseOptionalDate(input.closesAt) }
}

export function parseOptionalDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new YearbookValidationError('Choose a valid closing date.')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new YearbookValidationError('Choose a valid closing date.')
  return date.toISOString()
}

export function isWritableSubjectStatus(status: string | null | undefined): boolean {
  return !YEARBOOK_EXCLUDED_STATUSES.includes(status as typeof YEARBOOK_EXCLUDED_STATUSES[number])
}

type ExportParticipant = {
  memberId: number
  name: string
  department: string | null
  quote: string | null
  portraitUrl: string | null
}

type ExportEntry = {
  id: string
  authorId: number
  subjectId: number
  body: string
  photoUrl: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Builds the print structure: one page per participant, containing only messages
 * whose author is also a participant. Pages and messages are sorted for a stable print.
 */
export function buildYearbookPages(participants: ExportParticipant[], entries: ExportEntry[]): YearbookExportPage[] {
  const byId = new Map(participants.map((participant) => [participant.memberId, participant]))
  const messagesBySubject = new Map<number, YearbookExportMessage[]>()

  for (const entry of entries) {
    const author = byId.get(entry.authorId)
    if (!author || !byId.has(entry.subjectId) || entry.authorId === entry.subjectId) continue
    const list = messagesBySubject.get(entry.subjectId) ?? []
    list.push({
      id: entry.id,
      authorId: entry.authorId,
      authorName: author.name,
      body: entry.body,
      photoUrl: entry.photoUrl,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })
    messagesBySubject.set(entry.subjectId, list)
  }

  return [...participants]
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
    .map((participant) => ({
      memberId: participant.memberId,
      name: participant.name,
      department: participant.department,
      quote: participant.quote,
      portraitUrl: participant.portraitUrl,
      messages: (messagesBySubject.get(participant.memberId) ?? []).sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      ),
    }))
}

/** Escapes a CSV cell and neutralises spreadsheet formulas (=, +, -, @, tab, CR). */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const YEARBOOK_CSV_HEADER = [
  'page_member_id',
  'page_name',
  'page_department',
  'page_quote',
  'page_portrait_url',
  'message_id',
  'author_name',
  'message',
  'message_photo_url',
  'message_created_at',
] as const

/** One row per printable message; participants without messages still get one row for their page. */
export function toYearbookCsv(pages: YearbookExportPage[]): string {
  const rows: string[] = [YEARBOOK_CSV_HEADER.join(',')]
  for (const page of pages) {
    const pageCells = [page.memberId, page.name, page.department, page.quote, page.portraitUrl]
    if (page.messages.length === 0) {
      rows.push([...pageCells, '', '', '', '', ''].map(csvCell).join(','))
      continue
    }
    for (const message of page.messages) {
      rows.push([
        ...pageCells,
        message.id,
        message.authorName,
        message.body,
        message.photoUrl,
        message.createdAt,
      ].map(csvCell).join(','))
    }
  }
  // BOM so Excel opens UTF-8 names and umlauts correctly.
  return `﻿${rows.join('\r\n')}\r\n`
}

export function yearbookExportFileName(edition: Pick<YearbookEdition, 'title'>, extension: 'csv' | 'json'): string {
  const slug = edition.title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'yearbook'
  return `${slug}.${extension}`
}
