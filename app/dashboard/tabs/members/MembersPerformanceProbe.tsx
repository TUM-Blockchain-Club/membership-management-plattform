'use client'

import { useEffect } from 'react'

type LongTaskEntry = PerformanceEntry & {
  attribution?: Array<{ name?: string; containerType?: string; containerSrc?: string }>
}

type ResourceSummary = {
  count: number
  duration: number
  transferSize: number
  encodedBodySize: number
}

const isEnabled = () => {
  if (typeof window === 'undefined') return false

  if (process.env.NEXT_PUBLIC_MEMBERS_PERF_PROBE === 'true') return true
  return new URLSearchParams(window.location.search).get('perf') === '1'
}

const summarizeResources = () => {
  const summary: Record<string, ResourceSummary> = {}

  performance.getEntriesByType('resource').forEach((entry) => {
    const resource = entry as PerformanceResourceTiming
    const key = resource.initiatorType || 'other'
    const current = summary[key] ?? {
      count: 0,
      duration: 0,
      transferSize: 0,
      encodedBodySize: 0,
    }

    current.count += 1
    current.duration += resource.duration
    current.transferSize += resource.transferSize
    current.encodedBodySize += resource.encodedBodySize
    summary[key] = current
  })

  return summary
}

const getNavigationSummary = () => {
  const navigation = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined

  if (!navigation) return null

  return {
    domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
    load: Math.round(navigation.loadEventEnd),
    responseEnd: Math.round(navigation.responseEnd),
    transferSize: navigation.transferSize,
    encodedBodySize: navigation.encodedBodySize,
  }
}

export function MembersPerformanceProbe() {
  useEffect(() => {
    if (!isEnabled()) return

    const longTasks: Array<{ duration: number; startTime: number; attribution?: LongTaskEntry['attribution'] }> = []
    let longTaskObserver: PerformanceObserver | null = null

    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const task = entry as LongTaskEntry
          longTasks.push({
            duration: Math.round(task.duration),
            startTime: Math.round(task.startTime),
            attribution: task.attribution,
          })
        })
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
    }

    const logSnapshot = (label: string) => {
      const totalLongTaskMs = longTasks.reduce((sum, task) => sum + task.duration, 0)
      const maxLongTaskMs = longTasks.reduce((max, task) => Math.max(max, task.duration), 0)

      console.info('[members-perf]', label, {
        navigation: getNavigationSummary(),
        resources: summarizeResources(),
        longTasks: {
          count: longTasks.length,
          totalMs: totalLongTaskMs,
          maxMs: maxLongTaskMs,
          recent: longTasks.slice(-8),
        },
        dom: {
          elements: document.getElementsByTagName('*').length,
          memberCards: document.querySelectorAll('[data-member-card]').length,
          virtualRows: document.querySelectorAll('[data-virtual-row]').length,
        },
      })
    }

    const loadTimer = window.setTimeout(() => logSnapshot('after-load'), 2500)
    let scrollTimer = 0
    let rafId = 0
    let collecting = false

    const collectScrollFrames = () => {
      if (collecting) return

      collecting = true
      const frameDurations: number[] = []
      let lastFrame = performance.now()
      const startedAt = lastFrame

      const step = (now: number) => {
        frameDurations.push(now - lastFrame)
        lastFrame = now

        if (now - startedAt < 1500) {
          rafId = window.requestAnimationFrame(step)
          return
        }

        collecting = false
        const overBudgetFrames = frameDurations.filter((duration) => duration > 20)
        const droppedFramesEstimate = frameDurations.reduce(
          (sum, duration) => sum + Math.max(0, Math.floor(duration / 16.67) - 1),
          0,
        )

        console.info('[members-perf]', 'scroll-window', {
          frames: frameDurations.length,
          avgFrameMs: Math.round(frameDurations.reduce((sum, duration) => sum + duration, 0) / frameDurations.length),
          maxFrameMs: Math.round(Math.max(...frameDurations)),
          framesOver20Ms: overBudgetFrames.length,
          droppedFramesEstimate,
          longTaskCount: longTasks.length,
          mountedMemberCards: document.querySelectorAll('[data-member-card]').length,
          mountedVirtualRows: document.querySelectorAll('[data-virtual-row]').length,
        })
      }

      rafId = window.requestAnimationFrame(step)
    }

    const handleScroll = () => {
      window.clearTimeout(scrollTimer)
      collectScrollFrames()
      scrollTimer = window.setTimeout(() => logSnapshot('after-scroll'), 500)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    console.info('[members-perf]', 'probe-enabled')

    return () => {
      window.clearTimeout(loadTimer)
      window.clearTimeout(scrollTimer)
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', handleScroll)
      longTaskObserver?.disconnect()
    }
  }, [])

  return null
}
