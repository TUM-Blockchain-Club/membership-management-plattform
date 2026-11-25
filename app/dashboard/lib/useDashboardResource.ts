'use client'

import { useCallback, useEffect, useState, type SetStateAction } from 'react'

// State belongs to the persistent dashboard shell, not a cross-account global cache.
export function useDashboardResource<T>(resource: 'members' | 'events', enabled: boolean) {
  const [data, setData] = useState<T[]>()
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const loaded = data !== undefined

  useEffect(() => {
    if (!enabled || loaded) return
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(`/api/dashboard/data?resource=${resource}`, { signal: controller.signal })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Could not load dashboard data.')
        if (!Array.isArray(payload)) throw new Error('Unexpected dashboard data.')
        if (!controller.signal.aborted) { setData(payload); setError(null) }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load dashboard data.')
      }
    }
    void load()
    return () => controller.abort()
  }, [enabled, loaded, resource, attempt])

  const updateData = useCallback((update: SetStateAction<T[]>) => {
    // Profile edits before the directory loads must not mark an empty list as loaded.
    setData(previous => previous === undefined ? previous : typeof update === 'function' ? update(previous) : update)
  }, [])
  const retry = useCallback(() => { setError(null); setAttempt(value => value + 1) }, [])
  return { data, setData: updateData, error, loading: enabled && !loaded && !error, retry }
}
