import 'server-only'
import { NFT_LEGAL_VERSION } from '@/lib/nftLegal'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>
export class NftPublicationConsentError extends Error {
  readonly status = 409
  constructor() { super('The member must confirm the current NFT publication consent before publication or transfer.') }
}
export async function hasCurrentNftConsent(client: Client, request: { id: string; member_id: number | string; consent_receipt_id?: string | null }) {
  if (!request.consent_receipt_id) return false
  const { data, error } = await client.from('nft_consent_receipts').select('id')
    .eq('id', request.consent_receipt_id).eq('request_id', request.id)
    .eq('member_id', request.member_id).eq('legal_version', NFT_LEGAL_VERSION).maybeSingle()
  if (error) throw new Error('Could not verify NFT publication consent.')
  return Boolean(data)
}
export async function requireNftPublicationConsent(client: Client, request: Parameters<typeof hasCurrentNftConsent>[1]) {
  if (!await hasCurrentNftConsent(client, request)) throw new NftPublicationConsentError()
}
