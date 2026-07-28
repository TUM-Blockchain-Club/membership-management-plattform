import assert from 'node:assert/strict'
import test from 'node:test'
const moduleUrl = new URL('../lib/date-picker-values.ts', import.meta.url)
const {
  dateTimeParts,
  formatDateValue,
  formatMonthValue,
  parseDateValue,
  parseMonthValue,
  withDatePart,
  withTimePart,
} = await import(moduleUrl.href) as typeof import('../lib/date-picker-values')

test('date values round-trip without a timezone shift', () => {
  const date = parseDateValue('2026-07-28')

  assert.ok(date)
  assert.equal(date.getFullYear(), 2026)
  assert.equal(date.getMonth(), 6)
  assert.equal(date.getDate(), 28)
  assert.equal(formatDateValue(date), '2026-07-28')
})

test('month values use the first local day of the selected month', () => {
  const date = parseMonthValue('2026-11')

  assert.ok(date)
  assert.equal(date.getFullYear(), 2026)
  assert.equal(date.getMonth(), 10)
  assert.equal(date.getDate(), 1)
  assert.equal(formatMonthValue(date), '2026-11')
})

test('date-time editing preserves the untouched local part', () => {
  assert.deepEqual(dateTimeParts('2026-07-28T09:30'), {
    date: '2026-07-28',
    time: '09:30',
  })
  assert.equal(withDatePart('2026-07-28T09:30', '2026-08-02'), '2026-08-02T09:30')
  assert.equal(withTimePart('2026-07-28T09:30', '17:45'), '2026-07-28T17:45')
  assert.equal(withDatePart('', '2026-08-02'), '2026-08-02T12:00')
  assert.equal(withTimePart('', '17:45'), '')
})
