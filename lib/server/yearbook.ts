import 'server-only'

import { cache } from 'react'
import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPictureUrl } from '@/app/dashboard/lib/memberUtils'
import { getRequestMember } from '@/lib/server/requestMember'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import {
  buildYearbookPages,
  isEditionWritable,
  isWritableSubjectStatus,
  YEARBOOK_MAX_UPLOAD_BYTES,
  YEARBOOK_PHOTO_BUCKET,
  YEARBOOK_PHOTO_MAX_EDGE,
  type YearbookEdition,
  type YearbookEditionStatus,
  type YearbookExport,
  type YearbookAdminData,
  type YearbookHomeData,
  YearbookValidationError,
} from '@/lib/yearbook'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, 'public', any>

export class YearbookError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

/** The server or database is missing yearbook setup; pages show a "not set up" state instead of crashing. */
export class YearbookSetupError extends YearbookError {
  constructor(reason: string) {
    super("The yearbook isn't set up on this server yet.", 503)
    console.error(`[yearbook] setup incomplete: ${reason}`)
  }
}

// PostgREST: table not in schema cache; Postgres: undefined table.
const MISSING_TABLE_CODES = new Set(['PGRST205', '42P01'])

function editionLoadError(error: { code?: string }): YearbookError {
  return MISSING_TABLE_CODES.has(error.code ?? '')
    ? new YearbookSetupError('yearbook tables are missing; apply supabase/yearbook.sql')
    : new YearbookError('Could not load the yearbook.', 503)
}

const PHOTO_URL_SECONDS = 60 * 60
export const EXPORT_PHOTO_URL_SECONDS = 7 * 24 * 60 * 60

type EditionRow = { id: string; title: string; status: YearbookEditionStatus; closes_at: string | null; created_at: string }
type ParticipantRow = { member_id: number; quote: string | null; portrait_path: string | null; joined_at: string }
type EntryRow = {
  id: string
  author_id: number
  subject_id: number
  body: string
  photo_path: string | null
  created_at: string
  updated_at: string
}
type DirectoryRow = { id: number; Name: string | null; Department: string | null; Picture: unknown; Status: string | null }

export const EDITION_COLUMNS = 'id, title, status, closes_at, created_at'
const ENTRY_COLUMNS = 'id, author_id, subject_id, body, photo_path, created_at, updated_at'

export function toEdition(row: EditionRow): YearbookEdition {
  return { id: row.id, title: row.title, status: row.status, closesAt: row.closes_at, createdAt: row.created_at }
}

function getAdminClient(): AdminClient {
  const admin = getSupabaseAdminClient() as AdminClient | null
  if (!admin) throw new YearbookSetupError('SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) must be set')
  return admin
}

export type YearbookViewer = {
  admin: AdminClient
  memberId: number
  name: string
  email: string | null
  pictureUrl: string | null
  canManage: boolean
}

/** Resolves the signed-in member and their yearbook admin right. Cached per request. */
export const getYearbookViewer = cache(async (): Promise<YearbookViewer | null> => {
  const { member } = await getRequestMember()
  if (!member) return null
  const admin = getAdminClient()
  const email = member['TBC Email'] ?? null
  const { data: canManage } = email
    ? await admin.rpc('check_email_has_admin_scope', { check_email: email, check_scope: 'yearbook' })
    : { data: false }
  return {
    admin,
    memberId: member.id,
    name: member.Name?.trim() || 'Member',
    email,
    pictureUrl: getPictureUrl(member.Picture),
    canManage: canManage === true,
  }
})

export async function requireYearbookViewer(): Promise<YearbookViewer> {
  const viewer = await getYearbookViewer()
  if (!viewer) throw new YearbookError('Sign in with your member account.', 401)
  return viewer
}

export async function requireYearbookAdmin(): Promise<YearbookViewer> {
  const viewer = await requireYearbookViewer()
  if (!viewer.canManage) throw new YearbookError('Only yearbook admins can do this.', 403)
  return viewer
}

/** The open edition, or the most recent closed one so members can still read it. */
export async function loadCurrentEdition(admin: AdminClient): Promise<YearbookEdition | null> {
  const { data, error } = await admin
    .from('yb_editions')
    .select(EDITION_COLUMNS)
    .order('status', { ascending: false }) // 'open' sorts after 'closed', so descending puts it first
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw editionLoadError(error)
  return data ? toEdition(data as EditionRow) : null
}

/** The open edition that still accepts changes, or a 400 explaining why not. */
export async function requireWritableEdition(admin: AdminClient): Promise<YearbookEdition> {
  const edition = await loadCurrentEdition(admin)
  if (!edition || edition.status !== 'open') throw new YearbookError('The yearbook is not open right now.', 400)
  if (!isEditionWritable(edition)) throw new YearbookError('The yearbook deadline has passed.', 400)
  return edition
}

export async function isParticipant(admin: AdminClient, editionId: string, memberId: number): Promise<boolean> {
  const { data, error } = await admin
    .from('yb_participants')
    .select('member_id')
    .eq('edition_id', editionId)
    .eq('member_id', memberId)
    .maybeSingle()
  if (error) throw new YearbookError('Could not check your yearbook membership.', 503)
  return Boolean(data)
}

export async function signPhotoPaths(
  admin: AdminClient,
  paths: Array<string | null | undefined>,
  expiresIn = PHOTO_URL_SECONDS,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))]
  if (unique.length === 0) return new Map()
  const { data, error } = await admin.storage.from(YEARBOOK_PHOTO_BUCKET).createSignedUrls(unique, expiresIn)
  if (error || !data) return new Map()
  return new Map(
    data.flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl] as [string, string]] : [])),
  )
}

/**
 * Re-encodes an uploaded photo: applies EXIF rotation, strips metadata (including
 * GPS location), caps the long edge and stores a JPEG. Rejects non-images.
 */
export async function processYearbookPhoto(file: File): Promise<Buffer> {
  if (file.size === 0) throw new YearbookError('The selected photo is empty.', 400)
  if (file.size > YEARBOOK_MAX_UPLOAD_BYTES) throw new YearbookError('Photos must be 4 MB or smaller.', 400)
  const input = Buffer.from(await file.arrayBuffer())
  try {
    return await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(YEARBOOK_PHOTO_MAX_EDGE, YEARBOOK_PHOTO_MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer()
  } catch {
    throw new YearbookError('That file is not a supported image. Use a JPEG, PNG or WebP photo.', 400)
  }
}

export async function uploadYearbookPhoto(
  admin: AdminClient,
  editionId: string,
  memberId: number,
  kind: 'portrait' | 'entry',
  bytes: Buffer,
): Promise<string> {
  const path = `${editionId}/${memberId}/${kind}-${crypto.randomUUID()}.jpg`
  const { data, error } = await admin.storage
    .from(YEARBOOK_PHOTO_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false })
  if (error || !data) throw new YearbookError('The photo could not be uploaded. Please try again.', 502)
  return data.path
}

export async function removeYearbookPhotos(admin: AdminClient, paths: Array<string | null | undefined>) {
  const list = paths.filter((path): path is string => Boolean(path))
  if (list.length === 0) return
  const { error } = await admin.storage.from(YEARBOOK_PHOTO_BUCKET).remove(list)
  if (error) console.warn('[yearbook] could not remove photos', error.message)
}

async function loadDirectory(admin: AdminClient): Promise<DirectoryRow[]> {
  const { data, error } = await admin
    .from('members_main')
    .select('id, Name, Department, Picture, Status')
    .order('Name', { ascending: true })
  if (error) throw new YearbookError('Could not load members.', 503)
  return ((data ?? []) as DirectoryRow[]).filter((row) => isWritableSubjectStatus(row.Status) && row.Name?.trim())
}

export async function loadYearbookHome(): Promise<YearbookHomeData | null> {
  const viewer = await getYearbookViewer()
  if (!viewer) return null
  const { admin } = viewer
  const edition = await loadCurrentEdition(admin)

  const base: YearbookHomeData = {
    viewer: { memberId: viewer.memberId, name: viewer.name, pictureUrl: viewer.pictureUrl },
    canManage: viewer.canManage,
    edition,
    isWritable: isEditionWritable(edition),
    participation: null,
    participantCount: 0,
    members: [],
    written: [],
    received: [],
  }
  if (!edition) return base

  const [participantsResult, writtenResult, receivedResult, directory] = await Promise.all([
    admin.from('yb_participants').select('member_id, quote, portrait_path, joined_at').eq('edition_id', edition.id),
    admin.from('yb_entries').select(ENTRY_COLUMNS).eq('edition_id', edition.id).eq('author_id', viewer.memberId),
    admin
      .from('yb_entries')
      .select(ENTRY_COLUMNS)
      .eq('edition_id', edition.id)
      .eq('subject_id', viewer.memberId)
      .order('created_at', { ascending: true }),
    loadDirectory(admin),
  ])
  if (participantsResult.error || writtenResult.error || receivedResult.error) {
    throw new YearbookError('Could not load the yearbook.', 503)
  }

  const participants = (participantsResult.data ?? []) as ParticipantRow[]
  const participantIds = new Set(participants.map((row) => row.member_id))
  const own = participants.find((row) => row.member_id === viewer.memberId) ?? null
  const written = (writtenResult.data ?? []) as EntryRow[]
  const received = (receivedResult.data ?? []) as EntryRow[]
  const directoryById = new Map(directory.map((row) => [row.id, row]))

  const signed = await signPhotoPaths(admin, [
    own?.portrait_path,
    ...written.map((entry) => entry.photo_path),
    ...received.map((entry) => entry.photo_path),
  ])
  const signedUrl = (path: string | null) => (path ? signed.get(path) ?? null : null)

  return {
    ...base,
    participantCount: participantIds.size,
    participation: own
      ? { joinedAt: own.joined_at, quote: own.quote, portraitUrl: signedUrl(own.portrait_path) }
      : null,
    members: directory
      .filter((row) => row.id !== viewer.memberId)
      .map((row) => ({
        id: row.id,
        name: row.Name!.trim(),
        department: row.Department,
        pictureUrl: getPictureUrl(row.Picture),
        isParticipant: participantIds.has(row.id),
      })),
    written: written.map((entry) => ({
      id: entry.id,
      subjectId: entry.subject_id,
      body: entry.body,
      photoUrl: signedUrl(entry.photo_path),
      hasPhoto: Boolean(entry.photo_path),
      updatedAt: entry.updated_at,
    })),
    received: received.map((entry) => {
      const author = directoryById.get(entry.author_id)
      return {
        id: entry.id,
        author: {
          id: entry.author_id,
          name: author?.Name?.trim() || 'Former member',
          pictureUrl: author ? getPictureUrl(author.Picture) : null,
        },
        body: entry.body,
        photoUrl: signedUrl(entry.photo_path),
        updatedAt: entry.updated_at,
        isPrintable: participantIds.has(entry.author_id),
      }
    }),
  }
}

export async function loadYearbookAdminData(admin: AdminClient, editionId?: string | null): Promise<YearbookAdminData> {
  const { data: editionRows, error } = await admin
    .from('yb_editions')
    .select(EDITION_COLUMNS)
    .order('created_at', { ascending: false })
  if (error) throw editionLoadError(error)
  const editions = ((editionRows ?? []) as EditionRow[]).map(toEdition)

  const [participantCounts, entryCounts] = await Promise.all([
    admin.from('yb_participants').select('edition_id'),
    admin.from('yb_entries').select('edition_id'),
  ])
  const countBy = (rows: Array<{ edition_id: string }> | null) => {
    const counts = new Map<string, number>()
    for (const row of rows ?? []) counts.set(row.edition_id, (counts.get(row.edition_id) ?? 0) + 1)
    return counts
  }
  const participantsByEdition = countBy(participantCounts.data as Array<{ edition_id: string }> | null)
  const entriesByEdition = countBy(entryCounts.data as Array<{ edition_id: string }> | null)

  const selected =
    editions.find((edition) => edition.id === editionId) ??
    editions.find((edition) => edition.status === 'open') ??
    editions[0] ??
    null

  const empty: YearbookAdminData = {
    editions: editions.map((edition) => ({
      ...edition,
      participantCount: participantsByEdition.get(edition.id) ?? 0,
      entryCount: entriesByEdition.get(edition.id) ?? 0,
    })),
    selected,
    participants: [],
    entries: [],
    stats: { participants: 0, entries: 0, printableEntries: 0, photos: 0 },
  }
  if (!selected) return empty

  const [participantsResult, entriesResult, directory] = await Promise.all([
    admin.from('yb_participants').select('member_id, quote, portrait_path, joined_at').eq('edition_id', selected.id),
    admin.from('yb_entries').select(ENTRY_COLUMNS).eq('edition_id', selected.id).order('updated_at', { ascending: false }),
    admin.from('members_main').select('id, Name, Department'),
  ])
  if (participantsResult.error || entriesResult.error || directory.error) {
    throw new YearbookError('Could not load yearbook details.', 503)
  }

  const participants = (participantsResult.data ?? []) as ParticipantRow[]
  const entries = (entriesResult.data ?? []) as EntryRow[]
  const names = new Map(
    ((directory.data ?? []) as Array<{ id: number; Name: string | null; Department: string | null }>).map((row) => [
      row.id,
      { name: row.Name?.trim() || `Member #${row.id}`, department: row.Department },
    ]),
  )
  const participantIds = new Set(participants.map((row) => row.member_id))
  const isPrintable = (entry: EntryRow) => participantIds.has(entry.author_id) && participantIds.has(entry.subject_id)

  return {
    ...empty,
    participants: participants
      .map((row) => ({
        memberId: row.member_id,
        name: names.get(row.member_id)?.name ?? `Member #${row.member_id}`,
        department: names.get(row.member_id)?.department ?? null,
        joinedAt: row.joined_at,
        hasPortrait: Boolean(row.portrait_path),
        hasQuote: Boolean(row.quote),
        printableReceived: entries.filter((entry) => entry.subject_id === row.member_id && isPrintable(entry)).length,
        written: entries.filter((entry) => entry.author_id === row.member_id).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    entries: entries.map((entry) => ({
      id: entry.id,
      authorName: names.get(entry.author_id)?.name ?? `Member #${entry.author_id}`,
      subjectName: names.get(entry.subject_id)?.name ?? `Member #${entry.subject_id}`,
      body: entry.body,
      hasPhoto: Boolean(entry.photo_path),
      isPrintable: isPrintable(entry),
      updatedAt: entry.updated_at,
    })),
    stats: {
      participants: participants.length,
      entries: entries.length,
      printableEntries: entries.filter(isPrintable).length,
      photos: entries.filter((entry) => entry.photo_path).length + participants.filter((row) => row.portrait_path).length,
    },
  }
}

/** Print/export data. Photo links are signed for `expiresIn` seconds. */
export async function loadYearbookExport(
  admin: AdminClient,
  editionId: string,
  expiresIn = EXPORT_PHOTO_URL_SECONDS,
): Promise<YearbookExport | null> {
  const { data: editionRow, error } = await admin.from('yb_editions').select(EDITION_COLUMNS).eq('id', editionId).maybeSingle()
  if (error) throw editionLoadError(error)
  if (!editionRow) return null
  const edition = toEdition(editionRow as EditionRow)

  const [participantsResult, entriesResult] = await Promise.all([
    admin.from('yb_participants').select('member_id, quote, portrait_path, joined_at').eq('edition_id', edition.id),
    admin.from('yb_entries').select(ENTRY_COLUMNS).eq('edition_id', edition.id),
  ])
  if (participantsResult.error || entriesResult.error) throw new YearbookError('Could not load the yearbook.', 503)
  const participants = (participantsResult.data ?? []) as ParticipantRow[]
  const entries = (entriesResult.data ?? []) as EntryRow[]

  const memberIds = participants.map((row) => row.member_id)
  const { data: memberRows, error: memberError } = memberIds.length
    ? await admin.from('members_main').select('id, Name, Department, Picture').in('id', memberIds)
    : { data: [], error: null }
  if (memberError) throw new YearbookError('Could not load yearbook members.', 503)
  const members = new Map(
    ((memberRows ?? []) as Array<{ id: number; Name: string | null; Department: string | null; Picture: unknown }>).map(
      (row) => [row.id, row],
    ),
  )

  const participantIds = new Set(memberIds)
  const printable = entries.filter((entry) => participantIds.has(entry.author_id) && participantIds.has(entry.subject_id))
  const signed = await signPhotoPaths(
    admin,
    [...participants.map((row) => row.portrait_path), ...printable.map((entry) => entry.photo_path)],
    expiresIn,
  )

  const pages = buildYearbookPages(
    participants.map((row) => {
      const member = members.get(row.member_id)
      return {
        memberId: row.member_id,
        name: member?.Name?.trim() || `Member #${row.member_id}`,
        department: member?.Department ?? null,
        quote: row.quote,
        portraitUrl: (row.portrait_path && signed.get(row.portrait_path)) || getPictureUrl(member?.Picture) || null,
      }
    }),
    printable.map((entry) => ({
      id: entry.id,
      authorId: entry.author_id,
      subjectId: entry.subject_id,
      body: entry.body,
      photoUrl: entry.photo_path ? signed.get(entry.photo_path) ?? null : null,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    })),
  )

  return {
    edition,
    generatedAt: new Date().toISOString(),
    participantCount: pages.length,
    messageCount: pages.reduce((total, page) => total + page.messages.length, 0),
    pages,
  }
}

export function yearbookErrorResponse(error: unknown, fallback: string) {
  if (error instanceof YearbookError) return Response.json({ error: error.message }, { status: error.status })
  if (error instanceof YearbookValidationError) return Response.json({ error: error.message }, { status: 400 })
  console.error('[yearbook]', fallback, error)
  return Response.json({ error: fallback }, { status: 500 })
}
