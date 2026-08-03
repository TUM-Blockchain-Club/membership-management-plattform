import type { ReactNode } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { formatSubmittedAt } from '../useNftStatus'
import { NftRequestActions, OnChainButton } from './nft-status-actions'
import type { NftStatusSectionsProps } from './types'

export function NftRequestSummary({ state }: NftStatusSectionsProps) {
  const {
    assetUrl,
    canDeleteExistingRequest,
    claiming,
    claimWalletAddress,
    deleteConfirmationArmed,
    deleting,
    existingRequest,
    existingRequestImageUrl,
    handleClaimRequest,
    handleDeleteRequest,
    hasMintedNft,
    mintTxUrl,
    setClaimWalletAddress,
    setDeleteConfirmationArmed,
    setSummaryImageFailed,
    statusCopy,
    summaryImageFailed,
  } = state

  if (!existingRequest) return null

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className={`self-start overflow-hidden rounded-2xl border bg-black/30 ${hasMintedNft ? 'border-cyan-400/30 shadow-lg shadow-cyan-950/20' : 'border-white/10'}`}>
        <div className={`relative bg-black ${hasMintedNft ? 'aspect-[1190/1684]' : 'aspect-[4/5]'}`}>
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
            <div className="mt-4 flex flex-wrap gap-3">
              {assetUrl && <OnChainButton href={assetUrl} label="View Solana Asset" />}
              {mintTxUrl && <OnChainButton href={mintTxUrl} label="View Mint Transaction" />}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard label="Submitted">{formatSubmittedAt(existingRequest.created_at)}</SummaryCard>
          <SummaryCard label="Custody">
            {existingRequest.custody_status === 'member' ? 'Member wallet' : 'TBC club wallet'}
          </SummaryCard>
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

        {hasMintedNft && (
          <Card className="border-white/10 bg-black/20">
            <CardContent className="p-5">
              <Field>
                <FieldLabel htmlFor="claim-wallet" className="text-white">
                  {existingRequest.custody_status === 'member' ? 'Request wallet recovery' : 'Claim to your Solana wallet'}
                </FieldLabel>
                <Input
                  id="claim-wallet"
                  value={claimWalletAddress}
                  onChange={(event) => setClaimWalletAddress(event.target.value)}
                  placeholder="Solana wallet address"
                  disabled={claiming}
                  className="border-white/10 bg-black/30 text-white"
                />
                <FieldDescription className="text-white/55">
                  The NFT remains non-transferable. A board member confirms every claim or recovery request.
                </FieldDescription>
                {existingRequest.claim_wallet_address && (
                  <FieldDescription className="text-amber-200/80">
                    Pending destination: {existingRequest.claim_wallet_address}
                  </FieldDescription>
                )}
                <Button
                  type="button"
                  onClick={() => void handleClaimRequest()}
                  disabled={claiming || !claimWalletAddress.trim()}
                >
                  {claiming && <Spinner data-icon="inline-start" />}
                  {claiming ? 'Requesting...' : 'Request board approval'}
                </Button>
              </Field>
            </CardContent>
          </Card>
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
