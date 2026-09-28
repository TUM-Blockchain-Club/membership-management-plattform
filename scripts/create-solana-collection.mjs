import process from 'node:process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  createCollection,
  mplCore,
} from '@metaplex-foundation/mpl-core'
import {
  base58,
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'

process.loadEnvFile('.env.local')

const required = (key) => {
  const value = process.env[key]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

const network = process.env.SOLANA_NETWORK?.trim() || 'devnet'
const genesisHashes = {
  devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2',
}
if (!genesisHashes[network]) throw new Error('SOLANA_NETWORK must be devnet or mainnet-beta.')
const rpcUrl = required('SOLANA_RPC_URL')
const genesisResponse = await fetch(rpcUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getGenesisHash' }),
})
const genesisPayload = await genesisResponse.json()
if (genesisPayload.result !== genesisHashes[network]) {
  throw new Error(`SOLANA_NETWORK ${network} does not match the configured RPC.`)
}

const secretValue = required('SOLANA_WALLET_PRIVATE_KEY')
const secretKey = secretValue.startsWith('[')
  ? Uint8Array.from(JSON.parse(secretValue))
  : base58.serialize(secretValue)
const umi = createUmi(rpcUrl).use(mplCore())
const authority = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(secretKey))
umi.use(keypairIdentity(authority))

const supabase = createClient(
  required('NEXT_PUBLIC_SUPABASE_URL'),
  required('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } }
)
const logo = await readFile(path.join(process.cwd(), 'public', 'assets', 'tbc-logo.png'))
const { error: logoError } = await supabase.storage
  .from('nft-public-assets')
  .upload('collection/logo.png', logo, { contentType: 'image/png', upsert: true })
if (logoError) throw new Error(logoError.message)
const { data: logoPublic } = supabase.storage.from('nft-public-assets').getPublicUrl('collection/logo.png')
const metadata = {
  name: 'TUM Blockchain Club Membership',
  symbol: 'TBC',
  description: 'Official TUM Blockchain Club membership NFT collection',
  image: logoPublic.publicUrl,
  external_url: process.env.NEXT_PUBLIC_APP_URL?.trim() || undefined,
  properties: { category: 'image', files: [{ uri: logoPublic.publicUrl, type: 'image/png' }] },
}
const { error: metadataError } = await supabase.storage
  .from('nft-public-assets')
  .upload('collection/metadata.json', Buffer.from(JSON.stringify(metadata)), {
    contentType: 'application/json',
    upsert: true,
  })
if (metadataError) throw new Error(metadataError.message)
const { data: metadataPublic } = supabase.storage
  .from('nft-public-assets')
  .getPublicUrl('collection/metadata.json')

const collection = generateSigner(umi)
const result = await createCollection(umi, {
  collection,
  name: 'TUM Blockchain Club Membership',
  uri: metadataPublic.publicUrl,
  updateAuthority: authority.publicKey,
}).sendAndConfirm(umi)

console.log(JSON.stringify({
  collectionAddress: collection.publicKey,
  updateAuthority: authority.publicKey,
  transactionSignature: base58.deserialize(result.signature)[0],
}, null, 2))
