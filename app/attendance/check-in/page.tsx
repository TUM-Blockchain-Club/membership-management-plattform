'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type CheckInResult = {
  lecture: {
    id: string
    title: string | null
    kind: string | null
    scheduled_at: string | null
  }
  alreadyCheckedIn: boolean
}

type CheckInState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: CheckInResult }
  | { status: 'error'; message: string }

function formatLectureDate(value: string | null) {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return null
  }
}

function CheckInInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<CheckInState>({ status: 'idle' })

  useEffect(() => {
    if (!token) {
      setState({ status: 'error', message: 'Missing check-in token in the URL.' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })

    const performCheckIn = async () => {
      try {
        const response = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const body = await response.json().catch(() => ({}))

        if (!response.ok) {
          if (cancelled) return
          setState({
            status: 'error',
            message: body?.error || 'Could not record attendance.',
          })
          return
        }

        if (cancelled) return
        setState({ status: 'success', result: body as CheckInResult })
      } catch (error) {
        if (cancelled) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not record attendance.',
        })
      }
    }

    void performCheckIn()

    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-black relative">
      <div className="absolute inset-0 grid-background pointer-events-none">
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute inset-0 grid-glow" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
          {state.status === 'loading' && (
            <div className="flex flex-col items-center text-center">
              <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-white/80">Recording your attendance...</p>
            </div>
          )}

          {state.status === 'success' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {state.result.alreadyCheckedIn ? 'Already Checked In' : 'Attendance Recorded'}
              </h1>
              <p className="text-white/80 font-medium mb-1">
                {state.result.lecture.title || 'Lecture'}
              </p>
              {state.result.lecture.kind && (
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
                  {state.result.lecture.kind === 'core' ? 'Core lecture' : 'Side meeting'}
                </p>
              )}
              {state.result.lecture.scheduled_at && (
                <p className="text-white/40 text-sm mb-6">
                  {formatLectureDate(state.result.lecture.scheduled_at)}
                </p>
              )}
              <Link
                href="/attendance"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                View My Attendance
              </Link>
            </div>
          )}

          {state.status === 'error' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Check-in Failed</h1>
              <p className="text-white/70 mb-6">{state.message}</p>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm rounded-lg transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CheckInPage() {
  return (
    <Suspense fallback={null}>
      <CheckInInner />
    </Suspense>
  )
}
