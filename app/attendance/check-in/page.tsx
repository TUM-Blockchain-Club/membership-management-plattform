'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2Icon, CircleXIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

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
  const [state, setState] = useState<CheckInState>({ status: 'loading' })

  useEffect(() => {
    if (!token) return

    let cancelled = false

    const performCheckIn = async () => {
      try {
        const response = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const body = await response.json().catch(() => ({}))

        if (!response.ok) {
          if (!cancelled) setState({ status: 'error', message: body?.error || 'Could not record attendance.' })
          return
        }

        if (!cancelled) setState({ status: 'success', result: body as CheckInResult })
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Could not record attendance.',
          })
        }
      }
    }

    void performCheckIn()
    return () => { cancelled = true }
  }, [token])

  const visibleState: CheckInState = token
    ? state
    : { status: 'error', message: 'Missing check-in token in the URL.' }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black px-4 py-8">
      <div className="pointer-events-none absolute inset-0 grid-background">
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute inset-0 grid-glow" />
      </div>

      <Card className="relative z-10 w-full max-w-md border-white/10 bg-card/90 shadow-2xl backdrop-blur-md">
        <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
          {visibleState.status === 'loading' && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Spinner className="size-10 text-primary" />
              <p className="text-muted-foreground">Recording your attendance...</p>
            </div>
          )}

          {visibleState.status === 'success' && (
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2Icon className="size-16 text-emerald-400" />
              <div className="flex flex-col items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {visibleState.result.alreadyCheckedIn ? 'Already Checked In' : 'Attendance Recorded'}
                </h1>
                <p className="font-medium text-foreground">{visibleState.result.lecture.title || 'Lecture'}</p>
                {visibleState.result.lecture.kind && (
                  <Badge variant="secondary">
                    {visibleState.result.lecture.kind === 'core' ? 'Core lecture' : 'Side meeting'}
                  </Badge>
                )}
                {visibleState.result.lecture.scheduled_at && (
                  <p className="text-sm text-muted-foreground">
                    {formatLectureDate(visibleState.result.lecture.scheduled_at)}
                  </p>
                )}
              </div>
              <Button asChild>
                <Link href="/attendance">View My Attendance</Link>
              </Button>
            </div>
          )}

          {visibleState.status === 'error' && (
            <div className="flex flex-col gap-4">
              <Alert variant="destructive">
                <CircleXIcon />
                <AlertTitle>Check-in failed</AlertTitle>
                <AlertDescription>{visibleState.message}</AlertDescription>
              </Alert>
              <Button asChild variant="outline" className="self-center">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

export default function CheckInPage() {
  return (
    <Suspense fallback={null}>
      <CheckInInner />
    </Suspense>
  )
}
