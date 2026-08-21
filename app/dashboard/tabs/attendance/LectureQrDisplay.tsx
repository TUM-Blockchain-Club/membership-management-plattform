'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { CODE_ROTATION_MS } from './lectureClientConstants'

type Props = {
  lectureId: string
  initialToken: string | null
  onRotate: (id: string) => Promise<{ token: string } | null>
  onStop: () => void
  stopping?: boolean
}

export function LectureQrDisplay({
  lectureId,
  initialToken,
  onRotate,
  onStop,
  stopping,
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number>(CODE_ROTATION_MS / 1000)
  const [error, setError] = useState<string | null>(null)
  const rotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!initialToken) return

    const origin =
      typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/attendance/check-in?token=${encodeURIComponent(initialToken)}`

    QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not render QR code.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [initialToken])

  useEffect(() => {
    if (!initialToken) return

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    countdownTimerRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)

    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current)
    rotateTimerRef.current = setTimeout(async () => {
      const result = await onRotate(lectureId)
      if (result?.token) {
        setError(null)
      } else {
        setError('Lost connection — try refreshing.')
      }
    }, CODE_ROTATION_MS)

    return () => {
      if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [initialToken, lectureId, onRotate])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-xs aspect-square rounded-xl border border-white/10 bg-white p-4 flex items-center justify-center">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="Check-in QR code"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-gray-500 text-sm">Generating QR...</div>
          )}
        </div>

        <div className="text-center">
          <div className="text-white/60 text-xs uppercase tracking-wider">
            Next code in
          </div>
          <div className="text-3xl font-bold text-white tabular-nums">
            {secondsLeft}s
          </div>
        </div>

        {error && (
          <div className="w-full rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs p-2 text-center">
            {error}
          </div>
        )}

        <button
          onClick={onStop}
          disabled={stopping}
          className="w-full px-3 py-2 bg-red-600/90 hover:bg-red-600 disabled:bg-red-600/40 text-white text-sm rounded-lg transition-colors"
        >
          {stopping ? 'Stopping...' : 'Stop Lecture'}
        </button>
      </div>
    </div>
  )
}
