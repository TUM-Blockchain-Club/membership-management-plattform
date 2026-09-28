import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
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
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.local')

const required = (key) => {
  const value = process.env[key]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

const signatureString = (result) => base58.deserialize(result.signature)[0]
const network = required('SOLANA_NETWORK')
const rpcUrl = required('SOLANA_RPC_URL')
const expectedGenesis = {
  devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2',
}[network]
if (!expectedGenesis) throw new Error('SOLANA_NETWORK must be devnet or mainnet-beta.')

const genesisResponse = await fetch(rpcUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getGenesisHash' }),
})
const genesisPayload = await genesisResponse.json()
if (genesisPayload.result !== expectedGenesis) throw new Error('Configured RPC does not match SOLANA_NETWORK.')

const umi = createUmi(rpcUrl).use(mplCore())
const secretValue = required('SOLANA_WALLET_PRIVATE_KEY')
const secretKey = secretValue.startsWith('[')
  ? Uint8Array.from(JSON.parse(secretValue))
  : base58.serialize(secretValue)
const authority = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(secretKey))
umi.use(keypairIdentity(authority))

const collection = await fetchCollectionV1(umi, publicKey(required('SOLANA_COLLECTION_ADDRESS')))
if (String(collection.updateAuthority) !== String(authority.publicKey)) {
  throw new Error('Configured wallet is not the collection update authority.')
}

const supabase = createClient(
  required('NEXT_PUBLIC_SUPABASE_URL'),
  required('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } }
)
const runId = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`
const basePath = `prototypes/${runId}`
const imagePath = `${basePath}/image.png`
const activeMetadataPath = `${basePath}/active.json`
const alumniMetadataPath = `${basePath}/alumni.json`
const storagePaths = [imagePath, activeMetadataPath, alumniMetadataPath]
const logo = await readFile(path.join(process.cwd(), 'public', 'assets', 'tbc-logo.png'))
const { error: imageError } = await supabase.storage
  .from('nft-public-assets')
  .upload(imagePath, logo, { contentType: 'image/png' })
if (imageError) throw new Error(imageError.message)
const { data: imagePublic } = supabase.storage.from('nft-public-assets').getPublicUrl(imagePath)

const uploadMetadata = async (metadataPath, status) => {
  const metadata = {
    name: `TBC Membership Prototype — ${status}`,
    symbol: 'TBC',
    description: 'Disposable TUM Blockchain Club membership lifecycle prototype',
    image: imagePublic.publicUrl,
    attributes: [{ trait_type: 'Membership Status', value: status }],
    properties: { category: 'image', files: [{ uri: imagePublic.publicUrl, type: 'image/png' }] },
  }
  const { error } = await supabase.storage
    .from('nft-public-assets')
    .upload(metadataPath, Buffer.from(JSON.stringify(metadata)), { contentType: 'application/json' })
  if (error) throw new Error(error.message)
  return supabase.storage.from('nft-public-assets').getPublicUrl(metadataPath).data.publicUrl
}

const activeUri = await uploadMetadata(activeMetadataPath, 'Active')
const alumniUri = await uploadMetadata(alumniMetadataPath, 'Alumni')
const asset = generateSigner(umi)
const recipient = generateSigner(umi)
let assetCreated = false
let assetBurned = false
const signatures = {}

try {
  const mint = await create(umi, {
    asset,
    authority,
    collection,
    name: 'TBC Membership Prototype — Active',
    owner: authority.publicKey,
    uri: activeUri,
    plugins: [
      { type: 'PermanentFreezeDelegate', frozen: true },
      { type: 'PermanentTransferDelegate' },
      { type: 'PermanentBurnDelegate' },
    ],
  }).sendAndConfirm(umi)
  signatures.mint = signatureString(mint)
  assetCreated = true

  const update = await updateV1(umi, {
    asset: asset.publicKey,
    authority,
    collection: collection.publicKey,
    newName: 'TBC Membership Prototype — Alumni',
    newUri: alumniUri,
  }).sendAndConfirm(umi)
  signatures.update = signatureString(update)

  const claim = await updatePlugin(umi, {
    asset: asset.publicKey,
    authority,
    collection: collection.publicKey,
    plugin: { type: 'PermanentFreezeDelegate', frozen: false },
  }).add(transferV1(umi, {
    asset: asset.publicKey,
    authority,
    collection: collection.publicKey,
    newOwner: recipient.publicKey,
  })).add(updatePlugin(umi, {
    asset: asset.publicKey,
    authority,
    collection: collection.publicKey,
    plugin: { type: 'PermanentFreezeDelegate', frozen: true },
  })).sendAndConfirm(umi)
  signatures.claim = signatureString(claim)

  const claimedAsset = await fetchAssetV1(umi, asset.publicKey)
  if (String(claimedAsset.owner) !== String(recipient.publicKey)) throw new Error('Claim owner mismatch.')

  const burn = await updatePlugin(umi, {
    asset: asset.publicKey,
    authority,
    collection: collection.publicKey,
    plugin: { type: 'PermanentFreezeDelegate', frozen: false },
  }).add(burnV1(umi, {
    asset: asset.publicKey,
    authority,
    collection: collection.publicKey,
  })).sendAndConfirm(umi)
  signatures.burn = signatureString(burn)
  assetBurned = true

  let fetchAfterBurnFailed = false
  try { await fetchAssetV1(umi, asset.publicKey) } catch { fetchAfterBurnFailed = true }
  if (!fetchAfterBurnFailed) throw new Error('Burned asset is still fetchable.')

  console.log(JSON.stringify({
    network,
    collectionAddress: String(collection.publicKey),
    assetAddress: String(asset.publicKey),
    recipientAddress: String(recipient.publicKey),
    ownerVerifiedAfterClaim: true,
    assetUnavailableAfterBurn: true,
    signatures,
  }, null, 2))
} finally {
  if (assetCreated && !assetBurned) {
    try {
      await updatePlugin(umi, {
        asset: asset.publicKey,
        authority,
        collection: collection.publicKey,
        plugin: { type: 'PermanentFreezeDelegate', frozen: false },
      }).add(burnV1(umi, {
        asset: asset.publicKey,
        authority,
        collection: collection.publicKey,
      })).sendAndConfirm(umi)
    } catch {}
  }
  await supabase.storage.from('nft-public-assets').remove(storagePaths)
}
