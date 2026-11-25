import { NextResponse } from 'next/server'
import { acceptsCurrentNftLegal, NFT_LEGAL_DOCUMENTS } from '@/lib/nftLegal'
import { resolveCurrentNftRequestMember, NftRequestCurrentMemberError } from '@/lib/server/nftRequestCurrentMember'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const { user, member, dataClient } = await resolveCurrentNftRequestMember(await createSupabaseServerClient(), request)
    if (!user) return NextResponse.json({ error: 'Sign in to record publication consent.' }, { status: 401 })
    if (!payload || !acceptsCurrentNftLegal(payload)) return NextResponse.json({ error: 'Accept the current publication consent and terms.' }, { status: 400 })
    const { data, error } = await dataClient.rpc('save_nft_request_with_consent', {
      p_member_id: member.ID, p_actor_id: user.id, p_payload: payload,
      p_documents: NFT_LEGAL_DOCUMENTS, p_renew_only: true,
    })
    if (error || !data) return NextResponse.json({ error: 'Could not save consent. Reload your NFT request and try again.' }, { status: 409 })
    return NextResponse.json({ request: { ...data, consent_required: false } })
  } catch (error) {
    if (error instanceof NftRequestCurrentMemberError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Could not record publication consent.' }, { status: 500 })
  }
}
