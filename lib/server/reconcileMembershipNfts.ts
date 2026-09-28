import 'server-only'

import { reconcileMembershipAsset } from '@/lib/server/solanaMembership'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export const reconcileMembershipNfts = async (supabase: SupabaseServerClient) => {
  const { data: records, error } = await supabase
    .from('nft_requests')
    .select('id, asset_address, owner_address, metadata_url')
    .not('asset_address', 'is', null)
    .neq('asset_state', 'burned')
  if (error) throw new Error(error.message)

  const results = []
  for (const record of records ?? []) {
    try {
      const chain = await reconcileMembershipAsset(record.asset_address)
      const mismatches = [
        chain.ownerAddress !== record.owner_address ? 'owner' : null,
        chain.uri !== record.metadata_url ? 'metadata URI' : null,
      ].filter(Boolean)
      const message = mismatches.length > 0
        ? `Reconciliation mismatch: ${mismatches.join(', ')}`
        : null
      await supabase
        .from('nft_requests')
        .update({ last_chain_error: message, reconciled_at: new Date().toISOString() })
        .eq('id', record.id)
      results.push({ requestId: record.id, ok: message === null, message })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not reconcile asset.'
      await supabase
        .from('nft_requests')
        .update({ last_chain_error: message.slice(0, 2000), reconciled_at: new Date().toISOString() })
        .eq('id', record.id)
      results.push({ requestId: record.id, ok: false, message })
    }
  }

  return results
}
