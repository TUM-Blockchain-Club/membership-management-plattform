'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getInitials } from './yearbookClient'

/**
 * Lazy member portrait with an initials fallback. A plain lazy <img> keeps the
 * directory from fetching every member avatar up front.
 */
export function YearbookMemberPhoto({
  name,
  src,
  className,
  rounded = 'full',
}: {
  name: string
  src: string | null
  className?: string
  rounded?: 'full' | 'lg'
}) {
  const [failed, setFailed] = useState(false)
  const shape = rounded === 'full' ? 'rounded-full' : 'rounded-lg'

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={cn('flex shrink-0 items-center justify-center bg-muted font-medium text-muted-foreground', shape, className)}
      >
        {getInitials(name)}
      </span>
    )
  }

  return (
    // Member pictures and signed Supabase URLs come from several hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('shrink-0 bg-muted object-cover', shape, className)}
    />
  )
}
