import { expect, test } from '@playwright/test'
import {
  dateTimeParts,
  formatDateValue,
  formatMonthValue,
  parseDateValue,
  parseMonthValue,
  withDatePart,
  withTimePart,
} from '../lib/date-picker-values'

test('date values round-trip without a timezone shift', () => {
  const date = parseDateValue('2026-07-28')

  expect(date).toBeTruthy()
  expect(date?.getFullYear()).toBe(2026)
  expect(date?.getMonth()).toBe(6)
  expect(date?.getDate()).toBe(28)
  expect(formatDateValue(date!)).toBe('2026-07-28')
})

test('month values use the first local day of the selected month', () => {
  const date = parseMonthValue('2026-11')

  expect(date).toBeTruthy()
  expect(date?.getFullYear()).toBe(2026)
  expect(date?.getMonth()).toBe(10)
  expect(date?.getDate()).toBe(1)
  expect(formatMonthValue(date!)).toBe('2026-11')
})

test('date-time editing preserves the untouched local part', () => {
  expect(dateTimeParts('2026-07-28T09:30')).toEqual({
    date: '2026-07-28',
    time: '09:30',
  })
  expect(withDatePart('2026-07-28T09:30', '2026-08-02')).toBe('2026-08-02T09:30')
  expect(withTimePart('2026-07-28T09:30', '17:45')).toBe('2026-07-28T17:45')
  expect(withDatePart('', '2026-08-02')).toBe('2026-08-02T12:00')
  expect(withTimePart('', '17:45')).toBe('')
})
