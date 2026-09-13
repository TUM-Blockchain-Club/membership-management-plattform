'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Shared presentation only: an unminted preview never implies ownership or approval. */
export function NftPreview({
  imageUrl,
  displayName,
  onImageError,
  compact = false,
}: {
  imageUrl?: string | null
  displayName?: string | null
  onImageError?: () => void
  compact?: boolean
}) {
  return (
    <div className={cn('nft-preview-stage', compact && 'nft-preview-stage-compact')}>
      <div className="nft-preview-surface">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`Minted membership NFT for ${displayName || 'member'}`}
            fill
            unoptimized
            sizes={compact ? '128px' : '280px'}
            className="object-contain"
            onError={onImageError}
          />
        ) : (
          <div className="nft-preview-placeholder">
            <div className="nft-preview-wordmark">TUM Blockchain Club</div>
            <div className="nft-preview-emblem">
              <Image src="/assets/tbc-logo.png" alt="" width={96} height={96} className="size-full object-contain" />
            </div>
            <div className="nft-preview-inscription">
              <span>Membership</span>
              <span className="nft-preview-edition">Digital collectible</span>
            </div>
          </div>
        )}
        <div className="nft-preview-sheen" aria-hidden="true" />
      </div>
    </div>
  )
}
