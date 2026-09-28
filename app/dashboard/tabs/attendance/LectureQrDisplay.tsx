'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export type LectureCode = { token: string; expiresAt: string; rotateAt: string; serverNow: string }
type Props = {
  lectureId: string
  onRotate: (id: string) => Promise<LectureCode | null>
  onStop: () => void
  stopping?: boolean
}

export function LectureQrDisplay({ lectureId, onRotate, onStop, stopping }: Props) {
  const [qr, setQr] = useState<{ url: string; expires: number } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let generation = 0
    const refresh = async () => {
      const current = ++generation
      const requested = performance.now()
      let delay = 3000
      try {
        const result = await onRotate(lectureId)
        if (cancelled || current !== generation) return
        if (!result) throw new Error('Code unavailable')
        // Use server-relative time; subtract request time conservatively.
        const expires = requested + Date.parse(result.expiresAt) - Date.parse(result.serverNow)
        const rotate = requested + Date.parse(result.rotateAt) - Date.parse(result.serverNow)
        const url = new URL('/attendance/check-in', window.location.origin)
        url.searchParams.set('token', result.token)
        const dataUrl = await QRCode.toDataURL(url.toString(), {
          errorCorrectionLevel: 'M', margin: 2, width: 512,
          color: { dark: '#000000', light: '#FFFFFF' },
        })
        if (cancelled || current !== generation) return
        setQr({ url: dataUrl, expires })
        setError(null)
        delay = Math.max(1000, rotate - performance.now())
      } catch {
        if (!cancelled && current === generation) setError('Connection interrupted. Retrying automatically…')
      }
      if (!cancelled && current === generation) timer = setTimeout(refresh, delay)
    }
    const resume = () => {
      if (document.visibilityState === 'hidden') return
      clearTimeout(timer)
      setQr(null)
      void refresh()
    }
    void refresh()
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      cancelled = true
      clearTimeout(timer)
      window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [lectureId, onRotate])

  useEffect(() => {
    const tick = () => setSecondsLeft(qr ? Math.max(0, Math.ceil((qr.expires - performance.now()) / 1000)) : 0)
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [qr])

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-4 sm:p-6">
      <div className="flex aspect-square w-full max-w-xs items-center justify-center rounded-xl bg-white p-4">
        {qr && secondsLeft > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element -- QR is generated locally as a data URL.
          <img src={qr.url} alt="Check-in QR code" className="size-full object-contain" />
        ) : <p className="text-sm text-neutral-700">Waiting for a fresh code…</p>}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="off">
        {secondsLeft > 0 ? `Code valid for ${secondsLeft}s · refreshes automatically` : 'Reconnecting…'}
      </p>
      {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
      <Button variant="destructive" className="w-full" onClick={onStop} disabled={stopping}>
        {stopping ? 'Stopping…' : 'Stop Lecture'}
      </Button>
    </div>
  )
}
