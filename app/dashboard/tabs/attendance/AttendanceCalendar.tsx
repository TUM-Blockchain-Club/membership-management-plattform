'use client'

import { useMemo, useState } from 'react'
import {
  addDays,
  formatDayHeader,
  formatHourMinute,
  formatWeekRange,
  isSameDay,
  startOfWeek,
  toDayKey,
  weekDays,
  type DayKey,
} from './calendarUtils'

export type CalendarAttendanceRow = {
  id: string
  checked_in_at: string
  lecture: {
    id: string
    title: string | null
    kind: string | null
    scheduled_at: string | null
    location?: string | null
  } | null
}

type Props = {
  attendance: CalendarAttendanceRow[]
  emptyMessage?: string
}

export function AttendanceCalendar({ attendance, emptyMessage }: Props) {
  const [anchor, setAnchor] = useState<Date>(() => new Date())

  const byDay = useMemo(() => {
    const map = new Map<DayKey, CalendarAttendanceRow[]>()
    for (const row of attendance) {
      const dateStr = row.lecture?.scheduled_at ?? row.checked_in_at
      const date = new Date(dateStr)
      if (!Number.isFinite(date.getTime())) continue
      const key = toDayKey(date)
      const existing = map.get(key)
      if (existing) {
        existing.push(row)
      } else {
        map.set(key, [row])
      }
    }
    return map
  }, [attendance])

  const days = useMemo(() => weekDays(anchor), [anchor])
  const today = new Date()

  const goPrev = () => setAnchor((d) => addDays(startOfWeek(d), -7))
  const goNext = () => setAnchor((d) => addDays(startOfWeek(d), 7))
  const goToday = () => setAnchor(new Date())

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden">
      <div className="border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 flex items-center justify-center"
            aria-label="Previous week"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="w-8 h-8 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 flex items-center justify-center"
            aria-label="Next week"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={goToday}
            className="ml-1 px-3 py-1.5 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-xs"
          >
            Today
          </button>
        </div>
        <h3 className="text-white font-semibold">{formatWeekRange(anchor)}</h3>
      </div>

      <div className="grid grid-cols-7 divide-x divide-white/10">
        {days.map((day) => {
          const isToday = isSameDay(day, today)
          return (
            <div
              key={day.toISOString()}
              className={`px-2 py-2 text-center text-xs border-b border-white/10 ${
                isToday ? 'bg-blue-500/15 text-blue-200' : 'text-white/60'
              }`}
            >
              {formatDayHeader(day)}
            </div>
          )
        })}

        {days.map((day) => {
          const entries = byDay.get(toDayKey(day)) ?? []
          return (
            <div
              key={`cells-${day.toISOString()}`}
              className="min-h-[120px] p-2 space-y-2 align-top"
            >
              {entries.length === 0 ? (
                <div className="h-full" />
              ) : (
                entries.map((entry) => {
                  const kind = entry.lecture?.kind
                  const baseColor =
                    kind === 'core'
                      ? 'bg-blue-500/20 border-blue-400/40 text-blue-100'
                      : kind === 'side'
                      ? 'bg-purple-500/20 border-purple-400/40 text-purple-100'
                      : 'bg-white/10 border-white/20 text-white/80'
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-md border px-2 py-1.5 ${baseColor}`}
                      title={`Checked in ${formatHourMinute(entry.checked_in_at)}`}
                    >
                      <div className="text-xs font-medium truncate">
                        {entry.lecture?.title ?? 'Untitled'}
                      </div>
                      <div className="text-[10px] opacity-70 truncate">
                        {formatHourMinute(entry.lecture?.scheduled_at ?? entry.checked_in_at)}
                        {entry.lecture?.location ? ` · ${entry.lecture.location}` : ''}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )
        })}
      </div>

      {attendance.length === 0 && emptyMessage && (
        <div className="px-4 sm:px-6 py-4 text-center text-white/50 text-sm border-t border-white/10">
          {emptyMessage}
        </div>
      )}
    </div>
  )
}
