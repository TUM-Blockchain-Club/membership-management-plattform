export type DayKey = string // YYYY-MM-DD in local time

const pad = (n: number) => n.toString().padStart(2, '0')

export const toDayKey = (date: Date): DayKey =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const fromDayKey = (key: DayKey): Date => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// Returns Monday 00:00 of the week containing `date`.
export const startOfWeek = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? -6 : 1 - day // shift to Monday
  d.setDate(d.getDate() + diff)
  return d
}

export const addDays = (date: Date, days: number): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export const weekDays = (anchor: Date): Date[] => {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export const formatWeekRange = (anchor: Date): string => {
  const start = startOfWeek(anchor)
  const end = addDays(start, 6)
  const fmtMonth = (d: Date) =>
    d.toLocaleString('en-US', { month: 'short' })
  if (start.getMonth() === end.getMonth()) {
    return `${fmtMonth(start)} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
  }
  return `${fmtMonth(start)} ${start.getDate()} – ${fmtMonth(end)} ${end.getDate()}, ${end.getFullYear()}`
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export const formatDayHeader = (date: Date): string =>
  `${date.toLocaleString('en-US', { weekday: 'short' })} ${date.getDate()}`

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export const formatHourMinute = (value: string | null): string => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return ''
  }
}
