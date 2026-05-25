import type { ReactNode } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatSubmittedAt } from '../useNftStatus'
import { NftRequestActions, OnChainButton } from './nft-status-actions'
import type { NftStatusSectionsProps } from './types'

export function NftRequestSummary({ state }: NftStatusSectionsProps) {
  const {
    canDeleteExistingRequest,
    deleteConfirmationArmed,
    deleting,
    existingRequest,
    existingRequestImageUrl,
    handleDeleteRequest,
    hasMintedNft,
    mintTxUrl,
    setDeleteConfirmationArmed,
    setSummaryImageFailed,
    statusCopy,
    summaryImageFailed,
  } = state

  if (!existingRequest) return null

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className={`self-start overflow-hidden rounded-2xl border bg-black/30 ${hasMintedNft ? 'border-cyan-400/30 shadow-lg shadow-cyan-950/20' : 'border-white/10'}`}>
        <div className={`relative bg-black ${hasMintedNft ? 'aspect-[1587/2245]' : 'aspect-[4/5]'}`}>
          {existingRequestImageUrl && !summaryImageFailed ? (
            <Image
              src={existingRequestImageUrl}
              alt={`${hasMintedNft ? 'Minted NFT' : 'Submitted NFT image'} for ${existingRequest.display_name}`}
              fill
              unoptimized
              sizes="(max-width: 1024px) 100vw, 240px"
              className="object-cover"
              onError={() => setSummaryImageFailed(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/55">
              The submitted image could not be loaded.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="border-white/10 bg-black/20">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">{hasMintedNft ? 'Minted NFT' : 'Saved Request'}</p>
                <h4 className="mt-2 text-2xl font-semibold text-white">{existingRequest.display_name}</h4>
              </div>
              <Badge variant="outline" className={statusCopy.badgeClass}>{statusCopy.label}</Badge>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/70">{statusCopy.text}</p>
            {mintTxUrl && <OnChainButton href={mintTxUrl} className="mt-4" />}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard label="Submitted">{formatSubmittedAt(existingRequest.created_at)}</SummaryCard>
          <SummaryCard label="Wallet">{existingRequest.wallet_address || 'Central Wallet'}</SummaryCard>
          {existingRequest.mint_tx_hash && (
            <SummaryCard label="Mint Transaction" className="sm:col-span-2 text-cyan-100">
              {existingRequest.mint_tx_hash}
            </SummaryCard>
          )}
        </div>

        <SummaryCard label="Fun Facts" block>
          {existingRequest.fun_facts || 'No fun facts were submitted with this request.'}
        </SummaryCard>

        {existingRequest.review_note && (
          <SummaryCard label="Admin Note" block>{existingRequest.review_note}</SummaryCard>
        )}

        <NftRequestActions
          canDeleteExistingRequest={canDeleteExistingRequest}
          deleteConfirmationArmed={deleteConfirmationArmed}
          deleting={deleting}
          handleDeleteRequest={handleDeleteRequest}
          hasMintedNft={hasMintedNft}
          setDeleteConfirmationArmed={setDeleteConfirmationArmed}
        />
      </div>
    </div>
  )
}

function SummaryCard({
  block = false,
  children,
  className = '',
  label,
}: {
  block?: boolean
  children: ReactNode
  className?: string
  label: string
}) {
  return (
    <Card className={`border-white/10 bg-black/20 ${className}`}>
      <CardContent className={block ? 'p-5' : 'p-4'}>
        <div className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</div>
        <div className={`${block ? 'mt-3 leading-6 text-white/80' : 'mt-2'} break-all text-sm text-white`}>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
