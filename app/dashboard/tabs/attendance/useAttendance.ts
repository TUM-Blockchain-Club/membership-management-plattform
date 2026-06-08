'use client'

import { useCallback, useState } from 'react'
import useSWR from 'swr'

export type LectureKind = 'core' | 'side'

export type LectureRow = {
  id: string
  title: string
  kind: LectureKind | string
  scheduled_at: string
  location: string | null
  lecturer_member_id: number | null
  is_active: boolean
  started_at: string | null
  created_at: string
  updated_at: string
}

export type LecturesResponse = { lectures: LectureRow[] }

export type MyAttendanceRow = {
  id: string
  lecture_id: string
  checked_in_at: string
  lecture: {
    id: string
    title: string | null
    kind: string | null
    scheduled_at: string | null
    location: string | null
  } | null
}

export type MyAttendanceResponse = {
  member: { id: number; name: string | null }
  attendance: MyAttendanceRow[]
  totalLectures: number
}

export type OverviewAttendanceRow = {
  id: string
  lecture_id: string
  member_id: number
  checked_in_at: string
  member: { id: number; name: string | null; department: string | null; role: string | null } | null
  lecture: { id: string; title: string | null; kind: string | null; scheduled_at: string | null } | null
}

export type OverviewResponse = { attendance: OverviewAttendanceRow[] }

export type ByMemberResponse = {
  member: { id: number; name: string | null; department: string | null; role: string | null }
  attendance: MyAttendanceRow[]
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error || 'Request failed')
  }
  return body as T
}

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error || 'Request failed')
  }
  return body as T
}

export function useMyAttendance() {
  const { data, error, isLoading, mutate } = useSWR<MyAttendanceResponse>(
    '/api/attendance/my',
    fetcher,
    { revalidateOnFocus: true }
  )
  return {
    data,
    error: error instanceof Error ? error.message : null,
    loading: isLoading,
    refresh: mutate,
  }
}

export function useLectures(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<LecturesResponse>(
    enabled ? '/api/lectures' : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 10_000 }
  )
  return {
    data,
    error: error instanceof Error ? error.message : null,
    loading: isLoading,
    refresh: mutate,
  }
}

export function useEventAttendance(lectureId: string | null) {
  const url = lectureId ? `/api/attendance/overview?lectureId=${lectureId}` : null
  const { data, error, isLoading, mutate } = useSWR<OverviewResponse>(url, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: lectureId ? 5_000 : 0,
  })
  return {
    data,
    error: error instanceof Error ? error.message : null,
    loading: isLoading,
    refresh: mutate,
  }
}

export function useMemberAttendance(memberId: number | null) {
  const url = memberId ? `/api/attendance/by-member?memberId=${memberId}` : null
  const { data, error, isLoading, mutate } = useSWR<ByMemberResponse>(url, fetcher, {
    revalidateOnFocus: true,
  })
  return {
    data,
    error: error instanceof Error ? error.message : null,
    loading: isLoading,
    refresh: mutate,
  }
}

export type LectureUpsertPayload = {
  title: string
  kind: LectureKind
  scheduled_at: string
  location?: string | null
  lecturer_member_id?: number | null
}

export function useLectureMutations() {
  const [working, setWorking] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const run = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setWorking(true)
    setMutationError(null)
    try {
      return await fn()
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Request failed')
      return null
    } finally {
      setWorking(false)
    }
  }

  const create = useCallback(
    (payload: LectureUpsertPayload) =>
      run(() =>
        fetchJson<{ lecture: LectureRow }>('/api/lectures', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      ),
    []
  )

  const update = useCallback(
    (id: string, payload: Partial<LectureUpsertPayload>) =>
      run(() =>
        fetchJson<{ lecture: LectureRow }>(`/api/lectures/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      ),
    []
  )

  const remove = useCallback(
    (id: string) =>
      run(() => fetchJson<{ ok: boolean }>(`/api/lectures/${id}`, { method: 'DELETE' })),
    []
  )

  const start = useCallback(
    (id: string) =>
      run(() =>
        fetchJson<{ lecture: { id: string; current_code: string }; token: string }>(
          `/api/lectures/${id}/start`,
          { method: 'POST' }
        )
      ),
    []
  )

  const stop = useCallback(
    (id: string) =>
      run(() => fetchJson<{ ok: boolean }>(`/api/lectures/${id}/stop`, { method: 'POST' })),
    []
  )

  const rotate = useCallback(
    (id: string) =>
      run(() =>
        fetchJson<{ lecture: { id: string; current_code: string }; token: string }>(
          `/api/lectures/${id}/rotate-code`,
          { method: 'POST' }
        )
      ),
    []
  )

  return { create, update, remove, start, stop, rotate, working, mutationError }
}

export const formatDateTime = (value: string | null) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return ''
  }
}
