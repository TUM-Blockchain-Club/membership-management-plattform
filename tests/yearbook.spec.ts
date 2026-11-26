import { expect, test } from '@playwright/test'
import {
  buildYearbookPages,
  csvCell,
  isEditionWritable,
  isUuid,
  isWritableSubjectStatus,
  parseEditionInput,
  parseEntryBody,
  parseMemberId,
  parseQuote,
  toYearbookCsv,
  YEARBOOK_MAX_ENTRY_LENGTH,
  YearbookValidationError,
  yearbookExportFileName,
} from '@/lib/yearbook'

const participant = (memberId: number, name: string) => ({
  memberId,
  name,
  department: 'IT',
  quote: null,
  portraitUrl: null,
})

const entry = (id: string, authorId: number, subjectId: number, createdAt = '2026-11-01T10:00:00.000Z') => ({
  id,
  authorId,
  subjectId,
  body: `Message ${id}`,
  photoUrl: null,
  createdAt,
  updatedAt: createdAt,
})

test('editions accept writes only while open and before the deadline', () => {
  const now = new Date('2026-11-26T12:00:00Z')
  expect(isEditionWritable({ status: 'open', closesAt: null }, now)).toBe(true)
  expect(isEditionWritable({ status: 'open', closesAt: '2026-12-01T00:00:00Z' }, now)).toBe(true)
  expect(isEditionWritable({ status: 'open', closesAt: '2026-11-26T11:59:59Z' }, now)).toBe(false)
  expect(isEditionWritable({ status: 'closed', closesAt: null }, now)).toBe(false)
  expect(isEditionWritable(null, now)).toBe(false)
})

test('validates messages, quotes, member ids and edition input', () => {
  expect(parseEntryBody('  Thanks for everything!  ')).toBe('Thanks for everything!')
  expect(() => parseEntryBody('   ')).toThrow(YearbookValidationError)
  expect(() => parseEntryBody('x'.repeat(YEARBOOK_MAX_ENTRY_LENGTH + 1))).toThrow(YearbookValidationError)
  expect(parseQuote('   ')).toBeNull()
  expect(() => parseQuote('x'.repeat(201))).toThrow(YearbookValidationError)
  expect(parseMemberId('42')).toBe(42)
  expect(() => parseMemberId('0')).toThrow(YearbookValidationError)
  expect(() => parseMemberId('4.2')).toThrow(YearbookValidationError)
  expect(parseEditionInput({ title: ' TBC 2026 ', closesAt: '' })).toEqual({ title: 'TBC 2026', closesAt: null })
  expect(() => parseEditionInput({ title: '' })).toThrow(YearbookValidationError)
  expect(() => parseEditionInput({ title: 'Ok', closesAt: 'not a date' })).toThrow(YearbookValidationError)
  expect(isUuid('8f14e45f-ceea-4f6a-9d5b-1f6c2d3b4a5e')).toBe(true)
  expect(isUuid('8f14e45f')).toBe(false)
})

test('members who left the club cannot receive messages', () => {
  expect(isWritableSubjectStatus('Active')).toBe(true)
  expect(isWritableSubjectStatus('Alumni')).toBe(true)
  expect(isWritableSubjectStatus(null)).toBe(true)
  expect(isWritableSubjectStatus('Left')).toBe(false)
  expect(isWritableSubjectStatus('Kicked out')).toBe(false)
})

test('print pages only include messages between participants', () => {
  const pages = buildYearbookPages(
    [participant(2, 'Bea'), participant(1, 'alex')],
    [
      entry('b', 2, 1, '2026-11-02T10:00:00.000Z'),
      entry('a', 2, 1, '2026-11-01T10:00:00.000Z'),
      entry('from-non-participant', 9, 1),
      entry('about-non-participant', 1, 9),
      entry('self', 1, 1),
    ],
  )
  expect(pages.map((page) => page.name)).toEqual(['alex', 'Bea'])
  expect(pages[0].messages.map((message) => message.id)).toEqual(['a', 'b'])
  expect(pages[0].messages[0].authorName).toBe('Bea')
  expect(pages[1].messages).toEqual([])
})

test('csv export escapes cells, neutralises formulas and keeps empty pages', () => {
  expect(csvCell('plain')).toBe('plain')
  expect(csvCell('has, comma')).toBe('"has, comma"')
  expect(csvCell('say "hi"')).toBe('"say ""hi"""')
  expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
  expect(csvCell(null)).toBe('')

  const csv = toYearbookCsv(buildYearbookPages([participant(1, 'Alex'), participant(2, 'Bea')], [entry('m1', 2, 1)]))
  const lines = csv.replace(/^﻿/, '').trim().split('\r\n')
  expect(lines).toHaveLength(3)
  expect(lines[1]).toContain('Message m1')
  expect(lines[2].startsWith('2,Bea,IT,,,,,,,')).toBe(true)
})

test('export file names are safe slugs', () => {
  expect(yearbookExportFileName({ title: 'TBC Jahrbuch 2026 – Über uns!' }, 'csv')).toBe('tbc-jahrbuch-2026-uber-uns.csv')
  expect(yearbookExportFileName({ title: '???' }, 'json')).toBe('yearbook.json')
})
