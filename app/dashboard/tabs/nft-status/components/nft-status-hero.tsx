import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getLabel } from '../useNftStatus'
import { OnChainButton } from './nft-status-actions'
import type { NftStatusSectionsProps } from './types'

export function NftStatusHero({ state }: NftStatusSectionsProps) {
  const {
    currentMemberName,
    existingRequest,
    existingRequestImageUrl,
    hasMintedNft,
    mintTxUrl,
    setSummaryImageFailed,
    statusCopy,
    summaryImageFailed,
  } = state

  return (
    <section className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-emerald-500/10 p-6 sm:p-8">
      <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div>
          <Badge variant="outline" className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
            Membership NFT
          </Badge>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
            {hasMintedNft
              ? `Your minted membership NFT is ready${currentMemberName ? ` for ${getLabel(currentMemberName, 'your profile')}` : ''}. You can review the final card and inspect the mint transaction below.`
              : `Use this form to request your TBC membership NFT. You can set the display name, share fun facts, and provide the image you want to appear on the card${currentMemberName ? ` for ${getLabel(currentMemberName, 'your profile')}` : ''}.`}
          </p>

          <Card className="mt-6 max-w-sm border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/50">Status</div>
              <div className="mt-2 text-lg font-semibold text-white">{statusCopy.label}</div>
              <div className="mt-1 text-sm text-white/60">{statusCopy.text}</div>
            </CardContent>
          </Card>

          {mintTxUrl && <OnChainButton href={mintTxUrl} className="mt-4" />}
        </div>

        <NftPreviewCard
          existingRequest={existingRequest}
          existingRequestImageUrl={existingRequestImageUrl}
          hasMintedNft={hasMintedNft}
          setSummaryImageFailed={setSummaryImageFailed}
          summaryImageFailed={summaryImageFailed}
        />
      </div>
    </section>
  )
}

function NftPreviewCard({
  existingRequest,
  existingRequestImageUrl,
  hasMintedNft,
  setSummaryImageFailed,
  summaryImageFailed,
}: Pick<NftStatusSectionsProps['state'], 'existingRequest' | 'existingRequestImageUrl' | 'hasMintedNft' | 'setSummaryImageFailed' | 'summaryImageFailed'>) {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="nft-preview-frame rounded-[30px] bg-black/20 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur-sm">
        {hasMintedNft && existingRequestImageUrl && !summaryImageFailed ? (
          <div className="relative aspect-[1587/2245] overflow-hidden rounded-[22px] border border-white/10 bg-black">
            <Image
              src={existingRequestImageUrl}
              alt={`Minted membership NFT for ${existingRequest?.display_name ?? 'member'}`}
              fill
              unoptimized
              priority
              sizes="280px"
              className="object-cover"
              onError={() => setSummaryImageFailed(true)}
            />
          </div>
        ) : (
          <div className="nft-preview-card relative aspect-[1587/2245] overflow-hidden rounded-[22px] border border-white/10 bg-black">
            <Image src="/assets/base1.png" alt="NFT Base 1" fill priority sizes="280px" className="object-cover opacity-80" />
            <Image src="/assets/base2.png" alt="NFT Base 2" fill priority sizes="280px" className="object-cover" />
            <Image src="/assets/overlay_it&dev.png" alt="Department Overlay" fill priority sizes="280px" className="z-10 object-cover" />

            <div className="nft-question-mark-stage z-20" aria-hidden="true">
              <div className="nft-question-mark-rotator">
                <div className="nft-question-mark-face">
                  <Image src="/question-mark-cutout.png" alt="" fill sizes="160px" className="nft-question-mark-image object-contain" />
                </div>
                <div className="nft-question-mark-face nft-question-mark-face-back">
                  <Image src="/question-mark-cutout.png" alt="" fill sizes="160px" className="nft-question-mark-image object-contain" />
                </div>
              </div>
            </div>

            <div className="absolute inset-x-5 bottom-5 z-30 rounded-[18px] border border-white/10 bg-black/45 px-4 py-3 text-center shadow-xl backdrop-blur-md">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/75">
                {hasMintedNft ? 'Minted NFT' : 'Awaiting Mint'}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/70">
                {hasMintedNft
                  ? 'The minted NFT image could not be loaded right now.'
                  : 'Your final NFT card will appear here once it has been reviewed and minted.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
