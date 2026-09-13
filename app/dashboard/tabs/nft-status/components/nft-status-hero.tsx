import { NftPreview } from '@/components/nft-preview'
import { Badge } from '@/components/ui/badge'
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
    <section className="overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8">

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div>
          <Badge variant="secondary">
            Membership NFT
          </Badge>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {hasMintedNft
              ? `Your minted membership NFT is ready${currentMemberName ? ` for ${getLabel(currentMemberName, 'your profile')}` : ''}. You can review the final card and inspect the mint transaction below.`
              : `Use this form to request your TBC membership NFT. You can set the display name, share fun facts, and provide the image you want to appear on the card${currentMemberName ? ` for ${getLabel(currentMemberName, 'your profile')}` : ''}.`}
          </p>

          <div className="mt-6 flex max-w-sm flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">{statusCopy.label}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{statusCopy.text}</p>
          </div>

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
    <figure className="mx-auto flex w-full max-w-[280px] flex-col gap-4">
      <NftPreview
        imageUrl={hasMintedNft && !summaryImageFailed ? existingRequestImageUrl : null}
        displayName={existingRequest?.display_name}
        onImageError={() => setSummaryImageFailed(true)}
      />
      {(!hasMintedNft || !existingRequestImageUrl || summaryImageFailed) && (
        <figcaption className="text-center text-xs leading-relaxed text-muted-foreground">
          {hasMintedNft
            ? 'Your NFT is minted. The artwork is temporarily unavailable.'
            : 'Preview · Your personalized artwork appears after approval and minting.'}
        </figcaption>
      )}
    </figure>
  )
}
