'use client'

import { useCallback, useState } from 'react'
import { parseCheckInToken } from './parseCheckInToken'
import { useQrScanner, type ScannerError } from './useQrScanner'

type Props = {
  open: boolean
  onClose: () => void
  onCheckedIn?: () => void
}

type Phase =
  | { kind: 'scanning' }
  | { kind: 'submitting' }
  | { kind: 'success'; title: string; alreadyCheckedIn: boolean }
  | { kind: 'error'; message: string; retryable: boolean }

const SCANNER_ERROR_COPY: Record<ScannerError, string> = {
  'permission-denied':
    'Camera access was blocked. Enable the camera for this site in your browser settings, then try again.',
  'no-camera': 'No usable camera was found on this device.',
  'insecure-context': 'The camera only works over a secure (https) connection.',
  unsupported: 'This browser can’t access the camera for scanning.',
  unknown: 'Could not start the camera. Please try again.',
}

export function CheckInScannerModal({ open, onClose, onCheckedIn }: Props) {
  // The parent mounts this component only while open, so state starts fresh
  // on every scan session.
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' })

  const submitToken = useCallback(
    async (token: string) => {
      setPhase({ kind: 'submitting' })
      try {
        const res = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          setPhase({
            kind: 'error',
            message: body?.error || 'Could not record attendance.',
            retryable: true,
          })
          return
        }
        setPhase({
          kind: 'success',
          title: body?.lecture?.title || 'Lecture',
          alreadyCheckedIn: Boolean(body?.alreadyCheckedIn),
        })
        onCheckedIn?.()
      } catch {
        setPhase({ kind: 'error', message: 'Network error — please try again.', retryable: true })
      }
    },
    [onCheckedIn]
  )

  const handleDecode = useCallback(
    (rawValue: string) => {
      const token = parseCheckInToken(rawValue)
      if (!token) {
        setPhase({
          kind: 'error',
          message: 'That’s not a valid check-in code. Scan the QR shown by the board.',
          retryable: true,
        })
        return
      }
      void submitToken(token)
    },
    [submitToken]
  )

  // Camera runs only while we're actively scanning.
  const { videoRef, status, error } = useQrScanner({
    active: open && phase.kind === 'scanning',
    onDecode: handleDecode,
  })

  if (!open) return null

  const cameraError = phase.kind === 'scanning' && error ? SCANNER_ERROR_COPY[error] : null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan check-in QR code"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">Scan to check in</h3>
          <button
            onClick={onClose}
            aria-label="Close scanner"
            className="text-white/50 hover:text-white transition-colors rounded-lg p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scanning: live camera with a target overlay */}
        {phase.kind === 'scanning' && (
          <div className="space-y-3">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
              {/* Target overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-2/3 w-2/3">
                  <span className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-white/90 rounded-tl-lg" />
                  <span className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-white/90 rounded-tr-lg" />
                  <span className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-white/90 rounded-bl-lg" />
                  <span className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-white/90 rounded-br-lg" />
                </div>
              </div>
              {status === 'starting' && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                  Starting camera…
                </div>
              )}
            </div>

            {cameraError ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300">
                {cameraError}
              </p>
            ) : (
              <p className="text-center text-sm text-white/50">
                Point your camera at the check-in QR code.
              </p>
            )}
          </div>
        )}

        {phase.kind === 'submitting' && (
          <div className="flex flex-col items-center py-10 text-center">
            <svg className="mb-4 h-10 w-10 animate-spin text-blue-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-white/80">Recording your attendance…</p>
          </div>
        )}

        {phase.kind === 'success' && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500/40 bg-green-500/20">
              <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="mb-1 text-xl font-bold text-white">
              {phase.alreadyCheckedIn ? 'Already Checked In' : 'Attendance Recorded'}
            </h4>
            <p className="mb-6 font-medium text-white/80">{phase.title}</p>
            <button
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm text-white transition-colors hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        )}

        {phase.kind === 'error' && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500/40 bg-red-500/20">
              <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h4 className="mb-2 text-xl font-bold text-white">Check-in Failed</h4>
            <p className="mb-6 text-white/70">{phase.message}</p>
            <div className="flex gap-3">
              {phase.retryable && (
                <button
                  onClick={() => setPhase({ kind: 'scanning' })}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm text-white transition-colors hover:bg-blue-700"
                >
                  Scan again
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white transition-colors hover:bg-white/15"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
