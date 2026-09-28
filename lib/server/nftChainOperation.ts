import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
export type NftChainOperation = 'mint' | 'update' | 'claim' | 'burn' | 'reconcile'

export const startNftChainOperation = async (
  supabase: SupabaseServerClient,
  requestId: string,
  operation: NftChainOperation
) => {
  const { data, error } = await supabase
    .from('nft_chain_operations')
    .insert({ request_id: requestId, operation, state: 'started' })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message || 'Could not record the blockchain operation.')
  return data.id as string
}

export const confirmNftChainOperation = async (
  supabase: SupabaseServerClient,
  operationId: string,
  result: { assetAddress?: string; signature?: string }
) => {
  const { error } = await supabase
    .from('nft_chain_operations')
    .update({
      state: 'confirmed',
      asset_address: result.assetAddress ?? null,
      transaction_signature: result.signature ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', operationId)
  if (error) throw new Error(error.message)
}

export const failNftChainOperation = async (
  supabase: SupabaseServerClient,
  operationId: string,
  errorMessage: string
) => {
  await supabase
    .from('nft_chain_operations')
    .update({
      state: 'failed',
      error_message: errorMessage.slice(0, 2000),
      completed_at: new Date().toISOString(),
    })
    .eq('id', operationId)
}
