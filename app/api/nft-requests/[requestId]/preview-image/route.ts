import { NextResponse } from "next/server"
import { loadNftCompositeRecord, NftCompositeError, renderNftCompositeSvg } from "@/lib/server/nftComposite"
import { NftRequestAdminError, requireNftRequestAdmin } from "@/lib/server/nftRequestAdmin"
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    requestId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { requestId } = await context.params
    const supabase = await createSupabaseServerClient()

    await requireNftRequestAdmin(supabase, _request)
    const dataClient = getSupabaseAdminClient() ?? supabase

    const record = await loadNftCompositeRecord(dataClient, requestId)
    const svg = await renderNftCompositeSvg(dataClient, record)

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "image/svg+xml; charset=utf-8",
      },
    })
  } catch (error) {
    if (error instanceof NftRequestAdminError || error instanceof NftCompositeError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not render the NFT preview."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
