const pad = (value: number) => String(value).padStart(2, '0')

export function formatDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateValue(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isFinite(date.getTime()) ? date : undefined
}

export function formatMonthValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function parseMonthValue(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return undefined

  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1)
  return Number.isFinite(date.getTime()) ? date : undefined
}

export function dateTimeParts(value: string): { date: string; time: string } {
  const [date = '', rawTime = ''] = value.split('T')
  return { date, time: rawTime.slice(0, 5) }
}

export function withDatePart(value: string, date: string): string {
  if (!date) return ''
  const { time } = dateTimeParts(value)
  return `${date}T${time || '12:00'}`
}

export function withTimePart(value: string, time: string): string {
  const { date } = dateTimeParts(value)
  if (!date || !time) return date ? `${date}T12:00` : ''
  return `${date}T${time}`
}

