import { NextResponse } from "next/server"
import { NftRequestAdminError, requireNftRequestAdmin } from "@/lib/server/nftRequestAdmin"
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{
    requestId: string
  }>
}

type ReviewPayload = {
  status?: string
  reviewNote?: string | null
}

const REVIEWABLE_STATUSES = new Set(["approved", "rejected"])

export async function POST(request: Request, context: RouteContext) {
  try {
    const { requestId } = await context.params
    const payload = (await request.json()) as ReviewPayload
    const status = typeof payload.status === "string" ? payload.status.trim() : ""
    const reviewNote = typeof payload.reviewNote === "string" ? payload.reviewNote.trim() : null

    if (!REVIEWABLE_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid review status." }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { user } = await requireNftRequestAdmin(supabase, request)
    const dataClient = getSupabaseAdminClient() ?? supabase

    const { data, error } = await dataClient
      .from("nft_requests")
      .update({
        status,
        review_note: reviewNote || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      })
      .eq("id", requestId)
      .select("id, member_id, status, display_name, fun_facts, wallet_address, image_path, image_url, created_at, reviewed_at, reviewed_by, review_note, mint_tx_hash")
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Could not update the NFT request." },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof NftRequestAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not update the NFT request."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
