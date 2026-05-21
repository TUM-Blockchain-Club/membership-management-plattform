export const formatEventDate = (startAt: string, endAt: string) => {
  const start = new Date(startAt)
  const end = new Date(endAt)

  const startDate = start.toDateString()
  const endDate = end.toDateString()

  if (startDate !== endDate) {
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
    const startDay = start.getDate()
    const endDay = end.getDate()
    const year = start.getFullYear()

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`
    }

    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
  }

  return start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const formatEventTime = (startAt: string, endAt: string) => {
  const start = new Date(startAt)
  const end = new Date(endAt)

  const startTime = start.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const endTime = end.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return `${startTime} - ${endTime}`
}
