import 'server-only'

import type { SolanaNetwork } from '@/lib/nftLifecycle'

export const getConfiguredSolanaNetwork = (): SolanaNetwork => {
  const value = process.env.SOLANA_NETWORK?.trim() || 'devnet'
  if (value !== 'devnet' && value !== 'mainnet-beta') {
    throw new Error('SOLANA_NETWORK must be devnet or mainnet-beta.')
  }
  return value
}

export class SolanaNetworkMismatchError extends Error {
  readonly status = 409
}

// An asset can only be changed with the signer, RPC and collection of its own network.
export const assertAssetOnConfiguredNetwork = (assetNetwork: string | null | undefined) => {
  const configured = getConfiguredSolanaNetwork()
  if (assetNetwork !== configured) {
    throw new SolanaNetworkMismatchError(
      `This membership NFT is on Solana ${assetNetwork || 'an unknown network'}, but the platform is configured for ${configured}. ` +
        `Chain actions on it are refused; re-issue the membership on ${configured} instead.`
    )
  }
}
