const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

export const formatEventDate = (startAt: string, endAt: string) => {
  const start = new Date(startAt)
  const end = new Date(endAt)

  const startDate = start.toISOString().slice(0, 10)
  const endDate = end.toISOString().slice(0, 10)

  if (startDate !== endDate) {
    const startMonth = monthFormatter.format(start)
    const endMonth = monthFormatter.format(end)
    const startDay = start.getUTCDate()
    const endDay = end.getUTCDate()
    const startYear = start.getUTCFullYear()
    const endYear = end.getUTCFullYear()

    if (startMonth === endMonth && startYear === endYear) {
      return `${startMonth} ${startDay}-${endDay}, ${startYear}`
    }

    if (startYear === endYear) {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`
    }

    return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`
  }

  return fullDateFormatter.format(start)
}

export const formatEventTime = (startAt: string, endAt: string) => {
  const start = new Date(startAt)
  const end = new Date(endAt)

  const startTime = timeFormatter.format(start)
  const endTime = timeFormatter.format(end)

  return `${startTime} - ${endTime}`
}
