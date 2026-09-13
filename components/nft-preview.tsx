'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'
import { ArrowUpRight, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './nft-preview.module.css'

/** Presentation only: the preview never claims minting, approval or ownership. */
export function NftPreview({ imageUrl, displayName, onImageError, compact = false, draft = false }: {
  imageUrl?: string | null
  displayName?: string | null
  onImageError?: () => void
  draft?: boolean
  compact?: boolean
}) {
  const root = useRef<HTMLDivElement>(null)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    const element = root.current
    if (!element) return
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    let frame = 0
    let pointer: { x: number; y: number } | null = null
    const resetTilt = () => {
      cancelAnimationFrame(frame)
      frame = 0
      pointer = null
      for (const property of ['--tilt-x', '--tilt-y', '--light-x', '--light-y']) element.style.removeProperty(property)
    }
    const sync = () => {
      element.dataset.visible = String(visible && !document.hidden)
      if (!visible || document.hidden || motion.matches) resetTilt()
    }
    const moveOnPage = (event: globalThis.PointerEvent) => {
      if (draft || event.pointerType !== 'mouse' || !visible || document.hidden || motion.matches) return
      pointer = { x: event.clientX, y: event.clientY }
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!pointer) return
        const bounds = element.getBoundingClientRect()
        const centerX = bounds.left + bounds.width / 2
        const centerY = bounds.top + bounds.height / 2
        const x = Math.max(-1, Math.min(1, (pointer.x - centerX) / Math.max(centerX, innerWidth - centerX, 1)))
        const y = Math.max(-1, Math.min(1, (pointer.y - centerY) / Math.max(centerY, innerHeight - centerY, 1)))
        element.style.setProperty('--tilt-x', `${-y * 6}deg`)
        element.style.setProperty('--tilt-y', `${x * 8}deg`)
        element.style.setProperty('--light-x', `${50 + x * 25}%`)
        element.style.setProperty('--light-y', `${50 + y * 25}%`)
      })
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    observer.observe(element)
    document.addEventListener('visibilitychange', sync)
    document.addEventListener('pointermove', moveOnPage, { passive: true })
    document.documentElement.addEventListener('pointerleave', resetTilt)
    window.addEventListener('blur', resetTilt)
    motion.addEventListener('change', sync)
    return () => {
      observer.disconnect()
      resetTilt()
      document.removeEventListener('visibilitychange', sync)
      document.removeEventListener('pointermove', moveOnPage)
      document.documentElement.removeEventListener('pointerleave', resetTilt)
      window.removeEventListener('blur', resetTilt)
      motion.removeEventListener('change', sync)
    }
  }, [draft])

  const reset = () => {
    const element = root.current
    if (!element) return
    for (const property of ['--tilt-x', '--tilt-y', '--light-x', '--light-y']) element.style.removeProperty(property)
  }
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
    const style = root.current?.style
    style?.setProperty('--tilt-x', `${(0.5 - y) * 16}deg`)
    style?.setProperty('--tilt-y', `${(x - 0.5) * 22}deg`)
    style?.setProperty('--light-x', `${x * 100}%`)
    style?.setProperty('--light-y', `${y * 100}%`)
  }
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') { setFlipped(false); reset() }
  }

  return (
    <div ref={root} className={cn(styles.root, compact && styles.compact)} data-visible="false">
      <div className={styles.stage}>
        <div className={styles.aura} aria-hidden="true" />
        <div className={styles.float}>
          <button type="button" className={styles.object} onPointerMove={draft ? move : undefined} onPointerLeave={draft ? reset : undefined}
            onPointerCancel={reset} onBlur={reset} onKeyDown={keyDown}
            onClick={() => setFlipped(value => !value)}
            aria-label={flipped ? 'Show NFT artwork' : 'Turn NFT card to see details'} aria-pressed={flipped}>
            <span className={styles.turn} data-flipped={flipped}>
              <span className={cn(styles.face, styles.front)} aria-hidden={flipped}>
                {imageUrl ? (
                  <Image src={imageUrl} alt={`${draft ? 'Draft' : 'Minted'} membership NFT for ${displayName || 'member'}`} fill unoptimized
                    sizes={compact ? '200px' : '340px'} className={styles.artwork} onError={onImageError} />
                ) : (
                  <>
                    <span className={styles.header}><span>TUM<br />BLOCKCHAIN CLUB</span><span className={styles.edition}>MEMBER<br />EDITION</span></span>
                    <span className={styles.sculpture} aria-hidden="true">
                      <span className={styles.orbit} /><span className={styles.orbitTwo} />
                      <span className={styles.symbolShadow} /><span className={styles.symbol} />
                      <span className={styles.spark} />
                    </span>
                    <span className={styles.vertical}>CONNECTED BY CURIOSITY</span>
                    <span className={styles.title}>Member<br /><span>Pass.</span></span>
                    <span className={styles.footer}><span className={styles.chainDot} />Solana<span className={styles.previewLabel}>COLLECTIBLE PREVIEW</span></span>
                  </>
                )}
                <span className={styles.foil} aria-hidden="true" />
                <span className={styles.rim} aria-hidden="true" />
              </span>
              <span className={cn(styles.face, styles.back)} aria-hidden={!flipped}>
                <span className={styles.header}><span>TUM<br />BLOCKCHAIN CLUB</span><RotateCw size={18} /></span>
                <span className={styles.backContent}>
                  <span className={styles.backSymbol} aria-hidden="true" />
                  <span className={styles.backTitle}>{imageUrl ? 'One of us.' : 'Make it yours.'}</span>
                  <span className={styles.backCopy}>{imageUrl ? 'Your club membership, as a digital collectible.' : 'Your portrait. Your story. Your place in the club.'}</span>
                  <span className={styles.backNote}>{draft ? 'Draft preview. Nothing has been submitted or published.' : imageUrl ? 'View your NFT status for ownership and on-chain details.' : 'Personalized artwork is created after your request is reviewed and minted.'}</span>
                </span>
                <span className={styles.footer}>TBC MEMBERSHIP<ArrowUpRight size={16} /></span>
                <span className={styles.rim} aria-hidden="true" />
              </span>
            </span>
          </button>
        </div>
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.hint} onClick={() => setFlipped(value => !value)}>
          <RotateCw size={12} aria-hidden="true" />{flipped ? 'Back to artwork' : 'Tap to turn'}
        </button>
      </div>
    </div>
  )
}
