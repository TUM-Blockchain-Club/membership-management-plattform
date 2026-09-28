import { NextResponse } from 'next/server'
import { getMembershipAssetState } from '@/lib/nftLifecycle'
import { NftRequestAdminError, requireNftRequestAdmin } from '@/lib/server/nftRequestAdmin'
import {
  loadMembershipNftRecord,
  renderMembershipImage,
} from '@/lib/server/membershipNftAssets'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await context.params
    const authClient = await createSupabaseServerClient()
    await requireNftRequestAdmin(authClient, request)
    const dataClient = getSupabaseAdminClient() ?? authClient
    const record = await loadMembershipNftRecord(dataClient, requestId)
    const desiredState = getMembershipAssetState(record.member.status)
    if (desiredState === 'revoked') {
      return new NextResponse('This member status cannot receive a membership NFT.', { status: 409 })
    }
    const image = await renderMembershipImage(
      dataClient,
      record,
      desiredState === 'alumni' ? 'alumni' : 'active'
    )

    return new NextResponse(new Uint8Array(image), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not render NFT preview.'
    if (error instanceof NftRequestAdminError) {
      return new NextResponse(message, { status: error.status })
    }
    return new NextResponse(message, { status: 500 })
  }
}
