import 'server-only'

import {
  burnV1,
  create,
  fetchAssetV1,
  fetchCollectionV1,
  mplCore,
  transferV1,
  updatePlugin,
  updateV1,
} from '@metaplex-foundation/mpl-core'
import {
  base58,
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  publicKey,
  type PublicKey,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import type { SolanaNetwork } from '@/lib/nftLifecycle'

const requiredEnv = (key: string) => {
  const value = process.env[key]?.trim()
  if (!value) throw new Error(`Missing required Solana environment variable: ${key}`)
  return value
}

const parseSecretKey = (value: string) => {
  if (value.startsWith('[')) {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed) || parsed.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
      throw new Error('SOLANA_WALLET_PRIVATE_KEY must be a Base58 key or a JSON byte array.')
    }
    const bytes = Uint8Array.from(parsed as number[])
    if (bytes.byteLength !== 64) throw new Error('SOLANA_WALLET_PRIVATE_KEY must contain 64 bytes.')
    return bytes
  }

  const bytes = base58.serialize(value)
  if (bytes.byteLength !== 64) throw new Error('SOLANA_WALLET_PRIVATE_KEY must contain 64 bytes.')
  return bytes
}

const GENESIS_HASHES: Record<SolanaNetwork, string> = {
  devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2',
}

let networkAssertion: Promise<void> | null = null

const assertConfiguredNetwork = async (rpcUrl: string, network: SolanaNetwork) => {
  if (networkAssertion) return networkAssertion
  networkAssertion = (async () => {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getGenesisHash' }),
    cache: 'no-store',
  })
  const payload = (await response.json()) as { result?: string; error?: { message?: string } }
  if (!response.ok || !payload.result) {
    throw new Error(payload.error?.message || 'Could not verify the configured Solana RPC network.')
  }
  if (payload.result !== GENESIS_HASHES[network]) {
    throw new Error(`SOLANA_NETWORK ${network} does not match the configured RPC.`)
  }
  })()
  try {
    await networkAssertion
  } catch (error) {
    networkAssertion = null
    throw error
  }
}

export const getSolanaMembershipConfig = () => {
  const networkValue = process.env.SOLANA_NETWORK?.trim() || 'devnet'
  if (networkValue !== 'devnet' && networkValue !== 'mainnet-beta') {
    throw new Error('SOLANA_NETWORK must be devnet or mainnet-beta.')
  }

  return {
    network: networkValue as SolanaNetwork,
    rpcUrl: requiredEnv('SOLANA_RPC_URL'),
    collectionAddress: publicKey(requiredEnv('SOLANA_COLLECTION_ADDRESS')),
  }
}

export const createSolanaMembershipClient = () => {
  const config = getSolanaMembershipConfig()
  const umi = createUmi(config.rpcUrl).use(mplCore())
  const keypair = umi.eddsa.createKeypairFromSecretKey(parseSecretKey(requiredEnv('SOLANA_WALLET_PRIVATE_KEY')))
  const signer = createSignerFromKeypair(umi, keypair)
  const configuredPublicKey = process.env.SOLANA_WALLET_PUBLIC_KEY?.trim()

  if (configuredPublicKey && signer.publicKey !== publicKey(configuredPublicKey)) {
    throw new Error('SOLANA_WALLET_PUBLIC_KEY does not match SOLANA_WALLET_PRIVATE_KEY.')
  }

  umi.use(keypairIdentity(signer))
  return { umi, signer, config }
}

const signatureToString = (signature: Uint8Array) => base58.deserialize(signature)[0]

export const isSolanaPublicKey = (value: string) => {
  try {
    publicKey(value)
    return true
  } catch {
    return false
  }
}

export const mintMembershipAsset = async ({
  name,
  uri,
}: {
  name: string
  uri: string
}) => {
  const { umi, signer, config } = createSolanaMembershipClient()
  await assertConfiguredNetwork(config.rpcUrl, config.network)
  const collection = await fetchCollectionV1(umi, config.collectionAddress)
  const asset = generateSigner(umi)
  const result = await create(umi, {
    asset,
    authority: signer,
    collection,
    name,
    owner: signer.publicKey,
    uri,
    plugins: [
      { type: 'PermanentFreezeDelegate', frozen: true },
      { type: 'PermanentTransferDelegate' },
      { type: 'PermanentBurnDelegate' },
    ],
  }).sendAndConfirm(umi)

  return {
    assetAddress: String(asset.publicKey),
    collectionAddress: String(collection.publicKey),
    ownerAddress: String(signer.publicKey),
    signature: signatureToString(result.signature),
    network: config.network,
  }
}

export const updateMembershipAsset = async ({
  assetAddress,
  name,
  uri,
}: {
  assetAddress: string
  name: string
  uri: string
}) => {
  const { umi, signer, config } = createSolanaMembershipClient()
  await assertConfiguredNetwork(config.rpcUrl, config.network)
  const result = await updateV1(umi, {
    asset: publicKey(assetAddress),
    authority: signer,
    collection: config.collectionAddress,
    newName: name,
    newUri: uri,
  }).sendAndConfirm(umi)

  return { signature: signatureToString(result.signature), network: config.network }
}

export const claimMembershipAsset = async ({
  assetAddress,
  recipientAddress,
}: {
  assetAddress: string
  recipientAddress: string
}) => {
  const { umi, signer, config } = createSolanaMembershipClient()
  await assertConfiguredNetwork(config.rpcUrl, config.network)
  const assetKey = publicKey(assetAddress)
  const collectionKey = config.collectionAddress
  const thaw = updatePlugin(umi, {
    asset: assetKey,
    authority: signer,
    collection: collectionKey,
    plugin: { type: 'PermanentFreezeDelegate', frozen: false },
  })
  const transfer = transferV1(umi, {
    asset: assetKey,
    authority: signer,
    collection: collectionKey,
    newOwner: publicKey(recipientAddress),
  })
  const freeze = updatePlugin(umi, {
    asset: assetKey,
    authority: signer,
    collection: collectionKey,
    plugin: { type: 'PermanentFreezeDelegate', frozen: true },
  })
  const result = await thaw.add(transfer).add(freeze).sendAndConfirm(umi)

  return { signature: signatureToString(result.signature), network: config.network }
}

export const burnMembershipAsset = async (assetAddress: string) => {
  const { umi, signer, config } = createSolanaMembershipClient()
  await assertConfiguredNetwork(config.rpcUrl, config.network)
  const assetKey = publicKey(assetAddress)
  const thaw = updatePlugin(umi, {
    asset: assetKey,
    authority: signer,
    collection: config.collectionAddress,
    plugin: { type: 'PermanentFreezeDelegate', frozen: false },
  })
  const burn = burnV1(umi, {
    asset: assetKey,
    authority: signer,
    collection: config.collectionAddress,
  })
  const result = await thaw.add(burn).sendAndConfirm(umi)

  return { signature: signatureToString(result.signature), network: config.network }
}

export const reconcileMembershipAsset = async (assetAddress: string) => {
  const { umi, config } = createSolanaMembershipClient()
  await assertConfiguredNetwork(config.rpcUrl, config.network)
  const asset = await fetchAssetV1(umi, publicKey(assetAddress))
  return {
    assetAddress: String(asset.publicKey),
    ownerAddress: String(asset.owner),
    name: asset.name,
    uri: asset.uri,
    network: config.network,
  }
}

export type MembershipAssetPublicKey = PublicKey
