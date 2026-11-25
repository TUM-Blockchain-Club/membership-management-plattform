import { FlaskConicalIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { SolanaNetwork } from '@/lib/nftLifecycle'
import { cn } from '@/lib/utils'

// Server-provided network; renders nothing on mainnet.
export function SolanaNetworkNotice({ network, className }: { network: SolanaNetwork | null | undefined; className?: string }) {
  if (network !== 'devnet') return null

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-300">
        <FlaskConicalIcon data-icon="inline-start" aria-hidden="true" />
        Devnet (test network)
      </Badge>
      <p className="text-xs leading-relaxed text-muted-foreground">
        This is a test version on Solana devnet. Memberships will be re-issued on Solana mainnet later.
      </p>
    </div>
  )
}
