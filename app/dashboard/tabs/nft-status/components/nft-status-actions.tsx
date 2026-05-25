import { ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { NftStatusController } from '../useNftStatus'

export function NftRequestActions({
  canDeleteExistingRequest,
  deleteConfirmationArmed,
  deleting,
  handleDeleteRequest,
  hasMintedNft,
  setDeleteConfirmationArmed,
}: Pick<NftStatusController, 'canDeleteExistingRequest' | 'deleteConfirmationArmed' | 'deleting' | 'handleDeleteRequest' | 'hasMintedNft' | 'setDeleteConfirmationArmed'>) {
  if (!canDeleteExistingRequest) {
    return (
      <p className="text-sm text-white/55">
        {hasMintedNft ? 'Minted requests stay on record and can be tracked on-chain from this page.' : 'Minted requests stay on record and cannot be deleted from this page.'}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleDeleteRequest}
        disabled={deleting}
        className={deleteConfirmationArmed
          ? 'border-rose-500/35 bg-rose-950/40 text-rose-100 hover:bg-rose-950/55 disabled:border-rose-500/20 disabled:text-rose-200/60'
          : 'border-rose-400/40 text-rose-200 hover:bg-rose-500/10 disabled:border-rose-400/20 disabled:text-rose-200/60'
        }
      >
        {deleting && <Spinner data-icon="inline-start" />}
        {deleting ? 'Deleting...' : deleteConfirmationArmed ? 'Confirm?' : 'Delete request'}
      </Button>

      {deleteConfirmationArmed && !deleting && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setDeleteConfirmationArmed(false)}
          className="border-white/10 text-white/70 hover:border-white/20 hover:text-white"
        >
          Cancel
        </Button>
      )}
    </div>
  )
}

export function OnChainButton({ className = '', href }: { className?: string; href: string }) {
  return (
    <Button asChild variant="outline" className={`border-cyan-400/35 bg-cyan-500/10 text-cyan-100 hover:border-cyan-300/50 hover:bg-cyan-400/15 hover:text-cyan-50 ${className}`}>
      <a href={href} target="_blank" rel="noreferrer">
        <ExternalLinkIcon data-icon="inline-start" />
        Check On-Chain
      </a>
    </Button>
  )
}
