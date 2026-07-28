type SignupRound = {
  status: string
  signupDeadline: string | null
}

export function getSignupError(round: SignupRound, now = new Date()): string | null {
  if (round.status !== 'open') {
    return 'This round is not open for signup.'
  }

  if (round.signupDeadline && new Date(round.signupDeadline).getTime() <= now.getTime()) {
    return 'The signup deadline for this round has passed.'
  }

  return null
}

export function localDateTimeToUtcIso(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Invalid local date and time.')
  }

  return date.toISOString()
}

export function localDateToUtcIso(value: string): string {
  return localDateTimeToUtcIso(`${value}T00:00`)
}

export function dateToCalendarDate(
  date: Date,
  timeZone = 'Europe/Berlin',
): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  }).formatToParts(date)
  const values = new Map(parts.map((part) => [part.type, part.value]))

  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`
}
