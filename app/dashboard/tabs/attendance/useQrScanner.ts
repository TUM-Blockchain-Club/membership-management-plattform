'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal typing for the native Barcode Detection API (not in TS DOM lib yet).
type DetectedBarcode = { rawValue: string }
type BarcodeDetectorInstance = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance
  getSupportedFormats?: () => Promise<string[]>
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor
  }
}

export type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'error'

export type ScannerError =
  | 'permission-denied'
  | 'no-camera'
  | 'insecure-context'
  | 'unsupported'
  | 'unknown'

type Options = {
  active: boolean
  onDecode: (rawValue: string) => void
}

const SCAN_INTERVAL_MS = 250

export function useQrScanner({ active, onDecode }: Options) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const jsqrRef = useRef<((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null>(null)
  const loopRef = useRef<number | null>(null)
  const decodedRef = useRef(false)
  // Keep the latest callback without re-subscribing the scan loop.
  const onDecodeRef = useRef(onDecode)
  useEffect(() => {
    onDecodeRef.current = onDecode
  }, [onDecode])

  const [status, setStatus] = useState<ScannerStatus>('idle')
  const [error, setError] = useState<ScannerError | null>(null)

  const stop = useCallback(() => {
    if (loopRef.current !== null) {
      clearTimeout(loopRef.current)
      loopRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    detectorRef.current = null
  }, [])

  const emit = useCallback((value: string) => {
    if (decodedRef.current) return
    decodedRef.current = true
    stop()
    setStatus('idle')
    onDecodeRef.current(value)
  }, [stop])

  // Decode a single frame; returns true when a QR is found.
  const scanFrame = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return false

    if (detectorRef.current) {
      try {
        const results = await detectorRef.current.detect(video)
        const hit = results.find((r) => r.rawValue)
        if (hit) {
          emit(hit.rawValue)
          return true
        }
      } catch {
        // A transient detect() failure shouldn't kill the loop.
      }
      return false
    }

    // jsQR fallback: pull the frame through a canvas.
    const jsqr = jsqrRef.current
    if (!jsqr) return false
    const canvas = canvasRef.current ?? document.createElement('canvas')
    canvasRef.current = canvas
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return false
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return false
    ctx.drawImage(video, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)
    const result = jsqr(data, w, h)
    if (result?.data) {
      emit(result.data)
      return true
    }
    return false
  }, [emit])

  useEffect(() => {
    if (!active) {
      stop()
      return
    }

    let cancelled = false
    decodedRef.current = false

    const start = async () => {
      setError(null)
      setStatus('starting')
      // getUserMedia requires a secure context (https or localhost).
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setError(window.isSecureContext ? 'unsupported' : 'insecure-context')
          setStatus('error')
        }
        return
      }

      // Pick decoder: native BarcodeDetector when it actually supports QR,
      // otherwise lazy-load jsQR (keeps it off the Android happy path).
      try {
        if (window.BarcodeDetector) {
          const formats = (await window.BarcodeDetector.getSupportedFormats?.()) ?? []
          if (formats.includes('qr_code')) {
            detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] })
          }
        }
        if (!detectorRef.current) {
          const mod = await import('jsqr')
          jsqrRef.current = (data, w, h) => mod.default(data, w, h)
        }
      } catch {
        if (!cancelled) {
          setError('unsupported')
          setStatus('error')
        }
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch (err) {
        if (cancelled) return
        const name = err instanceof DOMException ? err.name : ''
        if (name === 'NotAllowedError' || name === 'SecurityError') setError('permission-denied')
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setError('no-camera')
        else setError('unknown')
        setStatus('error')
        return
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      try {
        await video.play()
      } catch {
        // Autoplay can reject; the loop still reads frames once ready.
      }

      if (cancelled) return
      setStatus('scanning')

      const tick = async () => {
        if (cancelled || decodedRef.current) return
        await scanFrame()
        if (cancelled || decodedRef.current) return
        loopRef.current = window.setTimeout(tick, SCAN_INTERVAL_MS)
      }
      void tick()
    }

    void start()

    return () => {
      cancelled = true
      stop()
    }
  }, [active, scanFrame, stop])

  return { videoRef, status, error }
}
