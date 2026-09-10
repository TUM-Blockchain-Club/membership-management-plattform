export type MembershipAssetState = 'active' | 'alumni' | 'burned'
export type MembershipAssetAction = 'none' | 'update_alumni' | 'burn'
export type SolanaNetwork = 'devnet' | 'mainnet-beta'

const BURNING_MEMBER_STATUSES = new Set(['left', 'kicked out', 'revoked'])

export const isBurningMemberStatus = (status: string | null | undefined) =>
  BURNING_MEMBER_STATUSES.has(status?.trim().toLowerCase() ?? '')

export const getMembershipAssetState = (status: string | null | undefined) => {
  if (isBurningMemberStatus(status)) return 'revoked'
  if (status?.trim().toLowerCase() === 'alumni') return 'alumni'
  return 'active'
}

export const getMembershipAssetAction = (
  memberStatus: string | null | undefined,
  assetState: MembershipAssetState
): MembershipAssetAction => {
  if (assetState === 'burned') return 'none'
  if (isBurningMemberStatus(memberStatus)) return 'burn'
  if (memberStatus?.trim().toLowerCase() === 'alumni' && assetState !== 'alumni') {
    return 'update_alumni'
  }
  return 'none'
}

export const buildMembershipMetadata = ({
  name,
  imageUrl,
  department,
  funFact,
  batch,
  assetState,
  alumniYear,
}: {
  name: string
  imageUrl: string
  department: string
  funFact: string | null
  batch: string | null
  assetState: 'active' | 'alumni'
  alumniYear?: number | null
}) => {
  const status = assetState === 'alumni' ? 'Alumni' : 'Active'
  const attributes = [
    { trait_type: 'Membership Status', value: status },
    { trait_type: 'Department', value: department },
  ]

  if (batch) {
    attributes.push({ trait_type: 'Batch', value: batch })
    attributes.push({
      trait_type: 'Club Period',
      value: assetState === 'alumni' && alumniYear ? `Batch ${batch} – ${alumniYear}` : `Batch ${batch} – Present`,
    })
  }

  if (funFact) {
    attributes.push({ trait_type: 'Member Flex', value: funFact })
  }

  return {
    name: `${name} — TBC Membership`,
    symbol: 'TBC',
    description: 'TUM Blockchain Club membership NFT',
    image: imageUrl,
    attributes,
    properties: {
      category: 'image',
      files: [{ uri: imageUrl, type: 'image/png' }],
    },
  }
}

export const getSolanaExplorerUrl = (
  value: string,
  network: SolanaNetwork,
  kind: 'tx' | 'address'
) => {
  const cluster = network === 'devnet' ? '?cluster=devnet' : ''
  return `https://explorer.solana.com/${kind}/${encodeURIComponent(value)}${cluster}`
}
