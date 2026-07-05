'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

type CheckInResponse = {
  event: {
    id: string | number
    title: string
  }
  attendance_count: number
  is_checked_in: boolean
  checked_in_member_id?: number
}

export default function CheckInPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params?.token
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Preparing your check-in...')
  const [result, setResult] = useState<CheckInResponse | null>(null)

  useEffect(() => {
    if (!token) return

    let cancelled = false

    const run = async () => {
      try {
        const response = await fetch(`/api/checkin/${token}`, {
          method: 'POST',
        })
        const payload = await response.json()

        if (cancelled) return

        if (!response.ok) {
          if (response.status === 401) {
            setStatus('error')
            setMessage('You need to sign in before checking in.')
            return
          }

          throw new Error(payload?.error || 'Could not check you in.')
        }

        setResult(payload as CheckInResponse)
        setStatus('success')
        setMessage(payload?.is_checked_in ? 'You are checked in.' : 'Check-in completed.')
      } catch (error) {
        if (cancelled) return
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Could not check you in.')
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <Card className="w-full border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
          <CardHeader>
            <CardTitle>{status === 'success' ? 'Checked in' : 'Check-in'}</CardTitle>
            <CardDescription>
              {status === 'loading'
                ? 'Verifying your session and recording attendance.'
                : result?.event.title || 'Attendance record'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/80">
              {status === 'loading' ? <Spinner /> : message}
            </div>

            {result && (
              <div className="space-y-2 text-sm text-white/70">
                <p>{result.attendance_count} people have checked in.</p>
                {result.is_checked_in && <p>Your attendance is recorded.</p>}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => router.push('/dashboard')}>Go to dashboard</Button>
              <Button variant="outline" asChild>
                <Link href="/signin">Sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
